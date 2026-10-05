use super::*;

#[test]
fn hands_back_what_the_blocking_work_returns() {
    let result = tauri::async_runtime::block_on(run_blocking(|| Ok(42)));

    assert_eq!(result.unwrap(), 42);
}

#[test]
fn a_panicking_job_becomes_an_error() {
    let result: AppResult<()> = tauri::async_runtime::block_on(run_blocking(|| panic!("boom")));

    assert_eq!(result.unwrap_err().code(), ErrorCode::Io);
}

#[test]
fn the_blocking_work_may_wait_for_async_service_calls() {
    let result = tauri::async_runtime::block_on(run_blocking(|| block_on(async { Ok("done") })));

    assert_eq!(result.unwrap(), "done");
}
