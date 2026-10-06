use std::path::Path;

use reqwest::Method;
use serde::Serialize;

use super::Manager;
use crate::credentials::{AccountBinding, CredentialStore, Credentials};
use crate::detect::GameClient;
use crate::durable::now_seconds;
use crate::error::{AppError, AppResult, ErrorCode};
use crate::paths::configs_dir;
use crate::process::ensure_closed;
use crate::profiles::ProfileStore;
use crate::sets::SetsFile;
use crate::site::{normalize_code, BindRequest, MOD_VERSION_PREFIX, REALM};
use crate::sync::{
    apply_profiles, decide, local_changes, local_profiles, remote_changes, Decision, LibrarySync, ProfileSyncState, PutProfiles, RemoteProfiles,
    RemoteSets, Resolution, Side, SignedBody, Step, SyncBase, PROFILES_PATH, SETS_PATH,
};

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AccountLink {
    pub accounts: Vec<AccountBinding>,
    pub selected: Option<u64>,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalSync {
    pub synced_at: Option<f64>,
    pub pending: usize,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncStatus {
    pub linked: bool,
    pub profiles: Option<LocalSync>,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncReport {
    pub profiles: Option<LibrarySync>,
}

fn base_after_reset(base: SyncBase, revision: u64) -> SyncBase {
    if base.revision.is_some_and(|known| revision < known) {
        return SyncBase::default();
    }

    base
}

impl Manager {
    pub(super) fn credential_store(&self) -> CredentialStore {
        let configs = self.client(None).map_or_else(|_| self.layout.durable_dir(), |client| configs_dir(&client.path));

        CredentialStore::new(configs, self.layout.durable_dir())
    }

    pub fn account_link(&self) -> AccountLink {
        let accounts = self.credential_store().load();
        let wanted = self.state().sync_account_id;
        let selected =
            wanted.filter(|id| accounts.iter().any(|item| item.account_id == *id)).or_else(|| accounts.first().map(|item| item.account_id));

        AccountLink { accounts: accounts.iter().map(Credentials::binding).collect(), selected }
    }

    pub async fn link_account(&self, code: &str) -> AppResult<AccountLink> {
        let code = normalize_code(code).ok_or_else(|| AppError::coded(ErrorCode::LinkCode, "not a bind code"))?;
        let client_version = self.client(None).map(|client| client.version.to_string()).unwrap_or_default();
        let request =
            BindRequest { code, mod_version: format!("{MOD_VERSION_PREFIX}{}", env!("MANAGER_VERSION")), client_version, realm: REALM.to_owned() };
        let answer = self.site.bind(&request).await?;
        let credentials =
            Credentials { device_id: answer.device_id, secret: answer.secret, account_id: answer.account_id, bound_at: Some(now_seconds().floor()) };

        if !credentials.is_valid() {
            return Err(AppError::coded(ErrorCode::Http, "the site answered an unusable binding"));
        }

        let _guard = self.write_guard().await?;

        self.credential_store().save(&credentials)?;
        self.change_state(|state| state.sync_account_id = Some(credentials.account_id))?;
        log::info!("bound the manager to account {}", credentials.account_id);

        Ok(self.account_link())
    }

    pub fn select_sync_account(&self, account_id: u64) -> AppResult<AccountLink> {
        if !self.credential_store().load().iter().any(|item| item.account_id == account_id) {
            return Err(AppError::coded(ErrorCode::NotLinked, format!("no binding for {account_id}")));
        }

        self.change_state(|state| state.sync_account_id = Some(account_id))?;

        Ok(self.account_link())
    }

    fn sync_credentials(&self) -> AppResult<Credentials> {
        self.credential_store().find(self.state().sync_account_id).ok_or_else(|| AppError::coded(ErrorCode::NotLinked, "no site binding"))
    }

    pub fn sync_status(&self, client_path: Option<&Path>) -> SyncStatus {
        let profiles = self.client(client_path).ok().map(|client| {
            let state = ProfileSyncState::load(&self.layout.client_dir(&client.path));
            let file = ProfileStore::new(configs_dir(&client.path), self.layout.durable_dir()).load().unwrap_or_default();
            let local = local_profiles(&file);
            let deleted = state.tombstones(&local);

            LocalSync { synced_at: state.synced_at, pending: local_changes(&Side { items: &local, deleted: &deleted }, state.synced_at) }
        });

        SyncStatus { linked: !self.credential_store().load().is_empty(), profiles }
    }

    pub async fn sync_now(&self, client_path: Option<&Path>, resolution: Option<Resolution>) -> AppResult<SyncReport> {
        let credentials = self.sync_credentials()?;
        let _guard = self.write_guard().await?;
        let profiles = match self.client(client_path) {
            Ok(client) => {
                self.pull_sets(&credentials).await?;
                self.migrate_sets(&client)?;
                Some(self.sync_profiles(&client, &credentials, resolution).await?)
            }
            Err(_) => None,
        };

        Ok(SyncReport { profiles })
    }

    async fn pull_sets(&self, credentials: &Credentials) -> AppResult<()> {
        let signed = SignedBody { device_id: credentials.device_id.clone(), account_id: credentials.account_id };
        let remote: RemoteSets = self.site.signed(Method::POST, SETS_PATH, credentials, &signed).await?;

        self.set_store().absorb(&SetsFile { sets: remote.sets, deleted: remote.deleted, ..SetsFile::default() })
    }

    async fn sync_profiles(&self, client: &GameClient, credentials: &Credentials, resolution: Option<Resolution>) -> AppResult<LibrarySync> {
        let client_dir = self.layout.client_dir(&client.path);
        let store = ProfileStore::new(configs_dir(&client.path), self.layout.durable_dir());
        let file = store.load()?;
        let state = ProfileSyncState::load(&client_dir);
        let local = local_profiles(&file);
        let deleted = state.tombstones(&local);
        let signed = SignedBody { device_id: credentials.device_id.clone(), account_id: credentials.account_id };
        let remote: RemoteProfiles = self.site.signed(Method::POST, PROFILES_PATH, credentials, &signed).await?;
        let base = base_after_reset(state.base(), remote.revision);
        let local_side = Side { items: &local, deleted: &deleted };
        let remote_side = Side { items: &remote.profiles, deleted: &remote.deleted };
        let local_count = local_changes(&local_side, base.synced_at);
        let remote_count = remote_changes(&local_side, &remote_side);
        let Decision { step, outcome } = decide(local_count, remote_count, &base, remote.revision, resolution);
        let summary =
            LibrarySync { outcome, local: local.len(), remote: remote.profiles.len(), local_changes: local_count, remote_changes: remote_count };
        let answer = match step {
            Step::Ask => return Ok(summary),
            Step::Nothing => RemoteProfiles { profiles: local.clone(), deleted: deleted.clone(), ..remote },
            Step::TakeRemote => remote,
            Step::Put(mode) => {
                let body = PutProfiles { signed, profiles: &local, deleted: &deleted, mode };

                ensure_closed(&client.path)?;
                self.site.signed(Method::PUT, PROFILES_PATH, credentials, &body).await?
            }
        };

        if answer.profiles != local {
            ensure_closed(&client.path)?;
            store.replace(&apply_profiles(&file, &answer.profiles))?;
        }

        ProfileSyncState::synced(&answer.profiles, answer.deleted, answer.revision).save(&client_dir)?;

        Ok(summary)
    }
}
