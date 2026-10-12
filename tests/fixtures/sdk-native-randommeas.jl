using JSON3, Random, RandomMeas
VERSION == v"1.12.7" || error("Use the locked Julia version")
JSON3.write("runtime-packages.json", Dict("Julia" => string(VERSION),
    "RandomMeas" => string(pkgversion(RandomMeas)), "JSON3" => string(pkgversion(JSON3))))
Random.seed!(173)
models = []
for n in (3, 7)
    sites = siteinds("Qubit", n)
    # User-defined product pattern and local gate, not a preset state selector.
    psi = MPS(sites, [isodd(i) ? "0" : "1" for i in 1:n])
    psi = apply(op("H", sites[1]), psi)
    measurements = MeasurementGroup(psi, 3, 4)
    reduced = reduce_to_subsystem(measurements, [1, n])
    @assert length(reduced.measurements) == 3
    @assert reduced.N == 2 && reduced.NM == 4
    @assert all(size(data.measurement_results) == (4, 2) for data in reduced.measurements)
    @assert length(psi) == n
    push!(models, Dict("sites" => n, "settings" => length(reduced.measurements)))
end
JSON3.write("api-objects.json", Dict("models" => models,
    "operations" => ["custom MPS input and local gate", "native measurement data and subsystem reduction"],
    "scientificValidation" => "not_evaluated"))
open("full-array.bin", "w") do stream
    write(stream, zeros(Float64, 393216))
end
println(JSON3.write(Dict("status" => "completed", "scientificValidation" => "not_evaluated")))
