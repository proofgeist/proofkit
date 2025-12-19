import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { client } from "../lib/api";

/**
 * Simple health check function that pings the config endpoint.
 * Returns true if server is reachable, false otherwise.
 */
async function checkHealth(): Promise<boolean> {
  try {
    const res = await client.api.config.$get();
    return res.ok;
  } catch (error) {
    // Connection errors indicate server is down
    return false;
  }
}

/**
 * Hook to periodically check if the server is reachable.
 * Returns true if the server is healthy, false if unreachable.
 * Only reports unhealthy after having had at least one successful connection.
 */
export function useHealthCheck(options?: {
  interval?: number; // Polling interval in milliseconds (default: 5000)
  enabled?: boolean; // Whether to enable health checking (default: true)
}) {
  const { interval = 5000, enabled = true } = options || {};
  const hasConnectedRef = useRef(false); // Track if we've ever successfully connected

  const { data, isFetching: isChecking } = useQuery({
    queryKey: ["health-check"],
    queryFn: checkHealth,
    enabled,
    refetchInterval: interval,
    retry: false, // Don't retry - we want to detect failures immediately
    staleTime: 0, // Always consider stale to ensure polling
    gcTime: 0, // Don't cache health check results
  });

  // Determine health status
  // If we got a successful response (data === true), mark as healthy and track connection
  // If we got data === false, only report unhealthy if we've connected before
  let isHealthy: boolean;
  if (data === true) {
    hasConnectedRef.current = true;
    isHealthy = true;
  } else if (data === false) {
    // Only report unhealthy if we've connected before
    // This prevents false positives on initial page load
    isHealthy = hasConnectedRef.current ? false : true;
  } else {
    // Still loading or no data yet - default to healthy
    isHealthy = true;
  }

  return {
    isHealthy,
    isChecking,
  };
}
