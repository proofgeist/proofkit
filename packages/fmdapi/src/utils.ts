import type * as z3 from "zod/v3";
import type * as z4 from "zod/v4/core";

type StripFMTableName<K extends PropertyKey> = K extends `${string}::${infer R}`
  ? R
  : K;

type TransformedFields<T extends object> = {
  [K in keyof T as K extends string ? StripFMTableName<K> : K]: T[K];
};

export function removeFMTableNames<T extends object>(
  obj: T,
): TransformedFields<T> {
  const newObj = {} as TransformedFields<T>;
  for (const key in obj) {
    const originalKey = key as keyof T;
    const value = obj[originalKey];
    const mappedKey = (
      typeof key === "string" && key.includes("::") ? key.split("::")[1] : key
    ) as keyof TransformedFields<T>;

    // Use a temporary index signature cast to assign without any
    (newObj as unknown as Record<PropertyKey, unknown>)[
      mappedKey as unknown as PropertyKey
    ] = value as unknown;
  }
  return newObj;
}

export type InferZodPortals<T extends Record<string, any>> = {
  [K in keyof T]: T[K] extends { _def: any; parse: (...args: any[]) => any }
    ? ReturnType<T[K]["parse"]>
    : T[K] extends { _def: any; safeParse: (...args: any[]) => any }
      ? T[K] extends { parse: (...args: any[]) => any }
        ? ReturnType<T[K]["parse"]>
        : any
      : never;
};
