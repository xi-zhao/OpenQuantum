/** Keep ACP's first handshake behind the configured model adapter's mount.
 * The official ACP bundle can accept stdio while sibling Includes are still
 * loading. This Host readiness service performs no model/network request.
 */
export const inject = ["llm"];

export async function apply(ctx, { provider }) {
  await new Promise((resolve, reject) => {
    let finished = false;
    const finish = (error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      dispose();
      if (error) reject(error); else resolve();
    };
    const check = () => {
      if (ctx.llm.listProviders().some((entry) => entry.id === provider)) finish();
    };
    const dispose = ctx.on("llm/adapters-updated", check);
    const timer = setTimeout(() => finish(new Error("OpenQuantum ACP model adapter did not become ready")), 30_000);
    ctx.effect(() => () => finish(new Error("OpenQuantum ACP startup was disposed")));
    check();
  });
  ctx.provide("openquantumAcpModelReady", { provider });
}
