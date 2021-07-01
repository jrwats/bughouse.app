use num_integer::div_rem;

pub fn b73_encode(num: u32) -> String {
    let alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_`\"!$'()*,-.".as_bytes();
    let mut result = String::new();
    let len = alphabet.len() as usize;
    let mut n = num;
    while n > 0 {
        let (quotient, rem) = div_rem(n, len as u32);
        n = quotient;
        let ch = alphabet[rem as usize] as char;
        result.push(ch);
    }
    result.chars().rev().collect::<String>()
}
