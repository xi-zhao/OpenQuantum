using QuantumControl, QuantumPropagators, GRAPE, Krotov, JSON3, LinearAlgebra
initial = ComplexF64[1, 0]
h = ComplexF64[0 0.37; 0.37 0]
times = collect(range(0, 0.8, length=17))
final = QuantumPropagators.propagate(initial, (h,), times; method=:expprop)
reference = exp(-im * h * last(times)) * initial
@assert norm(final-reference) < 1e-10
trajectory = Trajectory(initial_state=initial, generator=(h,), target_state=ComplexF64[0,1])
@assert trajectory.initial_state == initial
write("result.json", JSON3.write((amplitudes=[(real(x),imag(x)) for x in final], residual=norm(final-reference), scientificValidation="not_evaluated")))
