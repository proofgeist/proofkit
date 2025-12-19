import { FileText, Database } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Plus } from "lucide-react";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";

interface EmptyStateProps {
  variant: "file-missing" | "empty-config";
  configPath?: string;
  onAddFmdapi?: () => void;
  onAddFmodata?: () => void;
}

export function EmptyState({
  variant,
  configPath,
  onAddFmdapi,
  onAddFmodata,
}: EmptyStateProps) {
  if (variant === "file-missing") {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="rounded-full bg-muted p-6 mb-6">
          <FileText className="w-12 h-12 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">No Config File Found</h2>
        <p className="text-muted-foreground text-center mb-4 max-w-md">
          A config file will be created at the{" "}
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="border-b border-dotted border-muted-foreground cursor-help">
                current working directory
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-md">
              <p className="font-mono text-xs break-all">
                {configPath || "proofkit-typegen.config.json"}
              </p>
            </TooltipContent>
          </Tooltip>
          .
        </p>
        <p className="text-xs text-muted-foreground text-center mb-8 max-w-md">
          Want to create it somewhere else? <br />
          Restart the server with the{" "}
          <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
            --config
          </code>{" "}
          option and specify a file path.
        </p>
        {(onAddFmdapi || onAddFmodata) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="lg" variant="inverse">
                <Plus className="w-4 h-4" />
                Choose Connection Type
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80">
              {onAddFmdapi && (
                <DropdownMenuItem
                  className="flex flex-col items-start gap-1 p-4 cursor-pointer"
                  onClick={onAddFmdapi}
                >
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-base">Data API</p>
                    <Badge shape="circle" appearance="light" variant="info">
                      Legacy
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Reads/writes data using layout-specific context
                  </div>
                </DropdownMenuItem>
              )}
              {onAddFmodata && (
                <DropdownMenuItem
                  className="flex flex-col items-start gap-1 p-4 cursor-pointer"
                  onClick={onAddFmodata}
                >
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-base">OData</p>
                    <Badge shape="circle" appearance="light" variant="success">
                      New
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Reads/writes data directly to the database tables, using the
                    relationship graph as context
                  </div>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  }

  // Empty config state
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="rounded-full bg-muted p-6 mb-6">
        <Database className="w-12 h-12 text-muted-foreground" />
      </div>
      <h2 className="text-2xl font-semibold mb-2">No Connections Yet</h2>
      <p className="text-muted-foreground text-center mb-8 max-w-md">
        Add your first FileMaker connection to get started
      </p>
      {(onAddFmdapi || onAddFmodata) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="lg" variant="inverse">
              <Plus className="w-4 h-4" />
              Add Connection
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80">
            {onAddFmdapi && (
              <DropdownMenuItem
                className="flex flex-col items-start gap-1 p-4 cursor-pointer"
                onClick={onAddFmdapi}
              >
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-base">Data API</p>
                  <Badge shape="circle" appearance="light" variant="info">
                    Legacy
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Reads/writes data using layout-specific context
                </div>
              </DropdownMenuItem>
            )}
            {onAddFmodata && (
              <DropdownMenuItem
                className="flex flex-col items-start gap-1 p-4 cursor-pointer"
                onClick={onAddFmodata}
              >
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-base">OData</p>
                  <Badge shape="circle" appearance="light" variant="success">
                    New
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Reads/writes data directly to the database tables, using the
                  relationship graph as context
                </div>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
