import { afterEach, beforeEach, expect, it, vi } from 'vitest';

beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

function browser(embedded: boolean) {
  const frame: Record<string, unknown> = {
    location: { origin: 'http://localhost:3037' },
    matchMedia: () => ({ matches: false }),
  };
  frame.parent = embedded ? {} : frame;
  const root = { setAttribute: vi.fn(), removeAttribute: vi.fn() };
  const startViewTransition = vi.fn((update: () => Promise<void>) => {
    const finished = update();
    return { finished, ready: Promise.resolve(), skipTransition: vi.fn() };
  });
  vi.stubGlobal('window', frame);
  vi.stubGlobal('document', { documentElement: root, startViewTransition });
  return { startViewTransition, root };
}

it.each(['/workspace?session=resume-me', '/'])(
  'embedded navigation to %s bypasses browser snapshots and preserves the full route',
  async (href) => {
    vi.stubEnv('NEXT_PUBLIC_OPENQUANTUM_EMBED', '1');
    const { startViewTransition, root } = browser(true);
    startViewTransition.mockImplementation(() => { throw new Error('snapshot capture must not run'); });
    const push = vi.fn();
    const { startProSwap, isProSwapRunning } = await import('@/lib/workbench/pro-swap');
    startProSwap(href, push);
    expect(push).toHaveBeenCalledExactlyOnceWith(href);
    expect(startViewTransition).not.toHaveBeenCalled();
    expect(root.setAttribute).not.toHaveBeenCalled();
    expect(isProSwapRunning()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  },
);

it.each([
  ['1', false],
  ['0', true],
] as const)('retains upstream animation outside the hosted boundary (%s, %s)', async (flag, inFrame) => {
  vi.stubEnv('NEXT_PUBLIC_OPENQUANTUM_EMBED', flag);
  const { startViewTransition } = browser(inFrame);
  const push = vi.fn();
  const { startProSwap, proSwapArrived } = await import('@/lib/workbench/pro-swap');
  startProSwap('/workspace', push);
  expect(startViewTransition).toHaveBeenCalledOnce();
  expect(push).toHaveBeenCalledExactlyOnceWith('/workspace');
  proSwapArrived('/workspace');
  await Promise.resolve();
});
