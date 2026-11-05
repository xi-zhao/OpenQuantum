using RcmpsCore, JSON3, LinearAlgebra
BLAS.set_num_threads(1)

# Editable trial-state calculation, not an optimized vacuum or a certified spectrum.
a, b, coupling = 0.15, 0.04, 0.5
s = State(reshape(ComplexF64[a + im*b], 1, 1), zeros(1, 1))
s.model_param.name = "phi4"
s.model_param.coupling = coupling
s.integrator_param.max_point = 30
s.integrator_param.atol = 1e-12
s.integrator_param.rtol = 1e-12
model = ExcitationModel(:phi4, coupling)
momenta = [-1.0, 0.0, 1.0]
spectrum = dispersion_relation(s, momenta; model)
gap = transfer_gap(s)
write("result.json", JSON3.write((
    state = "D=1 coherent trial; not optimized", a, b, coupling,
    normalOrderingMass = 1, couplingConvention = "g :phi^4: (no 1/4!)",
    energyDensity = fg_phi4(s, coupling; gradient = false),
    fieldSquared = phi_monomial(s, 2; gradient = false),
    momenta, energies = [collect(row) for row in eachrow(spectrum.energies)],
    transferGap = isfinite(gap) ? gap : "infinite",
    hamiltonianRestEnergy = excitation_gap(s; model),
    residuals = [r.residuals for r in spectrum.spectra],
    upstreamVersion = string(pkgversion(RcmpsCore)),
    scientificValidation = "not_evaluated",
)))
