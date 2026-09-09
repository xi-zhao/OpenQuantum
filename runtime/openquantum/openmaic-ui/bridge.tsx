'use client';

import { loadStageData, saveStageData, listFolders, createFolder, setStageFolder } from '@/lib/utils/stage-storage';
import { db } from '@/lib/utils/database';
import { stageDeletionEpoch } from '@/lib/utils/deleted-stages';
import type { Stage, Scene } from '@/lib/types/stage';
import { BrowserRuntimeStore } from '@openmaic/storage';
import { getDocumentStore } from '@/lib/document-store/store';
import { getRuntimeStore } from '@/lib/runtime/store';
import { getPersistenceLearnerKey } from '@/lib/persistence/bootstrap';
import { APP_RUNTIME_PAYLOAD_VALIDATORS } from '@/lib/runtime/payload-validators';
import { migrateLearningLibrary, migrateLearningFolders } from '@/lib/openquantum-library-migration.mjs';

export const OPENQUANTUM_EMBED = process.env.NEXT_PUBLIC_OPENQUANTUM_EMBED === '1';
const parentOrigin = process.env.NEXT_PUBLIC_OPENQUANTUM_PARENT_ORIGIN || '';
const channel = 'openquantum.openmaic.v1';
const importedKey = 'openquantum:imported-classrooms:v1';
type Course = { id: string; createdAt: string; document: { stage: Partial<Stage>; scenes: Scene[] } };

function request<T>(type: 'library'): Promise<T> {
  if (window.parent === window || !parentOrigin) return Promise.reject(new Error('请从 OpenQuantum 的量子学习通入口打开。'));
  const requestId = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error('历史课程同步暂未完成，请稍后重新打开。')), 30_000);
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
    window.parent.postMessage({ channel, type, requestId }, parentOrigin);
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
async function migrateBrowserLibrary() {
  if (process.env.NEXT_PUBLIC_PERSISTENCE !== '1') return;
  const local = getDocumentStore({ dbName: 'maic-documents' });
  const remote = getDocumentStore();
  const localRuntime = new BrowserRuntimeStore({ dbName: 'maic-runtime', payloadValidators: APP_RUNTIME_PAYLOAD_VALIDATORS });
  const remoteRuntime = getRuntimeStore();
  const learner = await getPersistenceLearnerKey();
  await migrateLearningLibrary({ local, remote, localRuntime, remoteRuntime, learner, markers: localStorage });
  await migrateLearningFolders({
    folders: await db.folders.toArray(), memberships: await db.stageFolders.toArray(),
    remote: { list: listFolders, create: createFolder }, setMembership: setStageFolder, markers: localStorage,
  });
}

export function syncQuantumLibrary() {
  if (!OPENQUANTUM_EMBED || window.parent === window) return Promise.resolve();
  return syncing ??= (async () => {
    await navigator.locks.request('openquantum-library-migration', migrateBrowserLibrary);
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
