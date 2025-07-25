import { FileMakerError } from "../client-types.js";
import memoryStore from "../tokenStore/memory.js";
import type { TokenStoreDefinitions } from "../tokenStore/types.js";
import type {
  BaseFetchAdapterOptions,
  GetTokenArguments,
} from "./fetch-base-types.js";
import { BaseFetchAdapter } from "./fetch-base.js";

export interface FetchAdapterOptions extends BaseFetchAdapterOptions {
  auth: {
    username: string;
    password: string;
  };
  tokenStore?: TokenStoreDefinitions;
}

export class FetchAdapter extends BaseFetchAdapter {
  private username: string;
  private password: string;
  private tokenStore: Omit<TokenStoreDefinitions, "getKey">;
  private getTokenKey: Required<TokenStoreDefinitions>["getKey"];

  constructor(args: FetchAdapterOptions) {
    super({ ...args, refreshToken: true });
    this.username = args.auth.username;
    this.password = args.auth.password;
    this.tokenStore = args.tokenStore ?? memoryStore();
    this.getTokenKey =
      args.tokenStore?.getKey ?? (() => `${args.server}/${args.db}`);

    if (this.username === "") throw new Error("Username is required");
    if (this.password === "") throw new Error("Password is required");
  }

  /**
   * Gets a FileMaker Data API token for authentication.
   *
   * This token is **NOT** guaranteed to be valid, since it expires 15 minutes after the last use. Pass `refresh=true` to forcibly get a fresh token
   *
   * @param args.refresh - If true, forces getting a new token instead of using cached token
   * @internal This method is intended for internal use, you should not need to use it in most cases.
   */
  public override getToken = async (
    args?: GetTokenArguments,
  ): Promise<string> => {
    const { refresh = false } = args ?? {};
    let token: string | null = null;
    if (!refresh) {
      token = await this.tokenStore.getToken(this.getTokenKey());
    }

    if (!token) {
      const res = await fetch(`${this.baseUrl}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(
            `${this.username}:${this.password}`,
          ).toString("base64")}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new FileMakerError(
          data.messages[0].code,
          data.messages[0].message,
        );
      }
      token = res.headers.get("X-FM-Data-Access-Token");
      if (!token) throw new Error("Could not get token");
      this.tokenStore.setToken(this.getTokenKey(), token);
    }

    return token;
  };

  public disconnect = async (): Promise<void> => {
    const token = await this.tokenStore.getToken(this.getTokenKey());
    if (token) {
      await this.request({
        url: `/sessions/${token}`,
        method: "DELETE",
        fetchOptions: {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      });
      this.tokenStore.clearToken(this.getTokenKey());
    }
  };
}
