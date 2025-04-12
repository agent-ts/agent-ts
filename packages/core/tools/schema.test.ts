import { describe, expect, test } from "bun:test";
import { schema, parse, safeParse, ParseError } from "./schema";

describe("parse()", () => {
  test("应该成功解析字符串", () => {
    const stringSchema = schema({ type: "string" });
    expect(parse(stringSchema, "hello")).toBe("hello");
  });

  test("应该成功解析带格式的字符串", () => {
    const emailSchema = schema({ type: "string", format: "email" });
    expect(parse(emailSchema, "test@example.com")).toBe("test@example.com");
  });

  test("应该成功解析数字", () => {
    const numberSchema = schema({ type: "number" });
    expect(parse(numberSchema, 42)).toBe(42);
  });

  test("应该成功解析布尔值", () => {
    const booleanSchema = schema({ type: "boolean" });
    expect(parse(booleanSchema, true)).toBe(true);
  });

  test("应该成功解析数组", () => {
    const arraySchema = schema({
      type: "array",
      items: { type: "string" },
    });
    expect(parse(arraySchema, ["a", "b", "c"])).toEqual(["a", "b", "c"]);
  });

  test("应该成功解析对象", () => {
    const objectSchema = schema({
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
      },
    });
    expect(parse(objectSchema, { name: "John", age: 30 })).toEqual({
      name: "John",
      age: 30,
    });
  });

  test("应该抛出错误当输入类型不匹配", () => {
    const stringSchema = schema({ type: "string" });
    expect(() => parse(stringSchema, 42)).toThrow(ParseError);
  });

  test("应该抛出错误当字符串格式无效", () => {
    const emailSchema = schema({ type: "string", format: "email" });
    expect(() => parse(emailSchema, "invalid-email")).toThrow(ParseError);
  });
});

describe("safeParse()", () => {
  test("应该返回成功结果当解析成功", () => {
    const stringSchema = schema({ type: "string" });
    const result = safeParse(stringSchema, "hello");
    if (!result.success) throw new Error("Expected success");
    expect(result.value).toBe("hello");
  });

  test("应该返回失败结果当解析失败", () => {
    const stringSchema = schema({ type: "string" });
    const result = safeParse(stringSchema, 42);
    if (result.success) throw new Error("Expected failure");
    expect(result.error).toBeInstanceOf(ParseError);
  });

  test("应该正确处理嵌套对象的解析", () => {
    const nestedSchema = schema({
      type: "object",
      properties: {
        user: {
          type: "object",
          properties: {
            name: { type: "string" },
            age: { type: "number" },
          },
        },
      },
    });
    const result = safeParse(nestedSchema, {
      user: { name: "John", age: 30 },
    });
    if (!result.success) throw new Error("Expected success");
    expect(result.value).toEqual({
      user: { name: "John", age: 30 },
    });
  });

  test("应该正确处理数组的解析", () => {
    const arraySchema = schema({
      type: "array",
      items: { type: "number" },
    });
    const result = safeParse(arraySchema, [1, 2, 3]);
    if (!result.success) throw new Error("Expected success");
    expect(result.value).toEqual([1, 2, 3]);
  });
});

describe("parse() 失败场景", () => {
  test("应该抛出错误当字符串长度超出限制", () => {
    const stringSchema = schema({ type: "string", maxLength: 5 });
    expect(() => parse(stringSchema, "hello world")).toThrow(ParseError);
  });

  test("应该抛出错误当字符串长度不足", () => {
    const stringSchema = schema({ type: "string", minLength: 5 });
    expect(() => parse(stringSchema, "hi")).toThrow(ParseError);
  });

  test("应该抛出错误当数字超出范围", () => {
    const numberSchema = schema({ type: "number", minimum: 0, maximum: 100 });
    expect(() => parse(numberSchema, -1)).toThrow(ParseError);
    expect(() => parse(numberSchema, 101)).toThrow(ParseError);
  });

  test("应该抛出错误当整数不是整数", () => {
    const integerSchema = schema({ type: "integer" });
    expect(() => parse(integerSchema, 3.14)).toThrow(ParseError);
  });

  test("应该抛出错误当数组长度超出限制", () => {
    const arraySchema = schema({
      type: "array",
      items: { type: "string" },
      maxItems: 2,
    });
    expect(() => parse(arraySchema, ["a", "b", "c"])).toThrow(ParseError);
  });

  test("应该抛出错误当数组长度不足", () => {
    const arraySchema = schema({
      type: "array",
      items: { type: "string" },
      minItems: 2,
    });
    expect(() => parse(arraySchema, ["a"])).toThrow(ParseError);
  });

  test("应该抛出错误当缺少必需字段", () => {
    const objectSchema = schema({
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
      },
      required: ["name"],
    });
    expect(() => parse(objectSchema, { age: 30 })).toThrow(ParseError);
  });

  test("应该抛出错误当枚举值不匹配", () => {
    const enumSchema = schema({
      type: "string",
      enum: ["red", "green", "blue"],
    });
    expect(() => parse(enumSchema, "yellow")).toThrow(ParseError);
  });

  test("应该抛出错误当日期时间格式无效", () => {
    const dateTimeSchema = schema({
      type: "string",
      format: "date-time",
    });
    expect(() => parse(dateTimeSchema, "invalid-date")).toThrow(ParseError);
  });

  test("应该抛出错误当URI格式无效", () => {
    const uriSchema = schema({
      type: "string",
      format: "uri",
    });
    expect(() => parse(uriSchema, "not-a-uri")).toThrow(ParseError);
  });

  test("应该抛出错误当嵌套对象验证失败", () => {
    const nestedSchema = schema({
      type: "object",
      properties: {
        user: {
          type: "object",
          properties: {
            name: { type: "string", minLength: 3 },
            age: { type: "number", minimum: 0 },
          },
          required: ["name"],
        },
      },
    });
    expect(() =>
      parse(nestedSchema, {
        user: { name: "ab", age: -1 },
      })
    ).toThrow(ParseError);
  });

  test("应该抛出错误当数组元素验证失败", () => {
    const arraySchema = schema({
      type: "array",
      items: { type: "number", minimum: 0 },
    });
    expect(() => parse(arraySchema, [1, -2, 3])).toThrow(ParseError);
  });
});

