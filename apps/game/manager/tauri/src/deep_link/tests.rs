use super::*;

fn link(url: &str) -> Option<DeepLink> {
    first_arg_link([url])
}

#[test]
fn opens_the_app() {
    assert_eq!(link("triotmetki://open"), Some(DeepLink::Open));
    assert_eq!(link("triotmetki://"), Some(DeepLink::Open));
}

#[test]
fn imports_a_profile_code() {
    assert_eq!(
        link("triotmetki://profile/TM1.eJyrVkrLz1eyUkpKLFKqBQApfgT-"),
        Some(DeepLink::Profile { code: "TM1.eJyrVkrLz1eyUkpKLFKqBQApfgT-".into() })
    );
    assert_eq!(link("triotmetki://profile/not-a-code"), None);
}

#[test]
fn starts_an_install_with_a_preset() {
    assert_eq!(link("triotmetki://install?preset=minimal"), Some(DeepLink::Install { preset: Some("minimal".into()) }));
    assert_eq!(link("triotmetki://install"), Some(DeepLink::Install { preset: None }));
    assert_eq!(link("triotmetki://install?preset=../x"), Some(DeepLink::Install { preset: None }));
    assert_eq!(link("triotmetki://install?preset=mini%5Fmal"), Some(DeepLink::Install { preset: Some("mini_mal".into()) }));
}

#[test]
fn ignores_other_schemes_and_paths() {
    assert_eq!(link("https://triotmetki.ru/open"), None);
    assert_eq!(link("triotmetki://uninstall"), None);
}

#[test]
fn takes_the_first_valid_link_from_the_arguments() {
    let args = ["C:\\otmetki-manager.exe", "triotmetki://open"];

    assert_eq!(first_arg_link(args), Some(DeepLink::Open));
}
