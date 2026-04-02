interface Window {
  handleFmWVFetchCallback: (data: unknown, fetchId: string) => boolean;
  FileMaker?: {
    PerformScript: (name: string, parameter: string) => void;
    PerformScriptWithOption: (name: string, parameter: string, option: "0" | "1" | "2" | "3" | "4" | "5") => void;
  };
  filemaker?: {
    (...args: unknown[]): unknown;
    performScript?: (...args: unknown[]) => unknown;
    performScriptWithOption?: (...args: unknown[]) => unknown;
  };
}
