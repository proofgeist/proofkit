import { fmTableOccurrence, textField, timestampField } from "@proofkit/fmodata";


export const customer = fmTableOccurrence("customer", {
    "PrimaryKey": textField().primaryKey().entityId("FMFID:4296032387").comment("Unique identifier of each record in this table"),
    "CreationTimestamp": timestampField().notNull().entityId("FMFID:8590999683").comment("Date and time each record was created"),
    "CreatedBy": textField().notNull().entityId("FMFID:12885966979").comment("Account name of the user who created each record"),
    "ModificationTimestamp": timestampField().notNull().entityId("FMFID:17180934275").comment("Date and time each record was last modified"),
    "ModifiedBy": textField().notNull().entityId("FMFID:21475901571").comment("Account name of the user who last modified each record"),
    "name": textField().entityId("FMFID:25770868867"),
    "phone": textField().entityId("FMFID:30065836163")
}, {
  entityId: "FMTID:1065091",
  navigationPaths: ["related"]
});
