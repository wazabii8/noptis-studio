import {type ReactNode} from "react";

type IconProps = {
  className?: string;
};

// Stroke icons drawn on a 24px grid. They inherit the text colour and are hidden from assistive technology,
// so the surrounding button or link must carry the accessible name.
function StrokeIcon({className, strokeWidth = 2, children}: IconProps & {strokeWidth?: number; children: ReactNode}) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return <StrokeIcon {...props} strokeWidth={2.2}><path d="M12 5v14M5 12h14" /></StrokeIcon>;
}

export function PencilIcon(props: IconProps) {
  return <StrokeIcon {...props}><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></StrokeIcon>;
}

export function TrashIcon(props: IconProps) {
  return <StrokeIcon {...props}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></StrokeIcon>;
}

export function SearchIcon(props: IconProps) {
  return <StrokeIcon {...props}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></StrokeIcon>;
}

export function CopyIcon(props: IconProps) {
  return <StrokeIcon {...props}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h8" /></StrokeIcon>;
}

export function CheckIcon(props: IconProps) {
  return <StrokeIcon {...props} strokeWidth={2.4}><path d="m5 12.5 4.5 4.5L19 7.5" /></StrokeIcon>;
}

export function ChevronRightIcon(props: IconProps) {
  return <StrokeIcon {...props} strokeWidth={2.2}><path d="m9 6 6 6-6 6" /></StrokeIcon>;
}

export function ChevronDownIcon(props: IconProps) {
  return <StrokeIcon {...props}><path d="m6 9 6 6 6-6" /></StrokeIcon>;
}

export function AlertIcon(props: IconProps) {
  return <StrokeIcon {...props}><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5v.01" /></StrokeIcon>;
}

export function SyncIcon(props: IconProps) {
  return <StrokeIcon {...props}><path d="M4 11a8 8 0 0 1 13.7-4.7L20 9m0-5v5h-5M20 13a8 8 0 0 1-13.7 4.7L4 15m0 5v-5h5" /></StrokeIcon>;
}

export function XIcon(props: IconProps) {
  return <StrokeIcon {...props} strokeWidth={2.2}><path d="M6 6l12 12M18 6 6 18" /></StrokeIcon>;
}

export function InfoIcon(props: IconProps) {
  return <StrokeIcon {...props}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8v.01" /></StrokeIcon>;
}

export function ArrowRightIcon(props: IconProps) {
  return <StrokeIcon {...props} strokeWidth={2.2}><path d="M5 12h14M13 6l6 6-6 6" /></StrokeIcon>;
}

/** Nine dots, the GID layouts symbol. Filled rather than stroked. */
export function GridIcon({className}: IconProps) {
  const dots = [6, 12, 18].flatMap(y => [6, 12, 18].map(x => ({x, y})));

  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {dots.map(({x, y}) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.8" />)}
    </svg>
  );
}

export function CloudIcon(props: IconProps) {
  return <StrokeIcon {...props}><path d="M7 18a4.5 4.5 0 0 1-.5-8.97A6 6 0 0 1 18 8.5a4.25 4.25 0 0 1-.5 9.5z" /></StrokeIcon>;
}

export function CloudCheckIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M7 18a4.5 4.5 0 0 1-.5-8.97A6 6 0 0 1 18 8.5a4.25 4.25 0 0 1-.5 9.5z" /><path d="m9.5 13 2 2 3.5-3.5" />
    </StrokeIcon>
  );
}

export function LogOutIcon(props: IconProps) {
  return <StrokeIcon {...props}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l-5-5 5-5M5 12h11" /></StrokeIcon>;
}

export function HashIcon(props: IconProps) {
  return <StrokeIcon {...props}><path d="M5 9h14M5 15h14M10 4 8 20M16 4l-2 16" /></StrokeIcon>;
}

export function ListIcon(props: IconProps) {
  return <StrokeIcon {...props}><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /></StrokeIcon>;
}

export function CodeIcon(props: IconProps) {
  return <StrokeIcon {...props}><path d="m8 8-4 4 4 4M16 8l4 4-4 4" /></StrokeIcon>;
}
