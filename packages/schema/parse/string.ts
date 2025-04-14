import type { StringSchema } from "../types";
import { ParseError } from "../types";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidUri(uri: string): boolean {
  try {
    new URL(uri);
    return true;
  } catch (e) {
    return false;
  }
}

function isValidDateTime(dateTime: string): boolean {
  return !isNaN(new Date(dateTime).getTime());
}

/**
 * Parse a string value according to the schema
 * @param schema - The schema to parse the string value against
 * @param path - The path to the input value
 * @param input - The input value to parse
 * @returns The parsed value
 */
export function parseString<T extends StringSchema>(
  { enum: enumValues, maxLength, minLength, format }: T,
  path: string,
  input: unknown
): string {
  if (typeof input !== "string") {
    throw new ParseError(`input is not a string: ${input}`, path, input);
  }
  if (typeof maxLength === "number" && input.length > maxLength) {
    throw new ParseError(
      `string is too long: ${input.length} > ${maxLength}`,
      path,
      input
    );
  }
  if (typeof minLength === "number" && input.length < minLength) {
    throw new ParseError(
      `string is too short: ${input.length} < ${minLength}`,
      path,
      input
    );
  }
  if (enumValues && !enumValues.includes(input)) {
    throw new ParseError(
      `string is not in enum ${JSON.stringify(enumValues)}: ${input}`,
      path,
      input
    );
  }
  if (format === "email" && !isValidEmail(input)) {
    throw new ParseError(`string is not a valid email: ${input}`, path, input);
  }
  if (format === "uri" && !isValidUri(input)) {
    throw new ParseError(`string is not a valid uri: ${input}`, path, input);
  }
  if (format === "date-time" && !isValidDateTime(input)) {
    throw new ParseError(
      `string is not a valid date-time: ${input}`,
      path,
      input
    );
  }
  return input;
}
