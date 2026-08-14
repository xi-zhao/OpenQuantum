import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { validateReport } from "../validators/validate-report.mjs";

const evalRoot = fileURLToPath(new URL(".", import.meta.url));
const cases = JSON.parse(fs.readFileSync(path.join(evalRoot, "cases.json"), "utf8"));
let failures = 0;

for (const testCase of cases) {
  const report = JSON.parse(
    fs.readFileSync(path.join(evalRoot, testCase.fixture), "utf8"),
  );
  const errors = validateReport(report);
  const valid = errors.length === 0;
  const passed =
    valid === testCase.expectedValid && report.status === testCase.expectedStatus;

  if (passed) {
    console.log(`PASS ${testCase.name}`);
    continue;
  }

  failures += 1;
  console.error(`FAIL ${testCase.name}`);
  console.error(
    `  expected valid=${testCase.expectedValid} status=${testCase.expectedStatus}`,
  );
  console.error(`  received valid=${valid} status=${report.status}`);

  for (const error of errors) {
    console.error(`  ${error}`);
  }
}

if (failures > 0) {
  process.exitCode = 1;
} else {
  console.log(`Validated ${cases.length} platform-diagnostics eval cases.`);
}
