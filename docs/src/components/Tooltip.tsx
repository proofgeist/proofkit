import { type ReactNode, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  content: string;
  children: ReactNode;
  delay?: number;
  variant?: "default" | "success";
}

export function Tooltip({
  content,
  children,
  delay = 0,
  variant = "default",
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top + rect.height / 2 + window.scrollY,
        left: rect.left + window.scrollX, // Position at the left edge of the trigger
      });
    }
  }, [isVisible]);

  const bgColor =
    variant === "success"
      ? "bg-green-600 dark:bg-green-700"
      : "bg-gray-900 dark:bg-gray-700";

  const arrowColor =
    variant === "success"
      ? "border-l-green-600 dark:border-l-green-700"
      : "border-l-gray-900 dark:border-l-gray-700";

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={() => setTimeout(() => setIsVisible(true), delay)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible &&
        createPortal(
          <div
            className="fixed transform -translate-y-1/2 pointer-events-none"
            style={{ top: position.top, left: position.left }}
          >
            <div
              className={`px-2 py-1 text-xs text-white rounded shadow-lg whitespace-nowrap mr-2 translate-x-[-100%] ${bgColor}`}
            >
              {content}
              <div
                className={`absolute top-1/2 right-[-4px] -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-l-4 ${arrowColor}`}
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
