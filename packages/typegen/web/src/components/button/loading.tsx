"use client";

import { LoaderCircleIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function ButtonDemo() {
  const [isDisabled, setIsDisabled] = useState(false);

  useEffect(() => {
    // Automatically toggle button state every 4 seconds
    const interval = setInterval(() => {
      setIsDisabled((prev) => !prev);
    }, 1000);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-4">
      <Button disabled={isDisabled} variant="primary">
        {isDisabled ? <LoaderCircleIcon className="size-4 animate-spin" /> : null}
        {isDisabled ? "Submitting..." : "Submit"}
      </Button>
    </div>
  );
}
