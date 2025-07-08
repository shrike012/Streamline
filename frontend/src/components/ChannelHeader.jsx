import { Link } from "react-router-dom";

function ChannelHeader({
  channelId,
  channelInfo,
  hasNewVideo = false,
  rightActions,
}) {
  if (!channelInfo) return null;

  return (
    <div className="channel-header-wrapper">
      <Link to={`/app/channel/${channelId}`} className="channel-link">
        <img
          src={channelInfo.thumbnail || channelInfo.avatar}
          alt="channel avatar"
          className="channel-avatar"
        />
        <div className="channel-info">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <h2>{channelInfo.channelTitle}</h2>
            {hasNewVideo && <span className="badge-new">New!</span>}
          </div>
          <p className="channel-meta">
            {channelInfo.subscriberCount !== undefined
              ? channelInfo.subscriberCount.toLocaleString()
              : "0"}{" "}
            subscribers
          </p>
        </div>
      </Link>

      {rightActions && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          {rightActions}
        </div>
      )}
    </div>
  );
}

export default ChannelHeader;
