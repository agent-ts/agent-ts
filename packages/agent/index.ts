import type { OpenAI } from "openai";
import { makeTool, type Tool } from "@agent-ts/tool";
import { schema, type Schema, type ValueOf } from "@agent-ts/schema";

const agent = ({
  openAI,
  model,
}: {
  openAI: OpenAI;
  model: string;
}) => {
  const inputSchema = schema({
    type: "object",
    properties: {
      message: {
        type: "string",
      },
    },
    required: ["message"] as const,
  });

  const outputSchema = schema({
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: ["complete", "error", "continue"] as const,
      },
      message: {
        type: "string",
      },
    },
    required: ["type", "message"] as const,
  });

  const agentTool: Tool = makeTool({
    name: "agent",
    description: "Agent",
    inputSchema,
    outputSchema,
    invoke: async (
      parameters: ValueOf<typeof inputSchema>,
      trace: (chunk: string) => void
    ) => {
      const response = await openAI.chat.completions.create({
        model,
        messages: [{ role: "user", content: parameters.message }],
        tools: [agentTool.definition],
      });

      return {
        type: "complete" as const,
        message: response?.choices?.[0]?.message.content ?? "",
      };
    },
  });

  return agentTool;
};

export default agent;
