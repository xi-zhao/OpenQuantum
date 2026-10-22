// SPDX-License-Identifier: BSD-3-Clause
// Port of QuTiP 5.3.1's Clenshaw Wigner recurrence. See NOTICE.md and LICENSE.txt.
use pyo3::exceptions::{PyOverflowError, PyValueError};
use pyo3::prelude::*;
use pyo3::types::PyBytes;

#[derive(Clone, Copy, Debug, Default)]
struct C {
    re: f64,
    im: f64,
}

impl C {
    #[cfg(test)]
    fn add(self, rhs: Self) -> Self {
        Self {
            re: self.re + rhs.re,
            im: self.im + rhs.im,
        }
    }
    #[cfg(test)]
    fn sub(self, rhs: Self) -> Self {
        Self {
            re: self.re - rhs.re,
            im: self.im - rhs.im,
        }
    }
    fn scale(self, value: f64) -> Self {
        Self {
            re: self.re * value,
            im: self.im * value,
        }
    }
    #[cfg(test)]
    fn mul(self, rhs: Self) -> Self {
        Self {
            re: self.re * rhs.re - self.im * rhs.im,
            im: self.re * rhs.im + self.im * rhs.re,
        }
    }
}

struct Step {
    coefficient: C,
    a: f64,
    b: f64,
    c: f64,
}

struct Series {
    y0: C,
    y1: C,
    steps: Vec<Step>,
    final_b: f64,
    final_scale: f64,
}

impl Series {
    fn new(l: usize, coefficients: &[C]) -> Self {
        let length = coefficients.len();
        let (y0, y1) = if length == 1 {
            (coefficients[0], C::default())
        } else {
            (coefficients[length - 2], coefficients[length - 1])
        };
        let steps = (0..length.saturating_sub(2))
            .rev()
            .map(|index| {
                let k = (index + 2) as f64;
                let l = l as f64;
                Step {
                    coefficient: coefficients[index],
                    a: (((k - 1.0) * (l + k - 1.0)) / ((l + k) * k)).sqrt(),
                    b: l + 2.0 * k - 1.0,
                    c: 1.0 / ((l + k) * k).sqrt(),
                }
            })
            .collect();
        Self {
            y0,
            y1,
            steps,
            final_b: (l + 1) as f64,
            final_scale: 1.0 / ((l + 1) as f64).sqrt(),
        }
    }

    #[cfg(test)]
    fn value(&self, b: f64) -> C {
        let (mut y0, mut y1) = (self.y0, self.y1);
        for step in &self.steps {
            let old = y0;
            y0 = step.coefficient.sub(y1.scale(step.a));
            y1 = old.sub(y1.scale((step.b - b) * step.c));
        }
        y0.sub(y1.scale((self.final_b - b) * self.final_scale))
    }
}

struct Kernel {
    highest: C,
    series: Vec<Series>,
}

impl Kernel {
    fn new(rho: &[C], n: usize) -> Self {
        let series = (0..n - 1)
            .map(|l| {
                let scale = if l == 0 { 1.0 } else { 2.0 };
                let coefficients: Vec<C> = (0..n - l)
                    .map(|row| rho[row * n + row + l].scale(scale))
                    .collect();
                Series::new(l, &coefficients)
            })
            .collect();
        Self {
            highest: rho[n - 1].scale(2.0),
            series,
        }
    }

    #[cfg(test)]
    fn point(&self, x: f64, y: f64, g: f64) -> f64 {
        let a = C {
            re: g * x,
            im: g * y,
        };
        let b = a.re * a.re + a.im * a.im;
        let mut w = self.highest;
        for series in self.series.iter().rev() {
            w = series.value(b).add(w.mul(a).scale(series.final_scale));
        }
        w.re * (-0.5 * b).exp() * (g * g * 0.5 / std::f64::consts::PI)
    }

    fn write_grid(&self, x: &[f64], y: &[f64], g: f64, buffer: &mut [u8]) -> Result<(), String> {
        // Evaluate a short tile together. Inner loops can use ordinary compiler SIMD,
        // with unchanged binary64 operations and no fast-math or worker threads.
        const TILE: usize = 32;
        let total = x.len() * y.len();
        let scale = g * g * 0.5 / std::f64::consts::PI;
        for start in (0..total).step_by(TILE) {
            let count = TILE.min(total - start);
            let (mut ar, mut ai, mut b) = ([0.0; TILE], [0.0; TILE], [0.0; TILE]);
            let (mut wr, mut wi) = ([self.highest.re; TILE], [self.highest.im; TILE]);
            for p in 0..count {
                ar[p] = g * x[(start + p) % x.len()];
                ai[p] = g * y[(start + p) / x.len()];
                b[p] = ar[p] * ar[p] + ai[p] * ai[p];
            }
            for series in self.series.iter().rev() {
                let (mut y0r, mut y0i) = ([series.y0.re; TILE], [series.y0.im; TILE]);
                let (mut y1r, mut y1i) = ([series.y1.re; TILE], [series.y1.im; TILE]);
                for step in &series.steps {
                    for p in 0..count {
                        let old_r = y0r[p];
                        let old_i = y0i[p];
                        y0r[p] = step.coefficient.re - y1r[p] * step.a;
                        y0i[p] = step.coefficient.im - y1i[p] * step.a;
                        let factor = (step.b - b[p]) * step.c;
                        y1r[p] = old_r - y1r[p] * factor;
                        y1i[p] = old_i - y1i[p] * factor;
                    }
                }
                for p in 0..count {
                    let factor = (series.final_b - b[p]) * series.final_scale;
                    let value_r = y0r[p] - y1r[p] * factor;
                    let value_i = y0i[p] - y1i[p] * factor;
                    let next_r = value_r + (wr[p] * ar[p] - wi[p] * ai[p]) * series.final_scale;
                    wi[p] = value_i + (wr[p] * ai[p] + wi[p] * ar[p]) * series.final_scale;
                    wr[p] = next_r;
                }
            }
            for p in 0..count {
                let value = wr[p] * (-0.5 * b[p]).exp() * scale;
                if !value.is_finite() {
                    return Err("non-finite result: coordinate or binary64 overflow".into());
                }
                let offset = (start + p) * 8;
                buffer[offset..offset + 8].copy_from_slice(&value.to_ne_bytes());
            }
        }
        Ok(())
    }
}

