use std::path::Path;

use super::Manager;
use crate::cache::{self, CachePlan, CacheResult, PlanInput};
use crate::conflicts::{self, ConflictReport};
use crate::error::{AppError, AppResult, ErrorCode};
use crate::process::ensure_closed;

impl Manager {
    pub fn conflicts(&self, client_path: Option<&Path>) -> AppResult<ConflictReport> {
        conflicts::scan(self.scope(client_path)?.context())
    }

    pub async fn restore_missing(&self, client_path: Option<&Path>) -> AppResult<ConflictReport> {
        let _guard = self.write_guard().await?;
        let scope = self.usable_scope(client_path)?;

        let wanted = conflicts::scan(scope.context())?.to_restore();

        if wanted.is_empty() {
            return Err(AppError::coded(ErrorCode::NothingToRestore, "no component is missing or replaced"));
        }

        ensure_closed(&scope.client.path)?;
        self.download_components(&scope, &wanted).await?;
        self.sync_res_map(&scope.client);
        self.sync_hangar_looks(scope.context());

        conflicts::scan(scope.context())
    }

    pub fn cache_plan(&self, client_path: Option<&Path>) -> AppResult<CachePlan> {
        let client = self.usable_client(client_path)?;

        Ok(cache::plan(PlanInput { app_data: &self.layout.app_data_dir(), client: &client }))
    }

    pub async fn clear_cache(&self, client_path: Option<&Path>, ids: &[String]) -> AppResult<CacheResult> {
        let _guard = self.write_guard().await?;
        let client = self.usable_client(client_path)?;

        for known in self.detect() {
            ensure_closed(&known.path)?;
        }

        ensure_closed(&client.path)?;

        let plan = cache::plan(PlanInput { app_data: &self.layout.app_data_dir(), client: &client });

        Ok(cache::clear(&plan, ids))
    }
}
