use std::f64::consts;

fn main() {
    let ln10 = 10.0_f64.ln();
    println!("ln10: {}", ln10);
    let p: f64 = 3.0f64 * 10.0_f64.ln().powi(2) / (consts::PI.powi(2) * 400.0f64.powi(2));
    println!("p: {:.68}", p);
}
