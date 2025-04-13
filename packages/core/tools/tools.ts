import type { OpenAI } from "openai";
import { parse, type Schema, type ValueOf } from "./schema";

export type Tool = {
  definition: OpenAI.ChatCompletionTool;
  call: (parameters: string) => Promise<string>;
};

export type ToolParams<T extends Schema> = {
  name: string;
  description: string;
  schema: T;
  call: (parameters: ValueOf<T>) => Promise<string>;
};

export const makeTool = <T extends Schema>({
  name,
  description,
  schema,
  call,
}: ToolParams<T>): Tool => {
  return {
    definition: {
      type: "function",
      function: {
        name,
        description,
        parameters: schema,
      },
    },
    call: async (paramString: string) => {
      try {
        const paramObj = parse(schema, JSON.parse(paramString));
        return await call(paramObj).then(JSON.stringify);
      } catch (error) {
        return JSON.stringify({
          error,
        });
      }
    },
  };
};

export type InternalTool = {
  definition: OpenAI.ChatCompletionTool;
  call: (
    messages: OpenAI.ChatCompletionMessageParam[],
    id: string,
    parameters: string
  ) => Promise<string>;
};

export function makeInternalTool(tool: Tool): InternalTool {
  return {
    definition: tool.definition,
    call: async (messages, id, parameters) => {
      const result = await tool.call(parameters);
      messages.push({
        role: "tool",
        content: result,
        tool_call_id: id,
      });
      return result;
    },
  };
}
