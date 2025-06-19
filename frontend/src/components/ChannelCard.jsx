import React from 'react';
import { Link } from 'react-router-dom';
import { FiPlus } from 'react-icons/fi';
import '../styles/channel.css';

function ChannelCard({
  avatar,
  title,
  channelId,
  subscriberCount,
  score,
  onAdd = () => {},
}) {
  const localChannelUrl = `/app/channel/${channelId}`;

  return (
    <Link
      to={localChannelUrl}
      className="channel-card"
      style={{
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <img
        src={avatar}
        alt="channel"
        className="channel-avatar"
        referrerPolicy="no-referrer"
      />
      <div className="channel-info">
        <div className="channel-title">{title}</div>
        <div className="channel-meta">
          <span>{subscriberCount ? `${subscriberCount} subs` : 'N/A'}</span>
          {score && <span className="score">{score}</span>}
        </div>
      </div>

      <button
        className="add-button"
        onClick={(e) => {
          e.preventDefault();
          onAdd();
        }}
      >
        <FiPlus size={18} />
      </button>
    </Link>
  );
}

export default ChannelCard;