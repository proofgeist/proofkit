import { handle } from "hono/vercel";
import app from "./registry";

const handler = handle(app);
export {
  handler as GET,
  handler as POST,
  handler as DELETE,
  handler as PUT,
  handler as PATCH,
  handler as OPTIONS,
  handler as HEAD,
};
