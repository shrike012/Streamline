import React from "react";
import { Link } from "react-router-dom";
import "../styles/channel.css";

function ChannelCard({
  avatar,
  channelTitle,
  channelId,
  subscriberCount,
  score,
  onAdd = () => {},
  navigateOnClick = true,
  forceUniformSize = false,
}) {
  const localChannelUrl = `/app/channel/${channelId}`;

  const CardWrapper = navigateOnClick ? Link : "div";
  const wrapperProps = navigateOnClick ? { to: localChannelUrl } : {};

  const handleCardClick = (e) => {
    if (!navigateOnClick) {
      e.preventDefault();
      onAdd();
    }
  };

  return (
    <CardWrapper
      {...wrapperProps}
      className="channel-card"
      style={{
        textDecoration: "none",
        color: "inherit",
        cursor: "pointer",
        ...(forceUniformSize && { width: "280px", height: "100px" }),
      }}
      onClick={handleCardClick}
    >
      <img
        src={avatar}
        alt="channel"
        className="channel-avatar"
        referrerPolicy="no-referrer"
      />
      <div
        className="channel-info"
        style={{
          display: "flex",
          flexDirection: "column",
          flex: "1 1 auto",
          minWidth: 0,
        }}
      >
        <div className="channel-title">{channelTitle}</div>

        {(subscriberCount || score) && (
          <div className="channel-meta">
            {subscriberCount && (
              <span>{subscriberCount.toLocaleString()} subs</span>
            )}
            {score && <span className="score">{score}</span>}
          </div>
        )}
      </div>
    </CardWrapper>
  );
}

export default ChannelCard;
