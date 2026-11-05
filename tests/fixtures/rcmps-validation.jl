using RcmpsCore, JSON3, LinearAlgebra, Random, Test, SHA, Pkg
BLAS.set_num_threads(1)
const records = Dict{String, Any}()
const root = normpath(joinpath(@__DIR__, "../.."))
const output = get(ENV, "OPENQUANTUM_SDK_CHECK_OUTPUT", pwd())
mkpath(output)
complex_rows(A) = [[(real = real(x), imaginary = imag(x)) for x in row] for row in eachrow(A)]

@testset "fixed source and runtime" begin
    @test VERSION == v"1.12.7"
    @test pkgversion(RcmpsCore) == v"0.2.1"
    dependency = only(info for info in values(Pkg.dependencies()) if info.name == "RcmpsCore")
    @test dependency.git_revision == "175b0aa41c2e4eee7d26f44a33d7d59ea641fbe1"
    @test startswith(realpath(pathof(RcmpsCore)), realpath(dependency.source) * "/")
    records["source"] = (; revision = dependency.git_revision, path = pathof(RcmpsCore), julia = string(VERSION))
end

@testset "native trial-state program and normal-ordering convention" begin
    cd(output) do
        include(joinpath(root, ".agents/skills/rcmps-field-theory/references/native-example.jl"))
    end
    result = JSON3.read(read(joinpath(output, "result.json"), String))
    a, b, g = result.a, result.b, result.coupling
    @test abs(result.energyDensity - (a^2 + b^2 + 4g*a^4)) < 1e-9
    @test abs(result.fieldSquared - 2a^2) < 1e-9
    expected = [sqrt(1+p^2) + 12g*a^2/sqrt(1+p^2) for p in result.momenta]
    @test maximum(abs.([row[1] for row in result.energies] - expected)) < 1e-8
    @test result.transferGap == "infinite"
    @test abs(result.hamiltonianRestEnergy - (1+12g*a^2)) < 1e-8
    records["nativeExample"] = (; result, referenceEnergies = expected)
end

@testset "free vacuum: dispersion and two distinct gaps" begin
    vacuum = State(zeros(1, 1), zeros(1, 1))
    model = ExcitationModel(:phi4, 0.0)
    momenta = [-2.0, -0.5, 0.0, 0.5, 2.0]
    result = dispersion_relation(vacuum, momenta; model)
    reference = sqrt.(1 .+ momenta.^2)
    @test maximum(abs.(result.energies[:, 1] - reference)) < 1e-10
    @test excitation_gap(vacuum; model) ≈ 1.0 atol = 1e-12
    @test mass_gap(vacuum, model) ≈ 1.0 atol = 1e-12
    @test mass_gap(vacuum) == transfer_gap(vacuum) == Inf
    @test maximum(maximum(r.residuals) for r in result.spectra) < 1e-10
    records["freeVacuum"] = (; momenta, reference, actual = result.energies[:, 1],
        transferGap = "infinite", hamiltonianGap = excitation_gap(vacuum; model))
end

@testset "coherent-state moments, vertices and modified mass" begin
    a, b, g, m = 0.23, -0.07, 0.8, 0.7
    s = State(reshape(ComplexF64[a+im*b], 1, 1), zeros(1, 1))
    s.integrator_param.max_point = 30
    s.integrator_param.atol = s.integrator_param.rtol = 1e-12
    moments = [phi_monomial(s, n; gradient = false) for n in 0:4]
    @test maximum(abs.(moments - [(sqrt(2)*a)^n for n in 0:4])) < 1e-9
    vertices = [vertex(s, β; gradient = false) for β in (0.6, 0.6im)]
    @test maximum(abs.(vertices - [exp(β*sqrt(2)*a) for β in (0.6, 0.6im)])) < 1e-9
    # Independent scalar coherent-state evaluation of the normal-ordered Hamiltonian.
    # z is the change of normal-ordering covariance, y the vacuum-energy shift.
    z = -log(m)/(2pi)
    y = (1-m^2+2m^2*log(m))/(8pi)
    expected = a^2 + b^2/m^2 + 4g*a^4 - 12g*z*a^2 + y/m^2 + 3g*z^2
    s.model_param.name = "phi4_m"
    s.model_param.coupling = g
    value = fg_phi4_massmod(s, g, m; gradient = false)
    @test abs(value - expected) < 1e-9
    explicit_model = ExcitationModel(s; massmod = m)
    records["coherent"] = (; a, b, g, massmod = m, moments,
        vertices = [(real = real(v), imaginary = imag(v)) for v in vertices],
        massModifiedReference = expected, massModifiedActual = value, model = string(explicit_model.name))
end

