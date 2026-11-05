using TensorNetworkQuantumSimulator, JSON3, Random, LinearAlgebra, Test, SHA, Pkg
const TN = TensorNetworkQuantumSimulator
const records = Dict{String, Any}()
const root = normpath(joinpath(@__DIR__, "../.."))
const output = get(ENV, "OPENQUANTUM_SDK_CHECK_OUTPUT", pwd())
mkpath(output)
Random.seed!(20261105)

# A separate scalar enumeration oracle: no TNQS contraction, cache or optimizer.
function enumerate_network(tn)
    vs = collect(vertices(tn))
    local_indices = [collect(TN.inds(tn[v])) for v in vs]
    all_indices = unique(vcat(local_indices...))
    positions = [[findfirst(==(i), all_indices) for i in is] for is in local_indices]
    arrays = [Array(TN.array(tn[v], local_indices[k]...)) for (k, v) in enumerate(vs)]
    answer = 0.0
    for assignment in CartesianIndices(Tuple(TN.dim.(all_indices)))
        answer += prod(A[Tuple(assignment[p] for p in ps)...] for (A, ps) in zip(arrays, positions))
    end
    inputs = [(vertex = string(v), dimensions = collect(size(A)), values = vec(A), indices = ps)
              for (v, A, ps) in zip(vs, arrays, positions)]
    return answer, inputs
end

function triangle()
    g = NamedGraph([1, 2, 3])
    for edge in (1 => 2, 2 => 3, 3 => 1)
        g = add_edge(g, edge)
    end
    return g
end
const positions = Dict(1 => (0.0, 0.0), 2 => (1.0, 0.0), 3 => (0.2, 0.8))

@testset "fixed source and runtime" begin
    @test VERSION == v"1.12.7"
    @test pkgversion(TN) == v"0.5.0"
    dependency = only(info for info in values(Pkg.dependencies()) if info.name == "TensorNetworkQuantumSimulator")
    @test dependency.git_revision == "c37fba6eac78649f7bf146888e04df3f1deebb92"
    @test startswith(realpath(pathof(TN)), realpath(dependency.source) * "/")
    records["source"] = (; revision = dependency.git_revision, path = pathof(TN), julia = string(VERSION))
end

@testset "positive tree and triangle tensor networks" begin
    cases = []
    for (name, g) in (("tree", named_path_graph(4)), ("triangle", triangle()))
        tn = map_tensors(t -> abs.(t), random_tensornetwork(Float64, g; bond_dimension = 2))
        reference, tensors = enumerate_network(tn)
        actual = name == "tree" ? contract(tn; alg = "bp") :
            contract(tn; alg = "ctmrg", env_maxdim = 16, positions)
        @test isapprox(actual, reference; rtol = 1e-8)
        push!(cases, (; name, tensors, reference, actual, relativeError = abs(actual / reference - 1)))
    end
    records["positiveContractions"] = cases
end

@testset "Ising partition function and free-energy sign" begin
    K = 0.31
    tn = ising_partitionfunction(triangle(), K)
    reference = sum(exp(K * (a*b + b*c + c*a)) for a in (-1, 1), b in (-1, 1), c in (-1, 1))
    @test isapprox(reference, 2exp(3K) + 6exp(-K); rtol = 1e-14)
    actual = contract(tn; alg = "ctmrg", env_maxdim = 16, positions)
    free = freenergy(update(CTMRGCache(tn, 16; positions)))
    @test isapprox(actual, reference; rtol = 1e-8)
    @test isapprox(free, -log(reference); atol = 1e-8)
    records["ising"] = (; K, reference, actual, free, freeReference = -log(reference))
end

@testset "editable circuit against independent dense Pauli rotations" begin
    # The native example is executed as a user script, not reproduced by this oracle.
    cd(output) do
        include(joinpath(root, ".agents/skills/tnqs-dynamics/references/native-example.jl"))
    end
    result = JSON3.read(read(joinpath(output, "result.json"), String))
    θ, ϕ, λ = result.angles
    X = ComplexF64[0 1; 1 0]
    Y = ComplexF64[0 -im; im 0]
    Z = ComplexF64[1 0; 0 -1]
    I2 = Matrix{ComplexF64}(I, 2, 2)
    initial = ComplexF64[1, 0, 0, 0]
    expected = exp(-im * λ/2 * kron(Z, Z)) * kron(exp(-im * θ/2 * Y), exp(-im * ϕ/2 * X)) * initial
    actual = result.real + im * result.imaginary
    @test maximum(abs.(actual - expected)) < 1e-10
    @test abs(result.normSquared - real(dot(expected, expected))) < 1e-10
    @test abs(result.x1 - real(dot(expected, kron(X, I2) * expected))) < 1e-10
    @test abs(result.x1) > 0.1
    records["circuit"] = (; angles = result.angles, referenceReal = real.(expected),
        referenceImaginary = imag.(expected), maximumAmplitudeError = maximum(abs.(actual - expected)), result)
