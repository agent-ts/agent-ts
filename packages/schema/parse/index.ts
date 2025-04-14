import type { Schema, ValueOf, ParseResult } from "../types";
import { parseAny } from "./collections";
import { ParseError } from "../types";

export function parse<T extends Schema>(schema: T, input: unknown): ValueOf<T> {
  return parseAny(schema, "", input);
}

export function safeParse<T extends Schema>(schema: T, input: unknown): ParseResult<T> {
  try {
    return { success: true, value: parse(schema, input) };
  } catch (e) {
    return { success: false, error: e as ParseError };
  }
}