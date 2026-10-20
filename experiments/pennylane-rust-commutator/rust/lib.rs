//! Fixed-coefficient Pauli commutators. No matrix, approximation or threading.
use pyo3::exceptions::PyValueError;
use pyo3::prelude::*;
use std::collections::HashMap;

#[derive(Clone)]
struct Term {
    x: u64,
    z: u64,
    y: i32,
    re: f64,
    im: f64,
}

#[pyclass(frozen)]
struct Operator {
    terms: Vec<Term>,
}

fn commutator(left: &[Term], right: &[Term]) -> Vec<Term> {
    let mut sums: HashMap<(u64, u64), (f64, f64)> = HashMap::new();
    for a in left {
        for b in right {
            if ((a.x & b.z) ^ (a.z & b.x)).count_ones() % 2 == 0 {
                continue;
            }
            let x = a.x ^ b.x;
            let z = a.z ^ b.z;
            // P(x,z) = i^popcount(x&z) X^x Z^z. The exponent can be negative.
            let phase = (a.y + b.y - (x & z).count_ones() as i32
                + 2 * (a.z & b.x).count_ones() as i32)
                .rem_euclid(4);
            let re = 2.0 * (a.re * b.re - a.im * b.im);
            let im = 2.0 * (a.re * b.im + a.im * b.re);
            let (re, im) = match phase {
                0 => (re, im),
                1 => (-im, re),
                2 => (-re, -im),
                _ => (im, -re),
            };
            let entry = sums.entry((x, z)).or_insert((0.0, 0.0));
            entry.0 += re;
            entry.1 += im;
        }
    }
    sums.into_iter()
        .filter(|(_, (re, im))| *re != 0.0 || *im != 0.0)
        .map(|((x, z), (re, im))| Term {
            x,
            z,
            y: (x & z).count_ones() as i32,
            re,
            im,
        })
        .collect()
}

#[pymethods]
impl Operator {
    #[new]
    fn new(rows: Vec<(u64, u64, f64, f64)>) -> PyResult<Self> {
        if rows.iter().any(|row| !row.2.is_finite() || !row.3.is_finite()) {
            return Err(PyValueError::new_err("coefficients must be finite"));
        }
        Ok(Self {
            terms: rows
                .into_iter()
                .map(|(x, z, re, im)| Term {
                    x,
                    z,
                    y: (x & z).count_ones() as i32,
                    re,
                    im,
                })
                .collect(),
        })
    }

    fn commutator(&self, other: &Self, py: Python<'_>) -> PyResult<Self> {
        let terms = py.detach(|| commutator(&self.terms, &other.terms));
        if terms.iter().any(|t| !t.re.is_finite() || !t.im.is_finite()) {
            return Err(PyValueError::new_err("non-finite result: binary64 arithmetic overflow"));
        }
        Ok(Self { terms })
    }

    fn rows(&self) -> Vec<(u64, u64, f64, f64)> {
        self.terms.iter().map(|t| (t.x, t.z, t.re, t.im)).collect()
    }

    fn __len__(&self) -> usize {
        self.terms.len()
    }
}

#[pymodule]
fn pauli_rust(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_class::<Operator>()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn term(x: u64, z: u64) -> Term {
        Term { x, z, y: (x & z).count_ones() as i32, re: 1.0, im: 0.0 }
    }

    #[test]
    fn ordered_phase_and_high_bit() {
        let xy = commutator(&[term(1, 0)], &[term(1, 1)]);
        assert_eq!((xy[0].x, xy[0].z, xy[0].re, xy[0].im), (0, 1, 0.0, 2.0));
        let xz = commutator(&[term(1, 0)], &[term(0, 1)]);
        assert_eq!((xz[0].x, xz[0].z, xz[0].re, xz[0].im), (1, 1, 0.0, -2.0));
        assert!(commutator(&[term(1, 0)], &[term(2, 0)]).is_empty());
        let top = 1_u64 << 63;
        let result = commutator(&[term(top, 0)], &[term(top, top)]);
        assert_eq!((result[0].z, result[0].im), (top, 2.0));
    }
}
