export {
  Check,
  ChevronDown,
  Clipboard,
  Download,
  Globe,
  Globe2,
  GripHorizontal,
  GripVertical,
  Minus,
  Move,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RotateCcw,
  Share2,
  Shuffle,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

export { Map as MapIcon } from "lucide-react";

// Branded dotted-globe mark — mirrors the favicon at /public/favicon.svg so
// the icon used in the panel header reads as the wordmark, not a generic
// outline. Dots are positioned on a roughly Fibonacci-sphere grid clipped to
// a 32x32 viewBox; the surrounding rect is omitted because the icon container
// already provides the chrome.
export const DottedGlobe = ({ size = 20, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <circle cx="16" cy="6" r="1.1" />
    <circle cx="11" cy="8" r="1.1" /><circle cx="16" cy="8" r="1.1" /><circle cx="21" cy="8" r="1.1" />
    <circle cx="8" cy="11" r="1.1" /><circle cx="13" cy="11" r="1.1" /><circle cx="19" cy="11" r="1.1" /><circle cx="24" cy="11" r="1.1" />
    <circle cx="6" cy="14" r="1.1" /><circle cx="11" cy="14" r="1.1" /><circle cx="16" cy="14" r="1.1" /><circle cx="21" cy="14" r="1.1" /><circle cx="26" cy="14" r="1.1" />
    <circle cx="6" cy="18" r="1.1" /><circle cx="11" cy="18" r="1.1" /><circle cx="16" cy="18" r="1.1" /><circle cx="21" cy="18" r="1.1" /><circle cx="26" cy="18" r="1.1" />
    <circle cx="8" cy="21" r="1.1" /><circle cx="13" cy="21" r="1.1" /><circle cx="19" cy="21" r="1.1" /><circle cx="24" cy="21" r="1.1" />
    <circle cx="11" cy="24" r="1.1" /><circle cx="16" cy="24" r="1.1" /><circle cx="21" cy="24" r="1.1" />
    <circle cx="16" cy="26" r="1.1" />
  </svg>
);

export const Github = ({ size = 24, ...props }) => (
  <svg
    className="lucide lucide-github"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.4c.58.11.79-.25.79-.55v-2.04c-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.19 1.18a11.05 11.05 0 0 1 5.81 0c2.22-1.49 3.19-1.18 3.19-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.4-5.27 5.69.41.36.78 1.06.78 2.14v3.18c0 .3.21.67.8.55A11.5 11.5 0 0 0 12 .5Z" />
  </svg>
);

export const Twitter = ({ size = 24, ...props }) => (
  <svg
    className="lucide lucide-twitter"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);
