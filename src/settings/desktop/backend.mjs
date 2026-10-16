import { createBackend, connectProvider } from "../../../runtime/chatgpt/backend.mjs";
import { nativeAdapter } from "../../../runtime/chatgpt/native-adapter.mjs";

export const createDesktopBackend = options => createBackend({ ...options,
  connect: (provider, root, values, signal) => provider.kind === "native" ? nativeAdapter(provider, root) : connectProvider(provider, root, values, signal, options.nodeExecutable),
});
