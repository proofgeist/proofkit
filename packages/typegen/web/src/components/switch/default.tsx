import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function SwitchDemo() {
  return (
    <div className="flex items-center space-x-2">
      <Switch defaultChecked id="auto-update" />
      <Label htmlFor="auto-update">Auto update</Label>
    </div>
  );
}
