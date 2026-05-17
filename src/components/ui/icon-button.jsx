export const IconButton = ({ children, title, onClick, className = "", active = false }) => (
  <button
    type="button"
    className={`button ${active ? "button-active" : ""} ${className}`}
    onClick={onClick}
    title={title}
  >
    {children}
  </button>
);
