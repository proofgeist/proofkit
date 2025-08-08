import { registryFetch } from "./http.js";

export async function getMetaFromRegistry(name: string) {
  const result = await registryFetch("@get/meta/:name", {
    params: { name },
  });
  if (result.error) {
    if (result.error.status === 404) return null;
    throw new Error(result.error.message);
  }
  return result.data;
}
