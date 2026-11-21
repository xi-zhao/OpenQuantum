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
      let text = item;
      for (const secret of secrets) {
        const patterns = [secret];
        for (;;) {
          const escaped = JSON.stringify(patterns.at(-1)).slice(1, -1);
          if (escaped === patterns.at(-1) || escaped.length > item.length) break;
          patterns.push(escaped);
        }
        for (const pattern of patterns.reverse()) text = text.replaceAll(pattern, "[redacted]");
      }
      return text;
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
