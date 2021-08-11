use crate::adjectives;
use crate::nouns;
use uuid::Uuid;

pub struct GuestHandle {}

impl GuestHandle {
    pub fn generate(uuid: &Uuid) -> String {
        // TODO
        let adj_arr = adjectives::adjectives();
        let noun_arr = nouns::nouns();
        let fields = uuid.as_fields();
        let adj_idx = (fields.0 & 0x0000FFFF) as u16;
        let adjective = adj_arr[(adj_idx % adj_arr.len() as u16) as usize];
        let noun_idx = (fields.0 >> 16) as u16;
        let noun = noun_arr[(noun_idx % noun_arr.len() as u16) as usize];
        format!("\u{00bf}{}_{}?", adjective, noun)
    }
}
