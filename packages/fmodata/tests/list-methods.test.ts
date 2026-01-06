import { describe, it } from "vitest";
import { createMockClient, users } from "./utils/test-setup";

const client = createMockClient();
const db = client.database("test_db");

describe("list methods", () => {
  it("should not run query unless you await the method", async () => {
    const { data: _data, error: _error } = await db
      .from(users)
      .list()
      .select({ CreatedBy: users.CreatedBy, active: users.active })
      .execute();
  });
});
