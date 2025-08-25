import { handle } from "hono/vercel";
import app from "./registry";
import { getRegistryIndex } from "@proofkit/registry";

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

// Generate static params for all registry routes
export async function generateStaticParams() {
  try {
    const index = await getRegistryIndex();
    
    const params = [
      // Root registry route
      { name: [] },
      // Individual component routes
      ...index.map((item) => ({
        name: item.name.split('/'),
      })),
      // Meta routes for each component
      ...index.map((item) => ({
        name: ['meta', ...item.name.split('/')],
      })),
    ];
    
    console.log('Generated static params for registry:', params);
    return params;
  } catch (error) {
    console.error('Failed to generate static params for registry:', error);
    return [{ name: [] }];
  }
}
