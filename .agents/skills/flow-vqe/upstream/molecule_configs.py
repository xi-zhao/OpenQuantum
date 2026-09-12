import numpy as np
 
MOLECULE_CONFIGS = { 
    'H4': {
        'symbols': ['H', 'H', 'H', 'H'],
        'active_electrons': 4,
        'active_orbitals': 4,
        'basis': 'cc-pvdz',
        'get_coordinates': lambda dist: np.array([[0.0, 0.0, 0.0], [dist, 0.0, 0.0], [dist*2, 0.0, 0.0], [dist*3, 0.0, 0.0]])
    },
    'H2O': {
        'symbols': ['O', 'H', 'H'],
        'active_electrons': 6,
        'active_orbitals': 5,
        'basis': 'sto-3g',
        'get_coordinates': lambda dist: (
            lambda angle=104.5: np.array([
                [0.0, 0.0, 0.0],  # O
                [dist * np.sin(np.radians(angle/2)), 0.0, dist * np.cos(np.radians(angle/2))],  # H1
                [-dist * np.sin(np.radians(angle/2)), 0.0, dist * np.cos(np.radians(angle/2))]  # H2
            ])
        )()
    },
    'NH3': {
        'symbols': ['N', 'H', 'H', 'H'],
        'active_electrons': 6,
        'active_orbitals': 6,
        'basis': 'sto-3g',
        'get_coordinates': lambda dist: np.array([
            [0.0, 0.0, dist],          # N atom along z
            [1.0, 0.0, 0.0],        # H1 on x-axis
            [-0.5, np.sqrt(3)/2, 0.0],  # H2 at +y direction
            [-0.5, -np.sqrt(3)/2, 0.0], # H3 at -y direction
            ])
    },

    'C6H6': {
        'symbols': ['C']*6 + ['H']*6,
        'active_electrons': 6,  
        'active_orbitals': 6,   
        'basis': 'sto-3g',
        'get_coordinates': lambda dist: (
            lambda base_coords=np.array([
                [ 1.3970,  0.0000, 0.0000],  # C1
                [ 0.6985,  1.2098, 0.0000],  # C2
                [-0.6985,  1.2098, 0.0000],  # C3
                [-1.3970,  0.0000, 0.0000],  # C4
                [-0.6985, -1.2098, 0.0000],  # C5
                [ 0.6985, -1.2098, 0.0000],  # C6
                [ 2.4810,  0.0000, 0.0000],  # H1
                [ 1.2405,  2.1486, 0.0000],  # H2
                [-1.2405,  2.1486, 0.0000],  # H3
                [-2.4810,  0.0000, 0.0000],  # H4
                [-1.2405, -2.1486, 0.0000],  # H5
                [ 1.2405, -2.1486, 0.0000],  # H6
            ]): (
            np.vstack([
                base_coords[:6],
                np.array([
                    base_coords[6] + (base_coords[6] - base_coords[0]) / np.linalg.norm(base_coords[6] - base_coords[0]) * dist,  # H1 - stretched
                    base_coords[7] + (base_coords[7] - base_coords[1]) / np.linalg.norm(base_coords[7] - base_coords[1]) * 1.084,  # H2 - standard
                    base_coords[8] + (base_coords[8] - base_coords[2]) / np.linalg.norm(base_coords[8] - base_coords[2]) * 1.084,  # H3 - standard
                    base_coords[9] + (base_coords[9] - base_coords[3]) / np.linalg.norm(base_coords[9] - base_coords[3]) * 1.084,  # H4 - standard
                    base_coords[10] + (base_coords[10] - base_coords[4]) / np.linalg.norm(base_coords[10] - base_coords[4]) * 1.084,  # H5 - standard
                    base_coords[11] + (base_coords[11] - base_coords[5]) / np.linalg.norm(base_coords[11] - base_coords[5]) * 1.084,  # H6 - standard
                ])
                ])  # Only H1 is stretched, others use standard C-H bond length of 1.084 Å
                  )
        )()
    },
} 
