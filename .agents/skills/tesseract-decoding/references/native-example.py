import json
import numpy as np
import stim
from tesseract_decoder import tesseract
dem = stim.DetectorErrorModel("error(0.13) D0 D1 L0\nerror(0.17) D1 D2 L1")
decoder = tesseract.TesseractConfig(dem=dem, det_beam=50).compile_decoder()
syndrome = np.array([0,1,1], dtype=bool)
flips = decoder.decode(syndrome)
assert np.array_equal(flips, [False, True])
with open("model.dem", "w") as f:
    f.write(str(dem))
with open("result.json", "w") as f:
    json.dump({"syndrome": syndrome.tolist(), "observables": flips.tolist(), "scientificValidation": "not_evaluated"}, f)
