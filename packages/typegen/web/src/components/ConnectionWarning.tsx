import { AlertTriangle, RefreshCw, X } from "lucide-react";
import { Button } from "./ui/button";

interface ConnectionWarningProps {
  onRefresh?: () => void;
}

export function ConnectionWarning({ onRefresh }: ConnectionWarningProps) {
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-destructive/50 bg-destructive/10 p-8 shadow-lg">
        <div className="flex items-start gap-4">
          <AlertTriangle className="mt-0.5 h-6 w-6 flex-shrink-0 text-destructive" />
          <div className="flex-1">
            <h2 className="mb-3 font-semibold text-2xl text-destructive">UI Server Unavailable</h2>
            <p className="mb-6 text-destructive/90">Did you stop the @proofkit/typegen ui command?</p>
            <div className="space-y-3">
              <p className="text-muted-foreground text-sm">To resolve this, you can:</p>
              <ul className="list-inside list-disc space-y-2 text-muted-foreground text-sm">
                <li>Close this browser tab or window</li>
                <li>Refresh the page if you plan to reconnect</li>
                <li>Rerun the @proofkit/ui command</li>
              </ul>
            </div>
            <div className="mt-6 flex gap-3">
              <Button className="flex-1" onClick={handleRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Page
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  // Try to close the window/tab
                  // Note: This may not work in all browsers if the tab wasn't opened by script
                  try {
                    window.close();
                  } catch (_err) {
                    // If closing fails, the user can manually close the tab
                    // Some browsers prevent closing tabs that weren't opened by script
                  }
                }}
                variant="outline"
              >
                <X className="mr-2 h-4 w-4" />
                Close Tab
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
