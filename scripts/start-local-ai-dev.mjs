import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { join } from "node:path";
import process from "node:process";

const hostName = process.env.HOST_NAME || "127.0.0.1";
const requestedPort = Number(process.env.PORT || "3000");
const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const visionModel = process.env.VISION_MODEL || "qwen2.5vl:7b";
const textModel = process.env.TEXT_MODEL || visionModel;
const ollamaExe = process.env.OLLAMA_EXE || "ollama";
const skipOllama = process.env.SKIP_OLLAMA === "1";

const env = {
  ...process.env,
  AI_PROVIDER: process.env.AI_PROVIDER || "ollama",
  VISION_PROVIDER: "ollama",
  EXERCISE_AI_PROVIDER: "ollama",
  EXERCISE_VISION_PROVIDER: "ollama",
  OLLAMA_BASE_URL: ollamaBaseUrl,
  OLLAMA_MODEL: visionModel,
  VISION_MODEL: visionModel,
  EXERCISE_VISION_OLLAMA_MODEL: process.env.EXERCISE_VISION_OLLAMA_MODEL || visionModel,
  OLLAMA_TEXT_MODEL: process.env.OLLAMA_TEXT_MODEL || textModel,
  EXERCISE_OLLAMA_MODEL: textModel
};

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isOllamaReady() {
  try {
    const response = await fetch(`${ollamaBaseUrl}/api/tags`, {
      signal: AbortSignal.timeout(2000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForOllama() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (await isOllamaReady()) return true;
    await wait(1000);
  }

  return false;
}

function canUsePort(port) {
  return new Promise((resolve) => {
    const server = createServer();

    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, hostName);
  });
}

async function findAvailablePort(startPort) {
  for (let port = startPort; port < startPort + 20; port += 1) {
    if (await canUsePort(port)) return port;
  }

  throw new Error(`No available port found from ${startPort} to ${startPort + 19}.`);
}

let ollamaProcess = null;

if (!skipOllama && !(await isOllamaReady())) {
  console.log(`Starting Ollama at ${ollamaBaseUrl}...`);
  ollamaProcess = spawn(ollamaExe, ["serve"], {
    env,
    stdio: "ignore",
    windowsHide: true
  });

  ollamaProcess.on("error", (error) => {
    console.warn(`Warning: failed to start Ollama with "${ollamaExe} serve": ${error.message}`);
  });

  if (!(await waitForOllama())) {
    console.warn(
      `Warning: Ollama did not respond at ${ollamaBaseUrl}. Next.js will still start, but AI analysis may fail until Ollama is ready.`
    );
  }
}

const nextBin = join("node_modules", "next", "dist", "bin", "next");
const port = await findAvailablePort(requestedPort);
if (port !== requestedPort) {
  console.warn(`Port ${requestedPort} is in use. Starting Heth at the next available port: ${port}`);
}

console.log("Local AI provider: Ollama");
console.log(`Vision model: ${env.OLLAMA_MODEL}`);
console.log(`Exercise text model: ${env.EXERCISE_OLLAMA_MODEL}`);
console.log(`Starting Heth at http://${hostName}:${port}`);

const nextProcess = spawn(process.execPath, [nextBin, "dev", "-H", hostName, "-p", port], {
  env,
  stdio: "inherit",
  windowsHide: true
});

function stopChildren() {
  nextProcess.kill();
  if (ollamaProcess) ollamaProcess.kill();
}

process.on("SIGINT", () => {
  stopChildren();
  process.exit(130);
});

process.on("SIGTERM", () => {
  stopChildren();
  process.exit(143);
});

nextProcess.on("exit", (code, signal) => {
  if (ollamaProcess) ollamaProcess.kill();
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
