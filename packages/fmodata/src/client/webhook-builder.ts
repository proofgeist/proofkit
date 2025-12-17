import { FMTable, getTableName } from "../orm";
import type { ExecutionContext, ExecuteMethodOptions } from "../types";
import type { FFetchOptions } from "@fetchkit/ffetch";
import { FilterExpression } from "../orm/operators";
import { isColumn, type Column } from "../orm/column";
import { formatSelectFields } from "./builders/select-utils";

export type Webhook<TableName = string> = {
  webhook: string;
  headers?: Record<string, string>;
  tableName: TableName;
  notifySchemaChanges?: boolean;
  select?: string | Column<any, any, any>[];
  filter?: string | FilterExpression;
};

/**
 * Webhook information returned by the API
 */
export type WebhookInfo = {
  webHookID: number;
  tableName: string;
  url: string;
  headers?: Record<string, string>;
  notifySchemaChanges: boolean;
  select: string;
  filter: string;
  pendingOperations: unknown[];
};

/**
 * Response from listing all webhooks
 */
export type WebhookListResponse = {
  Status: string;
  WebHook: WebhookInfo[];
};

/**
 * Response from adding a webhook
 */
export type WebhookAddResponse = {
  webHookResult: {
    webHookID: number;
  };
};

export class WebhookManager {
  constructor(
    private readonly databaseName: string,
    private readonly context: ExecutionContext,
  ) {}

  /**
   * Adds a new webhook to the database.
   * @param webhook - The webhook configuration object
   * @param webhook.webhook - The webhook URL to call
   * @param webhook.tableName - The FMTable instance for the table to monitor
   * @param webhook.headers - Optional custom headers to include in webhook requests
   * @param webhook.notifySchemaChanges - Whether to notify on schema changes
   * @param webhook.select - Optional field selection (string or array of Column references)
   * @param webhook.filter - Optional filter (string or FilterExpression)
   * @returns Promise resolving to the created webhook data with ID
   * @example
   * ```ts
   * const result = await db.webhook.add({
   *   webhook: "https://example.com/webhook",
   *   tableName: contactsTable,
   *   headers: { "X-Custom-Header": "value" },
   * });
   * // result.webHookResult.webHookID contains the new webhook ID
   * ```
   * @example
   * ```ts
   * // Using filter expressions and column arrays (same DX as query builder)
   * const result = await db.webhook.add({
   *   webhook: "https://example.com/webhook",
   *   tableName: contacts,
   *   filter: eq(contacts.name, "John"),
   *   select: [contacts.name, contacts.PrimaryKey],
   * });
   * ```
   */
  async add(
    webhook: Webhook<FMTable>,
    options?: ExecuteMethodOptions,
  ): Promise<WebhookAddResponse> {
    // Extract the string table name from the FMTable instance
    const tableName = getTableName(webhook.tableName);

    // Get useEntityIds setting (check options first, then context, default to false)
    const useEntityIds =
      options?.useEntityIds ?? this.context._getUseEntityIds?.() ?? false;

    // Transform filter if it's a FilterExpression
    let filter: string | undefined;
    if (webhook.filter !== undefined) {
      if (webhook.filter instanceof FilterExpression) {
        filter = webhook.filter.toODataFilter(useEntityIds);
      } else {
        filter = webhook.filter;
      }
    }

    // Transform select if it's an array of Columns
    let select: string | undefined;
    if (webhook.select !== undefined) {
      if (Array.isArray(webhook.select)) {
        // Extract field identifiers from columns or use strings as-is
        const fieldNames = webhook.select.map((item) => {
          if (isColumn(item)) {
            return item.getFieldIdentifier(useEntityIds);
          }
          return String(item);
        });
        // Use formatSelectFields to properly format the select string
        select = formatSelectFields(
          fieldNames,
          webhook.tableName,
          useEntityIds,
        );
      } else {
        // Already a string, use as-is
        select = webhook.select;
      }
    }

    // Create request body with string table name and transformed filter/select
    const requestBody: {
      webhook: string;
      headers?: Record<string, string>;
      tableName: string;
      notifySchemaChanges?: boolean;
      select?: string;
      filter?: string;
    } = {
      webhook: webhook.webhook,
      tableName,
    };

    if (webhook.headers !== undefined) {
      requestBody.headers = webhook.headers;
    }
    if (webhook.notifySchemaChanges !== undefined) {
      requestBody.notifySchemaChanges = webhook.notifySchemaChanges;
    }
    if (select !== undefined) {
      requestBody.select = select;
    }
    if (filter !== undefined) {
      requestBody.filter = filter;
    }

    const result = await this.context._makeRequest<WebhookAddResponse>(
      `/${this.databaseName}/Webhook.Add`,
      {
        method: "POST",
        body: JSON.stringify(requestBody),
        ...options,
      },
    );

    if (result.error) {
      throw result.error;
    }

    return result.data;
  }

