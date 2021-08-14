use std::error;
use std::fs::{self, File};
use std::io::{self, BufRead};
use std::path::Path;
use std::result::Result;

fn lines_from_file<P>(filename: P) -> io::Result<io::Lines<io::BufReader<File>>>
where
    P: AsRef<Path>,
{
    let file = File::open(filename)?;
    Ok(io::BufReader::new(file).lines())
}

fn write_file(
    source_file: &str,
    dest_file: &str,
    fn_name: &str,
) -> Result<(), Box<dyn error::Error>> {
    let mut array_body = String::new();
    let mut count = 0;
    for line in lines_from_file(source_file)? {
        array_body.push_str(&format!("    \"{}\",\n", line?));
        count = count + 1;
    }
    let def = format!(
        "const WORDS: [&'static str; {}] = [\n{}];\npub fn {}() -> &'static [&'static str; {}] {{\n    return &WORDS;\n}}",
        count, array_body, fn_name, count,
        );
    fs::write(Path::new("src/guest").join(dest_file), def).unwrap();
    Ok(())
}

fn main() -> Result<(), Box<dyn error::Error>> {
    println!("cargo:rerun-if-changed=2_syllable_adjectives.txt");
    println!("cargo:rerun-if-changed=2_syllable_nouns.txt");

    write_file("2_syllable_adjectives.txt", "adjectives.rs", "adjectives")?;
    write_file("2_syllable_nouns.txt", "nouns.rs", "nouns")
}
