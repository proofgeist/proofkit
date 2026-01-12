import {
  fmTableOccurrence,
  textField,
  numberField,
  dateField,
  timestampField,
} from "@proofkit/fmodata";
import { z } from "zod/v4";

export const Orders = fmTableOccurrence(
  "Orders",
  {
    order_id: textField().primaryKey().entityId("FMFID:200001"),
    customer_id: textField().entityId("FMFID:200002"),
    order_date: dateField().entityId("FMFID:200003"),
    total_amount: numberField().entityId("FMFID:200004"),
    status: textField().entityId("FMFID:200005"),
    shipping_date: timestampField().entityId("FMFID:200006"),
    is_paid: numberField()
      .readValidator(z.coerce.boolean())
      .writeValidator(z.boolean().transform((v) => (v ? 1 : 0)))
      .entityId("FMFID:200007"),
    item_count: numberField().readOnly().entityId("FMFID:200008"),
  },
  {
    entityId: "FMTID:1000002",
    navigationPaths: ["Customers", "LineItems"],
  },
);
