export class ContractValidationError extends Error {
  constructor(subject, issues) {
    const normalized = [...new Set(issues.map((issue) => String(issue)))];
    super(`${subject} is invalid:\n- ${normalized.join("\n- ")}`);
    this.name = "ContractValidationError";
    this.subject = subject;
    this.issues = normalized;
  }
}

export function assertValid(subject, issues) {
  if (issues.length > 0) {
    throw new ContractValidationError(subject, issues);
  }
}
