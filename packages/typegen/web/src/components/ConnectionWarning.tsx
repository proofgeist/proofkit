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
    <div className="fixed inset-0 bg-background/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-8 max-w-md w-full shadow-lg">
        <div className="flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h2 className="text-2xl font-semibold text-destructive mb-3">
              UI Server Unavailable
            </h2>
            <p className="text-destructive/90 mb-6">
              Did you stop the @proofkit/typegen ui command?
            </p>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                To resolve this, you can:
              </p>
              <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                <li>Close this browser tab or window</li>
                <li>Refresh the page if you plan to reconnect</li>
                <li>Rerun the @proofkit/ui command</li>
              </ul>
            </div>
            <div className="flex gap-3 mt-6">
              <Button onClick={handleRefresh} className="flex-1">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Page
              </Button>
              <Button
                onClick={() => {
                  // Try to close the window/tab
                  // Note: This may not work in all browsers if the tab wasn't opened by script
                  try {
                    window.close();
                  } catch (err) {
                    // If closing fails, just show a message
                    alert(
                      "Please close this tab manually. Some browsers prevent closing tabs that weren't opened by script.",
                    );
                  }
                }}
                variant="outline"
                className="flex-1"
              >
                <X className="w-4 h-4 mr-2" />
                Close Tab
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
