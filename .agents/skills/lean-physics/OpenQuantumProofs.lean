import Physlib.Relativity.PauliMatrices.Basic

open Complex
open scoped PauliMatrix

namespace OpenQuantumProofs

theorem natural_add_zero (n : Nat) : n + 0 = n := Nat.add_zero n

theorem imaginary_square : Complex.I * Complex.I = (-1 : ℂ) := Complex.I_mul_I

theorem pauli_x_square : σ1 * σ1 = 1 :=
  PauliMatrix.pauliMatrix_mul_self (Sum.inr 0)

theorem pauli_xy_commutator : σ1 * σ2 - σ2 * σ1 = (2 * I) • σ3 :=
  PauliMatrix.σ1_σ2_commutator

#print axioms natural_add_zero
#print axioms imaginary_square
#print axioms pauli_x_square
#print axioms pauli_xy_commutator

end OpenQuantumProofs
