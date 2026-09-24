// Operator-selected subsets of existing Tools. Harness still owns registration,
// discovery, dispatch, approvals and scope disposal; this plugin registers no Tool.
const words = text => text.trim().split(/\s+/);
const gymCommon = words(`list_environments_tool get_environment_info_tool
  create_coupling_map_tool extract_subtopologies_tool list_subtopology_shapes_tool
  get_fake_backend_coupling_map_tool list_available_fake_backends_tool
  generate_random_permutation_tool generate_random_linear_function_tool generate_random_clifford_tool
  list_saved_models_tool list_loaded_models_tool get_model_info_tool`);
const hardwareDevices = words(`list_devices get_device_details best_qubits compare_devices queue_status
  device_history device_profile device_on_date ionq_devices get_alerts check_chip_identity`);
const hardwareJobs = [...hardwareDevices, ...words(`submit_job job_status job_results cancel_job list_jobs
  circuit_report debug_circuit ionq_submit_job ionq_job_status ionq_job_results estimate_ionq_gates
  estimate_ionq_cost start_repro_experiment repro_score job_analytics estimate_runtime route_job
  check_routing_overhead estimate_hardware_gates recommend_error_mitigation estimate_circuit_error_ceiling`)];
const flagCommon = words(`analyze_circuit_tool serialize_circuit_tool deserialize_circuit_tool
  describe_gate_set_tool inspect_parameters_tool bind_parameters_tool describe_layers_tool
  describe_topology_tool draw_circuit_tool plan_execution_tool`);

export const profiles = {
  qiskit_gym: {
    training: [...gymCommon, ...words(`create_permutation_env_tool create_linear_function_env_tool
      create_clifford_env_tool delete_environment_tool start_training_tool batch_train_environments_tool
      get_training_status_tool get_training_metrics_tool wait_for_training_tool stop_training_tool
      list_training_sessions_tool list_tensorboard_experiments_tool get_tensorboard_metrics_tool
      start_tensorboard_tool stop_tensorboard_tool get_tensorboard_status_tool save_model_tool
      load_model_tool delete_model_tool`)],
    synthesis: [...gymCommon, ...words(`load_model_tool synthesize_permutation_tool
      synthesize_linear_function_tool synthesize_clifford_tool`)],
    // The preferred QASM/QPY conversion provider is Qiskit. Keep the original
    // Gym converters selectable for existing workflows, including full mode.
    conversion: words(`convert_qpy_to_qasm3_tool convert_qasm3_to_qpy_tool`),
  },
  quantum_hardware: {
    devices: hardwareDevices,
    jobs: hardwareJobs,
    chemistry: [...hardwareJobs, ...words(`run_vqe estimate_expectation analyze_molecule
      plan_quantum_chemistry_run build_forged_circuits run_forged_energy collect_forged_energy`)],
    search: [...hardwareJobs, ...words(`run_grover encode_search_problem get_amplification
      discover_collision_candidates encode_collision_problem run_search_experiment encode_4way_collision
      equality_oracle_search find_collision_candidates sieve_singmaster_space run_parallel_collision_search`)],
    verification: [...hardwareJobs, ...words(`certify_ising_gate_optimality verify_stabilizer_circuit
      verify_stabilizer_hardware_result`)],
  },
  flagquantum: {
    compile: [...flagCommon, ...words(`optimize_circuit_tool route_circuit_tool compare_topologies_tool
      emit_openqasm_tool emit_qcis_tool`)],
    simulate: [...flagCommon, "simulate_circuit_tool"],
    train: [...flagCommon, "simulate_circuit_tool", "train_parameters_tool"],
  },
};

export const name = "openquantum-optional-tool-profiles";
export const inject = ["tools"];

export function apply(ctx, config = {}) {
  const selections = new Map();
  for (const [server, choices] of Object.entries(profiles)) {
    const selected = config[server] ?? "full";
    if (selected === "full") continue;
    if (!Object.hasOwn(choices, selected)) throw new Error(`${server}: unknown Tool profile ${selected}; use full or ${Object.keys(choices).join(", ")}`);
    selections.set(`mcp__${server}__`, new Set(choices[selected].map(tool => `mcp__${server}__${tool}`)));
  }
  if (!selections.size) return;
  const masks = new Map();
  let refreshing = false;
  const refresh = () => {
    // Register/unregister and restrictions both emit tools/change. A synchronous
    // guard prevents our own scope updates from recursively refreshing.
    if (refreshing) return;
    refreshing = true;
    try {
      for (const [agent, dispose] of masks) {
        dispose?.();
        const deny = ctx.tools.schemas(agent).map(tool => tool.name).filter(tool =>
          [...selections].some(([prefix, allowed]) => tool.startsWith(prefix) && !allowed.has(tool)));
        masks.set(agent, deny.length ? agent.ctx.tools.restrict({ deny }) : undefined);
      }
    } finally { refreshing = false; }
  };
  ctx.on("agent/created", ({ agent }) => { masks.set(agent, undefined); refresh(); });
  // Prompt assembly precedes agent/pre-step. Restrict at agent creation and at
  // registry changes so even the first model request and reconnects see the mask.
  ctx.on("tools/change", refresh);
  ctx.on("agent/disposed", ({ agent }) => {
    const dispose = masks.get(agent); masks.delete(agent); dispose?.();
  });
  ctx.effect(() => () => {
    const disposers = [...masks.values()]; masks.clear();
    for (const dispose of disposers) dispose?.();
  });
}
