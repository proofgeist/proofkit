import { Folder } from "lucide-react";
import type { SingleConfig } from "../lib/config-utils";
import { Badge } from "./ui/badge";

export function ConfigSummary({ config }: { config: SingleConfig }) {
  return (
    <div className="flex items-center gap-2">
      <Badge
        appearance="light"
        shape="circle"
        variant={(() => {
          if (config.type === "fmdapi") {
            // purple
            return "info";
          }
          if (config.type === "fmodata") {
            // green
            return "success";
          }
          return "secondary";
        })()}
      >
        {config?.type.toUpperCase()}
      </Badge>
      {config.configName ? (
        <>
          <h2>{config.configName}</h2>
          <p className="inline-flex items-center gap-1 text-muted-foreground text-sm">
            <Folder className="size-3" />
            {config.path}
          </p>
        </>
      ) : (
        <h2 className="inline-flex items-center gap-1">
          <Folder className="size-4" /> {config.path}
        </h2>
      )}
    </div>
  );
}

export default ConfigSummary;
