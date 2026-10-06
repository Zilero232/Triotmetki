use std::fs;
use std::path::{Path, PathBuf};

use crate::text::{decode_text, Fallback};

pub const LGC_PATH_DAT: [&str; 4] = ["Lesta", "GameCenter", "data", "lgc_path.dat"];
pub const PREFERENCES_XML: &str = "preferences.xml";

#[derive(Debug, Default, Clone, PartialEq, Eq)]
pub struct LgcPreferences {
    pub clients: Vec<PathBuf>,
    pub selected: Option<PathBuf>,
}

pub fn lgc_dir(program_data: &Path) -> Option<PathBuf> {
    let dat = LGC_PATH_DAT.iter().fold(program_data.to_path_buf(), |path, part| path.join(part));
    let text = decode_text(&fs::read(dat).ok()?, Fallback::Lossy);
    let line = text.lines().map(str::trim).find(|line| !line.is_empty())?;
    let path = PathBuf::from(line.trim_matches('\0'));
    let dir = if path.extension().is_some_and(|ext| ext.eq_ignore_ascii_case("exe")) { path.parent()?.to_path_buf() } else { path };

    dir.is_dir().then_some(dir)
}

pub fn read_preferences(lgc: &Path) -> LgcPreferences {
    fs::read(lgc.join(PREFERENCES_XML)).map(|bytes| parse_preferences(&decode_text(&bytes, Fallback::Lossy))).unwrap_or_default()
}

pub fn parse_preferences(xml: &str) -> LgcPreferences {
    let Ok(document) = roxmltree::Document::parse(xml.trim_start_matches('\u{feff}')) else {
        return LgcPreferences::default();
    };
    let text_of = |node: roxmltree::Node| node.text().map(str::trim).filter(|text| !text.is_empty()).map(PathBuf::from);
    let clients = document.descendants().filter(|node| node.has_tag_name("working_dir")).filter_map(text_of).collect();
    let selected = document
        .descendants()
        .find(|node| node.has_tag_name("selectedGames"))
        .and_then(|node| node.children().filter(roxmltree::Node::is_element).find_map(text_of));

    LgcPreferences { clients, selected }
}
