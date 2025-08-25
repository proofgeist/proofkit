export function showErrorNotification(): void;
export function showErrorNotification(message: string): void;
export function showErrorNotification(args?: string): void {
  const message =
    typeof args === "string" ? args : "An unexpected error occurred.";
  // TODO: Replace with your preferred toast library
  if (typeof window !== "undefined") console.error(message);
}

export function showSuccessNotification(): void;
export function showSuccessNotification(message: string): void;
export function showSuccessNotification(args?: string): void {
  const message = typeof args === "string" ? args : "Success!";
  // TODO: Replace with your preferred toast library
  if (typeof window !== "undefined") console.log(message);
}
