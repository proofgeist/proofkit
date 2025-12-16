"use client";

import { useId } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { InfoTooltip } from "../InfoTooltip";

interface SwitchFieldProps {
  id?: string;
  topLabel?: string;
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
      <div className="flex items-center gap-2 min-h-[20px]">
        <Label
          htmlFor={switchId}
          className={cn(
            "font-medium text-foreground opacity-0 pointer-events-none",
            topLabel ? "opacity-100" : "opacity-0",
          )}
        >
          {topLabel}
        </Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id={switchId}
          size={size}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          aria-describedby={description ? descriptionId : undefined}
        />
        <Label
          htmlFor={switchId}
          className="font-normal text-sm text-foreground cursor-pointer flex items-center gap-1.5"
        >
          {label}
          {infoTooltip && <InfoTooltip label={infoTooltip} />}
        </Label>
      </div>
    </div>
  );
}
