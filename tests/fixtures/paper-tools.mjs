// Fixed smoke cases; the policy remains authoritative for Tool names/effects.
export const PAPER_TOOLS = [
  {
    "id": "sqd-chemistry",
    "server": "sqd_local",
    "tool": "run_sqd_chemistry",
    "input": {
      "bondLengthAngstrom": 0.735
    }
  },
  {
    "id": "tjm-dynamics",
    "server": "tjm_local",
    "tool": "simulate_tjm_dynamics",
    "input": {
      "numQubits": 3,
      "steps": 10,
      "trajectories": 32
    }
  },
  {
    "id": "ldpc-decoding",
    "server": "ldpc_local",
    "tool": "decode_ldpc_syndromes",
    "input": {
      "parityCheck": [
        [
          1,
          1,
          0
        ],
        [
          0,
          1,
          1
        ]
      ],
      "syndromes": [
        [
          1,
          0
        ],
        [
          1,
          1
        ]
      ]
    }
  },
  {
    "id": "flow-vqe",
    "server": "flow_vqe_local",
    "tool": "train_flow_vqe",
    "input": {
      "numQubits": 2,
      "terms": [
        {
          "pauli": "ZI",
          "coefficient": -1
        },
        {
          "pauli": "IX",
          "coefficient": -0.5
        }
      ],
      "epochs": 8,
      "batchSize": 8
    }
  },
  {
    "id": "tenpy-ground-state",
    "server": "tenpy_local",
    "tool": "solve_tenpy_chain",
    "input": {
      "numSites": 4,
      "jx": 1,
      "jy": 1,
      "jz": 1
    }
  },
  {
    "id": "randomized-measurements",
    "server": "random_meas_local",
    "tool": "estimate_randomized_purity",
    "input": {
      "numQubits": 3,
      "state": "ghz",
      "subsystem": [
        0
      ],
      "settings": 32,
      "shotsPerSetting": 64
    }
  }
];
