use std::path::{Path, PathBuf};

use sysinfo::{ProcessRefreshKind, ProcessesToUpdate, RefreshKind, System, UpdateKind};

use crate::detect::client::LESTA_EXECUTABLE;
use crate::error::{AppError, AppResult, ErrorCode};
use crate::paths::normalized;

pub const GAME_PROCESS_NAMES: [&str; 2] = [LESTA_EXECUTABLE, "WorldOfTanks.exe"];

pub fn is_inside(path: &Path, dir: &Path) -> bool {
    let path = normalized(path);
    let dir = normalized(dir);

    path.len() > dir.len() && path.starts_with(&dir) && path[dir.len()..].starts_with('\\')
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RunningProcess {
    pub name: String,
    pub exe: Option<PathBuf>,
}

pub fn running_processes() -> Vec<RunningProcess> {
    let refresh = ProcessRefreshKind::nothing().with_exe(UpdateKind::OnlyIfNotSet);
    let mut system = System::new_with_specifics(RefreshKind::nothing().with_processes(refresh));

    system.refresh_processes_specifics(ProcessesToUpdate::All, true, refresh);
    system
        .processes()
        .values()
        .map(|process| RunningProcess { name: process.name().to_string_lossy().into_owned(), exe: process.exe().map(Path::to_path_buf) })
        .collect()
}

fn is_game_process(name: &str) -> bool {
    GAME_PROCESS_NAMES.iter().any(|known| known.eq_ignore_ascii_case(name))
}

pub fn client_running(processes: &[RunningProcess], client_path: &Path) -> bool {
    processes.iter().any(|process| match &process.exe {
        Some(exe) => is_inside(exe, client_path),
        None => is_game_process(&process.name),
    })
}

pub fn is_client_running(client_path: &Path) -> bool {
    client_running(&running_processes(), client_path)
}

pub fn ensure_closed(client_path: &Path) -> AppResult<()> {
    if is_client_running(client_path) {
        return Err(AppError::coded(ErrorCode::ClientRunning, format!("the game is running from {}", client_path.display())));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn matches_executables_inside_the_client_folder_only() {
        assert!(is_inside(Path::new(r"D:\Игры\Танки\Tanki.exe"), Path::new(r"d:\игры\танки\")));
        assert!(is_inside(Path::new(r"D:\Games\Tanki\win64\WorldOfTanks.exe"), Path::new(r"D:\Games\Tanki")));
        assert!(!is_inside(Path::new(r"D:\Games\Tanki2\Tanki.exe"), Path::new(r"D:\Games\Tanki")));
        assert!(!is_inside(Path::new(r"D:\Games\Tanki"), Path::new(r"D:\Games\Tanki")));
    }

    fn process(name: &str, exe: Option<&str>) -> RunningProcess {
        RunningProcess { name: name.to_owned(), exe: exe.map(PathBuf::from) }
    }

    #[test]
    fn a_game_process_whose_path_is_hidden_counts_as_running() {
        let client = Path::new(r"D:\Games\Tanki");

        assert!(client_running(&[process("Tanki.exe", None)], client));
        assert!(client_running(&[process("worldoftanks.EXE", None)], client));
    }

    #[test]
    fn other_processes_with_hidden_paths_do_not_block_writes() {
        assert!(!client_running(&[process("explorer.exe", None)], Path::new(r"D:\Games\Tanki")));
    }

    #[test]
    fn a_game_process_with_a_known_path_counts_only_inside_the_client() {
        let other = process("Tanki.exe", Some(r"E:\Other\Tanki.exe"));

        assert!(!client_running(std::slice::from_ref(&other), Path::new(r"D:\Games\Tanki")));
        assert!(client_running(&[other], Path::new(r"E:\Other")));
    }
}
