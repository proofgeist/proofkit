import { fmTableOccurrence, textField, numberField, timestampField } from "@proofkit/fmodata";


export const related = fmTableOccurrence("related", {
    "PrimaryKey": textField().primaryKey().entityId("FMFID:4296032386").comment("Unique identifier of each record in this table"),
    "CreationTimestamp": timestampField().notNull().entityId("FMFID:8590999682").comment("Date and time each record was created"),
    "CreatedBy": textField().notNull().entityId("FMFID:12885966978").comment("Account name of the user who created each record"),
    "ModificationTimestamp": timestampField().notNull().entityId("FMFID:17180934274").comment("Date and time each record was last modified"),
    "ModifiedBy": textField().notNull().entityId("FMFID:21475901570").comment("Account name of the user who last modified each record"),
    "related_field": textField().entityId("FMFID:25770868866"),
    "recordId": numberField().readOnly().entityId("FMFID:30065836162")
}, {
  entityId: "FMTID:1065090",
  navigationPaths: ["fmdapi_test", "customer"]
});
