"use client";

import { useId } from "react";
import { Label } from "@/components/ui/label";
import { Switch, SwitchWrapper } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { InfoTooltip } from "../InfoTooltip";

interface SwitchFieldProps {
  id?: string;
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
    <div
      className={cn(
        "relative flex w-full gap-2 rounded-lg border border-input p-4",
        description ? "items-start" : "items-center",
        "has-[data-state=checked]:border-primary",
        "transition-colors",
        className,
      )}
    >
      <SwitchWrapper>
        <Switch
          id={switchId}
          size={size}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          className="order-1"
          aria-describedby={description ? descriptionId : undefined}
        />
      </SwitchWrapper>
      <div
        className={cn("grow", description ? "grid gap-2" : "flex items-center")}
      >
        <Label htmlFor={switchId}>
          {label} {infoTooltip && <InfoTooltip label={infoTooltip} />}
        </Label>
        {description && (
          <p id={descriptionId} className="text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
