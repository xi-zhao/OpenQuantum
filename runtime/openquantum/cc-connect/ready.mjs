/** Keep ACP's first handshake behind the configured model adapter's mount.
 * The official ACP bundle can accept stdio while sibling Includes are still
 * loading. This Host readiness service performs no model/network request.
 */
export const inject = ["llm", "loader"];

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
  // A top-level model adapter can mount before the nested Tool providers.
  // Wait for this composition only: waiting for the entire Loader would also
  // include ACP itself, which is waiting for the readiness service below.
  let timeout;
  let stopped = false;
  await Promise.race([
    (async () => {
      let entry;
      while (!(entry = [...ctx.loader.entries()].find((candidate) => candidate.options.id === "openquantum-agent-extensions"))?.subtree) {
        if (stopped) return;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      await entry.fiber?.await();
      // Loader propagates apply failures. On 0.1.5, optional credential-bound
      // providers can remain pending without making this composition fail.
      await entry.subtree.await();
    })(),
    new Promise((_, reject) => {
      timeout = setTimeout(() => reject(new Error("OpenQuantum ACP Tool composition did not become ready")), 30_000);
    }),
  ]).finally(() => { stopped = true; clearTimeout(timeout); });
  ctx.provide("openquantumAcpModelReady", { provider });
}
