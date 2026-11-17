using TensorNetworkQuantumSimulator, JSON3
const TN = TensorNetworkQuantumSimulator

# Editable public-API example; vertex 1 is the most significant bit.
# Prepare the fixed environment explicitly before executing this file.
θ, ϕ = 0.37, 0.29
g = named_path_graph(2)
ψ = tensornetworkstate(ComplexF64, _ -> "↑", g, "S=1/2")
ψ, errors = apply_gates([("Ry", [1], θ), ("Rx", [2], ϕ), ("Rzz", [1, 2], 0.41)], ψ;
    apply_kwargs = (; maxdim = 4, cutoff = 1e-12, normalize_tensors = false))
s = siteinds(ψ)
t = reduce(*, [ψ[v] for v in (1, 2)])
amplitudes = vec(permutedims(TN.array(t, only(s[1]), only(s[2]))))
write("result.json", JSON3.write((
    angles = [θ, ϕ, 0.41], bitOrder = "vertex 1 most significant; 00,01,10,11",
    real = real.(amplitudes), imaginary = imag.(amplitudes),
    normSquared = real(norm_sqr(ψ; alg = "exact")),
    x1 = real(expect(ψ, ("X", [1]); alg = "exact")),
    gateTruncationErrors = errors,
    upstreamVersion = string(pkgversion(TN)),
    scientificValidation = "not_evaluated",
)))
