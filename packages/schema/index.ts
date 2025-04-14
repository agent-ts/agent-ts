import type { Schema } from "./types";

export function schema<T extends Schema>(schema: T): T {
  return schema;
}

export { parse, safeParse } from "./parse";

export type {
  ParseResult,
  ParseError,
  Schema,
  ValueOf,
  StringSchema,
  NumberSchema,
  IntegerSchema,
  BooleanSchema,
  NullSchema,
  ArraySchema,
  ObjectSchema,
} from "./types";
