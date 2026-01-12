import { DataApi, OttoAdapter } from "@proofkit/fmdapi";
import { z } from "zod/v4";

const fieldData = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phone: z.string(),
  city: z.string(),
  status: z.enum(["Active", "Inactive"]),
  created_date: z.iso.datetime(),
});

export const CustomersLayout = DataApi({
  adapter: new OttoAdapter({
    auth: { apiKey: "dk_not_a_real_key" },
    db: "Customers.fmp12",
    server: "https://filemaker.example.com",
  }),
  layout: "serverConnection",
  schema: {
    fieldData,
  },
});

export type TCustomer = z.infer<typeof fieldData>;
