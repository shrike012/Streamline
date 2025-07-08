export default function Filters({ filters }) {
  return (
    <>
      {filters.map(({ value, onChange, options }, idx) => (
        <select
          key={idx}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            backgroundColor: "#11151a",
            color: "#f9fafb",
            padding: "0.35rem 2rem 0.35rem 0.75rem",
            border: "1px solid #333",
            borderRadius: "8px",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
            height: "38px",
            lineHeight: 1.2,
            verticalAlign: "middle",
            textAlign: "left",
            appearance: "none",
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='8' height='5' viewBox='0 0 12 8' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23f9fafb' stroke-width='2' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 0.7rem center",
            width: "fit-content",
            minWidth: "120px",
          }}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ))}
    </>
  );
}
