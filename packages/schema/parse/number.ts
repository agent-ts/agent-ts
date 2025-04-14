import type { IntegerSchema, NumberSchema, ValueOf } from "../types";
import { ParseError } from "../types";

export function parseNumber<T extends NumberSchema>(
  { enum: enumValues, minimum, maximum }: T,
  path: string,
  input: unknown
): number {
  if (typeof input !== "number") {
    throw new ParseError(`input is not a number: ${input}`, path, input);
  }
  if (enumValues && !enumValues.includes(input)) {
    throw new ParseError(
      `number is not in enum ${JSON.stringify(enumValues)}: ${input}`,
      path,
      input
    );
  }
  if (typeof minimum === "number" && input < minimum) {
    throw new ParseError(
      `number is too small: ${input} < ${minimum}`,
      path,
      input
    );
  }
  if (typeof maximum === "number" && input > maximum) {
    throw new ParseError(
      `number is too large: ${input} > ${maximum}`,
      path,
      input
    );
  }
  return input as ValueOf<T>;
}

export function parseInteger<T extends IntegerSchema>(
  { enum: enumValues, minimum, maximum }: T,
  path: string,
  input: unknown
): number {
  const value = parseNumber(
    { enum: enumValues, minimum, maximum, type: "number" },
    path,
    input
  );
  if (!Number.isInteger(value)) {
    throw new ParseError(`number is not an integer: ${value}`, path, value);
  }
  return value;
}
