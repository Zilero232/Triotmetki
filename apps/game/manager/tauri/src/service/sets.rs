use super::Manager;
use crate::detect::GameClient;
use crate::error::AppResult;
use crate::paths::configs_dir;
use crate::process::ensure_closed;
use crate::profiles::{ProfileStore, MAX_PROFILES};
use crate::sets::{Migration, SetStore};

impl Manager {
    pub fn set_store(&self) -> SetStore {
        SetStore::new(self.layout.sets_file())
    }

    pub fn pending_sets(&self, client: &GameClient) -> AppResult<usize> {
        let legacy = self.set_store().load();
        let migration = Migration::load(&self.layout.client_dir(&client.path));
        let file = ProfileStore::new(configs_dir(&client.path), self.layout.durable_dir()).load()?;

        Ok(file.pending_sets(&legacy.sets, &migration.migrated).len())
    }

    pub fn migrate_sets(&self, client: &GameClient) -> AppResult<()> {
        let legacy = self.set_store().load();
        let client_dir = self.layout.client_dir(&client.path);
        let mut migration = Migration::load(&client_dir);
        let store = ProfileStore::new(configs_dir(&client.path), self.layout.durable_dir());
        let file = store.load()?;
        let has_room = file.profiles.len() < MAX_PROFILES;

        if file.pending_sets(&legacy.sets, &migration.migrated).is_empty() || !has_room || ensure_closed(&client.path).is_err() {
            return Ok(());
        }

        store.migrate_sets(&legacy.sets, &mut migration.migrated)?;
        migration.save(&client_dir)?;
        log::info!("moved the saved component sets into the profiles of {}", client.path.display());

        Ok(())
    }
}
