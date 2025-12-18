import { fmTableOccurrence, textField, timestampField } from "@proofkit/fmodata";


export const user_customer = fmTableOccurrence("user_customer", {
    "PrimaryKey": textField().primaryKey().entityId("FMFID:4296032392").comment("Unique identifier of each record in this table"),
    "CreationTimestamp": timestampField().notNull().entityId("FMFID:8590999688").comment("Date and time each record was created"),
    "CreatedBy": textField().notNull().entityId("FMFID:12885966984").comment("Account name of the user who created each record"),
    "ModificationTimestamp": timestampField().notNull().entityId("FMFID:17180934280").comment("Date and time each record was last modified"),
    "ModifiedBy": textField().notNull().entityId("FMFID:21475901576").comment("Account name of the user who last modified each record"),
    "name": textField().entityId("FMFID:25770868872"),
    "phone": textField().entityId("FMFID:30065836168")
}, {
  entityId: "FMTID:1065096",
  navigationPaths: ["users"]
});
