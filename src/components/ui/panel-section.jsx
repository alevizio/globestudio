import { useState } from "react";
import { ChevronDown } from "../icons.jsx";

export const PanelSection = ({ title, children, icon, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <details className="option-block" open={isOpen} onToggle={(event) => setIsOpen(event.currentTarget.open)}>
      <summary>
        {icon}
        <span>{title}</span>
        <ChevronDown size={17} />
      </summary>
      <div className="option-content">{children}</div>
    </details>
  );
};
