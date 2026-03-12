# @proofkit/typegen

`@proofkit/typegen` is a tool for generating TypeScript types from FileMaker database schemas, making it easier to work with FileMaker data in modern TypeScript projects.

Run the tool directly from the command line:

```bash
npx @proofkit/typegen@latest
```

Programmatic usage is also available from the root package export:

```ts
import { buildSchema, type BuildSchemaArgs } from "@proofkit/typegen";
import { Project, ScriptKind } from "ts-morph";

const project = new Project();
const file = project.createSourceFile("customer.ts", "", { scriptKind: ScriptKind.TS });

const args: BuildSchemaArgs = {
  schemaName: "customer",
  schema: [{ name: "recordId", type: "string" }],
  type: "ts",
  layoutName: "Customer",
  envNames: {
    server: "FM_SERVER",
    db: "FM_DATABASE",
    auth: { apiKey: "OTTO_API_KEY", username: undefined, password: undefined },
  },
};

buildSchema(file, args);
```

Check out the full documentation at [proofkit.dev](https://proofkit.dev/docs/typegen).
