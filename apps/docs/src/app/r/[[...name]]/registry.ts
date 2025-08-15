import { Hono } from "hono";

import {
  getComponentMeta,
  getRegistryIndex,
  getStaticComponent,
} from "@/registry/lib/utils";
import { createMiddleware } from "hono/factory";
import type { TemplateMetadata } from "@/registry/lib/types";

const app = new Hono().basePath("/r");

app.get("/", async (c) => {
  try {
    const index = await getRegistryIndex();
    return c.json(index);
  } catch (error) {
    return c.json(
      { error: "Failed to fetch registry index." },
      { status: 500 },
    );
  }
});

const componentMeta = createMiddleware<{
  Variables: { meta: TemplateMetadata; path: string };
}>(async (c, next) => {
  const path = c.req.path.replace("/r", "").replace(/\.json$/, "");
  c.set("path", path);

  try {
    const meta = await getComponentMeta(path);
    c.set("meta", meta);
    await next();
  } catch (error) {
    console.error(error);
    return c.json({ error: "Component not found." }, { status: 404 });
  }
});

// Handle registry requests at base path "/r"
app
  .use(componentMeta)
  .get("/*", async (c) => {
    const path = c.get("path");

    const meta = c.get("meta");
    if (meta.type === "static") {
      try {
        const data = await getStaticComponent(path);
        return c.json(data);
      } catch (error) {
        console.error(error);
        return c.json({ error: "Component not found." }, { status: 404 });
      }
    } else {
      return c.json(
        { error: "Dynamic components are not supported yet." },
        { status: 501 },
      );
    }
  })
  .options(async (c) => {
    const meta = c.get("meta");
    return c.json(meta, 200);
  });

export default app;
