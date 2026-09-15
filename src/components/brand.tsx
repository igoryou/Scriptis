import { MessagesSquare } from "lucide-react";
export function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark">
        <MessagesSquare size={23} strokeWidth={1.7} aria-hidden="true" />
      </span>
      <span>
        scriptis<span className="brand-dot">.</span>
      </span>
    </span>
  );
}
