export interface Template {
  requireData: boolean;
  label: string;
  hint?: string;
  templatePath: string;
  screenshot?: string;
  tags?: string[];
  postIntallFn?: (args: {
    projectDir: string;
    pageDir: string;
    dataSource?: unknown;
    schemaName?: string;
  }) => void | Promise<void>;
}

export const nextjsTemplates: Record<string, Template> = {
  blank: {
    requireData: false,
    label: "Blank",
    templatePath: "nextjs/blank",
  },
  table: {
    requireData: true,
    label: "Basic Table",
    hint: "Use to load and show multiple records",
    templatePath: "nextjs/table",
  },
  tableEdit: {
    requireData: true,
    label: "Basic Table (editable)",
    hint: "Use to load and show multiple records with inline edit functionality",
    templatePath: "nextjs/table-edit",
  },
  tableInfinite: {
    requireData: true,
    label: "Infinite Table",
    hint: "Automatically load more records when the user scrolls to the bottom",
    templatePath: "nextjs/table-infinite",
  },
};

export const wvTemplates: Record<string, Template> = {
  blank: {
    requireData: false,
    label: "Blank",
    templatePath: "vite-wv/blank",
  },
  table: {
    requireData: true,
    label: "Basic Table",
    hint: "Use to load and show multiple records",
    templatePath: "vite-wv/table",
  },
  tableEdit: {
    requireData: true,
    label: "Basic Table (editable)",
    hint: "Use to load and show multiple records with inline edit functionality",
    templatePath: "vite-wv/table-edit",
  },
};
