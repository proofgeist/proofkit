import { type SourceFile, VariableDeclarationKind } from "ts-morph";
import { pragmaComment, varname } from "./constants";
import type { BuildSchemaArgs, TSchema } from "./types";

// Regex to replace Z prefix with T prefix
const REPLACE_Z_PREFIX_REGEX = /^Z/;

export function buildSchema(schemaFile: SourceFile, { type, ...args }: BuildSchemaArgs): void {
  // make sure schema has unique keys, in case a field is on the layout mulitple times
  args.schema.reduce((acc: TSchema[], el) => {
    if (acc.find((o) => o.name === el.name)) {
      return acc;
    }
    acc.push(el);
    return acc;
  }, []);

  // setup
  const { schema, schemaName, portalSchema = [], valueLists = [], strictNumbers = false } = args;

  const hasPortals = portalSchema.length > 0;

  if (type === "zod" || type === "zod/v4" || type === "zod/v3") {
    // Add InferZodPortals import first (if needed) for consistent import order
    if (hasPortals) {
      schemaFile.addImportDeclaration({
        moduleSpecifier: "@proofkit/fmdapi",
        namedImports: ["InferZodPortals"],
        isTypeOnly: true,
      });
    }
    // Map zod/v4 to zod since we're using zod v4
    schemaFile.addImportDeclaration({
      moduleSpecifier: type,
      namedImports: ["z"],
    });

    // Add pragma comments after imports (before building schemas for proper formatting)
    schemaFile.addStatements(pragmaComment);
  }

  // build the portals
  for (const p of portalSchema) {
    if (type === "ts") {
      buildTypeTS(schemaFile, {
        schemaName: p.schemaName,
        schema: p.schema,
        strictNumbers,
      });
    } else {
      buildTypeZod(schemaFile, {
        schemaName: p.schemaName,
        schema: p.schema,
        strictNumbers,
      });
    }
  }

  // build the value lists
  for (const vls of valueLists) {
    if (vls.values.length > 0) {
      if (type === "ts") {
        buildValueListTS(schemaFile, {
          name: vls.name,
          values: vls.values,
        });
      } else {
        buildValueListZod(schemaFile, {
          name: vls.name,
          values: vls.values,
        });
      }
    }
  }

  // build the main schema
  if (type === "ts") {
    buildTypeTS(schemaFile, {
      schemaName,
      schema,
      strictNumbers,
    });
  } else {
    buildTypeZod(schemaFile, {
      schemaName,
      schema,
      strictNumbers,
    });
  }

  // build the final portals object
  if (portalSchema.length > 0) {
    if (type === "ts") {
      schemaFile.addTypeAlias({
        name: `T${varname(schemaName)}Portals`,
        type: (writer) => {
          writer.block(() => {
            for (const p of portalSchema) {
              writer.write(`${p.schemaName}: T${varname(p.schemaName)}`);
            }
          });
        },
        isExported: true,
      });
    } else {
      schemaFile.addVariableStatement({
        isExported: true,
        declarationKind: VariableDeclarationKind.Const,
        declarations: [
          {
            name: `Z${varname(schemaName)}Portals`,
            initializer: (writer) => {
              writer
                .write("{")
                .newLine()
                .indent(() => {
                  for (let i = 0; i < portalSchema.length; i++) {
                    const p = portalSchema[i];
                    if (!p) {
                      continue;
                    }
                    writer
                      .quote(p.schemaName)
                      .write(": ")
                      .write(`Z${varname(p.schemaName)}`);
                    writer.conditionalWrite(i !== portalSchema.length - 1, ",");
                    writer.newLine();
                  }
                })
                .write("}");
            },
          },
        ],
      });
      schemaFile.addTypeAlias({
        name: `T${varname(schemaName)}Portals`,
        type: `InferZodPortals<typeof Z${varname(schemaName)}Portals>`,
        isExported: true,
      });
    }
  }

  // Export the layout name so it can be imported even when generateClient is false
  schemaFile.addVariableStatement({
    isExported: true,
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: "layoutName",
        initializer: (writer) => {
          writer.quote(args.layoutName);
        },
      },
    ],
  });
}

function buildTypeTS(
  schemaFile: SourceFile,
  {
    schemaName,
    schema,
    strictNumbers = false,
  }: {
    schemaName: string;
    schema: TSchema[];
    strictNumbers?: boolean;
  },
) {
  schemaFile.addTypeAlias({
    name: `T${varname(schemaName)}`,
    type: (writer) => {
      writer.inlineBlock(() => {
        for (const field of schema) {
          writer.quote(field.name).write(": ");
          if (field.type === "string") {
            writer.write("string");
          } else if (field.type === "fmnumber") {
            if (strictNumbers) {
              writer.write("number | null");
            } else {
              writer.write("string | number");
            }
          } else if (field.type === "valueList") {
            writer.write(`"${field.values?.join('" | "')}"`);
          } else {
            writer.write("any");
          }
          writer.write(",").newLine();
        }
      });
    },
    isExported: true,
  });
}

function buildValueListTS(
  schemaFile: SourceFile,
  {
    name,
    values,
  }: {
    name: string;
    values: string[];
  },
) {
  schemaFile.addTypeAlias({
    name: `TVL${varname(name)}`,
    type: `"${values.join('" | "')}"`,
    isExported: true,
  });
}

