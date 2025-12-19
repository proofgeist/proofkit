import { Folder } from "lucide-react";
import { type SingleConfig } from "../lib/config-utils";
import { Badge } from "./ui/badge";

export function ConfigSummary({ config }: { config: SingleConfig }) {
  return (
    <div className="flex items-center gap-2">
      <Badge
        variant={
          config.type === "fmdapi"
            ? "info" // purple
            : config.type === "fmodata"
              ? "success" // green
              : "secondary"
        }
        shape="circle"
        appearance="light"
      >
        {config?.type.toUpperCase()}
      </Badge>
      {config.configName ? (
        <>
          <h2>{config.configName}</h2>
          <p className="text-sm text-muted-foreground inline-flex items-center gap-1">
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
