import type {
  ExecutableBuilder,
  ExecutionContext,
  Result,
  ExecuteOptions,
} from "../types";
import { type FFetchOptions } from "@fetchkit/ffetch";
import {
  formatBatchRequestFromNative,
  parseBatchResponse,
  type ParsedBatchResponse,
} from "./batch-request";

/**
 * Helper type to extract result types from a tuple of ExecutableBuilders.
 * Uses a mapped type which TypeScript 4.1+ can handle for tuples.
 */
type ExtractTupleTypes<T extends readonly ExecutableBuilder<any>[]> = {
  [K in keyof T]: T[K] extends ExecutableBuilder<infer U> ? U : never;
};

/**
 * Converts a ParsedBatchResponse to a native Response object
 * @param parsed - The parsed batch response
 * @returns A native Response object
 */
function parsedToResponse(parsed: ParsedBatchResponse): Response {
  const headers = new Headers(parsed.headers);

  // Handle null body
  if (parsed.body === null || parsed.body === undefined) {
    return new Response(null, {
      status: parsed.status,
      statusText: parsed.statusText,
      headers,
    });
  }

  // Convert body to string if it's not already
  const bodyString =
    typeof parsed.body === "string" ? parsed.body : JSON.stringify(parsed.body);

  // Handle 204 No Content status - it cannot have a body per HTTP spec
  // If FileMaker returns 204 with a body, treat it as 200
  let status = parsed.status;
  if (status === 204 && bodyString && bodyString.trim() !== "") {
    status = 200;
  }

  return new Response(status === 204 ? null : bodyString, {
    status: status,
    statusText: parsed.statusText,
    headers,
  });
}

/**
 * Builder for batch operations that allows multiple queries to be executed together
 * in a single transactional request.
 */
export class BatchBuilder<Builders extends readonly ExecutableBuilder<any>[]>
  implements ExecutableBuilder<ExtractTupleTypes<Builders>>
{
  private builders: ExecutableBuilder<any>[];
  private readonly originalBuilders: Builders;

  constructor(
    builders: Builders,
    private readonly databaseName: string,
    private readonly context: ExecutionContext,
  ) {
    // Convert readonly tuple to mutable array for dynamic additions
    this.builders = [...builders];
    // Store original tuple for type preservation
    this.originalBuilders = builders;
  }

  /**
   * Add a request to the batch dynamically.
   * This allows building up batch operations programmatically.
   *
   * @param builder - An executable builder to add to the batch
   * @returns This BatchBuilder for method chaining
   * @example
   * ```ts
   * const batch = db.batch([]);
   * batch.addRequest(db.from('contacts').list());
   * batch.addRequest(db.from('users').list());
   * const result = await batch.execute();
   * ```
   */
  addRequest<T>(builder: ExecutableBuilder<T>): this {
    this.builders.push(builder);
    return this;
  }

  /**
   * Get the request configuration for this batch operation.
   * This is used internally by the execution system.
   */
  getRequestConfig(): { method: string; url: string; body?: any } {
    // Note: This method is kept for compatibility but batch operations
    // should use execute() directly which handles the full Request/Response flow
    return {
      method: "POST",
      url: `/${this.databaseName}/$batch`,
      body: undefined, // Body is constructed in execute()
    };
  }

  toRequest(baseUrl: string, options?: ExecuteOptions): Request {
    // Batch operations are not designed to be nested, but we provide
    // a basic implementation for interface compliance
    const fullUrl = `${baseUrl}/${this.databaseName}/$batch`;
    return new Request(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "multipart/mixed",
        "OData-Version": "4.0",
      },
    });
  }

  async processResponse(
    response: Response,
    options?: ExecuteOptions,
  ): Promise<Result<any>> {
    // This should not typically be called for batch operations
    // as they handle their own response processing
    return {
      data: undefined,
      error: {
        name: "NotImplementedError",
        message: "Batch operations handle response processing internally",
        timestamp: new Date(),
      } as any,
    };
  }

  /**
   * Execute the batch operation.
   *
   * @param options - Optional fetch options and batch-specific options (includes beforeRequest hook)
   * @returns A tuple of results matching the input builders
   */
  async execute<EO extends ExecuteOptions>(
    options?: RequestInit & FFetchOptions & EO,
  ): Promise<Result<ExtractTupleTypes<Builders>>> {
    const baseUrl = this.context._getBaseUrl?.();
    if (!baseUrl) {
      return {
        data: undefined,
        error: {
          name: "ConfigurationError",
          message:
            "Base URL not available - execution context must implement _getBaseUrl()",
          timestamp: new Date(),
        } as any,
      };
    }

    try {
      // Convert builders to native Request objects
      const requests: Request[] = this.builders.map((builder) =>
        builder.toRequest(baseUrl, options),
      );

      // Format batch request (automatically groups mutations into changesets)
      const { body, boundary } = await formatBatchRequestFromNative(
        requests,
        baseUrl,
      );

      // Execute the batch request
      const response = await this.context._makeRequest<string>(
        `/${this.databaseName}/$batch`,
        {
          ...options,
          method: "POST",
          headers: {
            ...options?.headers,
            "Content-Type": `multipart/mixed; boundary=${boundary}`,
            "OData-Version": "4.0",
          },
          body,
        },
      );

      if (response.error) {
        return { data: undefined, error: response.error };
      }

      // Extract the actual boundary from the response
      // FileMaker uses its own boundary, not the one we sent
      const firstLine =
        response.data.split("\r\n")[0] || response.data.split("\n")[0] || "";
      const actualBoundary = firstLine.startsWith("--")
        ? firstLine.substring(2)
        : boundary;

      // Parse the multipart response
      const contentTypeHeader = `multipart/mixed; boundary=${actualBoundary}`;
      const parsedResponses = parseBatchResponse(
        response.data,
        contentTypeHeader,
      );

      // Check if we got the expected number of responses
      if (parsedResponses.length !== this.builders.length) {
        return {
          data: undefined,
          error: {
            name: "BatchError",
            message: `Expected ${this.builders.length} responses but got ${parsedResponses.length}`,
            timestamp: new Date(),
          } as any,
        };
      }

      // Process each response using the corresponding builder
      // Build tuple by processing each builder in order
      type ResultTuple = ExtractTupleTypes<Builders>;

      // Process builders sequentially to preserve tuple order
      const processedResults: any[] = [];
      for (let i = 0; i < this.originalBuilders.length; i++) {
        const builder = this.originalBuilders[i];
        const parsed = parsedResponses[i];

        if (!builder || !parsed) {
          processedResults.push(undefined);
          continue;
        }

        // Convert parsed response to native Response
        const nativeResponse = parsedToResponse(parsed);

        // Let the builder process its own response
        const result = await builder.processResponse(nativeResponse, options);

        if (result.error) {
          processedResults.push(undefined);
        } else {
          processedResults.push(result.data);
        }
      }

      // Use a type assertion that TypeScript will respect
      // ExtractTupleTypes ensures this is a proper tuple type
      return {
        data: processedResults as unknown as ResultTuple,
        error: undefined,
      };
    } catch (err) {
      return {
        data: undefined,
        error: {
          name: "BatchError",
          message: err instanceof Error ? err.message : "Unknown error",
          timestamp: new Date(),
        } as any,
      };
    }
  }
}