#[pyfunction]
fn clenshaw<'py>(
    py: Python<'py>,
    rho_bytes: &[u8],
    n: usize,
    x: Vec<f64>,
    y: Vec<f64>,
    g: f64,
) -> PyResult<Bound<'py, PyBytes>> {
    let expected = n
        .checked_mul(n)
        .and_then(|v| v.checked_mul(16))
        .ok_or_else(|| PyOverflowError::new_err("density matrix size overflow"))?;
    if n < 2 || rho_bytes.len() != expected {
        return Err(PyValueError::new_err(
            "square N>=2 complex128 matrix required",
        ));
    }
    if x.is_empty()
        || y.is_empty()
        || !g.is_finite()
        || g <= 0.0
        || x.iter().chain(&y).any(|v| !v.is_finite())
    {
        return Err(PyValueError::new_err(
            "nonempty finite coordinates and positive finite g required",
        ));
    }
    let rho: Vec<C> = rho_bytes
        .chunks_exact(16)
        .map(|chunk| C {
            re: f64::from_ne_bytes(chunk[..8].try_into().unwrap()),
            im: f64::from_ne_bytes(chunk[8..].try_into().unwrap()),
        })
        .collect();
    for row in 0..n {
        for col in 0..n {
            let (a, b) = (rho[row * n + col], rho[col * n + row]);
            if !a.re.is_finite()
                || !a.im.is_finite()
                || (a.re - b.re).abs() > 1e-12 + 1e-12 * a.re.abs().max(b.re.abs())
                || (a.im + b.im).abs() > 1e-12 + 1e-12 * a.im.abs().max(b.im.abs())
            {
                return Err(PyValueError::new_err("finite Hermitian matrix required"));
            }
        }
    }
    let kernel = Kernel::new(&rho, n);
    let bytes = x
        .len()
        .checked_mul(y.len())
        .and_then(|v| v.checked_mul(8))
        .ok_or_else(|| PyOverflowError::new_err("output grid size overflow"))?;
    PyBytes::new_with(py, bytes, |buffer| {
        kernel
            .write_grid(&x, &y, g, buffer)
            .map_err(PyValueError::new_err)
    })
}

#[pymodule]
fn qutip_wigner_rust(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(clenshaw, m)?)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn vacuum_and_one_photon_match_closed_forms() {
        let vacuum = Kernel::new(
            &[
                C { re: 1.0, im: 0.0 },
                C::default(),
                C::default(),
                C::default(),
            ],
            2,
        );
        let fock = Kernel::new(
            &[
                C::default(),
                C::default(),
                C::default(),
                C { re: 1.0, im: 0.0 },
            ],
            2,
        );
        for g in [0.7_f64, 2.0_f64.sqrt(), 2.3_f64] {
            for (x, y) in [(-0.3, 0.8), (0.0, 0.0), (1.2, -0.4)] {
                let b = g * g * (x * x + y * y);
                let scale = (-0.5 * b).exp() * g * g / (2.0 * std::f64::consts::PI);
                assert!((vacuum.point(x, y, g) - scale).abs() < 1e-14);
                assert!((fock.point(x, y, g) - (b - 1.0) * scale).abs() < 1e-14);
            }
        }
    }
    #[test]
    fn imaginary_coherence_has_correct_orientation() {
        let k = Kernel::new(
            &[
                C { re: 0.5, im: 0.0 },
                C { re: 0.0, im: -0.5 },
                C { re: 0.0, im: 0.5 },
                C { re: 0.5, im: 0.0 },
            ],
            2,
        );
        let g = 2.0_f64.sqrt();
        let x = 0.2_f64;
        let y = 0.6_f64;
        let b = g * g * (x * x + y * y);
        let expected = (0.5 * b + g * y) * (-0.5 * b).exp() / std::f64::consts::PI;
        assert!((k.point(x, y, g) - expected).abs() < 1e-14);
    }
    #[test]
    fn tiled_grid_matches_scalar_including_partial_tile() {
        for n in [2, 3, 8] {
            let rho: Vec<C> = (0..n * n)
                .map(|i| C {
                    re: ((i + 3) as f64).sin(),
                    im: ((i + 7) as f64).cos(),
                })
                .collect();
            let k = Kernel::new(&rho, n);
            let x: Vec<f64> = (0..19).map(|i| (i as f64 - 9.0) / 4.0).collect();
            let y = [-0.8, 0.1, 1.3];
            let mut buffer = vec![0_u8; x.len() * y.len() * 8];
            k.write_grid(&x, &y, 1.4, &mut buffer).unwrap();
            for (i, chunk) in buffer.chunks_exact(8).enumerate() {
                let actual = f64::from_ne_bytes(chunk.try_into().unwrap());
                let expected = k.point(x[i % x.len()], y[i / x.len()], 1.4);
                assert!((actual - expected).abs() < 1e-13);
            }
        }
    }
}
