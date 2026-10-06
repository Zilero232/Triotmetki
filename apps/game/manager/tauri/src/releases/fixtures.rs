use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use ring::signature::{Ed25519KeyPair, KeyPair};

use super::signature::{signed_payload, PayloadFormat};
use super::{LatestRelease, Release, ReleasePackage, ReleaseStatus};

pub const KEY_ID: [u8; 8] = [7, 1, 2, 3, 4, 5, 6, 8];
pub const LEGACY_ALGORITHM: &[u8; 2] = b"Ed";

pub struct TestSigner {
    pair: Ed25519KeyPair,
}

impl TestSigner {
    pub fn new(seed: u8) -> Self {
        Self { pair: Ed25519KeyPair::from_seed_unchecked(&[seed; 32]).unwrap() }
    }

    pub fn public_key(&self) -> String {
        let mut bin = LEGACY_ALGORITHM.to_vec();

        bin.extend_from_slice(&KEY_ID);
        bin.extend_from_slice(self.pair.public_key().as_ref());

        STANDARD.encode(format!(
            "untrusted comment: test key
{}
",
            STANDARD.encode(bin)
        ))
    }

    pub fn sign(&self, payload: &[u8]) -> String {
        self.sign_at(payload, 0)
    }

    pub fn sign_at(&self, payload: &[u8], timestamp: u64) -> String {
        let trusted = format!("timestamp:{timestamp}	file:release.txt");
        let signature = self.pair.sign(payload);
        let mut bin = LEGACY_ALGORITHM.to_vec();

        bin.extend_from_slice(&KEY_ID);
        bin.extend_from_slice(signature.as_ref());

        let global = self.pair.sign(&[signature.as_ref(), trusted.as_bytes()].concat());
        let text = format!(
            "untrusted comment: signature
{}
trusted comment: {trusted}
{}
",
            STANDARD.encode(bin),
            STANDARD.encode(global.as_ref())
        );

        STANDARD.encode(text)
    }

    pub fn signed(&self, mut release: Release) -> Release {
        release.signature = Some(self.sign(signed_payload(&release, PayloadFormat::Current).as_bytes()));
        release
    }

    pub fn signed_as(&self, mut release: Release, format: PayloadFormat, timestamp: u64) -> Release {
        release.signature = Some(self.sign_at(signed_payload(&release, format).as_bytes(), timestamp));
        release
    }
}

pub fn release(version: &str) -> Release {
    Release {
        version: version.to_owned(),
        published_at: "2026-09-27T12:00:00.000Z".to_owned(),
        games: vec!["1.46.*".to_owned()],
        notes: None,
        catalog: None,
        packages: ["core", "companion"]
            .iter()
            .map(|id| ReleasePackage {
                id: (*id).to_owned(),
                file: format!("net.triotmetki.{id}_{version}.mtmod"),
                url: format!("https://triotmetki.ru/downloads/modpack/{version}/net.triotmetki.{id}_{version}.mtmod"),
                sha256: "0".repeat(64),
                size: 1,
            })
            .collect(),
        signature: None,
    }
}

pub fn latest(game: &str, release: Option<Release>) -> LatestRelease {
    LatestRelease { game: game.to_owned(), status: if release.is_some() { ReleaseStatus::Compatible } else { ReleaseStatus::Waiting }, release }
}
