import React, { useEffect, useRef } from "react";
import "../styles/modal.css";

export default function Modal({
  isOpen,
  onClose,
  title,
  fields = [],
  formData = {},
  onChange = () => {},
  errors = {},
  onSubmit,
  loading,
  actions,
  submitLabel = "Submit",
  children,
  submitDisabled = false,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("no-scroll");
    } else {
      document.body.classList.remove("no-scroll");
    }
    return () => document.body.classList.remove("no-scroll");
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e) => {
        if (e.key === "Escape") {
          onClose();
        }
      };
      window.addEventListener("keydown", handleKeyDown);

      return () => {
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shouldShowForm =
    (fields && fields.length > 0) || children || submitLabel;

  return (
    <div
      className="overlay-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      style={{ pointerEvents: "auto", zIndex: 9999 }}
    >
      <div className="form-wrapper" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>
          &times;
        </button>

        <h2 className="form-title">{title}</h2>

        {shouldShowForm && (
          <form onSubmit={onSubmit} className="form-container">
            {children ? (
              React.Children.map(children, (child, index) =>
                index === 0 &&
                React.isValidElement(child) &&
                child.type === "input"
                  ? React.cloneElement(child, { ref: inputRef })
                  : child,
              )
            ) : (
              <>
                {fields.map(({ label, name, type, options }, idx) => (
                  <div className="form-group" key={name}>
                    <label htmlFor={name} className="form-label">
                      {label}
                    </label>

                    {type === "select" ? (
                      <select
                        id={name}
                        name={name}
                        value={formData[name] || ""}
                        onChange={onChange}
                        className={`form-input${errors[name] ? " error" : ""}`}
                      >
                        <option value="">-- Select --</option>
                        {options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        ref={idx === 0 ? inputRef : null} // Focus first input from fields
                        type={type || "text"}
                        id={name}
                        name={name}
                        value={formData[name] || ""}
                        onChange={onChange}
                        className={`form-input${errors[name] ? " error" : ""}`}
                      />
                    )}

                    {errors[name] && (
                      <p className="error-message">{errors[name]}</p>
                    )}
                  </div>
                ))}

                {errors.form && <p className="error-message">{errors.form}</p>}

                {submitLabel && (
                  <button
                    type="submit"
                    className="button-primary"
                    disabled={loading || submitDisabled}
                  >
                    {loading ? "Loading..." : submitLabel}
                  </button>
                )}
              </>
            )}
          </form>
        )}

        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  );
}
