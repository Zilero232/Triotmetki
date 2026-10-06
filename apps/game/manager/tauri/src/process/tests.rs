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
