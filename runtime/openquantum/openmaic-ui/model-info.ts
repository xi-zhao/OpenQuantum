import type { ModelInfo } from '@/lib/types/provider';

const isHarnessModel = (providerId: string, modelId: string) =>
  providerId === 'custom-openquantum' && modelId === 'harness-default';

/** Server-only metadata, refreshed for each resolution of the current alias. */
export async function resolveOpenQuantumModelInfo(
  providerId: string,
  modelId: string,
  catalog: ModelInfo | null,
): Promise<ModelInfo | null> {
  if (!isHarnessModel(providerId, modelId)) return catalog;
  try {
    const url = process.env.OPENQUANTUM_MODEL_GATEWAY_URL;
    const token = process.env.OPENQUANTUM_MODEL_GATEWAY_TOKEN;
    if (!url || !token) throw new Error('Missing private model gateway');
    const response = await fetch(`${url.replace(/\/$/, '')}/models`, {
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error('Model metadata unavailable');
    const result = await response.json();
    const current = result.data?.find((entry: { id?: string }) => entry.id === modelId);
    if (!current) throw new Error('Missing current model metadata');
    const vision = current.capabilities?.vision;
    return {
      ...catalog,
      id: modelId,
      name: catalog?.name || 'OpenQuantum',
      capabilities: { ...catalog?.capabilities, vision: typeof vision === 'boolean' ? vision : undefined },
    };
  } catch {
    throw new Error('无法读取 OpenQuantum 当前模型能力，请检查模型连接后重试。');
  }
}

/** Do not silently turn image-bearing teaching material into text-only input. */
export function assertOpenQuantumMaterialSupport(
  resolved: { providerId: string; modelId: string; modelInfo: ModelInfo | null },
  body: unknown,
) {
  if (!isHarnessModel(resolved.providerId, resolved.modelId) || !body || typeof body !== 'object') return;
  const { pdfImages } = body as { pdfImages?: unknown };
  if (!Array.isArray(pdfImages) || pdfImages.length === 0) return;
  const vision = resolved.modelInfo?.capabilities?.vision;
  if (vision !== true) throw new Error(vision === false
    ? 'OpenQuantum 当前模型不支持图片输入，请选择支持图片的模型后重试。'
    : '无法确认 OpenQuantum 当前模型支持图片输入，请检查模型能力设置后重试。');
}
