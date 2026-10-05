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

    pub async fn change_profiles(&self, client_path: Option<&Path>, change: impl FnOnce(&ProfileStore) -> AppResult<()>) -> AppResult<ProfilesView> {
        let _guard = self.write_guard().await?;
        let client = self.client(client_path)?;
        let store = ProfileStore::new(configs_dir(&client.path), self.layout.durable_dir());

        ensure_closed(&client.path)?;
        change(&store)?;

        Ok(store.load()?.view())
    }
}
