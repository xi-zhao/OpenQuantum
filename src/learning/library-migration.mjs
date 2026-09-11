/** One-way copy through OpenMAIC's store interfaces. Originals remain intact.
 * A completed marker prevents deleted server courses from being resurrected.
 * A partial runtime copy resumes only after verifying its existing prefix.
 */
export async function migrateLearningLibrary({ local, remote, localRuntime, remoteRuntime, learner, markers }) {
  const key = "openquantum:server-migration:v1";
  const migrated = new Set(JSON.parse(markers.getItem(key) || "[]"));
  for (const item of await local.listDocuments()) {
    if (migrated.has(item.id)) continue;
    const document = await local.loadDocument(item.id);
    if (!document) continue;
    if (!await remote.loadDocument(item.id)) await remote.saveDocument(document);
    for (const session of await localRuntime.listSessions(item.id, learner)) {
      const sessionKey = `${key}:${session.id}`;
      const existing = await remoteRuntime.getSession(session.id);
      if (existing && markers.getItem(sessionKey) !== "copying") continue;
      markers.setItem(sessionKey, "copying");
      if (!existing) {
        const init = { ...session };
        delete init.runtimeDslVersion;
        await remoteRuntime.createSession({ ...init, status: "active" });
      }
      const records = await localRuntime.listRecords(session.id);
      const copied = await remoteRuntime.listRecords(session.id);
      if (copied.length > records.length || copied.some((record, index) => record.id !== records[index].id)) throw new Error("课程已有新的学习记录，旧记录保留在本机，请检查后再迁移。");
      for (let index = copied.length; index < records.length; index++) {
        const init = { ...records[index] };
        delete init.seq;
        await remoteRuntime.appendRecord(init, { expectedLastSeq: index === 0 ? null : index - 1 });
      }
      await remoteRuntime.setSessionStatus(session.id, session.status, session.updatedAt, { expectedLastSeq: records.length ? records.length - 1 : null });
      markers.setItem(sessionKey, "done");
    }
    migrated.add(item.id);
    markers.setItem(key, JSON.stringify([...migrated]));
  }
}

/** Folder names move to the server; upstream memberships remain device-local.
 * Keep a recovery snapshot and resume only memberships that still name the old
 * folder, so an interrupted copy cannot undo subsequent user organization.
 */
export async function migrateLearningFolders({ folders, memberships, remote, setMembership, markers }) {
  const existing = await remote.list();
  for (const folder of [...folders].sort((a, b) => a.order - b.order)) {
    const key = `openquantum:folder-migration:v1:${folder.id}`;
    const saved = JSON.parse(markers.getItem(key) || "null");
    if (saved?.done) continue;
    let destination = saved?.targetId ? existing.find((item) => item.id === saved.targetId)
      : existing.find((item) => item.name.toLowerCase() === folder.name.toLowerCase());
    // A destination deleted after a partial migration must stay deleted.
    if (!destination && saved?.targetId) { markers.setItem(key, JSON.stringify({ ...saved, done: true })); continue; }
    if (!destination) { destination = await remote.create(folder.name); existing.push(destination); }
    const snapshot = saved || structuredClone({ folder, memberships: memberships.filter((item) => item.folderId === folder.id), targetId: destination.id });
    markers.setItem(key, JSON.stringify(snapshot));
    for (const member of snapshot.memberships) {
      if (memberships.find((item) => item.stageId === member.stageId)?.folderId === folder.id) await setMembership(member.stageId, destination.id);
    }
    markers.setItem(key, JSON.stringify({ ...snapshot, done: true }));
  }
}
