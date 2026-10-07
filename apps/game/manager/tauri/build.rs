use std::{env, fs, path::PathBuf};

fn manager_version() -> String {
    let path = PathBuf::from(env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR")).join("../package.json");
    println!("cargo:rerun-if-changed={}", path.display());

    let text = fs::read_to_string(&path).unwrap_or_else(|error| panic!("{}: {error}", path.display()));
    let manifest: serde_json::Value = serde_json::from_str(&text).unwrap_or_else(|error| panic!("{}: {error}", path.display()));

    manifest["version"].as_str().unwrap_or_else(|| panic!("{}: no \"version\"", path.display())).to_owned()
}

fn main() {
    println!("cargo:rustc-env=MANAGER_VERSION={}", manager_version());
    tauri_build::build();
}
