import dotenv from "dotenv";
import path from "path";

// Load .env.local from the parent directory (packages/typegen) relative to this setup file (packages/typegen/tests)
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

console.log(
  "SetupEnv: Loading .env.local from",
  path.resolve(__dirname, "../.env.local"),
);
