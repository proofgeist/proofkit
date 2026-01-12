import { InfoIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function InfoTooltip({ label }: { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger>
        <InfoIcon className="h-3 w-3" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs whitespace-pre-line break-words">{label}</TooltipContent>
    </Tooltip>
  );
}
