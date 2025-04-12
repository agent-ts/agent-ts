import { describe, expect, test } from "bun:test";
import { makeTool } from "./tools";
import { schema } from "./schema";

describe("makeTool", () => {
  test("应该正确处理简单的字符串参数", async () => {
    const tool = makeTool({
      name: "echo",
      description: "返回输入字符串",
      schema: schema({ type: "string" }),
      call: async (input) => input,
    });

    const result = await tool.call(JSON.stringify("hello"));
    expect(result).toBe(JSON.stringify("hello"));
  });

  test("应该正确处理对象参数", async () => {
    const tool = makeTool({
      name: "greet",
      description: "生成问候语",
      schema: schema({
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" },
        },
        required: ["name"],
      }),
      call: async (params) =>
        `Hello, ${params.name}! You are ${params.age} years old.`,
    });

    const result = await tool.call(JSON.stringify({ name: "John", age: 30 }));
    expect(result).toBe(JSON.stringify("Hello, John! You are 30 years old."));
  });

  test("应该处理参数验证失败的情况", async () => {
    const tool = makeTool({
      name: "validate",
      description: "验证输入",
      schema: schema({
        type: "object",
        properties: {
          email: { type: "string", format: "email" },
        },
        required: ["email"],
      }),
      call: async (params) => params.email,
    });

    const result = await tool.call(JSON.stringify({ email: "invalid-email" }));
    expect(JSON.parse(result)).toHaveProperty("error");
  });

  test("应该处理异步操作", async () => {
    const tool = makeTool({
      name: "delay",
      description: "延迟返回",
      schema: schema({ type: "number" }),
      call: async (ms) => {
        await new Promise((resolve) => setTimeout(resolve, ms));
        return "done";
      },
    });

    const result = await tool.call(JSON.stringify(100));
    expect(result).toBe(JSON.stringify("done"));
  });

  test("应该处理必需字段缺失的情况", async () => {
    const tool = makeTool({
      name: "required",
      description: "测试必需字段",
      schema: schema({
        type: "object",
        properties: {
          required: { type: "string" },
          optional: { type: "string" },
        },
        required: ["required"],
      }),
      call: async (params) => params.required,
    });

    const result = await tool.call(JSON.stringify({ optional: "value" }));
    expect(JSON.parse(result)).toHaveProperty("error");
  });

  test("应该处理数组参数", async () => {
    const tool = makeTool({
      name: "sum",
      description: "计算数组和",
      schema: schema({
        type: "object",
        properties: {
          numbers: {
            type: "array",
            items: { type: "number" },
          },
        },
        required: ["numbers"],
      }),
      call: async (params) => {
        return params.numbers.reduce((a, b) => a + b, 0).toString();
      },
    });

    const result = await tool.call(
      JSON.stringify({ numbers: [1, 2, 3, 4, 5] })
    );
    expect(result).toBe(JSON.stringify("15"));
  });

  test("应该处理嵌套对象参数", async () => {
    const tool = makeTool({
      name: "nested",
      description: "处理嵌套对象",
      schema: schema({
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              name: { type: "string" },
              address: {
                type: "object",
                properties: {
                  city: { type: "string" },
                  country: { type: "string" },
                },
                required: ["city", "country"],
              },
            },
            required: ["name", "address"],
          },
        },
        required: ["user"],
      }),
      call: async (params) => {
        return `${params.user.name} lives in ${params.user.address.city}, ${params.user.address.country}`;
      },
    });

    const result = await tool.call(
      JSON.stringify({
        user: {
          name: "John",
          address: {
            city: "New York",
            country: "USA",
          },
        },
      })
    );
    expect(result).toBe(JSON.stringify("John lives in New York, USA"));
  });

  test("应该处理工具定义", () => {
    const tool = makeTool({
      name: "test",
      description: "测试工具",
      schema: schema({ type: "string" }),
      call: async () => "",
    });

    expect(tool.definition).toEqual({
      type: "function",
      function: {
        name: "test",
        description: "测试工具",
        parameters: { type: "string" },
      },
    });
  });
});
