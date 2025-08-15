import type { clientTypes } from "@proofkit/fmdapi";
import { FileMakerError } from "@proofkit/fmdapi";
import {
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
import { fmFetch, callFMScript } from "./main.js";

export type ExecuteScriptOptions = BaseRequest & {
  data: { script: string; scriptParam?: string };
};

export type WebViewerAdapterOptions = {
  scriptName: string;
};

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
      delete body._offset;
    }
    if ("_limit" in body) {
      Object.assign(body, { limit: body._limit });
      delete body._limit;
    }
    if ("_sort" in body) {
      Object.assign(body, { sort: body._sort });
      delete body._sort;
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
        `Filemaker Data API failed with (${
          resp.messages?.[0].code
        }): ${JSON.stringify(resp, null, 2)}`,
      );
    }

    return resp.response;
  };

  public list = async (opts: ListOptions): Promise<clientTypes.GetResponse> => {
    const { data, layout } = opts;
    const resp = await this.request({
      body: data,
      layout,
    });
    return resp as clientTypes.GetResponse;
  };

  public get = async (opts: GetOptions): Promise<clientTypes.GetResponse> => {
    const { data, layout } = opts;
    const resp = await this.request({
      body: data,
      layout,
    });
    return resp as clientTypes.GetResponse;
  };

  public find = async (opts: FindOptions): Promise<clientTypes.GetResponse> => {
    const { data, layout } = opts;
    const resp = await this.request({
      body: data,
      layout,
    });
    return resp as clientTypes.GetResponse;
  };

  public create = async (
    opts: CreateOptions,
  ): Promise<clientTypes.CreateResponse> => {
    const { data, layout } = opts;
    const resp = await this.request({
      action: "create",
      body: data,
      layout,
    });
    return resp as clientTypes.CreateResponse;
  };

  public update = async (
    opts: UpdateOptions,
  ): Promise<clientTypes.UpdateResponse> => {
    const { data, layout } = opts;
    const resp = await this.request({
      action: "update",
      layout,
      body: data,
    });
    return resp as clientTypes.UpdateResponse;
  };

  public delete = async (
    opts: DeleteOptions,
  ): Promise<clientTypes.DeleteResponse> => {
    const { data, layout } = opts;
    const resp = await this.request({
      action: "delete",
      body: data,
      layout,
    });
    return resp as clientTypes.DeleteResponse;
  };

  public layoutMetadata = async (
    opts: LayoutMetadataOptions,
  ): Promise<clientTypes.LayoutMetadataResponse> => {
    return (await this.request({
      action: "metaData",
      layout: opts.layout,
      body: {},
    })) as clientTypes.LayoutMetadataResponse;
  };

  public executeScript = async (): Promise<never> => {
    throw new Error(
      "the `executeScript` method is not supported in the webviewer adapter. Use the `fmFetch` or `callFMScript` functions from @proofkit/webviewer instead.",
    );
  };

  public containerUpload = async (): Promise<never> => {
    throw new Error("Container upload is not supported in webviewer");
  };
}
