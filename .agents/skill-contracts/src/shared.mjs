import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import { parseDocument } from "yaml";

import { ContractValidationError } from "./errors.mjs";

const sourceDirectory = path.dirname(fileURLToPath(import.meta.url));
export const CONTRACT_ROOT = path.resolve(sourceDirectory, "..");
export const SCHEMA_ROOT = path.join(CONTRACT_ROOT, "schemas");

const SECRET_VALUE_PATTERNS = [
  { name: "Authorization header", pattern: /\bauthorization\s*:\s*(?:bearer|basic)\s+\S+/i },
  { name: "Bearer token", pattern: /\bbearer\s+[A-Za-z0-9._~+/=-]{12,}/i },
  { name: "OpenAI-style key", pattern: /\bsk-[A-Za-z0-9_-]{12,}/i },
  { name: "GitHub token", pattern: /\bgh(?:p|o|u|s|r)_[A-Za-z0-9]{20,}/i },
  { name: "AWS access key", pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/ },
  { name: "private key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  {
    name: "credential assignment",
    pattern: /\b(?:api[_-]?key|access[_-]?token|client[_-]?secret|password)\s*[=:]\s*["']?[^\s,"'}]{8,}/i,
  },
];

const SECRET_KEYS = new Set([
  "apikey",
  "authorization",
  "password",
  "privatekey",
  "secret",
  "token",
  "accesstoken",
  "clientsecret",
]);

function normalizeSecretKey(key) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function findSecretViolations(value, location = "$") {
  const issues = [];

  function visit(current, currentLocation) {
    if (typeof current === "string") {
      for (const candidate of SECRET_VALUE_PATTERNS) {
        if (candidate.pattern.test(current)) {
          issues.push(`${currentLocation} contains a probable ${candidate.name}`);
        }
      }
      return;
    }

    if (Array.isArray(current)) {
      current.forEach((item, index) => visit(item, `${currentLocation}[${index}]`));
      return;
    }

    if (current === null || typeof current !== "object") {
      return;
    }

    for (const [key, child] of Object.entries(current)) {
      const childLocation = `${currentLocation}.${key}`;
      if (SECRET_KEYS.has(normalizeSecretKey(key))) {
        issues.push(`${childLocation} is a forbidden credential field`);
      }
      visit(child, childLocation);
    }
  }

  visit(value, location);
  return [...new Set(issues)];
}

function isDateTime(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function createAjv() {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    allowUnionTypes: false,
    validateFormats: true,
  });
  ajv.addFormat("date-time", { type: "string", validate: isDateTime });
  return ajv;
}

