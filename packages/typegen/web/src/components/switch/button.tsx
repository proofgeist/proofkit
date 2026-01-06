import { useId } from "react";
import { Switch, SwitchIndicator, SwitchWrapper } from "@/components/ui/switch";

export default function SwitchDemo() {
  const id = useId();

  return (
    <div className="flex items-center space-x-2.5">
      <SwitchWrapper className="inline-grid w-60" permanent={true}>
        <Switch className="h-9 w-full rounded-md" id={id} size="xl" thumbClassName="rounded-md" />
        <SwitchIndicator className="w-1/2 text-accent-foreground peer-data-[state=unchecked]:text-primary" state="on">
          Partial upload
        </SwitchIndicator>
        <SwitchIndicator className="w-1/2 text-accent-foreground peer-data-[state=checked]:text-primary" state="off">
          Full upload
        </SwitchIndicator>
      </SwitchWrapper>
    </div>
  );
}
