use std::path::Path;

use crate::error::AppResult;

#[cfg(test)]
thread_local! {
    static FAULT: std::cell::Cell<Option<(usize, usize, std::io::ErrorKind)>> = const { std::cell::Cell::new(None) };
}

#[cfg(test)]
pub fn fail_after(operations: usize, kind: std::io::ErrorKind) {
    fail_times(operations, 1, kind);
}

#[cfg(test)]
pub fn fail_times(operations: usize, times: usize, kind: std::io::ErrorKind) {
    FAULT.set(Some((operations, times, kind)));
}

#[cfg(test)]
pub fn clear() {
    FAULT.set(None);
}

#[cfg(test)]
pub fn check(path: &Path) -> AppResult<()> {
    match FAULT.get() {
        Some((0, times, kind)) => {
            FAULT.set((times > 1).then_some((0, times - 1, kind)));

            Err(std::io::Error::new(kind, format!("injected fault at {}", path.display())).into())
        }
        Some((left, times, kind)) => {
            FAULT.set(Some((left - 1, times, kind)));

            Ok(())
        }
        None => Ok(()),
    }
}

#[cfg(not(test))]
pub fn check(_path: &Path) -> AppResult<()> {
    Ok(())
}
