/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataApi, OttoAdapter } from "../src";
import { z } from "zod";
import { config } from "./setup";
import { describe, expect, it } from "vitest";

const ZCustomer = z.object({ name: z.string(), phone: z.string() });
const ZPortalTable = z.object({
  "related::related_field": z.string(),
});

const ZCustomerPortals = z.object({
  PortalTable: ZPortalTable,
});

const client = DataApi({
  adapter: new OttoAdapter({
    auth: config.auth,
    db: config.db,
    server: config.server,
  }),
  layout: "customer",
  schema: { fieldData: ZCustomer },
});
const clientFieldMissing = DataApi({
  adapter: new OttoAdapter({
    auth: config.auth,
    db: config.db,
    server: config.server,
  }),
  layout: "customer_fieldsMissing",
  schema: { fieldData: ZCustomer },
});
const clientPortalData = DataApi({
  adapter: new OttoAdapter({
    auth: config.auth,
    db: config.db,
    server: config.server,
  }),
  layout: "customer",
  schema: { fieldData: ZCustomer, portalData: ZCustomerPortals },
});

describe("zod validation", () => {
  it("should pass validation, allow extra fields", async () => {
    await client.list();
  });
  it("list method: should fail validation when field is missing", async () => {
    await expect(clientFieldMissing.list()).rejects.toBeInstanceOf(Error);
  });
  it("find method: should properly infer from root type", async () => {
    // the following should not error if typed properly
    const resp = await client.find({ query: { name: "test" } });
    const _name = resp.data[0].fieldData.name;
    const _phone = resp.data[0].fieldData.phone;
  });
  it("client with portal data passed as zod type", async () => {
    await clientPortalData
      .list()
      .then(
        (data) =>
          data.data[0].portalData.PortalTable[0]["related::related_field"],
      )
      .catch();
  });
});

describe("zod transformation", () => {
  it("should return JS-native types when in the zod schema", async () => {
    const customClient = DataApi({
      adapter: new OttoAdapter({
        auth: config.auth,
        db: config.db,
        server: config.server,
      }),
      layout: "layout",
      schema: {
        fieldData: z.object({
          booleanField: z.coerce.boolean(),
          CreationTimestamp: z.coerce.date(), // this does not convert the date properly, but does test the transformation
        }),
        portalData: z.object({
          test: z.object({
            "related::related_field": z.string(),
            "related::recordId": z.coerce.string(), // it's actually a number field, this tests the transformation
          }),
        }),
      },
    });
    const data = await customClient.listAll();
    expect(typeof data[0].fieldData.booleanField).toBe("boolean");
    console.log(data[0].fieldData.CreationTimestamp);
    expect(typeof data[0].fieldData.CreationTimestamp).toBe("object");
    const firstPortalRecord = data[0].portalData.test[0];
    console.log("test portal data, first record", firstPortalRecord);
    expect(typeof firstPortalRecord["related::related_field"]).toBe("string");
    expect(typeof firstPortalRecord["related::recordId"]).toBe("string");
    expect(firstPortalRecord.recordId).not.toBeUndefined();
    expect(firstPortalRecord.modId).not.toBeUndefined();
  });
});

it("should properly type limit/offset in portals", async () => {
  await clientPortalData.find({
    query: { name: "test" },
    portalRanges: { PortalTable: { limit: 500, offset: 5 } },
  });
});
