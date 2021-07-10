use num_integer::div_rem;
use once_cell::sync::OnceCell;
use std::collections::HashMap;
use uuid::Uuid;

// URL-safe characters
pub const ALPHABET: &[u8] = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_`\"!$'()*,-.".as_bytes();
pub const LEN: usize = ALPHABET.len() as usize; // 74
pub const MAX_STR_LEN: usize = 21; // (74^21) > (2^128)

pub fn get_byte_map() -> &'static HashMap<u8, u8> {
    static INSTANCE: OnceCell<HashMap<u8, u8>> = OnceCell::new();
    INSTANCE.get_or_init(move || create_byte_map())
}

pub fn create_byte_map() -> HashMap<u8, u8> {
    let mut map = HashMap::new();
    for (i, b) in ALPHABET.iter().enumerate() {
        map.insert(*b, i as u8);
    }
    map
}

pub struct B73 {}

impl B73 {
    pub fn encode_num(num: u128) -> String {
        let mut result: [u8; MAX_STR_LEN] = [0; MAX_STR_LEN];
        let mut idx = MAX_STR_LEN;
        let mut n = num;
        while n > 0 {
            let (quotient, rem) = div_rem(n, LEN as u128);
            n = quotient;
            let b = ALPHABET[rem as usize] as u8;
            idx = idx - 1;
            result[idx] = b;
        }
        String::from_utf8_lossy(&result[idx..]).into()
    }

    pub fn decode_num(s: &str) -> Option<u128> {
        let bytes: &[u8] = s.as_bytes();
        let map = get_byte_map();
        let mut res: u128 = 0;
        for b in bytes {
            res *= LEN as u128;
            match map.get(&b) {
                None => {
                    return None;
                }
                Some(val) => {
                    res += *val as u128;
                }
            }
        }
        Some(res)
    }

    pub fn encode_uuid(uuid: Uuid) -> String {
        B73::encode_num(uuid.as_u128())
    }

    pub fn decode_uuid(s: &str) -> Option<Uuid> {
        Self::decode_num(s).map(|n| Uuid::from_u128(n))
    }
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn b73_sanity() {
        println!("LEN: {}", LEN);
        let enc = B73::encode_num(123456789);
        assert!(enc == "48n4.");
        let num = B73::decode_num(&"48n4.");
        assert!(num == Some(123456789 as u128));

        let big = B73::encode_num(std::u128::MAX);
        println!("big: {}", big);
        assert!(big == "E2gQRY'kdVupqC36d3CT)");
        assert!(
            Some(std::u128::MAX) == B73::decode_num(&"E2gQRY'kdVupqC36d3CT)")
        );
    }

    #[test]
    fn b73_uuid() {
        let d8 = [255; 8];
        let max_uuid =
            Uuid::from_fields(std::u32::MAX, std::u16::MAX, std::u16::MAX, &d8);
        let enc = B73::encode_uuid(max_uuid.unwrap());
        assert!(enc == "E2gQRY'kdVupqC36d3CT)");
        assert!(B73::encode_uuid(Uuid::nil()) == "");
    }
}
