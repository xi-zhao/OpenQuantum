'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { loadStageData, saveStageData } from '@/lib/utils/stage-storage';
import { stageDeletionEpoch } from '@/lib/utils/deleted-stages';
import type { Stage, Scene } from '@/lib/types/stage';

export const OPENQUANTUM_EMBED = process.env.NEXT_PUBLIC_OPENQUANTUM_EMBED === '1';
const parentOrigin = process.env.NEXT_PUBLIC_OPENQUANTUM_PARENT_ORIGIN || '';
const channel = 'openquantum.openmaic.v1';
const importedKey = 'openquantum:imported-classrooms:v1';
type Course = { id: string; createdAt: string; document: { stage: Partial<Stage>; scenes: Scene[] } };

function request<T>(type: 'library' | 'generate', payload?: unknown): Promise<T> {
  if (window.parent === window || !parentOrigin) return Promise.reject(new Error('请从 OpenQuantum 的量子学习通入口打开。'));
  const requestId = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error('请求尚未完成，请在 OpenQuantum 查看生成记录。')), type === 'library' ? 30_000 : 16 * 60_000);
    function finish(error?: Error, value?: T) {
      clearTimeout(timer);
      window.removeEventListener('message', receive);
      if (error) reject(error); else resolve(value as T);
    }
    function receive(event: MessageEvent) {
      if (event.source !== window.parent || event.origin !== parentOrigin || event.data?.channel !== channel || event.data.type !== 'response' || event.data.requestId !== requestId) return;
      finish(event.data.error ? new Error(event.data.error) : undefined, event.data.result);
    }
    window.addEventListener('message', receive);
    window.parent.postMessage({ channel, type, requestId, payload }, parentOrigin);
  });
}

async function importCourse(course: Course) {
  if (!course.document?.scenes?.length) throw new Error('课堂内容为空。');
  if (await loadStageData(course.id)) return; // Preserve subsequent edits in OpenMAIC.
  const now = Date.parse(course.createdAt) || Date.now();
  const stage: Stage = { ...course.document.stage, id: course.id, name: course.document.stage.name || '量子课堂', createdAt: now, updatedAt: now };
  const scenes = course.document.scenes.map((scene, order) => ({ ...scene, stageId: course.id, order, createdAt: now, updatedAt: now }));
  const outcome = await saveStageData(course.id, { stage, scenes, currentSceneId: scenes[0].id, chats: [] }, stageDeletionEpoch(course.id));
  if (outcome) throw new Error('课堂没有完整保存，请重新打开后重试。');
}

let syncing: Promise<void> | undefined;
export function syncQuantumLibrary() {
  if (!OPENQUANTUM_EMBED) return Promise.resolve();
  return syncing ??= (async () => {
    const courses = await request<Course[]>('library');
    const imported = new Set<string>(JSON.parse(localStorage.getItem(importedKey) || '[]'));
    for (const course of courses) {
      if (imported.has(course.id)) continue; // Respect deletion from the original course library.
      await importCourse(course);
      imported.add(course.id);
      localStorage.setItem(importedKey, JSON.stringify([...imported]));
    }
  })().finally(() => { syncing = undefined; });
}

export async function generateQuantumCourse(form: { requirement: string; webSearch: boolean; interactiveMode: boolean; courseMaterials: { file: File; name: string }[] }) {
  const texts: string[] = [];
  for (const item of form.courseMaterials) {
    if (!/\.(txt|md)$/i.test(item.name) || item.file.size > 100_000) throw new Error('当前建课入口支持 TXT、Markdown 材料，每份最多 100 KB。');
    texts.push(`${item.name}\n${await item.file.text()}`);
  }
  const material = texts.join('\n\n');
  if (material.length > 24_000) throw new Error('参考材料合计最多 24,000 字。');
  const course = await request<Course>('generate', { requirement: form.requirement, material, webSearch: form.webSearch, interactiveMode: form.interactiveMode });
  await importCourse(course);
  const imported = new Set<string>(JSON.parse(localStorage.getItem(importedKey) || '[]'));
  imported.add(course.id);
  localStorage.setItem(importedKey, JSON.stringify([...imported]));
  return course.id;
}

export function QuantumBridgeNotice() {
  useEffect(() => {
    if (OPENQUANTUM_EMBED && window.parent === window) toast.info('请从 OpenQuantum 的量子学习通入口创建课堂。');
  }, []);
  return null;
}
