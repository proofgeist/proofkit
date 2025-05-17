import { z } from "zod";

export const ZFieldValue = z.union([
  z.string(),
  z.number(),
  z.null(),
  z.unknown(),
]);
export type FieldValue = z.infer<typeof ZFieldValue>;

export const ZFieldData = z.record(z.string(), ZFieldValue);
export type FieldData = Record<string, unknown>;

export type GenericPortalData = {
  [key: string]: {
    [x: string]: string | number | null | unknown;
  };
};

export type PortalsWithIds<U extends GenericPortalData = GenericPortalData> = {
  [key in keyof U]: Array<
    U[key] & {
      recordId: string;
      modId: string;
    }
  >;
};
export type UpdatePortalsWithIds<
  U extends GenericPortalData = GenericPortalData,
> = {
  [key in keyof U]: Array<
    U[key] & {
      recordId: string;
      modId?: string;
    }
  >;
};

export type FMRecord<
  T extends FieldData = FieldData,
  U extends GenericPortalData = GenericPortalData,
> = {
  fieldData: T;
  recordId: string;
  modId: string;
  portalData: PortalsWithIds<U>;
};

export type ScriptParams = {
  script?: string;
  "script.param"?: string;
  "script.prerequest"?: string;
  "script.prerequest.param"?: string;
  "script.presort"?: string;
  "script.presort.param"?: string;
  timeout?: number;
};

const ZScriptResponse = z.object({
  scriptResult: z.string().optional(),
  scriptError: z.string().optional(),
  "scriptResult.prerequest": z.string().optional(),
  "scriptError.prerequest": z.string().optional(),
  "scriptResult.presort": z.string().optional(),
  "scriptError.presort": z.string().optional(),
});
export type ScriptResponse = z.infer<typeof ZScriptResponse>;

export const ZDataInfo = z.object({
  database: z.string(),
  layout: z.string(),
  table: z.string(),
  totalRecordCount: z.number(),
  foundCount: z.number(),
  returnedCount: z.number(),
});
export type DataInfo = z.infer<typeof ZDataInfo>;

export type CreateParams<U extends GenericPortalData = GenericPortalData> =
  ScriptParams & { portalData?: UpdatePortalsWithIds<U> };

export type CreateResponse = ScriptResponse & {
  recordId: string;
  modId: string;
};

export type UpdateParams<U extends GenericPortalData = GenericPortalData> =
  CreateParams<U> & {
    modId?: number;
  };

export type UpdateResponse = ScriptResponse & {
  modId: string;
};

export type DeleteParams = ScriptParams;

export type DeleteResponse = ScriptResponse;

export type RangeParams = {
  offset?: number;
  limit?: number;
};
export type RangeParamsRaw = {
  _offset?: number;
  _limit?: number;
};

export type PortalRanges<U extends GenericPortalData = GenericPortalData> =
  Partial<{ [key in keyof U]: RangeParams }>;

export type PortalRangesParams<
  U extends GenericPortalData = GenericPortalData,
> = {
  portalRanges?: PortalRanges<U>;
};

export type GetParams<U extends GenericPortalData = GenericPortalData> =
  ScriptParams &
    PortalRangesParams<U> & {
      "layout.response"?: string;
      dateformats?: "US" | "file_locale" | "ISO8601";
    };

export type Sort<T extends FieldData = FieldData> = {
  fieldName: keyof T;
  sortOrder?: "ascend" | "descend" | (string & {});
};

export type ListParams<
  T extends FieldData = FieldData,
  U extends GenericPortalData = GenericPortalData,
> = GetParams<U> &
  RangeParams & {
    sort?: Sort<T> | Array<Sort<T>>;
  };

export type ListParamsRaw<
  T extends FieldData = FieldData,
  U extends GenericPortalData = GenericPortalData,
> = GetParams<U> &
  RangeParamsRaw & {
    _sort?: Array<Sort<T>>;
  };

export type GetResponse<
  T extends FieldData = FieldData,
  U extends GenericPortalData = GenericPortalData,
> = ScriptResponse & {
  data: Array<FMRecord<T, U>>;
  dataInfo: DataInfo;
};
export type GetResponseOne<
  T extends FieldData = FieldData,
  U extends GenericPortalData = GenericPortalData,
> = ScriptResponse & {
  data: FMRecord<T, U>;
  dataInfo: DataInfo;
};

type SecondLevelKeys<T> = {
  [K in keyof T]: keyof T[K];
}[keyof T];
export type Query<
  T extends FieldData = FieldData,
  U extends GenericPortalData = GenericPortalData,
> = Partial<{
  [key in keyof T]: T[key] extends number ? number | string : string;
}> &
  Partial<{ [key in SecondLevelKeys<U>]?: string }> & {
    omit?: "true";
  };

export type LayoutMetadataResponse = {
  fieldMetaData: FieldMetaData[];
  portalMetaData: { [key: string]: FieldMetaData[] };
  valueLists?: ValueList[];
};
export type ProductInfoMetadataResponse = {
  name: string;
  dateFormat: string;
  timeFormat: string;
  timeStampFormat: string;
};
export type DatabaseMetadataResponse = {
  databases: Array<{
    name: string;
  }>;
};

export type FieldMetaData = {
  name: string;
  type: "normal" | "calculation" | "summary";
  displayType:
    | "editText"
    | "popupList"
    | "popupMenu"
    | "checkBox"
    | "calendar"
    | "radioButtons"
    | "secureText";
  result: "text" | "number" | "date" | "time" | "timeStamp" | "container";
  global: boolean;
  autoEnter: boolean;
  fourDigitYear: boolean;
  maxRepeat: number;
  maxCharacters: number;
  notEmpty: boolean;
  numeric: boolean;
  repetitions: number;
  timeOfDay: boolean;
  valueList?: string;
};

type ValueList = {
  name: string;
  // TODO need to test type of value list from other file
  type: "customList" | "byField";
  values: Array<{ value: string; displayValue: string }>;
};

/**
 * Represents the data returned by a call to the Data API `layouts` endpoint.
 */
export type AllLayoutsMetadataResponse = {
  /**
   * A list of `Layout` or `LayoutsFolder` objects.
   */
  layouts: LayoutOrFolder[];
};

/**
 * Represents a FileMaker layout.
 */
export type Layout = {
  /**
   * The name of the layout
   */
  name: string;
  /**
   * If the node is a layout, `table` may contain the name of the table
   * the layout is associated with.
   */
  table: string;
};

/**
 * Represents a folder of `Layout` or `LayoutsFolder` objects.
 */
export type LayoutsFolder = {
  /**
   * The name of the folder
   */
  name: string;
  isFolder: boolean;
  /**
   * A list of the Layout or LayoutsFolder objects in the folder.
   */
  folderLayoutNames?: LayoutOrFolder[];
};

export type LayoutOrFolder = Layout | LayoutsFolder;

/**
 * Represents the data returned by a call to the Data API `scripts` endpoint.
 */
export type ScriptsMetadataResponse = {
  /**
   * A list of `Layout` or `LayoutsFolder` objects.
   */
  scripts: ScriptOrFolder[];
};
type Script = {
  name: string;
  isFolder: false;
};
type ScriptFolder = {
  name: string;
  isFolder: true;
  folderScriptNames: ScriptOrFolder[];
};
export type ScriptOrFolder = Script | ScriptFolder;

export type RawFMResponse<T = unknown> = {
  response?: T;
  messages?: [{ code: string }];
};

export class FileMakerError extends Error {
  public readonly code: string;

  public constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
