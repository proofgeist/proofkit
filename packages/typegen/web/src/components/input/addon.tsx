import { Euro, TicketPercent } from "lucide-react";
import { Input, InputAddon, InputGroup } from "@/components/ui/input";

export default function InputDemo() {
  return (
    <div className="w-80 space-y-5">
      <InputGroup>
        <InputAddon>Addon</InputAddon>
        <Input placeholder="Start addon" type="email" />
      </InputGroup>
      <InputGroup>
        <Input placeholder="End addon" type="email" />
        <InputAddon>Addon</InputAddon>
      </InputGroup>
      <InputGroup>
        <InputAddon mode="icon">
          <Euro />
        </InputAddon>
        <Input placeholder="Start icon addon" type="email" />
      </InputGroup>
      <InputGroup>
        <Input placeholder="End icon addon" type="email" />
        <InputAddon mode="icon">
          <TicketPercent />
        </InputAddon>
      </InputGroup>
    </div>
  );
}
