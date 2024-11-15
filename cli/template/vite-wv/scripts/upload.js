import open from "open";
import { resolve } from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const currentDirectory = fileURLToPath(new URL(".", import.meta.url));

const { parsed } = dotenv.config({
  path: resolve(currentDirectory, "../.env"),
});

const server = new URL(parsed.FM_SERVER).hostname;
const file = parsed.FM_DATABASE.replace(/\.fmp12$/, "");
const uploadScript = "UploadWebviewerWidget";

const thePath = resolve(currentDirectory, "../dist", "index.html");
const url = `fmp://${server}/${file}?script=${uploadScript}&param=${encodeURIComponent(
  thePath
)}`;

open(url);
