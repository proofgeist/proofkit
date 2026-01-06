import { Database, FileText, Plus } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface EmptyStateProps {
  variant: "file-missing" | "empty-config";
  configPath?: string;
  onAddFmdapi?: () => void;
  onAddFmodata?: () => void;
}

export function EmptyState({ variant, configPath, onAddFmdapi, onAddFmodata }: EmptyStateProps) {
  if (variant === "file-missing") {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-16">
        <div className="mb-6 rounded-full bg-muted p-6">
          <FileText className="h-12 w-12 text-muted-foreground" />
        </div>
        <h2 className="mb-2 font-semibold text-2xl">No Config File Found</h2>
        <p className="mb-4 max-w-md text-center text-muted-foreground">
          A config file will be created at the{" "}
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help border-muted-foreground border-b border-dotted">
                current working directory
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-md">
              <p className="break-all font-mono text-xs">{configPath || "proofkit-typegen.config.json"}</p>
            </TooltipContent>
          </Tooltip>
          .
        </p>
        <p className="mb-8 max-w-md text-center text-muted-foreground text-xs">
          Want to create it somewhere else? <br />
          Restart the server with the <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">--config</code>{" "}
          option and specify a file path.
        </p>
        {(onAddFmdapi || onAddFmodata) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="lg" variant="inverse">
                <Plus className="h-4 w-4" />
                Choose Connection Type
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80">
              {onAddFmdapi && (
                <DropdownMenuItem className="flex cursor-pointer flex-col items-start gap-1 p-4" onClick={onAddFmdapi}>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-base">Data API</p>
                    <Badge appearance="light" shape="circle" variant="info">
                      Legacy
                    </Badge>
                  </div>
                  <div className="text-muted-foreground text-sm">Reads/writes data using layout-specific context</div>
                </DropdownMenuItem>
              )}
              {onAddFmodata && (
                <DropdownMenuItem className="flex cursor-pointer flex-col items-start gap-1 p-4" onClick={onAddFmodata}>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-base">OData</p>
                    <Badge appearance="light" shape="circle" variant="success">
                      New
                    </Badge>
                  </div>
                  <div className="text-muted-foreground text-sm">
                    Reads/writes data directly to the database tables, using the relationship graph as context
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
    <div className="flex flex-col items-center justify-center px-4 py-16">
      <div className="mb-6 rounded-full bg-muted p-6">
        <Database className="h-12 w-12 text-muted-foreground" />
      </div>
      <h2 className="mb-2 font-semibold text-2xl">No Connections Yet</h2>
      <p className="mb-8 max-w-md text-center text-muted-foreground">
        Add your first FileMaker connection to get started
      </p>
      {(onAddFmdapi || onAddFmodata) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="lg" variant="inverse">
              <Plus className="h-4 w-4" />
              Add Connection
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80">
            {onAddFmdapi && (
              <DropdownMenuItem className="flex cursor-pointer flex-col items-start gap-1 p-4" onClick={onAddFmdapi}>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-base">Data API</p>
                  <Badge appearance="light" shape="circle" variant="info">
                    Legacy
                  </Badge>
                </div>
                <div className="text-muted-foreground text-sm">Reads/writes data using layout-specific context</div>
              </DropdownMenuItem>
            )}
            {onAddFmodata && (
              <DropdownMenuItem className="flex cursor-pointer flex-col items-start gap-1 p-4" onClick={onAddFmodata}>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-base">OData</p>
                  <Badge appearance="light" shape="circle" variant="success">
                    New
                  </Badge>
                </div>
                <div className="text-muted-foreground text-sm">
                  Reads/writes data directly to the database tables, using the relationship graph as context
                </div>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
