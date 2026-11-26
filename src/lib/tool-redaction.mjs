// Match against the original text, including overlaps, before inserting any
// placeholders. Sequential replacement can expose a suffix or edit a marker.
export function redactText(original, values, replacement = "[redacted]") {
  let covered;
  for (const value of new Set(values)) {
    if (typeof value !== "string" || !value.length) continue;
    for (let start = original.indexOf(value); start !== -1; start = original.indexOf(value, start + 1)) {
      covered ??= new Uint8Array(original.length);
      covered.fill(1, start, start + value.length);
    }
  }
  if (!covered) return original;
  const pieces = [];
  let cursor = 0;
  for (let index = 0; index < covered.length; index += 1) {
    if (!covered[index]) continue;
    pieces.push(original.slice(cursor, index), replacement);
    while (covered[index + 1]) index += 1;
    cursor = index + 1;
  }
  pieces.push(original.slice(cursor));
  return pieces.join("");
}

// Preserve object/schema keys. Providers often put a second JSON document inside
// content[].text; sanitize that document structurally before encoding it again.
export function redactCredentialValues(value, values) {
  const secrets = [...new Set(values.filter(value => typeof value === "string" && value.length))];
  function visit(item, depth = 0) {
    if (depth > 64) throw new Error("服务返回的数据嵌套过深");
    if (typeof item === "string") {
      if (secrets.includes(item)) return "[redacted]";
      let parsed;
      try { parsed = JSON.parse(item); } catch { /* Plain text, handled below. */ }
      if (parsed !== undefined && parsed !== null && typeof parsed === "object") return JSON.stringify(visit(parsed, depth + 1));
      if (typeof parsed === "string") return JSON.stringify(visit(parsed, depth + 1));
      const patterns = new Set(secrets);
      for (const secret of secrets) {
        let pattern = secret;
        for (;;) {
          const escaped = JSON.stringify(pattern).slice(1, -1);
          if (escaped === pattern || escaped.length > item.length) break;
          patterns.add(escaped);
          pattern = escaped;
        }
      }
      return redactText(item, patterns);
    }
    if (Array.isArray(item)) return item.map(value => visit(value, depth + 1));
    if (item && typeof item === "object") return Object.fromEntries(Object.entries(item).map(([key, value]) => [key, visit(value, depth + 1)]));
    return item;
  }
  return secrets.length ? visit(value) : value;
}

// MCP discriminators are protocol constants, not provider text. Redacting a
// password such as "text" must not invalidate an otherwise valid tool response.
export function redactToolResult(result, values) {
  const clean = redactCredentialValues(result, values);
  if (!values.length) return clean;
  clean.content = result.content.map((block, index) => ({ ...clean.content[index], type: block.type }));
  return clean;
}
