import { Check } from "lucide-react";

/**
 * Reusable component for rendering boolean values in table cells
 * Shows a green checkmark when true, dash when false/undefined
 */
export function BooleanCell({ value }: { value: boolean | undefined }) {
  return (
    <div className="flex items-center justify-center">
      {value === true ? <Check className="size-4 text-green-600" /> : <span className="text-muted-foreground">-</span>}
    </div>
  );
}
