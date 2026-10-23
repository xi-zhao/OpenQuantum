import { nanoid } from 'nanoid';
import type { Slide } from '@openmaic/dsl';
import { canonicalizeLegacyScene, mutateDocument, type AppDocument } from '@/lib/document-store';

/** Uploaded PPTX media must survive closing its importing tab. */
export async function embedPptxMedia(blob: Blob, filename: string): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 32768) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
  }
  const mimeTypes: Record<string, string> = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
    webp: 'image/webp', svg: 'image/svg+xml', mp4: 'video/mp4',
    mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg',
  };
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  return `data:${blob.type || mimeTypes[extension] || 'application/octet-stream'};base64,${btoa(binary)}`;
}

function assertDurableMedia(value: unknown): void {
  if (Array.isArray(value)) value.forEach(assertDurableMedia);
  else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (['src', 'poster', 'href'].includes(key) && typeof item === 'string' && item.startsWith('blob:')) {
        throw new TypeError('PPTX media could not be saved durably.');
      }
      assertDurableMedia(item);
    }
  }
}

/** Commit one aggregate through the original app's ownership and storage boundary. */
export async function savePptxClassroom(slides: Slide[], filename: string, pageTitle: (page: number) => string): Promise<string> {
  if (!slides.length) throw new TypeError('PPTX contains no slides.');
  slides.forEach(assertDurableMedia);
  const stageId = nanoid(), now = Date.now();
  const scenes = slides.map((canvas, index) => {
    const id = nanoid(), notes = canvas.script?.trim();
    return canonicalizeLegacyScene({
      id, stageId, outlineId: `p${index + 1}`, order: index + 1,
      title: pageTitle(index + 1), content: { type: 'slide', canvas },
      actions: notes ? [{ id: `speech-${id}`, type: 'speech', text: notes }] : [],
      createdAt: now, updatedAt: now,
    });
  });
  const document: AppDocument = {
    stage: { id: stageId, name: filename.replace(/^.*[\\/]/, '').replace(/\.pptx$/i, '').trim() || 'PPTX', createdAt: now, updatedAt: now },
    scenes,
    outline: {
      outlines: scenes.map((scene) => ({ id: scene.outlineId!, order: scene.order, title: scene.title, type: 'slide', description: scene.title, keyPoints: [] })),
      generationComplete: true, producer: 'client', createdAt: now, updatedAt: now,
    },
  };
  await mutateDocument(stageId, async (_existing, store) => store.saveDocument(document), {}, { mode: 'replace' });
  return stageId;
}
