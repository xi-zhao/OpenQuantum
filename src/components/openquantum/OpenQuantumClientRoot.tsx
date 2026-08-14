"use client";

import { useMemo } from "react";

import { DeepSeekHarnessAdapter } from "@/harness/deepseek-adapter";
import { HarnessSettingsAdapter } from "@/settings/harness-settings-adapter";

import { OpenQuantumApp } from "./OpenQuantumApp";

/** 浏览器运行时的唯一 Composition Root。 */
export function OpenQuantumClientRoot() {
  const port = useMemo(
    () => new DeepSeekHarnessAdapter({ initialSessionId: null }),
    [],
  );
  const settingsPort = useMemo(() => new HarnessSettingsAdapter(), []);

  return <OpenQuantumApp port={port} settingsPort={settingsPort} />;
}
