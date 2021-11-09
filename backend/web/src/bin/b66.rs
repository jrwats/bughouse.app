use std::env;
use std::io;
use uuid::Uuid;

use bughouse_app::b66::B66;

// Right now only useful for converting b66 encoding to a uuid and spitting it out
fn main() -> Result<(), io::Error> {
    let args: Vec<String> = env::args().collect();
    if args[1] == "-e" {
        let uuid = Uuid::parse_str(&args[2]);
        if uuid.is_err() {
            panic!("Couldn't parse `{}` as uuid", args[2]);
        }
        println!("{}", B66::encode_uuid(&uuid.unwrap()));
    } else {
        let uuid = B66::decode_uuid(&args[1]);
        if uuid.is_none() {
            panic!("Invalid uuid");
        }
        println!("{}", uuid.unwrap().to_hyphenated());
    }
    Ok(())
}
