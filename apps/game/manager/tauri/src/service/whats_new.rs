use std::path::Path;

use serde::Serialize;

use super::Manager;
use crate::changelog::{Changelog, ChangelogRelease};
use crate::error::AppResult;
use crate::state::Manifest;
use crate::versions::is_newer;

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WhatsNew {
    pub releases: Vec<ChangelogRelease>,
    pub offline: bool,
    pub installed_version: Option<String>,
    pub fresh_components: Vec<String>,
    pub show_card: bool,
}

impl Manager {
    pub fn installed_modpack(&self, client_path: Option<&Path>) -> Option<String> {
        let client = self.client(client_path).ok()?;

        Manifest::read(&self.layout.client_dir(&client.path)).ok().flatten().map(|manifest| manifest.modpack).filter(|version| !version.is_empty())
    }

    async fn changelog(&self) -> (Changelog, bool) {
        let cache = self.layout.changelog_cache();

        match self.releases.changelog().await {
            Ok(changelog) => {
                if let Err(error) = changelog.save(&cache) {
                    log::warn!("changelog cache: {error}");
                }

                (changelog, false)
            }
            Err(error) => {
                log::info!("changelog: {error}, using the saved copy");

                (Changelog::load(&cache).unwrap_or_default(), true)
            }
        }
    }

    pub async fn whats_new(&self, client_path: Option<&Path>) -> AppResult<WhatsNew> {
        let (changelog, offline) = self.changelog().await;
        let installed = self.installed_modpack(client_path);
        let mut seen = self.state().seen_modpack_version;

        if seen.is_none() {
            if let Some(version) = &installed {
                seen = self.change_state(|state| state.seen_modpack_version = Some(version.clone()))?.seen_modpack_version;
            }
        }

        let show_card = matches!((&installed, &seen), (Some(installed), Some(seen)) if is_newer(installed, seen));

        Ok(WhatsNew {
            fresh_components: changelog.fresh_components(installed.as_deref()),
            releases: changelog.releases,
            offline,
            installed_version: installed,
            show_card,
        })
    }

    pub fn mark_release_seen(&self, version: &str) -> AppResult<()> {
        self.change_state(|state| state.seen_modpack_version = Some(version.to_owned())).map(drop)
    }
}
