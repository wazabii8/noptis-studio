import type { ReactNode } from "react";

type TooltipProps = {
  text: string;
  children: ReactNode;
};

export function Tooltip({ text, children }: TooltipProps) {
  return (
    <span className="group relative inline-flex">
      {children}

      <span
        role="tooltip"
        className="
          pointer-events-none
          invisible absolute bottom-[calc(100%+8px)] left-1/2 z-50
          -translate-x-1/2
          whitespace-nowrap rounded-md
          bg-gray-800 px-2.5 py-1.5
          text-xs text-white
          opacity-0
          transition-opacity duration-150
          group-hover:visible group-hover:opacity-100
          group-focus-within:visible group-focus-within:opacity-100
        "
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
      </span>
    </span>
  );
}