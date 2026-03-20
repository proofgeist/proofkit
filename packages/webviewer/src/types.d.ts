interface Window {
  handleFmWVFetchCallback: (data: unknown, fetchId: string) => boolean;
  filemaker?: {
    (...args: unknown[]): unknown;
    performScript?: (...args: unknown[]) => unknown;
    performScriptWithOption?: (...args: unknown[]) => unknown;
  };
}
