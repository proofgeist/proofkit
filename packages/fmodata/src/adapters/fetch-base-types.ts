/**
 * Base options for fetch-based adapters
 */
export type BaseFetchAdapterOptions = {
  server: string;
  database: string;
  /**
   * Disable SSL certificate verification (useful for localhost/development)
   * WARNING: Only use in development environments!
   */
  rejectUnauthorized?: boolean;
};

