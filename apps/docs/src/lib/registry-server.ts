import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import createJiti from 'jiti';

// Types (copy from @proofkit/registry for now)
export interface TemplateMetadata {
  title: string;
  description: string;
  category: string;
  registryType: string;
  dependencies?: string[];
  registryDependencies?: string[];
  files: Array<{
    sourceFileName: string;
    destinationPath?: string;
    type: string;
    handlebars?: boolean;
  }>;
  [key: string]: any;
}

export interface RegistryItem {
  name: string;
  type: string;
  files: Array<{
    path: string;
    type: string;
    content: string;
    target: string;
  }>;
  [key: string]: any;
}

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

/**
 * Get all available templates from the manifest
 */
export async function getRegistryIndex() {
  const templatesPath = getTemplatesPath();
  
  try {
    // Try to read from manifest first (production)
    const manifestPath = path.join(templatesPath, 'manifest.json');
    if (await fileExists(manifestPath)) {
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
      
      // Load metadata for each template
      const index = await Promise.all(
        manifest.templates.map(async (template: any) => {
          const meta = await loadTemplateMeta(path.join(templatesPath, template.path));
          return {
            ...meta,
            name: template.name,
          };
        })
      );
      
      return index;
    }
  } catch (error) {
    console.warn('Failed to read from manifest, falling back to directory scan:', error);
  }
  
  // Fallback: scan directory (development)
  return await scanTemplatesDirectory(templatesPath);
}

/**
 * Get metadata for a specific component
 */
export async function getComponentMeta(namePath: string): Promise<TemplateMetadata> {
  const templatesPath = getTemplatesPath();
  const templateDir = path.join(templatesPath, namePath);
  
  return await loadTemplateMeta(templateDir);
}

/**
 * Get static component data for shadcn CLI
 */
export async function getStaticComponentForShadcn(
  namePath: string,
  options?: { routeName?: string }
): Promise<RegistryItem> {
  const templatesPath = getTemplatesPath();
  const meta = await getComponentMeta(namePath);
  
  const files = await Promise.all(
    meta.files.map(async (file) => {
      const sourceFile = file.handlebars
        ? file.sourceFileName.replace(/\.[^/.]+$/, '.hbs')
        : file.sourceFileName;

      const contentPath = path.join(templatesPath, namePath, sourceFile);
      const content = await fs.readFile(contentPath, 'utf-8');

      const routeName = options?.routeName ?? namePath;
      const destinationPath = file.destinationPath?.replace(
        '__PATH__',
        routeName
      );

      return {
        path: file.sourceFileName,
        type: file.type,
        content: encodeHandlebarsForShadcn(content),
        target: destinationPath ?? file.sourceFileName,
      };
    })
  );

  return {
    ...meta,
    name: namePath,
    type: meta.registryType,
    files,
  };
}

// Helper functions
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadTemplateMeta(templateDir: string): Promise<TemplateMetadata> {
  const jiti = createJiti(import.meta.url, {
    interopDefault: true,
    requireCache: false,
  });

  // Try _meta.ts first, then _meta.js
  const metaFiles = ['_meta.ts', '_meta.js'];
  
  for (const metaFile of metaFiles) {
    const metaPath = path.join(templateDir, metaFile);
    
    if (await fileExists(metaPath)) {
      try {
        const metaModule = jiti(metaPath);
        const meta = metaModule.meta || metaModule.default?.meta || metaModule.default;
        
        if (!meta) {
          throw new Error(`Template meta file must export a 'meta' object`);
        }
        
        return meta;
      } catch (error) {
        console.error(`Failed to load meta from ${metaPath}:`, error);
        throw error;
      }
    }
  }
  
  throw new Error(`No meta file found in ${templateDir}`);
}

async function scanTemplatesDirectory(templatesPath: string) {
  const templates: any[] = [];
  
  async function scanDir(dir: string, relativePath = '') {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      
      const fullPath = path.join(dir, entry.name);
      const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      
      // Check if this directory has a _meta.ts file
      const metaPath = path.join(fullPath, '_meta.ts');
      if (await fileExists(metaPath)) {
        try {
          const meta = await loadTemplateMeta(fullPath);
          templates.push({
            ...meta,
            name: relPath,
          });
        } catch (error) {
          console.error(`Failed to load template ${relPath}:`, error);
        }
      }
      
      // Recurse into subdirectories
      await scanDir(fullPath, relPath);
    }
  }
  
  await scanDir(templatesPath);
  return templates;
}

function encodeHandlebarsForShadcn(content: string): string {
  // Simple encoding for handlebars expressions
  const HANDLEBARS_PLACEHOLDERS = {
    '{{schema.schemaName}}': '__HB_SCHEMA_NAME__',
    '{{schema.sourceName}}': '__HB_SOURCE_NAME__',
    '{{schema.clientSuffix}}': '__HB_CLIENT_SUFFIX__',
  } as const;
  
  let result = content;
  
  for (const [handlebars, placeholder] of Object.entries(HANDLEBARS_PLACEHOLDERS)) {
    result = result.replace(new RegExp(escapeRegExp(handlebars), 'g'), placeholder);
  }
  
  return result;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
