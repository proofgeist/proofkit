import { Euro, TicketPercent, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, InputWrapper } from "@/components/ui/input";

export default function InputDemo() {
  return (
    <div className="w-80 space-y-5">
      <InputWrapper>
        <Euro />
        <Input placeholder="Start icon" type="email" />
      </InputWrapper>
      <InputWrapper>
        <Input placeholder="End icon" type="email" />
        <TicketPercent />
      </InputWrapper>
      <InputWrapper>
        <Button className="-ms-0.5 size-5" mode="icon" size="sm" variant="dim">
          <User />
        </Button>
        <Input placeholder="Start clickble icon" type="email" />
      </InputWrapper>
      <InputWrapper>
        <Input placeholder="End clickble icon" type="email" />
        <Button className="-me-0.5 size-5" mode="icon" size="sm" variant="dim">
          <X />
        </Button>
      </InputWrapper>
    </div>
  );
}
