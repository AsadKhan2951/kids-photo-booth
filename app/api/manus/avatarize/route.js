import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

const MANUS_API_KEY = process.env.MANUS_API_KEY;
const MANUS_BASE_URL = "https://api.manus.ai/v1";
const MANUS_USE_FILEDATA = process.env.MANUS_USE_FILEDATA !== "false";
const DEFAULT_PROMPT =
  "cute baby pixar style avatar face, big eyes, soft skin, 3d cartoon, clean background, helmet friendly";
const DEFAULT_AGENT_PROFILE = process.env.MANUS_AGENT_PROFILE || "manus-1.6";
const DEFAULT_TASK_MODE = "agent";
const TASK_CACHE_TTL_MS = 1000 * 60 * 60;
const taskCache = new Map();

const jsonResponse = (data, status = 200) => NextResponse.json(data, { status });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function parseDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string") return null;
  const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
  if (!match) return null;
  return {
    mime: match[1],
    buffer: Buffer.from(match[2], "base64")
  };
}

function sanitizeError(err) {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  return err.message || "Unknown error";
}

function hashPayload(imageData, prompt) {
  return crypto
    .createHash("sha256")
    .update(prompt || "")
    .update("|")
    .update(imageData || "")
    .digest("hex");
}

function readCache(key) {
  if (!key) return null;
  const entry = taskCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > TASK_CACHE_TTL_MS) {
    taskCache.delete(key);
    return null;
  }
  return entry;
}

function writeCache(key, entry) {
  if (!key) return;
  taskCache.set(key, { ...entry, ts: Date.now() });
}

async function manusFetch(path, options = {}) {
  if (!MANUS_API_KEY) {
    throw new Error("MANUS_API_KEY missing");
  }
  const res = await fetch(`${MANUS_BASE_URL}${path}`, {
    ...options,
    headers: {
      API_KEY: MANUS_API_KEY,
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Manus ${path} failed (${res.status}): ${text.slice(0, 200)}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

async function createFileRecord(filename) {
  return manusFetch("/files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename })
  });
}

async function uploadFile(uploadUrl, buffer, mimeType) {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": mimeType || "application/octet-stream"
    },
    body: buffer
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upload failed (${res.status}): ${text.slice(0, 200)}`);
  }
}

async function createTask({ prompt, fileId, filename }) {
  return manusFetch("/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      agentProfile: DEFAULT_AGENT_PROFILE,
      taskMode: DEFAULT_TASK_MODE,
      attachments: [
        {
          filename,
          file_id: fileId
        }
      ],
      interactiveMode: false
    })
  });
}

async function createTaskWithFileData({ prompt, filename, fileData }) {
  return manusFetch("/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      agentProfile: DEFAULT_AGENT_PROFILE,
      taskMode: DEFAULT_TASK_MODE,
      attachments: [
        {
          filename,
          fileData
        }
      ],
      interactiveMode: false
    })
  });
}

async function getTask(taskId) {
  return manusFetch(`/tasks/${taskId}`);
}

function extractOutputFile(task) {
  const output = task?.output || [];
  let found = null;
  for (const message of output) {
    for (const item of message.content || []) {
      if (item.type === "output_file" && item.fileUrl) {
        found = item;
      }
    }
  }
  return found;
}

async function fetchAvatarDataUrl(fileItem) {
  const res = await fetch(fileItem.fileUrl);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Avatar fetch failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const mimeType = fileItem.mimeType || res.headers.get("content-type") || "image/png";
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

async function waitForTask(taskId, maxMs = 20000) {
  const start = Date.now();
  let delay = 1200;
  while (Date.now() - start < maxMs) {
    const task = await getTask(taskId);
    if (task?.status === "completed" || task?.status === "failed") return task;
    await sleep(delay);
    delay = Math.min(3000, Math.round(delay * 1.4));
  }
  return null;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const imageData = body?.imageData;
    const prompt = body?.prompt || DEFAULT_PROMPT;

    if (!imageData) {
      return jsonResponse({ error: "imageData is required" }, 400);
    }

    const parsed = parseDataUrl(imageData);
    if (!parsed) {
      return jsonResponse({ error: "Invalid imageData format" }, 400);
    }

    const filename = body?.filename || `face-${Date.now()}.png`;
    const cacheKey = hashPayload(imageData, prompt);
    const cached = readCache(cacheKey);
    if (cached?.status === "completed" && cached.avatarDataUrl) {
      return jsonResponse({ status: "completed", taskId: cached.taskId, avatarDataUrl: cached.avatarDataUrl, reused: true });
    }
    if (cached?.taskId && cached.status === "pending") {
      return jsonResponse({ status: "pending", taskId: cached.taskId, reused: true }, 202);
    }

    let task = null;
    if (MANUS_USE_FILEDATA) {
      task = await createTaskWithFileData({ prompt, filename, fileData: imageData });
    } else {
      const fileRecord = await createFileRecord(filename);
      const fileId = fileRecord?.id;
      const uploadUrl = fileRecord?.upload_url;

      if (!fileId || !uploadUrl) {
        return jsonResponse({ error: "Failed to create file record" }, 502);
      }

      await uploadFile(uploadUrl, parsed.buffer, parsed.mime);
      task = await createTask({ prompt, fileId, filename });
    }
    const taskId = task?.task_id || task?.id;

    if (!taskId) {
      return jsonResponse({ error: "Task creation failed" }, 502);
    }
    writeCache(cacheKey, { taskId, status: "pending" });

    const completed = await waitForTask(taskId);
    if (!completed) {
      writeCache(cacheKey, { taskId, status: "pending" });
      return jsonResponse({ status: "pending", taskId }, 202);
    }
    if (completed.status === "failed") {
      writeCache(cacheKey, { taskId, status: "failed" });
      return jsonResponse({ status: "failed", taskId, error: completed.error || "Task failed" }, 500);
    }

    const outputFile = extractOutputFile(completed);
    if (!outputFile) {
      return jsonResponse({ status: "completed", taskId, error: "No output file found" }, 502);
    }
    const avatarDataUrl = await fetchAvatarDataUrl(outputFile);
    writeCache(cacheKey, { taskId, status: "completed", avatarDataUrl });
    return jsonResponse({ status: "completed", taskId, avatarDataUrl });
  } catch (err) {
    return jsonResponse({ error: sanitizeError(err) }, 500);
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");
    if (!taskId) {
      return jsonResponse({ error: "taskId is required" }, 400);
    }

    const task = await getTask(taskId);
    if (!task) {
      return jsonResponse({ status: "pending", taskId }, 202);
    }
    if (task.status === "failed") {
      return jsonResponse({ status: "failed", taskId, error: task.error || "Task failed" }, 500);
    }
    if (task.status !== "completed") {
      return jsonResponse({ status: task.status || "pending", taskId }, 202);
    }

    const outputFile = extractOutputFile(task);
    if (!outputFile) {
      return jsonResponse({ status: "completed", taskId, error: "No output file found" }, 502);
    }
    const avatarDataUrl = await fetchAvatarDataUrl(outputFile);
    return jsonResponse({ status: "completed", taskId, avatarDataUrl });
  } catch (err) {
    return jsonResponse({ error: sanitizeError(err) }, 500);
  }
}
