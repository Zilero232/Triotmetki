use reqwest::header::{HeaderMap, HeaderValue};

use super::*;

#[test]
fn signs_the_v2_message_like_the_mod_and_the_server() {
    let body = br#"{"device_id":"dev_abc","account_id":42}"#;
    let message = signed_message(&SignedMessage {
        method: "post",
        path: "/mod/me/sets",
        timestamp: "1790000000",
        nonce: "0123456789abcdef0123456789abcdef",
        body,
    });

    assert!(message.starts_with(b"v2\nPOST\n/mod/me/sets\n1790000000\n0123456789abcdef0123456789abcdef\n{"));
    assert_eq!(sign(&"x".repeat(32), &message).unwrap(), "sha256=2185502b403fb27313d3df3109444c81a613dca4eaf23bcb443f6a7df7d9d9c9");
}

#[test]
fn makes_a_fresh_hex_nonce_each_time() {
    let first = new_nonce();

    assert_eq!(first.len(), NONCE_BYTES * 2);
    assert!(first.chars().all(|c| c.is_ascii_hexdigit()));
    assert_ne!(first, new_nonce());
}

#[test]
fn normalizes_a_bind_code_from_the_site() {
    assert_eq!(normalize_code(" abcd-efgh 23 ").as_deref(), Some("ABCDEFGH23"));
    assert_eq!(normalize_code("abc"), None);
    assert_eq!(normalize_code("ABCDEFGH2!"), None);
}

#[test]
fn maps_site_answers_to_error_codes() {
    assert_eq!(status_error(StatusCode::FORBIDDEN).code(), ErrorCode::LinkRevoked);
    assert_eq!(status_error(StatusCode::UNAUTHORIZED).code(), ErrorCode::LinkRevoked);
    assert_eq!(status_error(StatusCode::NOT_FOUND).code(), ErrorCode::SyncUnavailable);
    assert_eq!(status_error(StatusCode::TOO_MANY_REQUESTS).code(), ErrorCode::RateLimited);
    assert_eq!(status_error(StatusCode::BAD_GATEWAY).code(), ErrorCode::Http);
}

#[test]
fn reads_the_server_clock_from_a_stale_answer() {
    let mut headers = HeaderMap::new();

    assert_eq!(server_time(&headers), None);

    headers.insert(SERVER_TIME_HEADER, HeaderValue::from_static("1790000000"));
    assert_eq!(server_time(&headers), Some(1_790_000_000.0));

    headers.insert(SERVER_TIME_HEADER, HeaderValue::from_static("soon"));
    assert_eq!(server_time(&headers), None);
}
