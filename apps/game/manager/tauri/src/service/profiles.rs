use std::path::Path;

use super::Manager;
use crate::error::AppResult;
use crate::paths::configs_dir;
use crate::process::ensure_closed;
use crate::profiles::{ProfileStore, ProfilesView};

impl Manager {
    pub fn profile_store(&self, client_path: Option<&Path>) -> AppResult<ProfileStore> {
        let client = self.client(client_path)?;

        Ok(ProfileStore::new(configs_dir(&client.path), self.layout.durable_dir()))
    }

    pub fn profiles_view(&self, client_path: Option<&Path>) -> AppResult<ProfilesView> {
        let client = self.client(client_path)?;

        if let Ok(_guard) = self.try_write_guard() {
            self.migrate_sets(&client)?;
        }

        let mut view = self.profile_store(Some(&client.path))?.load()?.view();

        view.pending_sets = self.pending_sets(&client)?;

        Ok(view)
    }

    pub async fn change_profiles(&self, client_path: Option<&Path>, change: impl FnOnce(&ProfileStore) -> AppResult<()>) -> AppResult<ProfilesView> {
        let _guard = self.write_guard().await?;
        let client = self.client(client_path)?;
        let store = ProfileStore::new(configs_dir(&client.path), self.layout.durable_dir());

        ensure_closed(&client.path)?;
        change(&store)?;

        let mut view = store.load()?.view();

        view.pending_sets = self.pending_sets(&client)?;

        Ok(view)
    }
}
