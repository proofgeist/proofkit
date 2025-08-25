import { Hono } from "hono";

import {
  getComponentMeta,
  getRegistryIndex,
  getStaticComponent,
  getStaticComponentForShadcn,
} from "@proofkit/registry";
import { createMiddleware } from "hono/factory";
import type { TemplateMetadata } from "@proofkit/registry";

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

const componentMeta = (basePath: string) =>
  createMiddleware<{
    Variables: { meta: TemplateMetadata; path: string };
  }>(async (c, next) => {
    console.log("c.req.path", c.req.path);
    console.log("basePath", basePath);
    const path = c.req.path.replace(basePath, "").replace(/\.json$/, "");
    console.log("path", path);
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

// Handle meta requests first (more specific route)
app.get("/meta/*", componentMeta("/r/meta"), async (c) => {
  const meta = c.get("meta");
  return c.json(meta, 200);
});

// Handle registry requests at base path "/r" (less specific route)
app.get("/*", componentMeta("/r"), async (c) => {
  const path = c.get("path");
  const requestUrl = new URL(c.req.url);

  const routeNameRaw = c.req.query("routeName")
    ? decodeURIComponent(c.req.query("routeName")!)
    : undefined;
  // remove leading slash if present
  const routeName = routeNameRaw ? routeNameRaw.replace(/^\/+/, "") : undefined;

  try {
      const data = await getStaticComponentForShadcn(path, {routeName});

      return c.json({
        ...data,
        registryDependencies: data.registryDependencies?.map((x) =>
          x.replace("{proofkit}", requestUrl.origin),
        ),
      });
    } catch (error) {
      console.error(error);
      return c.json({ error: "Component not found." }, { status: 404 });
    }
});

export default app;
