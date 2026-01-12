type MaybePromise<T> = Promise<T> | T;
export interface TokenStoreDefinitions {
  getKey?: () => string;
  getToken: (key: string) => MaybePromise<string | null>;
  setToken: (key: string, value: string) => void;
  clearToken: (key: string) => void;
}
