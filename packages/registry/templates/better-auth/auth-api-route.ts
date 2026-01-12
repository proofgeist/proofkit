import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/registry/lib/auth";

export const { GET, POST } = toNextJsHandler(auth.handler);
