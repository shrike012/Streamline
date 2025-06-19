import React from 'react';
import '../styles/modal.css';

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
  submitLabel = 'Submit',
  children,
  submitDisabled = false,
}) {
  if (!isOpen) return null;

  const shouldShowForm =
    (fields && fields.length > 0) ||
    children ||
    submitLabel;

  return (
    <div className="overlay-center" onClick={onClose}>
      <div className="form-wrapper" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>
          &times;
        </button>

        <h2 className="form-title">{title}</h2>

        {shouldShowForm && (
          <form onSubmit={onSubmit} className="form-container">
            {children ? (
              children
            ) : (
              <>
                {fields.map(({ label, name, type, options }) => (
                  <div className="form-group" key={name}>
                    <label htmlFor={name} className="form-label">{label}</label>

                    {type === 'select' ? (
                      <select
                        id={name}
                        name={name}
                        value={formData[name] || ''}
                        onChange={onChange}
                        className={`form-input${errors[name] ? ' error' : ''}`}
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
                        type={type || 'text'}
                        id={name}
                        name={name}
                        value={formData[name] || ''}
                        onChange={onChange}
                        className={`form-input${errors[name] ? ' error' : ''}`}
                      />
                    )}

                    {errors[name] && (
                      <p className="error-message">{errors[name]}</p>
                    )}
                  </div>
                ))}

                {errors.form && (
                  <p className="error-message">{errors.form}</p>
                )}

                {submitLabel && (
                  <button
                    type="submit"
                    className="button-primary"
                    disabled={loading || submitDisabled}
                  >
                    {loading ? 'Loading...' : submitLabel}
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