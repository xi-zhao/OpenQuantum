using PauliStrings, JSON3, LinearAlgebra
h = Operator(3) + (0.71, "X", 1, "X", 2) + (-0.23, "Z", 2) + (0.18, "Z", 3)
o = Operator(3) + ("Z", 1)
c = commutator(h, o)
@assert norm(c) > 0
coefficients, strings = op_to_strings(c)
write("result.json", JSON3.write((coefficients=[(real(x),imag(x)) for x in coefficients], paulis=strings, scientificValidation="not_evaluated")))
