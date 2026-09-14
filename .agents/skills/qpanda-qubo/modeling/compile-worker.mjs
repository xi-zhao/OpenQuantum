import { compileBinaryLinearModel } from "./binary-linear-model.mjs";
try {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const request = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  process.stdout.write(JSON.stringify(compileBinaryLinearModel(request.model, { referenceMode: request.referenceMode })));
} catch (error) {
  process.stderr.write(error.message);
  process.exitCode = 1;
}
