import Table from "cli-table3";

export interface OutputOptions {
  pretty: boolean;
}

export function printResult(data: unknown, opts: OutputOptions): void {
  if (opts.pretty) {
    printTable(data);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

function printTable(data: unknown): void {
  // Array of objects — render as rows
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === "object" && data[0] !== null) {
    const keys = Object.keys(data[0] as Record<string, unknown>);
    const table = new Table({ head: keys });
    for (const row of data) {
      table.push(keys.map((k) => String((row as Record<string, unknown>)[k] ?? "")));
    }
    console.log(table.toString());
    return;
  }

  // Array of primitives — render as single column
  if (Array.isArray(data) && data.length > 0) {
    const table = new Table({ head: ["Value"] });
    for (const value of data) {
      table.push([String(value ?? "")]);
    }
    console.log(table.toString());
    return;
  }

  // Single object — render as key-value pairs
  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    const table = new Table({ head: ["Key", "Value"] });
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      table.push([key, typeof value === "object" ? JSON.stringify(value) : String(value ?? "")]);
    }
    console.log(table.toString());
    return;
  }

  // Fallback — just print as JSON
  console.log(JSON.stringify(data, null, 2));
}

export function printError(err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Error: ${message}\n`);
  process.exit(1);
}
