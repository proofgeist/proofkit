import { registryItemSchema } from "shadcn/registry";
import { z } from "zod";

type RegistryItem = z.infer<typeof registryItemSchema>;

export function proofkitRegistryItem(): RegistryItem {
  return {
    name: "Test",
    type: "registry:block",
    files: [{}],
  };
}
