use super::*;

#[test]
fn makes_fresh_hex_of_the_asked_length() {
    let first = random_hex::<16>().unwrap();

    assert_eq!(first.len(), 32);
    assert!(first.chars().all(|c| c.is_ascii_hexdigit()));
    assert_ne!(first, random_hex::<16>().unwrap());
    assert_eq!(random_hex::<6>().unwrap().len(), 12);
}
