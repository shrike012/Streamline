import "../styles/infocard.css";

function InfoCard({ text, subtext = "", onClick = null }) {
  return (
    <div
      className="info-card"
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {subtext && <div className="info-subtext">{subtext}</div>}
      <div className="info-main">{text}</div>
    </div>
  );
}

export default InfoCard;
