"use client";

import { useMemo } from "react";

import { DeepSeekHarnessAdapter } from "@/harness/deepseek-adapter";

import { OpenQuantumApp } from "./OpenQuantumApp";

/** 浏览器运行时的唯一 Composition Root。 */
export function OpenQuantumClientRoot() {
  const port = useMemo(
    () => new DeepSeekHarnessAdapter({ initialSessionId: null }),
    [],
  );

  return <OpenQuantumApp port={port} />;
}
