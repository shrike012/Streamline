import '../styles/videocard.css';
import { FaLightbulb } from 'react-icons/fa';
import { useState } from 'react';
import { getSavedLists, updateSavedLists } from '../api/apiRoutes.js';

function VideoCard({
  title,
  thumbnail,
  views,
  timeAgo,
  length,
  videoId,
  score,
  isPlaylist = false,
  videoCount = 0,
  link = null,
  showActions = true,
}) {
  const [showModal, setShowModal] = useState(false);
  const [showNewListPrompt, setShowNewListPrompt] = useState(false);
  const [lists, setLists] = useState([]);
  const [newListName, setNewListName] = useState('');

  const videoUrl = link || `https://www.youtube.com/watch?v=${videoId}`;
  const displayLength = isPlaylist
    ? `${videoCount} video${videoCount !== 1 ? 's' : ''}`
    : length;

  const fallbackThumbnail = '/img/placeholder.png';

  const handleSaveClick = async () => {
    try {
      const res = await getSavedLists();
      setLists(res.data.lists || []);
      setShowModal(true);
    } catch (err) {
      console.error('Failed to fetch lists:', err);
    }
  };

  const handleAddToList = async (listName) => {
    const updatedLists = lists.map((list) => {
      if (list.name === listName) {
        return {
          ...list,
          videos: [...list.videos, { title, thumbnail, videoId, length }],
        };
      }
      return list;
    });

    setLists(updatedLists);
    await updateSavedLists({ lists: updatedLists });
    setShowModal(false);
  };

  const handleCreateAndAdd = async () => {
    if (!newListName.trim()) return;
    const newList = {
      name: newListName,
      videos: [{ title, thumbnail, videoId, length }],
    };
    const updatedLists = [...lists, newList];
    setLists(updatedLists);
    await updateSavedLists({ lists: updatedLists });
    setNewListName('');
    setShowModal(false);
  };

  return (
  <div className="video-card">
    <a
      href={videoUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="video-link"
    >
      <div className="thumbnail-wrapper">
        <img
          src={thumbnail && thumbnail.trim() !== '' ? thumbnail : fallbackThumbnail}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = fallbackThumbnail;
          }}
          alt={title}
          className="thumbnail-image"
        />
        <span className="video-length">{displayLength}</span>
      </div>

      <div className="video-info">
        <div className="video-title">
          {typeof score === 'number' && score > 0 && (
            <span
              style={{
                color:
                  score >= 5 ? '#ff4d4d' :       // red
                  score >= 3 ? '#ff9933' :        // orange
                  score >= 1 ? '#ffe066' :        // yellow
                  '#999999',                      // gray
                marginRight: '0.3rem',
                fontWeight: 'bold',
              }}
            >
              {score.toFixed(1)}x
            </span>
          )}
          {title}
        </div>
        {views && timeAgo && !isPlaylist && (
          <div className="video-meta">
            {views} • {timeAgo}
          </div>
        )}
      </div>
    </a>

      {showActions && !isPlaylist && (
        <div className="video-actions">
          <div className="ideate-block">
            <div className="ideate-header">
              <FaLightbulb className="icon" size={16} />
              <span className="label">Ideate</span>
            </div>
            <div className="dropdown-menu">
              <button>Generate Idea</button>
              <button>Generate Thumbnail</button>
              <button>Generate Title</button>
              <button onClick={handleSaveClick}>Save</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Save Video</h3>

            {/* List options */}
            {lists.map((list) => (
              <button
                key={list.name}
                className="list-option-button"
                onClick={() => handleAddToList(list.name)}
              >
                {list.name}
              </button>
            ))}

            {/* Create & Cancel buttons */}
            <button className="modal-action-button" onClick={() => setShowNewListPrompt(true)}>
              Create New List
            </button>
            <button className="modal-action-button" onClick={() => setShowModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* SECOND MODAL: Enter List Name */}
      {showNewListPrompt && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Enter List Name</h3>
            <input
              type="text"
              placeholder="List name"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
            />
            <button className="modal-action-button" onClick={handleCreateAndAdd}>
              Create
            </button>
            <button className="modal-action-button" onClick={() => setShowNewListPrompt(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoCard;