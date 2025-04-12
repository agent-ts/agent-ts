import { makeTool, schema } from "@agent-ts/core";
import vm from "node:vm";

export const scriptingTool = makeTool({
  name: "execute_script",
  description:
    "Execute JavaScript code in sandbox without network access, write the result to the global variable 'result', you can write code to get the information you need",
  schema: schema({
      type: "object",
      properties: {
        script: {
          description: "The JavaScript code to execute",
          type: "string",
        },
      },
      required: ["script"],
    }),
    call: async ({ script }) => {
      const context: { result: string | null } = { result: null };
      const sc = new vm.Script(script);
      sc.runInNewContext(context);
      return context.result ?? "No result";
    },
  });

