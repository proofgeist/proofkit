"use client";

import { useId } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { InfoTooltip } from "../InfoTooltip";

interface SwitchFieldProps {
  id?: string;
  topLabel?: string;
  topLabelTooltip?: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  infoTooltip?: string;
}

export function SwitchField({
  id,
  topLabel,
  topLabelTooltip,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  className,
  size = "sm",
  infoTooltip,
}: SwitchFieldProps) {
  const generatedId = useId();
  const switchId = id || generatedId;
  const descriptionId = `${switchId}-description`;

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <div className="flex min-h-[20px] items-center gap-2">
        <Label
          className={cn(
            "flex items-center gap-1 font-medium text-foreground",
            topLabel ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          htmlFor={switchId}
        >
          {topLabel}
          {topLabelTooltip && <InfoTooltip label={topLabelTooltip} />}
        </Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          aria-describedby={description ? descriptionId : undefined}
          checked={checked}
          disabled={disabled}
          id={switchId}
          onCheckedChange={onCheckedChange}
          size={size}
        />
        <Label
          className="flex cursor-pointer items-center gap-1.5 font-normal text-foreground text-sm"
          htmlFor={switchId}
        >
          {label}
          {infoTooltip && <InfoTooltip label={infoTooltip} />}
        </Label>
      </div>
    </div>
  );
}