@testset "nontrivial state: independent parameter perturbation and exported steady state" begin
    s = RandomState(2; seed = 20261105, scaling = 0.18)
    s.integrator_param.max_point = 24
    s.integrator_param.atol = s.integrator_param.rtol = 2e-12
    s.model_param.name = "phi4"
    s.model_param.coupling = 0.7
    w = randn(MersenneTwister(2718), ComplexF64, 2, 2)
    w /= norm(w)
    value, gradient = fg_phi4(s, 0.7)
    h = 1e-5
    # Construct the canonical parameter curve explicitly; do not call retraction.
    dK = (im/2)*(w'*s.R-s.R'*w)
    plus = State(s.R+h*w, s.K+h*dK)
    minus = State(s.R-h*w, s.K-h*dK)
    copy_param!(plus, s); copy_param!(minus, s)
    derivative = (fg_phi4(plus, 0.7; gradient = false)-fg_phi4(minus, 0.7; gradient = false))/(2h)
    predicted = metric(s, gradient, w)
    @test isapprox(predicted, derivative; rtol = 3e-5, atol = 2e-7)
    records["nontrivial"] = (; seed = 20261105, R = complex_rows(s.R), K = complex_rows(s.K),
        rho = complex_rows(s.ρ0), energy = value, step = h, derivative, predicted,
        gradientError = abs(predicted-derivative))
end

@testset "optimization trace and separate interacting numerical controls" begin
    s = RandomState(2; seed = 4, scaling = 0.2)
    s.model_param.name = "phi4"
    s.model_param.coupling = 1.0
    initial = fg_phi4(s, 1.0; gradient = false)
    result = optimize_state(s; method = "LBFGS", n_iter = 3, gradtol = 1e-7,
        verbosity = 1, diagnostics = true)
    @test result.energy < initial
    @test isfinite(result.gradient_norm)
    records["optimization"] = (; seed = 4, bondDimension = 2, initial, energy = result.energy,
        gradientNorm = result.gradient_norm, converged = result.converged,
        evaluations = result.evaluations, history = [collect(row) for row in eachrow(result.history)],
        iterationBudget = 3, gradientTolerance = 1e-7,
        stopInterpretation = result.converged ? "gradient tolerance reached" : "iteration budget; not converged")
    # Interacting coherent-state tangent energies have an independent analytic answer.
    a, g, p = 0.2, 0.9, 0.7
    reference = sqrt(1+p^2)+12g*a^2/sqrt(1+p^2)
    configurations = [(30.0, 128, 1e-12), (20.0, 128, 1e-12), (30.0, 64, 1e-12), (30.0, 128, 1e-10)]
    rows = []
    for (window, nodes, tolerance) in configurations
        state = State(reshape(ComplexF64[a], 1, 1), zeros(1, 1))
        state.integrator_param.max_point = window
        state.integrator_param.n_quad = nodes
        state.integrator_param.atol = state.integrator_param.rtol = tolerance
        excitation = excitation_spectrum(state, p; model = ExcitationModel(:phi4, g), kinetic_backend = :ode)
        energy = only(excitation.energies)
        @test abs(energy-reference) < 2e-7
        push!(rows, (; window, nodes, tolerance, energy, reference, error = abs(energy-reference), residuals = excitation.residuals))
    end
    records["interactingConvergence"] = rows
end

@testset "invalid inputs, nonconvergence and storage" begin
    vacuum = State(zeros(1, 1), zeros(1, 1))
    cases = [
        ("non-square", () -> State(zeros(2, 3), zeros(2, 2))),
        ("non-Hermitian K", () -> State(ones(2, 2), [0 1; 0 0])),
        ("nonfinite", () -> State(reshape([NaN], 1, 1), zeros(1, 1))),
        ("nonunique steady state", () -> State(zeros(2, 2), zeros(2, 2))),
        ("invalid model", () -> ExcitationModel(:unknown, 1.0)),
        ("invalid momentum", () -> excitation_spectrum(vacuum, NaN; model = ExcitationModel(:phi4, 0.0))),
        ("nonconvergence", () -> begin
            state = State(reshape([0.3], 1, 1), zeros(1, 1))
            state.integrator_param.maxiters = 1
            vertex(state, 0.4)
        end),
    ]
    failures = []
    for (name, action) in cases
        error = try action(); nothing catch e; e end
        @test error isa Union{ArgumentError, SolverFailure}
        push!(failures, (; name, error = sprint(showerror, error)))
    end
    state = RandomState(2; seed = 123, scaling = 0.2)
    state.model_param.name = "phi4"; state.model_param.coupling = 0.5
    state.info = "OpenQuantum scoped round-trip"
    mktempdir(output) do directory
        target = rcmps_store(state, joinpath(directory, "state.jld2"); verbose = false)
        loaded = rcmps_load(target)
        @test loaded.R == state.R && loaded.K ≈ state.K
        @test loaded.ρ0 ≈ state.ρ0
        @test loaded.model_param.name == state.model_param.name
        @test loaded.model_param.coupling == state.model_param.coupling
        @test loaded.info == state.info
    end
    records["failures"] = failures
    records["storageRoundTrip"] = "passed"
end

records["scientificValidation"] = "not_evaluated"
records["status"] = "passed_scoped_julia_checks; independent NumPy steady-state check is separate"
records["manifestSha256"] = bytes2hex(sha256(read(joinpath(root, ".agents/skills/rcmps-field-theory/Manifest.toml"))))
write(joinpath(output, "rcmps-validation.json"), JSON3.write(records))
