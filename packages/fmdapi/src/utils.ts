type StripFMTableName<K extends PropertyKey> = K extends `${string}::${infer R}` ? R : K;

type TransformedFields<T extends object> = {
  [K in keyof T as K extends string ? StripFMTableName<K> : K]: T[K];
};

export function removeFMTableNames<T extends object>(obj: T): TransformedFields<T> {
  const newObj = {} as TransformedFields<T>;
  for (const key in obj) {
    if (Object.hasOwn(obj, key)) {
      const originalKey = key as keyof T;
      const value = obj[originalKey];
      const mappedKey = (
        typeof key === "string" && key.includes("::") ? key.split("::")[1] : key
      ) as keyof TransformedFields<T>;

      // Use a temporary index signature cast to assign without any
      (newObj as unknown as Record<PropertyKey, unknown>)[mappedKey as unknown as PropertyKey] = value as unknown;
    }
  }
  return newObj;
}

export type InferZodPortals<T extends Record<string, unknown>> = {
  [K in keyof T]: T[K] extends { _def: unknown; parse: (...args: unknown[]) => unknown }
    ? ReturnType<T[K]["parse"]>
    : T[K] extends { _def: unknown; safeParse: (...args: unknown[]) => unknown }
      ? T[K] extends { parse: (...args: unknown[]) => unknown }
        ? ReturnType<T[K]["parse"]>
        : unknown
      : never;
};
