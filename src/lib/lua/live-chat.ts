import "server-only";

import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

type LuaChatEnvelope = {
  success?: boolean;
  text?: string;
  threadId?: string;
  error?: string | { message?: string; statusCode?: number; error?: string };
  message?: string;
  data?: {
    success?: boolean;
    text?: string;
    error?: string;
  };
  errorDetails?: {
    message: string;
    statusCode?: number;
    error?: string;
  };
};

function readLocalLuaApiKey() {
  if (process.env.LUA_API_KEY) {
    return process.env.LUA_API_KEY;
  }

  const credentialPath = join(homedir(), ".lua-cli", "credentials");

  if (existsSync(credentialPath)) {
    const apiKey = readFileSync(credentialPath, "utf8").trim();

    if (apiKey) {
      return apiKey;
    }
  }

  throw new Error(
    'Lua API key was not found. Configure it with "lua auth configure" or set LUA_API_KEY.',
  );
}

function readErrorMessage(error: LuaChatEnvelope["error"]) {
  if (!error) {
    return undefined;
  }

  return typeof error === "string" ? error : error.message || error.error;
}

function readLuaAgentConfig() {
  const yamlPath = join(process.cwd(), "lua.skill.yaml");

  if (!existsSync(yamlPath)) {
    throw new Error('lua.skill.yaml was not found in the ProcurePilot project root.');
  }

  const yaml = readFileSync(yamlPath, "utf8");
  const agentIdMatch = yaml.match(/^\s*agentId:\s*"?([^"\r\n]+)"?/m);
  const orgIdMatch = yaml.match(/^\s*orgId:\s*"?([^"\r\n]+)"?/m);
  const agentId = agentIdMatch?.[1]?.trim();
  const orgId = orgIdMatch?.[1]?.trim();

  if (!agentId) {
    throw new Error('Lua agentId is missing from lua.skill.yaml. Run "lua init" first.');
  }

  return {
    agentId,
    orgId: orgId ?? "",
  };
}

export function getLiveLuaAgentStatus() {
  const config = readLuaAgentConfig();

  return {
    status: "ok" as const,
    agentId: config.agentId,
    orgId: config.orgId,
    detail: "ProcurePilot is configured to use the live Lua agent chat runtime.",
  };
}

export async function sendLiveLuaAgentMessage(message: string, threadId?: string) {
  const trimmedMessage = message.trim();

  if (!trimmedMessage) {
    throw new Error("Message cannot be empty.");
  }

  const apiKey = readLocalLuaApiKey();
  const { agentId } = readLuaAgentConfig();
  const resolvedThreadId = threadId?.trim() || randomUUID();
  const apiBaseUrl = process.env.LUA_API_URL || "https://api.heylua.ai";

  const response = await fetch(`${apiBaseUrl}/chat/generate/${agentId}?channel=dev`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [
        {
          type: "text",
          text: trimmedMessage,
        },
      ],
      navigate: true,
      skillOverride: [],
      preprocessorOverride: [],
      postprocessorOverride: [],
      threadId: resolvedThreadId,
    }),
    cache: "no-store",
  });

  const payload = (await response.json()) as LuaChatEnvelope;

  if (!response.ok) {
    throw new Error(
      payload.errorDetails?.message ??
        readErrorMessage(payload.error) ??
        `Lua chat request failed with status ${response.status}.`,
    );
  }

  if (payload.text?.trim()) {
    return {
      threadId: payload.threadId?.trim() || resolvedThreadId,
      reply: payload.text.trim(),
    };
  }

  if (payload.success === false) {
    throw new Error(
      payload.errorDetails?.message ??
        readErrorMessage(payload.error) ??
        "Lua chat request was unsuccessful.",
    );
  }

  if (payload.data?.text?.trim()) {
    return {
      threadId: payload.threadId?.trim() || resolvedThreadId,
      reply: payload.data.text.trim(),
    };
  }

  throw new Error(
    payload.data?.error ?? readErrorMessage(payload.error) ?? "Lua agent did not return a chat response.",
  );
}
