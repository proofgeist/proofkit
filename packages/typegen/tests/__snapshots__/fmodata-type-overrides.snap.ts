import {
  fmTableOccurrence,
  textField,
  numberField,
  dateField,
  timestampField,
  containerField,
  listField,
} from "@proofkit/fmodata";
import { z } from "zod/v4";

export const Customers = fmTableOccurrence(
  "Customers",
  {
    customer_id: textField().primaryKey().entityId("FMFID:100001"),
    first_name: numberField()
      .entityId("FMFID:100002")
      .comment("Customer first name"),
    last_name: dateField().entityId("FMFID:100003"),
    email: timestampField().entityId("FMFID:100004"),
    age: numberField()
      .readValidator(z.coerce.boolean())
      .writeValidator(z.boolean().transform((v) => (v ? 1 : 0)))
      .entityId("FMFID:100005"),
    balance: numberField()
      .readValidator(z.coerce.boolean())
      .writeValidator(z.boolean().transform((v) => (v ? 1 : 0)))
      .entityId("FMFID:100006"),
    is_active: numberField()
      .readValidator(z.coerce.boolean())
      .writeValidator(z.boolean().transform((v) => (v ? 1 : 0)))
      .entityId("FMFID:100007"),
    birth_date: listField().entityId("FMFID:100008"),
    created_at: timestampField().notNull().entityId("FMFID:100009"),
    modified_at: timestampField().entityId("FMFID:100010"),
    full_name: textField().readOnly().entityId("FMFID:100011"),
    notes: containerField().readOnly().entityId("FMFID:100012"),
    photo: containerField().entityId("FMFID:100013"),
  },
  {
    entityId: "FMTID:1000001",
    comment: "Customer records",
    navigationPaths: ["Orders"],
  },
);
