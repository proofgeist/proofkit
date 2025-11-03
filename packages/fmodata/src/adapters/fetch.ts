import { BaseFetchAdapter } from "./fetch-base.js";
import type { BaseFetchAdapterOptions } from "./fetch-base-types.js";

export interface FetchAdapterOptions extends BaseFetchAdapterOptions {
  auth: {
    username: string;
    password: string;
  };
}

/**
 * Fetch adapter using Basic Authentication
 * This is the standard adapter for FileMaker OData API
 */
export class FetchAdapter extends BaseFetchAdapter {
  private username: string;
  private password: string;

  constructor(options: FetchAdapterOptions) {
    super({
      server: options.server,
      database: options.database,
    });

    this.username = options.auth.username;
    this.password = options.auth.password;

    if (this.username === "") {
      throw new Error("Username is required");
    }
    if (this.password === "") {
      throw new Error("Password is required");
    }
  }

  protected override async getAuthHeader(): Promise<string> {
    const credentials = `${this.username}:${this.password}`;
    const encoded = Buffer.from(credentials).toString("base64");
    return `Basic ${encoded}`;
  }
}

