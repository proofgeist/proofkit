// Simulate the complete workflow
const originalTemplate =
  "import type { T__hbo__schema.schemaName__hbc__ } from '@/config/schemas/__hbo__schema.sourceName__hbc__/__hbo__schema.schemaName__hbc__';";

console.log("1. Original template (what shadcn CLI sees):");
console.log(originalTemplate);
console.log("");

// Step 1: shadcn CLI processes this - should be valid TypeScript
const isValidForShadcn = !(originalTemplate.includes("{{") || originalTemplate.includes("}}"));
console.log("2. Valid for shadcn CLI?", isValidForShadcn);
console.log("");

// Step 2: Our handlebars processor decodes the tokens
const decodedTemplate = originalTemplate.replace(/__hbo__/g, "{{").replace(/__hbc__/g, "}}");
console.log("3. After handlebars decoding:");
console.log(decodedTemplate);
console.log("");

// Step 3: Handlebars processes with actual data
const mockData = { schema: { schemaName: "User", sourceName: "mydb" } };
const finalResult = decodedTemplate
  .replace(/\{\{schema\.schemaName\}\}/g, mockData.schema.schemaName)
  .replace(/\{\{schema\.sourceName\}\}/g, mockData.schema.sourceName);
console.log("4. Final rendered result:");
console.log(finalResult);
