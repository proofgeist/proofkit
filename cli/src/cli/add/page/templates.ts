import { postInstallTableInfinite } from "./post-install/table-infinite.js";
import { postInstallTable } from "./post-install/table.js";
import { type Template } from "./types.js";

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
    postIntallFn: postInstallTable,
  },
  tableEdit: {
    requireData: true,
    label: "Basic Table (editable)",
    hint: "Use to load and show multiple records with inline edit functionality",
    templatePath: "nextjs/table-edit",
    postIntallFn: postInstallTable,
  },
  tableInfinite: {
    requireData: true,
    label: "Infinite Table",
    hint: "Automatically load more records when the user scrolls to the bottom",
    templatePath: "nextjs/table-infinite",
    postIntallFn: postInstallTableInfinite,
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
    postIntallFn: postInstallTable,
  },
  tableEdit: {
    requireData: true,
    label: "Basic Table (editable)",
    hint: "Use to load and show multiple records with inline edit functionality",
    templatePath: "vite-wv/table-edit",
    postIntallFn: postInstallTable,
  },
};
