import { InfoIcon } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";

export function InfoTooltip({ label }: { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger>
        <InfoIcon className="w-3 h-3" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs whitespace-pre-line break-words">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
