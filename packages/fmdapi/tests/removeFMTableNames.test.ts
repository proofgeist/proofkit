import { describe, expect, it } from "vitest";
import { removeFMTableNames } from "../src";

describe("removeFMTableNames", () => {
  it("strips FM table prefixes from keys and preserves values", () => {
    const input = {
      "Customer::name": "Alice",
      count: 2,
      "X::flag": true,
    } as const;

    const out = removeFMTableNames(input);

    expect(out).toEqual({ name: "Alice", count: 2, flag: true });
    expect("Customer::name" in (out as Record<string, unknown>)).toBe(false);
    expect("name" in out).toBe(true);
    expect(out.name).toBe("Alice");
    expect(out.count).toBe(2);
    expect(out.flag).toBe(true);
  });

  it("produces a type with stripped keys", () => {
    interface Input {
      "Customer::first_name": string;
      last_name: string;
      "Portal::recordId": number;
    }

    const input: Input = {
      "Customer::first_name": "Bob",
      last_name: "Builder",
      "Portal::recordId": 42,
    };
    const out = removeFMTableNames(input);

    // Type-level assertions via assignment
    const first: string = out.first_name;
    const last: string = out.last_name;
    const recId: number = out.recordId;
    expect(first).toBe("Bob");
    expect(last).toBe("Builder");
    expect(recId).toBe(42);

    // Old keys should not exist on the resulting type
    // @ts-expect-error - old FM-prefixed key should not exist on result type
    out["Customer::first_name"];
    // @ts-expect-error - old FM-prefixed key should not exist on result type
    out["Portal::recordId"];
  });
});
