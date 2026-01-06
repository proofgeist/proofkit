import { handle } from "hono/vercel";
import app from "./registry";

export const GET = handle(app);
