import type { SVGProps } from "react";

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

function IconFrame({ size = 16, children, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return <IconFrame size={12} {...props}><path d="M6 9l6 6l6 -6" /></IconFrame>;
}

export function PlusIcon(props: IconProps) {
  return <IconFrame size={14} {...props}><path d="M12 5l0 14" /><path d="M5 12l14 0" /></IconFrame>;
}

export function SearchIcon(props: IconProps) {
  return <IconFrame size={14} {...props}><path d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /><path d="M21 21l-6 -6" /></IconFrame>;
}

export function LayoutSidebarIcon(props: IconProps) {
  return <IconFrame size={20} {...props}><path d="M4 6a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2l0 -12" /><path d="M9 4l0 16" /></IconFrame>;
}

export function MicrophoneIcon(props: IconProps) {
  return <IconFrame {...props}><path d="M9 5a3 3 0 0 1 3 -3a3 3 0 0 1 3 3v5a3 3 0 0 1 -3 3a3 3 0 0 1 -3 -3l0 -5" /><path d="M5 10a7 7 0 0 0 14 0" /><path d="M8 21l8 0" /><path d="M12 17l0 4" /></IconFrame>;
}

export function ArrowUpIcon(props: IconProps) {
  return <IconFrame {...props}><path d="M12 5l0 14" /><path d="M18 11l-6 -6" /><path d="M6 11l6 -6" /></IconFrame>;
}

export function WandIcon(props: IconProps) {
  return <IconFrame {...props}><path d="M6 21l15 -15l-3 -3l-15 15l3 3" /><path d="M15 6l3 3" /><path d="M9 3a2 2 0 0 0 2 2a2 2 0 0 0 -2 2a2 2 0 0 0 -2 -2a2 2 0 0 0 2 -2" /><path d="M19 13a2 2 0 0 0 2 2a2 2 0 0 0 -2 2a2 2 0 0 0 -2 -2a2 2 0 0 0 2 -2" /></IconFrame>;
}

export function FlaskIcon(props: IconProps) {
  return <IconFrame {...props}><path d="M9 3l6 0" /><path d="M10 9l4 0" /><path d="M10 3v6l-4 11a.7 .7 0 0 0 .5 1h11a.7 .7 0 0 0 .5 -1l-4 -11v-6" /></IconFrame>;
}

export function BookmarksIcon(props: IconProps) {
  return <IconFrame {...props}><path d="M15 10v11l-5 -3l-5 3v-11a3 3 0 0 1 3 -3h4a3 3 0 0 1 3 3" /><path d="M11 3h5a3 3 0 0 1 3 3v11" /></IconFrame>;
}

export function MessageQuestionIcon(props: IconProps) {
  return <IconFrame {...props}><path d="M8 9h8" /><path d="M8 13h6" /><path d="M14 18h-1l-5 3v-3h-2a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v4.5" /><path d="M19 22v.01" /><path d="M19 19a2.003 2.003 0 0 0 .914 -3.782a1.98 1.98 0 0 0 -2.414 .483" /></IconFrame>;
}

export function RefreshIcon(props: IconProps) {
  return <IconFrame size={14} {...props}><path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" /><path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" /></IconFrame>;
}
