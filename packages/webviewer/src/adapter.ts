import type { clientTypes } from "@proofkit/fmdapi";
import { FileMakerError } from "@proofkit/fmdapi";
import type {
  Adapter,
  BaseRequest,
  CreateOptions,
  DeleteOptions,
  FindOptions,
  GetOptions,
  LayoutMetadataOptions,
  ListOptions,
  UpdateOptions,
} from "@proofkit/fmdapi/dist/esm/adapters/core.js";
import { fmFetch } from "./main.js";

export type ExecuteScriptOptions = BaseRequest & {
  data: { script: string; scriptParam?: string };
};

export interface WebViewerAdapterOptions {
  scriptName: string;
}

export class WebViewerAdapter implements Adapter {
  protected scriptName: string;

  constructor(options: WebViewerAdapterOptions & { refreshToken?: boolean }) {
    this.scriptName = options.scriptName;
  }

  protected request = async (params: {
    layout: string;
    body: object;
    action?: "read" | "metaData" | "create" | "update" | "delete" | "duplicate";
  }): Promise<unknown> => {
    const { action = "read", layout, body } = params;

    if ("_offset" in body) {
      Object.assign(body, { offset: body._offset });
      body._offset = undefined;
    }
    if ("_limit" in body) {
      Object.assign(body, { limit: body._limit });
      body._limit = undefined;
    }
    if ("_sort" in body) {
      Object.assign(body, { sort: body._sort });
      body._sort = undefined;
    }

    const resp = await fmFetch<clientTypes.RawFMResponse>(this.scriptName, {
      ...body,
      layouts: layout,
      action,
      version: "vLatest",
    });

    if (resp.messages?.[0].code !== "0") {
      throw new FileMakerError(
        resp?.messages?.[0].code ?? "500",
        `Filemaker Data API failed with (${resp.messages?.[0].code}): ${JSON.stringify(resp, null, 2)}`,
      );
    }

    return resp.response;
  };

  list = async (opts: ListOptions): Promise<clientTypes.GetResponse> => {
    const { data, layout } = opts;
    const resp = await this.request({
      body: data,
      layout,
    });
    return resp as clientTypes.GetResponse;
  };

  get = async (opts: GetOptions): Promise<clientTypes.GetResponse> => {
    const { data, layout } = opts;
    const resp = await this.request({
      body: data,
      layout,
    });
    return resp as clientTypes.GetResponse;
  };

  find = async (opts: FindOptions): Promise<clientTypes.GetResponse> => {
    const { data, layout } = opts;
    const resp = await this.request({
      body: data,
      layout,
    });
    return resp as clientTypes.GetResponse;
  };

  create = async (opts: CreateOptions): Promise<clientTypes.CreateResponse> => {
    const { data, layout } = opts;
    const resp = await this.request({
      action: "create",
      body: data,
      layout,
    });
    return resp as clientTypes.CreateResponse;
  };

  update = async (opts: UpdateOptions): Promise<clientTypes.UpdateResponse> => {
    const { data, layout } = opts;
    const resp = await this.request({
      action: "update",
      layout,
      body: data,
    });
    return resp as clientTypes.UpdateResponse;
  };

  delete = async (opts: DeleteOptions): Promise<clientTypes.DeleteResponse> => {
    const { data, layout } = opts;
    const resp = await this.request({
      action: "delete",
      body: data,
      layout,
    });
    return resp as clientTypes.DeleteResponse;
  };

  layoutMetadata = async (opts: LayoutMetadataOptions): Promise<clientTypes.LayoutMetadataResponse> => {
    return (await this.request({
      action: "metaData",
      layout: opts.layout,
      body: {},
    })) as clientTypes.LayoutMetadataResponse;
  };

  executeScript = (): Promise<never> => {
    throw new Error(
      "the `executeScript` method is not supported in the webviewer adapter. Use the `fmFetch` or `callFMScript` functions from @proofkit/webviewer instead.",
    );
  };

  containerUpload = (): Promise<never> => {
    throw new Error("Container upload is not supported in webviewer");
  };
}