  /**
   * Deletes a webhook by ID.
   * @param webhookId - The ID of the webhook to delete
   * @returns Promise that resolves when the webhook is deleted
   * @example
   * ```ts
   * await db.webhook.remove(1);
   * ```
   */
  async remove(
    webhookId: string | number,
    options?: ExecuteMethodOptions,
  ): Promise<void> {
    const result = await this.context._makeRequest(
      `/${this.databaseName}/Webhook.Delete(${webhookId})`,
      {
        method: "DELETE",
        ...options,
      },
    );

    if (result.error) {
      throw result.error;
    }
  }

  /**
   * Gets a webhook by ID.
   * @param webhookId - The ID of the webhook to retrieve
   * @returns Promise resolving to the webhook data
   * @example
   * ```ts
   * const webhook = await db.webhook.get(1);
   * // webhook.webHookID, webhook.tableName, webhook.url, etc.
   * ```
   */
  async get(
    webhookId: string | number,
    options?: ExecuteMethodOptions,
  ): Promise<WebhookInfo> {
    const result = await this.context._makeRequest<WebhookInfo>(
      `/${this.databaseName}/Webhook.Get(${webhookId})`,
      options,
    );

    if (result.error) {
      throw result.error;
    }

    return result.data;
  }

  /**
   * Lists all webhooks.
   * @returns Promise resolving to webhook list response with status and webhooks array
   * @example
   * ```ts
   * const result = await db.webhook.list();
   * // result.Status contains the status
   * // result.WebHook contains the array of webhooks
   * ```
   */
  async list(options?: ExecuteMethodOptions): Promise<WebhookListResponse> {
    const result = await this.context._makeRequest<WebhookListResponse>(
      `/${this.databaseName}/Webhook.GetAll`,
      options,
    );

    if (result.error) {
      throw result.error;
    }

    return result.data;
  }

  /**
   * Invokes a webhook by ID, optionally for specific row IDs.
   * @param webhookId - The ID of the webhook to invoke
   * @param options - Optional configuration
   * @param options.rowIDs - Array of row IDs to trigger the webhook for
   * @returns Promise resolving to the invocation result (type unknown until API behavior is confirmed)
   * @example
   * ```ts
   * // Invoke for all rows
   * await db.webhook.invoke(1);
   *
   * // Invoke for specific rows
   * await db.webhook.invoke(1, { rowIDs: [63, 61] });
   * ```
   */
  async invoke(
    webhookId: string | number,
    options?: { rowIDs?: number[] },
    executeOptions?: ExecuteMethodOptions,
  ): Promise<unknown> {
    const body: { rowIDs?: number[] } = {};
    if (options?.rowIDs !== undefined) {
      body.rowIDs = options.rowIDs;
    }

    const result = await this.context._makeRequest<unknown>(
      `/${this.databaseName}/Webhook.Invoke(${webhookId})`,
      {
        method: "POST",
        body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
        ...executeOptions,
      },
    );

    if (result.error) {
      throw result.error;
    }

    return result.data;
  }
}
