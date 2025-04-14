import type { ArraySchema, ObjectSchema, Schema, ValueOf } from "../types";
import { ParseError } from "../types";
import { parseString } from "./string";
import { parseNumber } from "./number";
import { parseInteger } from "./number";
import { parseBoolean } from "./boolean";
import { parseNull } from "./null";

export function parseArray<T extends ArraySchema>(
  schema: T,
  path: string,
  input: unknown
): ValueOf<T> {
  if (!Array.isArray(input)) {
    throw new ParseError(`input is not an array: ${input}`, path, input);
  }
  if (schema.minItems && input.length < schema.minItems) {
    throw new ParseError(
      `array is too short: ${input.length} < ${schema.minItems}`,
      path,
      input
    );
  }
  if (schema.maxItems && input.length > schema.maxItems) {
    throw new ParseError(
      `array is too long: ${input.length} > ${schema.maxItems}`,
      path,
      input
    );
  }
  return input.map((item, index) =>
    parseAny(schema.items, `${path}[${index}]`, item)
  ) as ValueOf<T>;
}

export function parseObject<T extends ObjectSchema>(
  schema: T,
  path: string,
  input: unknown
): ValueOf<T> {
  if (typeof input !== "object" || input === null) {
    throw new ParseError(`input is not an object: ${input}`, path, input);
  }
  return Object.entries(schema.properties).reduce((acc, [key, property]) => {
    const value = (input as Record<string, unknown>)[key];
    if (value === undefined) {
      if (schema.required && schema.required.includes(key)) {
        throw new ParseError(
          `required property "${key}" is missing`,
          path,
          input
        );
      }
      if (property.default !== undefined) {
        (acc as any)[key] = property.default;
      }
    } else {
      (acc as any)[key] = parseAny(property, `${path}.${key}`, value);
    }
    return acc;
  }, {} as Record<string, unknown>) as ValueOf<T>;
}

export function parseAny<T extends Schema>(
  schema: T,
  path: string,
  input: unknown
): ValueOf<T> {
  if (schema.type === "string") {
    return parseString(schema, path, input) as ValueOf<T>;
  }
  if (schema.type === "number") {
    return parseNumber(schema, path, input) as ValueOf<T>;
  }
  if (schema.type === "integer") {
    return parseInteger(schema, path, input) as ValueOf<T>;
  }
  if (schema.type === "boolean") {
    return parseBoolean(schema, path, input) as ValueOf<T>;
  }
  if (schema.type === "null") {
    return parseNull(schema, path, input) as ValueOf<T>;
  }
  if (schema.type === "array") {
    return parseArray(schema, path, input) as ValueOf<T>;
  }
  if (schema.type === "object") {
    return parseObject(schema, path, input) as ValueOf<T>;
  }
  throw new ParseError(`Invalid schema ${JSON.stringify(schema)}`, path, input);
}