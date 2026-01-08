export function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      className={`k-btn k-btn-primary ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, className = "", ...props }) {
  return (
    <button
      className={`k-btn k-btn-ghost ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
