import { Command } from "commander";
import type { EntityType, FieldMetadata, Metadata } from "../../types";
import type { ConnectionOptions } from "../utils/connection";
import { buildConnection } from "../utils/connection";
import { handleCliError } from "../utils/errors";
import { printResult } from "../utils/output";

function isEntityType(value: Metadata[string]): value is EntityType {
  return value.$Kind === "EntityType";
}

function isFieldMetadata(value: unknown): value is FieldMetadata {
  return value !== null && typeof value === "object" && "$Type" in value;
}

function getEntityFieldEntries(entityType: EntityType): [string, FieldMetadata][] {
  return Object.entries(entityType).filter(
    (entry): entry is [string, FieldMetadata] => !entry[0].startsWith("$") && isFieldMetadata(entry[1]),
  );
}

export function makeMetadataCommand(): Command {
  const metadata = new Command("metadata").description("FileMaker OData metadata operations");

  metadata
    .command("get")
    .description("Get OData metadata for the database")
    .option("--format <format>", "Output format: json or xml", "json")
    .option("--table <table>", "Filter metadata to a specific table")
    .action(async (opts, cmd) => {
      const globalOpts = cmd.parent?.parent?.opts() as ConnectionOptions & { pretty: boolean };
      try {
        const { db } = buildConnection(globalOpts);
        let result: unknown;
        if (opts.format === "xml") {
          result = await db.getMetadata({ format: "xml", tableName: opts.table });
        } else {
          result = await db.getMetadata({ format: "json", tableName: opts.table });
        }
        printResult(result, { pretty: globalOpts.pretty ?? false });
      } catch (err) {
        handleCliError(err);
      }
    });

  metadata
    .command("tables")
    .description("List all table names in the database")
    .action(async (_opts, cmd) => {
      const globalOpts = cmd.parent?.parent?.opts() as ConnectionOptions & { pretty: boolean };
      try {
        const { db } = buildConnection(globalOpts);
        const tables = await db.listTableNames();
        printResult(tables, { pretty: globalOpts.pretty ?? false });
      } catch (err) {
        handleCliError(err);
      }
    });

  metadata
    .command("fields")
    .description("List field names for a specific table")
    .requiredOption("--table <table>", "Table name")
    .option("--details", "Include field metadata details", false)
    .action(async (opts, cmd) => {
      const globalOpts = cmd.parent?.parent?.opts() as ConnectionOptions & { pretty: boolean };
      try {
        const { db } = buildConnection(globalOpts);
        const metadataResult = await db.getMetadata({ tableName: opts.table });
        const entityType = Object.values(metadataResult).find(isEntityType);

        if (!entityType) {
          throw new Error(`No entity metadata found for table: ${opts.table}`);
        }

        const fields = getEntityFieldEntries(entityType);

        if (opts.details) {
          const detailedFields = fields.map(([fieldName, fieldMeta]) => {
            const { $Type, $Nullable, ...rest } = fieldMeta;
            return { name: fieldName, type: $Type, nullable: $Nullable, ...rest };
          });
          printResult(detailedFields, { pretty: globalOpts.pretty ?? false });
          return;
        }

        printResult(
          fields.map(([fieldName]) => fieldName),
          { pretty: globalOpts.pretty ?? false },
        );
      } catch (err) {
        handleCliError(err);
      }
    });

  return metadata;
}
