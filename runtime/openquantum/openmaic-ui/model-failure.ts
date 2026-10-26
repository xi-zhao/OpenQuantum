/** Recognize only the gateway's public, fixed copy; never inline provider errors. */
export function modelFailureCopy(detail: string): { summary: `workbench.${string}`; hint: `workbench.${string}` } | undefined {
  if (detail.includes('OpenQuantum 当前模型网络连接失败，请检查网络连接后重试。')) {
    return { summary: 'workbench.system.modelNetworkFailed', hint: 'workbench.system.modelNetworkHint' };
  }
  return undefined;
}
