/** @type {import("@proofgeist/fmdapi/dist/utils/typegen/types.d.ts").GenerateSchemaOptions} */
export const config = {
  clientSuffix: "Layout",
  schemas: [
    {
      layout: "API_Customers",
      schemaName: "Customers",
      valueLists: "allowEmpty",
    },
  ],
  clearOldFiles: true,
  path: "./src/config/schemas/filemaker",
};
