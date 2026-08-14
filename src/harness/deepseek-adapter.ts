import { DeepSeekHarnessAdapterCore } from "./deepseek-adapter-core";
import {
  DeepSeekHarnessTransport,
  type HarnessTransport,
} from "./transport";

import type { HarnessUiSessionId } from "./interface";

export interface DeepSeekHarnessAdapterOptions {
  readonly transport?: HarnessTransport;
  readonly clock?: () => number;
  readonly retryDelay?: (attempt: number) => number;
  /** undefined 选中最近会话；null 明确保持未选择状态。 */
  readonly initialSessionId?: HarnessUiSessionId | null;
}

/** 浏览器生产入口；核心投影实现可注入 HarnessTransport 做合同测试。 */
export class DeepSeekHarnessAdapter extends DeepSeekHarnessAdapterCore {
  constructor(options: DeepSeekHarnessAdapterOptions = {}) {
    super({
      ...options,
      transport: options.transport ?? new DeepSeekHarnessTransport(),
    });
  }
}
