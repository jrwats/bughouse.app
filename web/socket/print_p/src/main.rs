use std::f64::consts;

fn main() {
    let ln10 = 10.0_f64.ln();
    println!("ln10: {}", ln10);

    //       3 (ln 10)^2
    // p =  -------------
    //       Pi^2 800^2   .
    let p: f64 = 3.0f64 * 10.0_f64.ln().powi(2) / (consts::PI.powi(2) * 800.0f64.powi(2));
    println!("p: {:.74}", p);

    // q = (ln 10)/800 (bughouse).
    let q = 10f64.ln() / 800f64;
    println!("q: {:.68}", q);

}
