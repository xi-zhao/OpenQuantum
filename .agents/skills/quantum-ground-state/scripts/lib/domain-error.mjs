export class GroundStateInputError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "GroundStateInputError";
    this.code = code;
    this.details = details;
  }
}

export function failInput(code, message, details) {
  throw new GroundStateInputError(code, message, details);
}
