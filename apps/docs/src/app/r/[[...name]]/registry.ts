import { Hono } from "hono";

import { getRegistryIndex, getStaticComponent } from "@/registry/lib/utils";

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

// Handle registry requests at base path "/r"
app.get("/:path", async (c) => {
  const path = c.req.param("path");

  // Support both with and without .json suffix; path may contain slashes
  const pathWithoutJson = path.replace(/\.json$/, "");
  try {
    const data = await getStaticComponent(pathWithoutJson);
    return c.json(data);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Component not found." }, { status: 404 });
  }
});

export default app;
