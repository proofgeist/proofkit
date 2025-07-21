import { BasicAuth, Connection, Database } from "fm-odata-client";

export type BasicAuthCredentials = {
  username: string;
  password: string;
};
export type OttoAPIKeyAuth = {
  apiKey: string;
};
export type ODataAuth = BasicAuthCredentials | OttoAPIKeyAuth;

export function isBasicAuth(auth: ODataAuth): auth is BasicAuthCredentials {
  return (
    typeof (auth as BasicAuthCredentials).username === "string" &&
    typeof (auth as BasicAuthCredentials).password === "string"
  );
}

export function isOttoAPIKeyAuth(auth: ODataAuth): auth is OttoAPIKeyAuth {
  return typeof (auth as OttoAPIKeyAuth).apiKey === "string";
}

export type FmOdataConfig = {
  hostname: string;
  auth: ODataAuth;
  database: string;
};

export class FmOdata {
  public connection: Connection;
  public database: Database;

  constructor(args: FmOdataConfig) {
    if (isOttoAPIKeyAuth(args.auth)) {
      throw new Error("Otto API key auth is yet not supported");
    } else {
      this.connection = new Connection(
        args.hostname.replace(/^https?:\/\//, "").replace(/\/$/, ""),
        new BasicAuth(args.auth.username, args.auth.password),
      );
    }

    this.database = new Database(this.connection, args.database);
  }
}
