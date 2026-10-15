import React from "react";

const Button = ({
  children,
  type = "button",
  onClick,
  disabled = false,
  loading = false,
  className = "",
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`common-button ${className}`}
    >
      {loading ? "Signing in..." : children}
    </button>
  );
};

export default Button;