end

@testset "non-square loop bond and environment sweeps" begin
    rows = []
    for D in (1, 2, 3)
        tn = map_tensors(t -> abs.(t), random_tensornetwork(Float64, triangle(); bond_dimension = D))
        reference, tensors = enumerate_network(tn)
        values = [contract(tn; alg = "ctmrg", env_maxdim = χ, positions) for χ in (1, 2, 8, 16)]
        errors = abs.(values ./ reference .- 1)
        @test all(isfinite, values)
        @test errors[end] < 1e-8
        push!(rows, (; bondDimension = D, environmentDimensions = [1, 2, 8, 16], tensors,
            reference, values, relativeErrors = errors, monotonic = all(diff(errors) .<= 1e-12)))
    end
    records["convergence"] = rows
end

@testset "product and GHZ sampling: support, probability and norm-scaled weight" begin
    g = named_grid((2, 2))
    vs = collect(vertices(g))
    s = siteinds("S=1/2", g)
    up = tensornetworkstate(Float64, _ -> "↑", g, s)
    down = tensornetworkstate(Float64, _ -> "↓", g, s)
    rows = []
    for (name, input) in (("product", up), ("ghz", up + down))
        ψ = gauge_and_scale(input)
        dense = Array(TN.array(reduce(*, [ψ[v] for v in vs]), [only(s[v]) for v in vs]...))
        independent_norm = sum(abs2, dense)
        count = 512
        Random.seed!(20261105)
        direct = sample_directly_certified(ψ, count; alg = "boundarymps", norm_env_maxdim = 4,
            projected_env_maxdim = 4, gauge_state = false)
        Random.seed!(20261105)
        certified = sample_certified(ψ, count; alg = "boundarymps", norm_env_maxdim = 4,
            projected_env_maxdim = 4, certification_env_maxdim = 4, gauge_state = false)
        bits = [[sample.bitstring[v] for v in vs] for sample in certified]
        @test all(b -> all(iszero, b) || (name == "ghz" && all(==(1), b)), bits)
        @test all(direct[i].bitstring == certified[i].bitstring for i in 1:count)
        references = [abs2(dense[Tuple(b .+ 1)...]) / exp(direct[i].logq) for (i, b) in enumerate(bits)]
        weights = real.([r.poverq for r in certified])
        @test maximum(abs.(weights - references)) < 1e-8
        @test maximum(abs.(weights .- independent_norm)) < 1e-8
        q = name == "ghz" ? 0.5 : 1.0
        @test maximum(abs.(exp.([r.logq for r in direct]) .- q)) < 1e-8
        zeros = Base.count(b -> all(iszero, b), bits)
        # Predeclared broad statistical tolerance, not a full-distribution certificate.
        @test abs(zeros / count - q) <= 0.1
        push!(rows, (; name, seed = 20261105, shots = count, allZeroCount = zeros,
            expectedZeroProbability = q, frequencyTolerance = 0.1, independent_norm,
            maximumWeightError = maximum(abs.(weights - references)), weights, bits))
    end
    records["sampling"] = rows
end

@testset "invalid drawings and projector fail explicitly" begin
    crossing = NamedGraph([1, 2, 3, 4])
    for edge in (1 => 2, 2 => 3, 3 => 4, 4 => 1)
        crossing = add_edge(crossing, edge)
    end
    bad_positions = Dict(1 => (0., 0.), 2 => (1., 1.), 3 => (0., 1.), 4 => (1., 0.))
    cases = [
        ("missing positions", () -> planar_embedding(triangle())),
        ("coincident vertices", () -> planar_embedding(triangle(); positions = Dict(v => (0., 0.) for v in 1:3))),
        ("crossing edges", () -> planar_embedding(crossing; positions = bad_positions)),
        ("unsupported projector", () -> CTMRGCache(ising_partitionfunction(triangle(), 0.31), 4; positions, projector = :unsupported)),
    ]
    failures = []
    for (name, action) in cases
        error = try action(); nothing catch e; e end
        @test error isa ArgumentError
        push!(failures, (; name, error = sprint(showerror, error)))
    end
    records["failures"] = failures
end

records["scientificValidation"] = "not_evaluated"
records["status"] = "passed_scoped_numerical_checks"
records["manifestSha256"] = bytes2hex(sha256(read(joinpath(root, ".agents/skills/tnqs-dynamics/Manifest.toml"))))
write(joinpath(output, "tnqs-validation.json"), JSON3.write(records))