describe("safeParse() 失败场景", () => {
  test("应该返回失败结果当输入为null", () => {
    const stringSchema = schema({ type: "string" });
    const result = safeParse(stringSchema, null);
    if (result.success) throw new Error("Expected failure");
    expect(result.error).toBeInstanceOf(ParseError);
  });

  test("应该返回失败结果当输入为undefined", () => {
    const stringSchema = schema({ type: "string" });
    const result = safeParse(stringSchema, undefined);
    if (result.success) throw new Error("Expected failure");
    expect(result.error).toBeInstanceOf(ParseError);
  });

  test("应该返回失败结果当输入为空对象", () => {
    const objectSchema = schema({
      type: "object",
      properties: {
        name: { type: "string" },
      },
      required: ["name"],
    });
    const result = safeParse(objectSchema, {});
    if (result.success) throw new Error("Expected failure");
    expect(result.error).toBeInstanceOf(ParseError);
  });

  test("应该返回失败结果当输入为空数组", () => {
    const arraySchema = schema({
      type: "array",
      items: { type: "string" },
      minItems: 1,
    });
    const result = safeParse(arraySchema, []);
    if (result.success) throw new Error("Expected failure");
    expect(result.error).toBeInstanceOf(ParseError);
  });

  test("应该返回失败结果当输入为无效的嵌套结构", () => {
    const nestedSchema = schema({
      type: "object",
      properties: {
        users: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              age: { type: "number" },
            },
            required: ["name"],
          },
        },
      },
    });
    const result = safeParse(nestedSchema, {
      users: [{ age: 30 }, { name: "John", age: "invalid" }],
    });
    if (result.success) throw new Error("Expected failure");
    expect(result.error).toBeInstanceOf(ParseError);
  });
});

describe("null schema 测试", () => {
  test("parse() 应该成功解析 null", () => {
    const nullSchema = schema({ type: "null" });
    expect(parse(nullSchema, null)).toBe(null);
  });

  test("parse() 应该抛出错误当输入不是 null", () => {
    const nullSchema = schema({ type: "null" });
    expect(() => parse(nullSchema, undefined)).toThrow(ParseError);
    expect(() => parse(nullSchema, 0)).toThrow(ParseError);
    expect(() => parse(nullSchema, "")).toThrow(ParseError);
    expect(() => parse(nullSchema, false)).toThrow(ParseError);
    expect(() => parse(nullSchema, {})).toThrow(ParseError);
    expect(() => parse(nullSchema, [])).toThrow(ParseError);
  });

  test("safeParse() 应该成功解析 null", () => {
    const nullSchema = schema({ type: "null" });
    const result = safeParse(nullSchema, null);
    if (!result.success) throw new Error("Expected success");
    expect(result.value).toBe(null);
  });

  test("safeParse() 应该返回失败结果当输入不是 null", () => {
    const nullSchema = schema({ type: "null" });
    const testCases = [undefined, 0, "", false, {}, []];

    for (const input of testCases) {
      const result = safeParse(nullSchema, input);
      if (result.success)
        throw new Error(`Expected failure for input: ${input}`);
      expect(result.error).toBeInstanceOf(ParseError);
    }
  });

  test("应该正确处理数组中的 null schema", () => {
    const arraySchema = schema({
      type: "array",
      items: { type: "null" },
    });

    // 成功情况
    expect(parse(arraySchema, [null, null])).toEqual([null, null]);

    // 失败情况
    expect(() => parse(arraySchema, [null, 0])).toThrow(ParseError);
  });
});
