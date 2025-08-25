import { Hono } from "hono";
import path from "path";

import {
  getComponentMeta,
  getRegistryIndex,
  getStaticComponentForShadcn,
} from "@proofkit/registry";
import { createMiddleware } from "hono/factory";
import type { TemplateMetadata } from "@proofkit/registry";

// Path to bundled templates in public directory
const getTemplatesPath = () => {
  if (process.env.NODE_ENV === 'production') {
    // In production, templates are bundled in the public directory
    return path.join(process.cwd(), 'public/registry-templates');
  } else {
    // In development, read directly from registry package
    return path.resolve(process.cwd(), '../../packages/registry/templates');
  }
};

const app = new Hono().basePath("/r");

app.get("/", async (c) => {
  try {
    const templatesPath = getTemplatesPath();
    const index = await getRegistryIndex(templatesPath);
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
    const componentPath = c.req.path.replace(basePath, "").replace(/\.json$/, "");
    console.log("path", componentPath);
    c.set("path", componentPath);

    try {
      const templatesPath = getTemplatesPath();
      const meta = await getComponentMeta(componentPath, templatesPath);
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
  const componentPath = c.get("path");
  const requestUrl = new URL(c.req.url);

  console.log("requestUrl", requestUrl);

  const routeNameRaw = c.req.query("routeName")
    ? decodeURIComponent(c.req.query("routeName")!)
    : undefined;
  // remove leading slash if present
  const routeName = routeNameRaw ? routeNameRaw.replace(/^\/+/, "") : undefined;

  try {
    const templatesPath = getTemplatesPath();
    const data = await getStaticComponentForShadcn(componentPath, {
      routeName,
      templatesPath
    });

    return c.json({
      ...data,
      registryDependencies: data.registryDependencies?.map((x: string) =>
        x.replace("{proofkit}", requestUrl.origin),
      ),
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Component not found." }, { status: 404 });
  }
});

export default app;
