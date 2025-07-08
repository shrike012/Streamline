import "../styles/videocard.css";
import { FaLightbulb } from "react-icons/fa";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCollections,
  addVideoToCollection,
  createCollection,
} from "../api/apiRoutes.js";
import Modal from "./Modal";

function timeAgoFromDate(dateString) {
  const published = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - published) / 1000);

  const intervals = [
    { label: "year", seconds: 31536000 },
    { label: "month", seconds: 2592000 },
    { label: "day", seconds: 86400 },
    { label: "hour", seconds: 3600 },
    { label: "minute", seconds: 60 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      return `${count} ${interval.label}${count !== 1 ? "s" : ""} ago`;
    }
  }
  return "just now";
}

function VideoCard({
  title,
  thumbnail,
  views,
  length,
  videoId,
  outlierScore,
  publishedAt,
  link = null,
  channelTitle = "",
  channelId,
  showChannelTitle = false,
  onRemove,
}) {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [showNewCollectionPrompt, setShowNewCollectionPrompt] = useState(false);
  const [collections, setCollections] = useState([]);
  const [saveError, setSaveError] = useState(null);
  const [newCollectionName, setNewCollectionName] = useState("");

  const videoUrl = link || `https://www.youtube.com/watch?v=${videoId}`;
  const fallbackThumbnail = "/img/placeholder.png";

  const handleSaveClick = async () => {
    try {
      const res = await getCollections();
      setCollections(res || []);
      setSaveError(null);
      setShowModal(true);
    } catch (err) {
      console.error("Failed to fetch collections:", err);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setShowNewCollectionPrompt(false);
    setSaveError(null);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const handleAddToCollection = async (collectionId) => {
    const videoData = {
      title,
      thumbnail,
      videoId,
      length,
      channelTitle,
      channelId,
      viewCount: views,
      publishedAt,
    };
    try {
      setSaveError(null); // clear previous error
      await addVideoToCollection(collectionId, videoData);
      setShowModal(false);
    } catch (err) {
      console.error("Failed to add video to collection:", err);
      const message =
        err.response?.data?.error || "Failed to add video to collection.";
      setSaveError(message); // display error inline
    }
  };

  const handleCreateAndAdd = async () => {
    if (!newCollectionName.trim()) return;
    try {
      const created = await createCollection(newCollectionName);
      setNewCollectionName("");
      setShowNewCollectionPrompt(false);
      const updatedCollections = await getCollections();
      setCollections(updatedCollections);

      if (created && created.collectionId) {
        await handleAddToCollection(created.collectionId);
      }
    } catch (err) {
      console.error("Failed to create collection:", err);
    }
  };

  const handleGenerateTitle = () => {
    navigate("/app/title-generator", { state: { initialIdea: title } });
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
            src={thumbnail?.trim() || fallbackThumbnail}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = fallbackThumbnail;
            }}
            alt={title}
            className="thumbnail-image"
          />
          <span className="video-length">{length}</span>
        </div>

        <div className="video-info">
          <div className="video-title">
            {typeof outlierScore === "number" && outlierScore > 0 && (
              <span
                style={{
                  color:
                    outlierScore >= 5
                      ? "#ff4d4d"
                      : outlierScore >= 3
                        ? "#ff9933"
                        : outlierScore >= 1
                          ? "#ffe066"
                          : "#999999",
                  marginRight: "0.3rem",
                  fontWeight: "bold",
                }}
              >
                {outlierScore.toFixed(1)}x
              </span>
            )}
            {title}
          </div>
          {views && publishedAt && (
            <div className="video-meta">
              {typeof views === "number" ? views.toLocaleString() : views} •{" "}
              {timeAgoFromDate(publishedAt)}
            </div>
          )}
          {showChannelTitle && channelTitle && (
            <div
              className="video-meta video-channel-link"
              style={{ cursor: "pointer", textDecoration: "none" }}
              onClick={(e) => {
                e.preventDefault();
                navigate(`/app/channel/${channelId}`);
              }}
            >
              {channelTitle}
            </div>
          )}
        </div>
      </a>

      <div className="video-actions">
        <div className="ideate-block">
          <div className="ideate-header">
            <FaLightbulb className="icon" size={16} />
            <span className="label">Ideate</span>
          </div>
          <div className="dropdown-menu">
            <button onClick={handleGenerateTitle}>Generate Title</button>
            <button onClick={handleSaveClick}>Save</button>
            {onRemove && <button onClick={onRemove}>Remove</button>}
          </div>
        </div>
      </div>

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={handleModalClose}
          title="Save Video to Collection"
          fields={[]}
          formData={{}}
          onChange={() => {}}
          onSubmit={(e) => e.preventDefault()}
          errors={{}}
          loading={false}
          submitLabel=""
          actions={
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              {collections.map((col) => (
                <button
                  key={col.collectionId}
                  className="list-option-button"
                  onClick={() => handleAddToCollection(col.collectionId)}
                >
                  {col.name}
                </button>
              ))}
              <button
                className="modal-action-button"
                onClick={() => setShowNewCollectionPrompt(true)}
              >
                ＋ Create New Collection
              </button>
            </div>
          }
        >
          {saveError && (
            <div
              className="error-message"
              style={{
                marginTop: "0.5rem",
                marginBottom: "0.5rem",
                textAlign: "center",
              }}
            >
              {saveError}
            </div>
          )}
        </Modal>
      )}

      {showNewCollectionPrompt && (
        <Modal
          isOpen={showNewCollectionPrompt}
          onClose={handleModalClose}
          title="Enter Collection Name"
          fields={[]}
          formData={{}}
          onChange={() => {}}
          onSubmit={(e) => {
            e.preventDefault();
            handleCreateAndAdd();
          }}
          errors={{}}
          loading={false}
          submitLabel="Create & Add"
        >
          <input
            type="text"
            placeholder="Collection name"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            className="form-input"
          />
        </Modal>
      )}
    </div>
  );
}

export default VideoCard;
