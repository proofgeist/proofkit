import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  "./apps/demo/vitest.config.ts",
  "./packages/cli/vitest.config.ts",
  "./packages/typegen/vitest.config.ts",
  "./packages/fmdapi/vitest.config.ts",
  "./packages/cli/template/vite-wv/vite.config.ts"
])
