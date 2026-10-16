import { FileSystemSkillProvider } from "@deepseek-ai/dsh-skill-filesystem";

export const name = "openquantum-additional-skills";
export const inject = ["skills", "openquantumCapabilities"];

// Keep the original roots, watcher and file loading for user-authored Skills.
// The task-aware provider owns bundled names, including explicit prohibitions.
export function apply(ctx, config) {
  const managed = new Set(ctx.openquantumCapabilities.application.settings.backend.sourceCapabilities.map(item => item.id));
  let provider;
  ctx.skills.registerProvider(control => {
    provider = new FileSystemSkillProvider(ctx, control, config);
    return { name: provider.name,
      async list(options) {
        const observation = await provider.list(options);
        const filter = candidates => candidates.filter(item => !managed.has(item.name));
        return Array.isArray(observation) ? filter(observation) : { ...observation, candidates: filter(observation.candidates) };
      },
      get: (...args) => provider.get(...args),
    };
  });
  ctx.on("fs/observed", (target, _observation, actor) => {
    if (actor?.name === "write" || actor?.name === "edit") provider.observeHostMutation(target.displayPath);
  });
  ctx.effect(() => () => provider.dispose());
}
