using JosephsonCircuits, JSON3
circuit = [("P1", "1", "0", 1), ("R1", "1", "0", 50.0), ("L1", "1", "2", 2.3e-9), ("C1", "2", "0", 0.7e-12)]
net = JosephsonCircuits.exportnetlist(circuit, Dict())
@assert net.Nnodes >= 2
@assert occursin("R1", net.netlist)
write("netlist.cir", net.netlist)
write("result.json", JSON3.write((nodes=net.Nnodes, model="numeric SI circuit export", scientificValidation="not_evaluated")))
