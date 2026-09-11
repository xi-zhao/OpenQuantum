import { randomUUID } from "node:crypto";
import { link, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { generateClassroom } from "./generation.mjs";

export const LEARNING_LIMITS = Object.freeze({ material: 24_000, topic: 200, goal: 2_000 });
export const LEARNING_LEVELS = Object.freeze(["初级", "中级", "高级"]);
const instances = new Map();

export function requireCourseId(id) {
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new TypeError("课堂编号无效");
  }
  return id;
}

function boundedText(value, key, required = false) {
  if (typeof value !== "string" || value.length > LEARNING_LIMITS[key] || (required && !value.trim())) {
    throw new TypeError(`${key} 内容为空或超过长度限制`);
  }
  return value.trim();
}

export function validateRequirements(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("请填写建课要求");
  if (Object.keys(input).some((key) => !["topic", "level", "goal", "material", "slideCount"].includes(key))) {
    throw new TypeError("建课要求含有不支持的字段");
  }
  if (!LEARNING_LEVELS.includes(input.level)) throw new TypeError("请选择初级、中级或高级");
  if (![2, 4, 6].includes(input.slideCount)) throw new TypeError("讲义页数须为 2、4 或 6");
  return {
    topic: boundedText(input.topic, "topic", true),
    level: input.level,
    goal: boundedText(input.goal ?? "", "goal"),
    material: boundedText(input.material ?? "", "material"),
    slideCount: input.slideCount,
  };
}

function summary(course) {
  return {
    id: course.id, title: course.document?.stage.name ?? course.requirements.topic,
    level: course.requirements.level, createdAt: course.createdAt,
    sessionId: course.sessionId, hasClassroom: Boolean(course.document),
    sceneCount: course.document?.scenes.length ?? 0,
  };
}

/** Owns classroom documents and their session association, never Agent execution state. */
export function createLearningApplication({ directory, generate = generateClassroom }) {
  const active = new Set();
  const file = (id) => path.join(directory, `${requireCourseId(id)}.json`);
  async function read(id) {
    try { return JSON.parse(await readFile(file(id), "utf8")); }
    catch (error) {
      if (error.code === "ENOENT") throw new TypeError("课堂不存在");
      throw error;
    }
  }
  async function save(course, exclusive = false) {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const temporary = `${file(course.id)}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, JSON.stringify(course), { mode: 0o600, flag: "wx" });
      if (exclusive) await link(temporary, file(course.id));
      else await rename(temporary, file(course.id));
    } finally { await rm(temporary, { force: true }); }
  }
  return Object.freeze({
    async dispatch(command) {
      if (!command || typeof command !== "object") throw new TypeError("课堂命令无效");
      if (command.action === "list") {
        let entries;
        try { entries = await readdir(directory); }
        catch (error) { if (error.code === "ENOENT") entries = []; else throw error; }
        const courses = [];
        for (const entry of entries.filter((name) => /^[0-9a-f-]{36}\.json$/i.test(name))) {
          courses.push(summary(await read(entry.slice(0, -5))));
        }
        return { courses: courses.sort((a, b) => b.createdAt.localeCompare(a.createdAt)), limits: LEARNING_LIMITS };
      }
      if (command.action === "create") {
        const requirements = validateRequirements(command.requirements);
        // The browser preallocates a Harness Session identity; retried creation
        // cannot accidentally attach a second session to a paid generation.
        if (typeof command.sessionId !== "string" || !/^session-learning-[0-9a-f-]{36}$/.test(command.sessionId)) {
          throw new TypeError("建课会话编号无效");
        }
        const course = {
          schemaVersion: 1, id: requireCourseId(command.sessionId.slice("session-learning-".length)), requirements,
          sessionId: command.sessionId, createdAt: new Date().toISOString(),
        };
        try { await save(course, true); }
        catch (error) {
          if (error.code !== "EEXIST") throw error;
          const existing = await read(course.id);
          if (JSON.stringify(existing.requirements) !== JSON.stringify(requirements) || existing.sessionId !== course.sessionId) throw new TypeError("此建课编号已关联不同要求");
          return existing;
        }
        return course;
      }
      if (command.action === "get") return read(command.id);
      throw new TypeError("不支持的课堂命令");
    },
    async generate(id, { sessionId, aiCall, signal, model }) {
      requireCourseId(id);
      if (active.has(id)) throw new TypeError("这个课堂正在生成，请查看原会话");
      active.add(id);
      try {
        const course = await read(id);
        if (course.sessionId !== sessionId) throw new TypeError("请在创建课堂的原会话中生成");
        if (course.document) return summary(course);
        signal.throwIfAborted();
        const document = await generate({ id, requirements: course.requirements, aiCall, signal });
        signal.throwIfAborted();
        course.document = document;
        course.provenance = {
          engine: "OpenMAIC", generationVersion: "0.3.6", rendererVersion: "0.1.6", dslVersion: "0.11.1",
          sessionId, model, generatedAt: new Date().toISOString(), reviewStatus: "unreviewed",
          materialOrigin: course.requirements.material ? "user-provided" : "model-knowledge",
        };
        await save(course);
        return summary(course);
      } finally { active.delete(id); }
    },
  });
}

export function learningApplication(projectRoot) {
  const directory = process.env.OPENQUANTUM_LEARNING_DIR
    ? path.resolve(process.env.OPENQUANTUM_LEARNING_DIR)
    : path.join(path.resolve(projectRoot), ".openquantum", "learning", "classrooms");
  if (!instances.has(directory)) instances.set(directory, createLearningApplication({ directory }));
  return instances.get(directory);
}
