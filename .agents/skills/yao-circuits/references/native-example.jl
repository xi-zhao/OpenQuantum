using Yao, JSON3
register = zero_state(3)
program = chain(3, put(1=>H), control(1, 2=>X), put(3=>Ry(0.43)))
apply!(register, program)
probabilities = abs2.(vec(state(register)))
@assert isapprox(sum(probabilities), 1.0; atol=1e-12)
@assert count(>(1e-10), probabilities) == 4
write("result.json", JSON3.write((probabilities=probabilities, scientificValidation="not_evaluated")))
