import type { OpenAI } from "openai";
import type { Schema, ValueOf } from "@agent-ts/schema";
import { parse, schema } from "@agent-ts/schema";

export type Tool = {
  definition: OpenAI.ChatCompletionTool;
  invoke: (paramString: string, trace: (chunk: string) => void) => Promise<string>;
};

export type ToolParams<I extends Schema, O extends Schema> = {
  name: string;
  description: string;
  inputSchema: I;
  outputSchema: O;
  invoke: (parameters: ValueOf<I>, trace: (chunk: string) => void) => Promise<ValueOf<O>>;
};

export const makeTool = <I extends Schema, O extends Schema>({
  name,
  description,
  inputSchema,
  outputSchema,
  invoke,
}: ToolParams<I, O>): Tool => {
  return {
    definition: {
      type: "function",
      function: {
        name,
        description,
        parameters: inputSchema,
      },
    },
    invoke: async (paramString: string, trace: (chunk: string) => void) => {
      try {
        const paramObj = parse(inputSchema, JSON.parse(paramString));
        const result = await invoke(paramObj, trace);
        return JSON.stringify(result);
      } catch (error) {
        return JSON.stringify({ error });
      }
    },
  };
};
