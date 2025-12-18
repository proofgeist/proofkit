import { fmTableOccurrence, textField, timestampField } from "@proofkit/fmodata";


export const contacts = fmTableOccurrence("contacts", {
    "PrimaryKey": textField().primaryKey().entityId("FMFID:4296032390").comment("Unique identifier of each record in this table"),
    "CreationTimestamp": timestampField().notNull().entityId("FMFID:8590999686").comment("Date and time each record was created"),
    "CreatedBy": textField().notNull().entityId("FMFID:12885966982").comment("Account name of the user who created each record"),
    "ModificationTimestamp": timestampField().notNull().entityId("FMFID:17180934278").comment("Date and time each record was last modified"),
    "ModifiedBy": textField().notNull().entityId("FMFID:21475901574").comment("Account name of the user who last modified each record"),
    "name": textField().entityId("FMFID:25770868870"),
    "hobby": textField().entityId("FMFID:30065836166")
}, {
  entityId: "FMTID:1065094",
  navigationPaths: ["users", "other_users"]
});
