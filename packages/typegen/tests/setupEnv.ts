import dotenv from "dotenv";
import path from "path";

// Load .env.local from the parent directory (packages/typegen) relative to this setup file (packages/typegen/tests)
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

console.log(
  "SetupEnv: Loading .env.local from",
  path.resolve(__dirname, "../.env.local"),
);
console.log(
  "SetupEnv: DIFFERENT_FM_SERVER=",
  process.env.DIFFERENT_FM_SERVER ? "Loaded" : "Not Loaded",
);
console.log(
  "SetupEnv: DIFFERENT_FM_DATABASE=",
  process.env.DIFFERENT_FM_DATABASE ? "Loaded" : "Not Loaded",
);
console.log(
  "SetupEnv: DIFFERENT_OTTO_API_KEY=",
  process.env.DIFFERENT_OTTO_API_KEY ? "Loaded" : "Not Loaded",
);
