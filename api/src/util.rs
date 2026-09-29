//! Helper kecil: waktu WIB tanpa crate tanggal.

const WIB: i64 = 7 * 3600;
const BULAN: [&str; 12] = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

pub fn now() -> i64 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs() as i64).unwrap_or(0)
}

/// "09.15"
pub fn clock(at: i64) -> String {
    let t = at + WIB;
    format!("{:02}.{:02}", (t / 3600).rem_euclid(24), (t / 60).rem_euclid(60))
}

/// (tahun, bulan 1-12, tanggal) dari hari sejak epoch. Algoritma civil_from_days (H. Hinnant).
fn civil(days: i64) -> (i64, usize, i64) {
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    (yoe + era * 400 + i64::from(m <= 2), m as usize, d)
}

/// "09.15" untuk hari ini, "Kemarin", atau "12 Sep".
pub fn when(at: i64) -> String {
    let day = |t: i64| (t + WIB).div_euclid(86_400);
    match day(now()) - day(at) {
        0 => clock(at),
        1 => "Kemarin".into(),
        _ => {
            let (_, m, d) = civil(day(at));
            format!("{d} {}", BULAN[m - 1])
        }
    }
}

/// "2026-08-14" -> "14 Agu 2026"
pub fn tanggal(iso: &str) -> String {
    let p: Vec<&str> = iso.split('-').collect();
    match (p.first(), p.get(1).and_then(|m| m.parse::<usize>().ok()), p.get(2)) {
        (Some(y), Some(m @ 1..=12), Some(d)) => format!("{} {} {y}", d.trim_start_matches('0'), BULAN[m - 1]),
        _ => iso.to_owned(),
    }
}

/// Hex acak kriptografis, dipakai untuk token sesi dan id lampiran.
pub fn random_hex(bytes: usize) -> String {
    use argon2::password_hash::rand_core::{OsRng, RngCore};
    let mut b = vec![0u8; bytes];
    OsRng.fill_bytes(&mut b);
    b.iter().map(|x| format!("{x:02x}")).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn format_waktu() {
        assert_eq!(clock(0), "07.00");
        assert_eq!(civil(0), (1970, 1, 1));
        assert_eq!(civil(20_725), (2026, 9, 29));
        assert_eq!(tanggal("2026-08-14"), "14 Agu 2026");
        assert_eq!(tanggal("rusak"), "rusak");
    }
}

