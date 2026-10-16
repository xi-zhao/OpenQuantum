import { serveScienceTool } from "../../../../src/lib/bounded-science-mcp.mjs";
import { definition, definitions } from "./contracts.mjs";
import path from "node:path";
import { preparedPythonLaunch } from "../../../../src/lib/prepared-python.mjs";
await serveScienceTool({ entrypoint: import.meta.url, id: "netqasm-network", definition, definitions,
  launchFor: async ({ skillRoot, id, dependencyLockSha256, tool }) => {
    const prepared = await preparedPythonLaunch({ skillRoot, id, dependencyLockSha256 });
    const simulation = process.env.OPENQUANTUM_NETQASM_SIMULATION_PYTHON;
    if (tool !== "simulate_squidasm_bell_pairs" || !simulation) return prepared;
    if (!path.isAbsolute(simulation)) throw new Error("仿真环境需要绝对 Python 路径");
    return { ...prepared, command: simulation };
  },
});