export function readJsonFile(filePath) {
  const absolutePath = path.resolve(filePath);
  let source;
  try {
    source = fs.readFileSync(absolutePath, "utf8");
  } catch (error) {
    throw new ContractValidationError(absolutePath, [
      `cannot read file: ${error instanceof Error ? error.message : String(error)}`,
    ]);
  }

  try {
    return { value: JSON.parse(source), source, path: absolutePath };
  } catch (error) {
    throw new ContractValidationError(absolutePath, [
      `invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
    ]);
  }
}

export function readYamlFile(filePath) {
  const absolutePath = path.resolve(filePath);
  let source;
  try {
    source = fs.readFileSync(absolutePath, "utf8");
  } catch (error) {
    throw new ContractValidationError(absolutePath, [
      `cannot read file: ${error instanceof Error ? error.message : String(error)}`,
    ]);
  }

  const document = parseDocument(source, {
    schema: "core",
    strict: true,
    uniqueKeys: true,
    merge: false,
  });

  if (document.errors.length > 0) {
    throw new ContractValidationError(
      absolutePath,
      document.errors.map((error) => `invalid YAML: ${error.message}`),
    );
  }

  let value;
  try {
    value = document.toJS({ maxAliasCount: 50, mapAsMap: false });
  } catch (error) {
    throw new ContractValidationError(absolutePath, [
      `cannot materialize YAML safely: ${error instanceof Error ? error.message : String(error)}`,
    ]);
  }

  return { value, source, path: absolutePath };
}

export function formatAjvErrors(errors = []) {
  return errors.map((error) => {
    const location = error.instancePath.length > 0 ? error.instancePath : "/";
    const detail = error.params?.additionalProperty
      ? ` (${String(error.params.additionalProperty)})`
      : "";
    return `${location} ${error.message ?? "violates schema"}${detail}`;
  });
}

export function compileSchemaFile(schemaPath) {
  const { value: schema } = readJsonFile(schemaPath);
  try {
    const validate = createAjv().compile(schema);
    return { schema, validate, path: path.resolve(schemaPath) };
  } catch (error) {
    throw new ContractValidationError(path.resolve(schemaPath), [
      `JSON Schema does not compile in strict Draft 2020-12 mode: ${
        error instanceof Error ? error.message : String(error)
      }`,
    ]);
  }
}

const compiledContractSchemas = new Map();

export function validateContractSchema(schemaName, value) {
  let compiled = compiledContractSchemas.get(schemaName);
  if (!compiled) {
    compiled = compileSchemaFile(path.join(SCHEMA_ROOT, schemaName));
    compiledContractSchemas.set(schemaName, compiled);
  }
  const valid = compiled.validate(value);
  return valid ? [] : formatAjvErrors(compiled.validate.errors);
}

export function validateJsonWithSchema(value, schemaPath) {
  const compiled = compileSchemaFile(schemaPath);
  const valid = compiled.validate(value);
  return valid ? [] : formatAjvErrors(compiled.validate.errors);
}

export function digestBuffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function digestFile(filePath) {
  return digestBuffer(fs.readFileSync(filePath));
}

export function inspectContainedFile(rootPath, relativePath, label) {
  const issues = [];
  const root = fs.realpathSync(path.resolve(rootPath));

  if (typeof relativePath !== "string" || relativePath.length === 0) {
    return { issues: [`${label} must be a non-empty relative path`] };
  }
  if (relativePath.includes("\0")) {
    return { issues: [`${label} contains a NUL byte`] };
  }
  if (
    path.isAbsolute(relativePath) ||
    path.win32.isAbsolute(relativePath) ||
    /^[A-Za-z][A-Za-z0-9+.-]*:/.test(relativePath)
  ) {
    return { issues: [`${label} must not be absolute or URL-like: ${relativePath}`] };
  }
  if (relativePath.includes("\\")) {
    return { issues: [`${label} must use POSIX separators: ${relativePath}`] };
  }

  const segments = relativePath.split("/");
  if (
    segments.some((segment) => segment === "" || segment === "." || segment === "..") ||
    path.posix.normalize(relativePath) !== relativePath
  ) {
    return { issues: [`${label} must be a normalized path without '.' or '..': ${relativePath}`] };
  }

  const lexicalPath = path.resolve(root, relativePath);
  if (lexicalPath !== root && !lexicalPath.startsWith(`${root}${path.sep}`)) {
    return { issues: [`${label} escapes its root: ${relativePath}`] };
  }

  let realPath;
  try {
    realPath = fs.realpathSync(lexicalPath);
  } catch (error) {
    return {
      issues: [
        `${label} does not resolve to an existing file: ${relativePath} (${
          error instanceof Error ? error.code ?? error.message : String(error)
        })`,
      ],
    };
  }

  if (realPath !== root && !realPath.startsWith(`${root}${path.sep}`)) {
    return { issues: [`${label} resolves outside its root: ${relativePath}`] };
  }

  let stats;
  try {
    stats = fs.statSync(realPath);
  } catch (error) {
    return {
      issues: [
        `${label} cannot be inspected: ${
          error instanceof Error ? error.message : String(error)
        }`,
      ],
    };
  }

  if (!stats.isFile()) {
    issues.push(`${label} must resolve to a regular file: ${relativePath}`);
  }

  return { issues, path: realPath, stats };
}

export function collectDuplicateIssues(items, getKey, label) {
  const seen = new Set();
  const issues = [];
  for (const item of items) {
    const key = getKey(item);
    if (seen.has(key)) {
      issues.push(`duplicate ${label}: ${String(key)}`);
    }
    seen.add(key);
  }
  return issues;
}

export function assertOnlyKeys(value, allowedKeys, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ContractValidationError(label, ["must be an object"]);
  }
  const allowed = new Set(allowedKeys);
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length > 0) {
    throw new ContractValidationError(label, [
      `contains unsupported fields: ${unknown.join(", ")}`,
    ]);
  }
}
