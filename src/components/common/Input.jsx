import React from "react";

const Input = ({
  label,
  type = "text",
  name,
  value,
  onChange,
  placeholder = "",
  error = "",
  required = false,
}) => {
  return (
    <div className="input-group">
      <label htmlFor={name}>
        {label}
        {required && <span className="required">*</span>}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={error ? "input-error" : ""}
      />

      {error && <span className="field-error">{error}</span>}
    </div>
  );
};

export default Input;