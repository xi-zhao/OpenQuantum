using JSON3
VERSION == v"1.12.7" || error("Use Julia 1.12.7 with this committed dependency lock")
using Random, Statistics
original_stdout = stdout
redirect_stdout(stderr)
using RandomMeas
redirect_stdout(original_stdout)

request = JSON3.read(read(stdin, String))
input = request.input
result = redirect_stdout(stderr) do
    # No Julia expressions or external file paths are accepted from the caller.
    Random.seed!(Int(input.seed))
    n = Int(input.numQubits)
    sites = siteinds("Qubit", n)
    zero = MPS(sites, fill("0", n))
    psi = input.state == "product" ? zero : (zero + MPS(sites, fill("1", n))) / sqrt(2)
    group = MeasurementGroup(psi, Int(input.settings), Int(input.shotsPerSetting))
    subsystem = Int.(input.subsystem) .+ 1
    purity = get_purity(group, subsystem)
    reduced = reduce_to_subsystem(group, subsystem)
    per_setting = [get_overlap(data, data; apply_bias_correction=true) for data in reduced.measurements]
    analytic = input.state == "product" || length(subsystem) == n ? 1.0 : 0.5
    Dict("purityEstimate" => purity, "analyticPurity" => analytic,
        "absoluteError" => abs(purity-analytic), "settingStandardError" => std(per_setting)/sqrt(length(per_setting)),
        "settings" => Int(input.settings), "shotsPerSetting" => Int(input.shotsPerSetting),
        "totalShots" => Int(input.settings)*Int(input.shotsPerSetting),
        "subsystemZeroBased" => Int.(input.subsystem), "ensemble" => "independent local Haar unitaries")
end
JSON3.write(stdout, Dict("schemaVersion" => "1.0", "source" => request.source,
    "input" => input, "inputSha256" => request.inputSha256, "dependencyLockSha256" => request.dependencyLockSha256,
    "result" => result, "scientificValidation" => "not_evaluated", "limitations" => [
        "Synthetic measurements of fixed product/GHZ states only; this is not imported laboratory data.",
        "The finite-shot bias-corrected purity estimate can lie outside [0,1]; it is not clipped.",
        "The reported standard error is across independent random settings and is not a rigorous finite-sample confidence bound.",
        "Validated on Julia 1.12.7/macOS; no central scientific acceptance or large-system scaling claim is made."]))
