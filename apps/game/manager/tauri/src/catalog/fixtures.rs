use serde_json::json;

use super::Catalog;

pub const MODPACK_VERSION: &str = "0.1.0";

fn component(id: &str, package_id: &str, category: &str, required: bool, dependencies: &[&str]) -> serde_json::Value {
    json!({
        "id": id,
        "packageId": package_id,
        "version": MODPACK_VERSION,
        "file": format!("{package_id}_{MODPACK_VERSION}.mtmod"),
        "category": category,
        "title": { "ru": format!("Компонент {id}"), "en": format!("Component {id}") },
        "description": { "ru": "Описание", "en": "Description" },
        "fairPlay": { "ru": "Только свои данные.", "en": "Only your own data." },
        "required": required,
        "default": true,
        "presets": ["recommended"],
        "preview": { "image": format!("previews/{id}.png"), "video": null, "audio": null },
        "dependencies": dependencies,
        "catalogued": true,
        "sha256": null,
        "size": null,
        "perf": if id == "damage_log" { "medium" } else { "low" }
    })
}

pub const GAMEFACE_SHA256: &str = "2bb65f28663e3ab34b5a1102a1bbd1f6e17a65e1f6a898a8645c4ab732b50184";
pub const MODSLIST_SHA256: &str = "b312adfcd005405d49b711e79b4032be7d624b6e38d4156364d1c04bc5dba71f";

pub fn gameface_json() -> serde_json::Value {
    json!({
        "id": "openwg_gameface",
        "kind": "dependency",
        "packageId": "net.openwg.gameface",
        "version": "1.2.2",
        "file": "net.openwg.gameface_1.2.2.mtmod",
        "title": { "ru": "OpenWG Gameface", "en": "OpenWG Gameface" },
        "description": { "ru": "Окно модпака и HUD на Gameface", "en": "The modpack window and the Gameface HUD" },
        "author": { "name": "OpenWG", "url": "https://gitlab.com/openwg/wot.gameface" },
        "licence": {
            "name": "MIT",
            "url": "https://gitlab.com/openwg/wot.gameface/-/raw/v1.2.2/LICENSE",
            "sha256": "ae7fdf07fd99a0c2c616ace3d07b50d7063a33a3bc6a9173098aa75bc93833a9"
        },
        "sourceUrl": "https://gitlab.com/-/project/68695173/uploads/43577d5bab856523c1b7a6dcada27f23/net.openwg.gameface_1.2.2.mtmod",
        "sha256": GAMEFACE_SHA256,
        "size": 48445,
        "requiredBy": ["marks_panel", "damage_log"],
        "restartRequired": true
    })
}

pub fn modslist_json() -> serde_json::Value {
    json!({
        "id": "modslist",
        "kind": "dependency",
        "packageId": "me.poliroid.modslistapi",
        "version": "1.6.01",
        "file": "me.poliroid.modslistapi_1.6.01.mtmod",
        "title": { "ru": "ModsList", "en": "ModsList" },
        "description": { "ru": "Кнопка модов в ангаре", "en": "The mods button in the hangar" },
        "author": { "name": "poliroid", "url": "https://gitlab.com/wot-public-mods/mods-list" },
        "licence": {
            "name": "MIT",
            "url": "https://gitlab.com/wot-public-mods/mods-list/-/raw/v1.6.01/LICENSE.md",
            "sha256": "c67ed29b3f80fa7b99e6fc16490fa1710353fb7ead042c276e8dccd2dbeedb5f"
        },
        "sourceUrl": "https://gitlab.com/-/project/26509092/uploads/9705f0b2627e9a074ecac2e84f38c9ca/me.poliroid.modslistapi_1.6.01.wotmod",
        "sha256": MODSLIST_SHA256,
        "size": 79776,
        "requiredBy": ["damage_log"],
        "restartRequired": false
    })
}

pub fn catalog_json() -> serde_json::Value {
    json!({
        "schemaVersion": 1,
        "modpackVersion": MODPACK_VERSION,
        "platform": "lesta",
        "extension": "mtmod",
        "categories": [
            { "id": "base", "title": { "ru": "Основа", "en": "Core" }, "description": { "ru": "", "en": "" } },
            { "id": "battle", "title": { "ru": "В бою", "en": "In battle" }, "description": { "ru": "", "en": "" } }
        ],
        "presets": [
            { "id": "recommended", "title": { "ru": "Рекомендуемый", "en": "Recommended" }, "description": { "ru": "", "en": "" }, "custom": false },
            { "id": "all", "title": { "ru": "Все компоненты", "en": "All components" }, "description": { "ru": "", "en": "" }, "everything": true },
            { "id": "custom", "title": { "ru": "Свой", "en": "Custom" }, "description": { "ru": "", "en": "" }, "custom": true }
        ],
        "components": [
            component("core", "net.triotmetki.core", "base", true, &[]),
            component("companion", "otmetki.companion", "base", true, &["core"]),
            component("marks_panel", "net.triotmetki.marks_panel", "battle", false, &["core", "companion"]),
            component("damage_log", "net.triotmetki.damage_log", "battle", false, &["core", "companion"]),
            component("hit_log", "net.triotmetki.hit_log", "battle", false, &["damage_log"]),
            gameface_json(),
            modslist_json()
        ],
        "ownedPatterns": ["net.triotmetki.*.mtmod", "otmetki.*.mtmod"],
        "ownedPaths": ["scripts/client/gui/mods/otmetki/", "scripts/client/gui/mods/mod_otmetki", "gui/gameface/mods/triotmetki/"],
        "conflicts": [
            {
                "id": "xvm",
                "title": { "ru": "XVM", "en": "XVM" },
                "patterns": ["com.modxvm.*", "*xvm*"],
                "components": ["damage_log", "hit_log"],
                "note": { "ru": "Свой лог урона", "en": "Its own damage log" }
            },
            {
                "id": "marks_calculator",
                "title": { "ru": "Калькулятор отметок", "en": "Marks calculator" },
                "patterns": ["*marksongun*"],
                "components": ["marks_panel"],
                "note": { "ru": "Второй калькулятор", "en": "A second calculator" }
            }
        ]
    })
}

pub fn catalog() -> Catalog {
    serde_json::from_value(catalog_json()).unwrap()
}
