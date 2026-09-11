import assert from "node:assert/strict";
import test from "node:test";
import { migrateLearningLibrary, migrateLearningFolders } from "../src/learning/library-migration.mjs";

function fixture() {
  const document = { stage: { id: "course", name: "Edited classroom" }, scenes: [{ narration: "User's edit" }] };
  const documents = new Map(), sessions = new Map(), copied = [], values = new Map();
  let fail = false;
  const input = {
    local: { async listDocuments() { return [{ id: "course" }]; }, async loadDocument() { return document; } },
    remote: { async loadDocument(id) { return documents.get(id); }, async saveDocument(value) { documents.set(value.stage.id, structuredClone(value)); } },
    learner: "learner",
    markers: { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value) },
    localRuntime: {
      async listSessions() { return [{ id: "quiz", stageId: "course", learnerKey: "learner", kind: "quizAttempt", status: "completed", updatedAt: "original-time", runtimeDslVersion: "1" }]; },
      async listRecords() { return [{ id: "answer", sessionId: "quiz", seq: 0, payload: { correct: true } }, { id: "report", sessionId: "quiz", seq: 1, payload: { score: 1 } }]; },
    },
    remoteRuntime: {
      async getSession(id) { return sessions.get(id); },
      async createSession(value) { assert.equal(value.status, "active"); sessions.set(value.id, value); },
      async listRecords() { return copied; },
      async appendRecord(value, options) {
        if (fail && value.id === "report") throw new Error("connection lost");
        assert.equal(options.expectedLastSeq, copied.length ? copied.length - 1 : null);
        assert.equal(Object.hasOwn(value, "seq"), false);
        copied.push({ ...value, seq: copied.length });
      },
      async setSessionStatus(id, status, time, options) {
        assert.equal(options.expectedLastSeq, copied.length ? copied.length - 1 : null);
        Object.assign(sessions.get(id), { status, updatedAt: time });
      },
    },
  };
  return { input, document, documents, sessions, copied, setFailure: (value) => { fail = value; } };
}

test("migration copies edited documents and quiz history without destroying the browser recovery copy", async () => {
  const f = fixture();
  await migrateLearningLibrary(f.input);
  assert.deepEqual(f.documents.get("course"), f.document);
  assert.equal(f.copied[1].payload.score, 1);
  assert.equal(f.sessions.get("quiz").status, "completed");
  assert.equal(f.sessions.get("quiz").updatedAt, "original-time");
  f.documents.delete("course");
  await migrateLearningLibrary(f.input);
  assert.equal(f.documents.has("course"), false, "do not resurrect a course deleted after migration");
  assert.equal(f.document.scenes[0].narration, "User's edit");
});

test("an interrupted copy resumes without replacing a newer document or duplicating learning records", async () => {
  const f = fixture(); f.setFailure(true);
  await assert.rejects(migrateLearningLibrary(f.input), /connection lost/);
  assert.equal(f.copied.length, 1);
  f.documents.get("course").stage.name = "New server edit";
  f.setFailure(false);
  await migrateLearningLibrary(f.input);
  assert.equal(f.documents.get("course").stage.name, "New server edit");
  assert.equal(f.copied.length, 2);
  assert.equal(f.sessions.get("quiz").status, "completed");
});

test("a diverged server history is preserved and rejects automatic replay", async () => {
  const f = fixture(); f.setFailure(true);
  await assert.rejects(migrateLearningLibrary(f.input));
  f.copied[0].id = "new-server-record";
  f.setFailure(false);
  await assert.rejects(migrateLearningLibrary(f.input), /新的学习记录/);
  assert.equal(f.copied.length, 1);
});

test("folder migration retains grouping and the recovery copy without recreating deleted folders", async () => {
  const values = new Map(), folders = [{ id: "old", name: "Quantum", order: 0 }], memberships = [{ stageId: "course", folderId: "old" }];
  const server = [];
  const input = { folders, memberships, markers: { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value) },
    remote: { async list() { return [...server]; }, async create(name) { const folder = { id: "new", name }; server.push(folder); return folder; } },
    async setMembership(id, folderId) { memberships.find((item) => item.stageId === id).folderId = folderId; },
  };
  await migrateLearningFolders(input);
  assert.equal(memberships[0].folderId, "new");
  assert.equal(JSON.parse([...values.values()][0]).memberships[0].folderId, "old");
  assert.equal(folders[0].id, "old");
  server.length = 0;
  await migrateLearningFolders(input);
  assert.equal(server.length, 0);
});

test("an interrupted folder migration preserves a course moved by the user", async () => {
  const values = new Map(), memberships = [{ stageId: "course", folderId: "old" }];
  let fail = true;
  const input = { folders: [{ id: "old", name: "Quantum", order: 0 }], memberships,
    markers: { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value) },
    remote: { async list() { return [{ id: "existing", name: "Quantum" }]; }, async create() { assert.fail("reuse existing folder"); } },
    async setMembership() { if (fail) throw new Error("interrupted"); assert.fail("preserve the user's new grouping"); },
  };
  await assert.rejects(migrateLearningFolders(input), /interrupted/);
  memberships[0].folderId = "other";
  fail = false;
  await migrateLearningFolders(input);
  assert.equal(memberships[0].folderId, "other");
});
