"""Fixed full-grid tasks; matrix and grid generation are outside measured calls."""
import numpy as np
import qutip as qt
from scipy.special import eval_genlaguerre, gammaln

from case import wigner_rust
from common import PLAN


def make_case(spec, offset):
    rng = np.random.default_rng(PLAN["seed"] + offset)
    a = rng.normal(size=(spec["dimension"], spec["rank"])) + 1j*rng.normal(size=(spec["dimension"], spec["rank"]))
    rho = a @ a.conj().T
    rho = (rho + rho.conj().T)/2
    rho /= np.trace(rho).real
    state = qt.Qobj(rho)
    x, y = np.linspace(-5, 5, spec["nx"]), np.linspace(-5, 5, spec["ny"])
    return state, x, y, spec["g"]


def methods(state, x, y, g):
    return {
        "qutip_clenshaw": lambda: qt.wigner(state, x, y, method="clenshaw", g=g),
        "qutip_iterative": lambda: qt.wigner(state, x, y, method="iterative", g=g),
        "qutip_laguerre": lambda: qt.wigner(state, x, y, method="laguerre", g=g, parfor=False),
        "rust_clenshaw": lambda: wigner_rust(state, x, y, g),
    }


def independent_laguerre(state, x, y, g):
    """Direct Fock-basis formula, not the ported Clenshaw recurrence."""
    rho = (state.proj() if state.isket or state.isbra else state).full()
    xx, yy = np.meshgrid(x, y)
    a = g*(xx + 1j*yy)
    b = np.abs(a)**2
    total = np.zeros(b.shape)
    for m in range(len(rho)):
        total += rho[m, m].real*((-1)**m)*eval_genlaguerre(m, 0, b)
        for n in range(m+1, len(rho)):
            factor = np.exp(0.5*(gammaln(m+1)-gammaln(n+1)))
            total += 2*np.real(rho[m, n]*((-1)**m)*factor*a**(n-m)*eval_genlaguerre(m, n-m, b))
    return total*np.exp(-0.5*b)*g*g/(2*np.pi)
