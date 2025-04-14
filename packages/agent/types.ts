import type { Tool } from "@agent-ts/tool";

export type AgentContext = {
  tools: Record<string, Tool>;
}

export type AgentOutput = {
  type: "complete" | "error" | "continue";
  message: string;
}
