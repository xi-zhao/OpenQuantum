using QuantumClifford, JSON3
s = S"+XX
+ZZ"
r = tCNOT * s
@assert length(r) == 2
p = P"X" * P"Z"
write("result.json", JSON3.write((stabilizer=string(r), pauli=string(p), scientificValidation="not_evaluated")))
