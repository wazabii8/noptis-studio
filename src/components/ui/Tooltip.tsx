import {
  type MouseEvent,
  type ReactNode,
  useState,
} from "react";
import { createPortal } from "react-dom";

type TooltipProps = {
  text: string;
  children: ReactNode;
};

type Position = {
  x: number;
  y: number;
};

export function Tooltip({ text, children }: TooltipProps) {
  const [position, setPosition] = useState<Position | null>(null);

  function handleMouseMove(event: MouseEvent<HTMLSpanElement>) {
    setPosition({
      x: event.clientX,
      y: event.clientY,
    });
  }

  function handleMouseLeave() {
    setPosition(null);
  }

  return (
    <>
      <span
        className="inline-flex"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </span>

      {position &&
        createPortal(
          <span
            role="tooltip"
            className="
              pointer-events-none
              fixed z-[9999]
              -translate-x-1/2 -translate-y-full
              whitespace-nowrap rounded-md
              bg-gray-800 px-2.5 py-1.5
              text-xs text-white
            "
            style={{
              left: position.x,
              top: position.y - 10,
            }}
          >
            {text}

            <span
              className="
                absolute left-1/2 top-full
                -translate-x-1/2
                border-[5px] border-transparent
                border-t-gray-800
              "
            />
          </span>,
          document.body,
        )}
    </>
  );
}