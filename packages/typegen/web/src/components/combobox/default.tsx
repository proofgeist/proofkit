"use client";

import { useState } from "react";
import { Button, ButtonArrow } from "@/components/ui/button";
import {
  Command,
  CommandCheck,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const topCities = [
  {
    value: "amsterdam",
    label: "Amsterdam, Netherlands",
  },
  {
    value: "london",
    label: "London, UK",
  },
  {
    value: "paris",
    label: "Paris, France",
  },
  {
    value: "tokyo",
    label: "Tokyo, Japan",
  },
  {
    value: "new_york",
    label: "New York, USA",
  },
  {
    value: "dubai",
    label: "Dubai, UAE",
  },
];

export default function ComboboxDemo() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className="w-[200px]"
          mode="input"
          placeholder={!value}
          role="combobox"
          variant="outline"
        >
          <span className={cn("truncate")}>
            {value ? topCities.find((city) => city.value === value)?.label : "Select city..."}
          </span>
          <ButtonArrow />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popper-anchor-width) p-0">
        <Command>
          <CommandInput placeholder="Search city..." />
          <CommandList>
            <CommandEmpty>No city found.</CommandEmpty>
            <CommandGroup>
              {topCities.map((city) => (
                <CommandItem
                  key={city.value}
                  onSelect={(currentValue) => {
                    setValue(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                  value={city.value}
                >
                  <span className="truncate">{city.label}</span>
                  {value === city.value && <CommandCheck />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