function buildTypeZod(
  schemaFile: SourceFile,
  {
    schemaName,
    schema,
    strictNumbers = false,
  }: {
    schemaName: string;
    schema: TSchema[];
    strictNumbers?: boolean;
  },
) {
  schemaFile.addVariableStatement({
    isExported: true,
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: `Z${varname(schemaName)}`,
        initializer: (writer) => {
          writer
            .write("z.object(")
            .inlineBlock(() => {
              for (const field of schema) {
                writer.quote(field.name).write(": ");
                if (field.type === "string") {
                  writer.write("z.string()");
                } else if (field.type === "fmnumber") {
                  if (strictNumbers) {
                    writer.write("z.coerce.number().nullable().catch(null)");
                  } else {
                    writer.write("z.union([z.string(), z.number()])");
                  }
                } else if (field.type === "valueList") {
                  writer.write("z.enum([");
                  field.values?.map((v, i) =>
                    writer.quote(v).conditionalWrite(i !== (field.values ?? []).length - 1, ", "),
                  );
                  writer.write("])");
                  writer.conditionalWrite(field.values?.includes(""), `.catch("")`);
                } else {
                  writer.write("z.any()");
                }
                writer.write(",").newLine();
              }
            })
            .write(")");
        },
      },
    ],
  });
  schemaFile.addTypeAlias({
    name: `T${varname(schemaName)}`,
    type: `z.infer<typeof Z${varname(schemaName)}>`,
    isExported: true,
  });
}

function buildValueListZod(
  schemaFile: SourceFile,
  {
    name,
    values,
  }: {
    name: string;
    values: string[];
  },
) {
  schemaFile.addVariableStatement({
    isExported: true,
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: `ZVL${varname(name)}`,
        initializer: (writer) => {
          writer.write("z.enum([");
          values.map((v, i) => writer.quote(v).conditionalWrite(i !== values.length - 1, ", "));
          writer.write("])");
        },
      },
    ],
  });
  schemaFile.addTypeAlias({
    name: `TVL${varname(name)}`,
    type: `z.infer<typeof ZVL${varname(name)}>`,
    isExported: true,
  });
}

export function buildOverrideFile(
  overrideFile: SourceFile,
  schemaFile: SourceFile,
  { type, ...args }: BuildSchemaArgs,
) {
  if (type === "zod" || type === "zod/v4" || type === "zod/v3") {
    overrideFile.addImportDeclaration({
      moduleSpecifier: type,
      namedImports: ["z"],
    });
  }

  const { schemaName, portalSchema = [] } = args;

  const namedExportNames = schemaFile
    .getExportSymbols()
    .map((symbol) => symbol.getName())
    .filter((name) => {
      if (type === "zod" || type === "zod/v4" || type === "zod/v3") {
        return name.startsWith("Z");
      }
      return name.startsWith("T");
    })
    .filter((name) => !name.endsWith("Portals"));

  overrideFile.addImportDeclaration({
    moduleSpecifier: `./generated/${args.schemaName}`,
    namedImports: namedExportNames.map((name) => ({
      name,
      alias: `${name}_generated`,
      isTypeOnly: type === "ts",
    })),
  });

  const hasPortals = portalSchema.length > 0;

  if (hasPortals && (type === "zod" || type === "zod/v4" || type === "zod/v3")) {
    overrideFile.addImportDeclaration({
      moduleSpecifier: "@proofkit/fmdapi",
      namedImports: ["InferZodPortals"],
      isTypeOnly: true,
    });
  }

  for (const name of namedExportNames) {
    if (type === "zod" || type === "zod/v4" || type === "zod/v3") {
      overrideFile.addVariableStatement({
        isExported: true,
        declarationKind: VariableDeclarationKind.Const,
        declarations: [
          {
            name,
            initializer: (writer) => {
              writer.write(`${name}_generated`);
            },
          },
        ],
      });

      overrideFile.addTypeAlias({
        name: name.replace(REPLACE_Z_PREFIX_REGEX, "T"),
        type: `z.infer<typeof ${name}>`,
        isExported: true,
      });
    } else if (type === "ts") {
      overrideFile.addTypeAlias({
        name,
        type: `${name}_generated`,
        isExported: true,
      });
    }
  }

  // build the final portals object
  if (hasPortals) {
    if (type === "ts") {
      overrideFile.addTypeAlias({
        name: `T${varname(schemaName)}Portals`,
        type: (writer) => {
          writer.block(() => {
            for (const p of portalSchema) {
              writer.write(`${p.schemaName}: T${varname(p.schemaName)}`);
            }
          });
        },
        isExported: true,
      });
    } else {
      overrideFile.addVariableStatement({
        isExported: true,
        declarationKind: VariableDeclarationKind.Const,
        declarations: [
          {
            name: `Z${varname(schemaName)}Portals`,
            initializer: (writer) => {
              writer
                .write("{")
                .newLine()
                .indent(() => {
                  for (let i = 0; i < portalSchema.length; i++) {
                    const p = portalSchema[i];
                    if (!p) {
                      continue;
                    }
                    writer
                      .quote(p.schemaName)
                      .write(": ")
                      .write(`Z${varname(p.schemaName)}`);
                    writer.conditionalWrite(i !== portalSchema.length - 1, ",");
                    writer.newLine();
                  }
                })
                .write("}");
            },
          },
        ],
      });
      overrideFile.addTypeAlias({
        name: `T${varname(schemaName)}Portals`,
        type: `InferZodPortals<typeof Z${varname(schemaName)}Portals>`,
        isExported: true,
      });
    }
  }
}
