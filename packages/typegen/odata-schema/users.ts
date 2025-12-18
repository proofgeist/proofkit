import { fmTableOccurrence, textField, timestampField } from "@proofkit/fmodata";


export const users = fmTableOccurrence("users", {
    "id": textField().primaryKey().entityId("FMFID:4296032389").comment("Unique identifier of each record in this table"),
    "CreationTimestamp": timestampField().notNull().entityId("FMFID:8590999685").comment("Date and time each record was created"),
    "CreatedBy": textField().notNull().entityId("FMFID:12885966981").comment("Account name of the user who created each record"),
    "ModificationTimestamp": timestampField().notNull().entityId("FMFID:17180934277").comment("Date and time each record was last modified"),
    "ModifiedBy": textField().notNull().entityId("FMFID:21475901573").comment("Account name of the user who last modified each record"),
    "name": textField().entityId("FMFID:25770868869"),
    "id_customer": textField().entityId("FMFID:30065836165")
}, {
  entityId: "FMTID:1065093",
  comment: "A table comment about users",
  navigationPaths: ["contacts", "user_customer"]
});
