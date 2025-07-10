import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  getCollections,
  createCollection,
  renameCollection,
  deleteCollection,
  getVideosInCollection,
  removeVideoFromCollection,
} from "../api/apiRoutes.js";
import Grid from "../components/Grid.jsx";
import VideoCard from "../components/VideoCard.jsx";

function Collections() {
  const [collections, setCollections] = useState([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState(null);
  const [savedVideos, setSavedVideos] = useState([]);

  useEffect(() => {
    loadCollections();
  }, []);

  useEffect(() => {
    if (!selectedCollectionId) {
      setSavedVideos([]);
      return;
    }
    getVideosInCollection(selectedCollectionId)
      .then((res) => setSavedVideos(res.videos || []))
      .catch((err) => {
        console.error("Failed to fetch videos for collection:", err);
      });
  }, [selectedCollectionId]);

  const loadCollections = async () => {
    try {
      const res = await getCollections();
      setCollections(res || []);
      if (res.length > 0) {
        setSelectedCollectionId((prev) =>
          prev && res.some((l) => l.collectionId === prev)
            ? prev
            : res[0].collectionId,
        );
      } else {
        setSelectedCollectionId(null);
      }
    } catch (err) {
      console.error("Failed to fetch collections:", err);
    }
  };

  const handleSelectCollection = (collectionId) => {
    setSelectedCollectionId(collectionId);
  };

  const handleCreateCollection = async () => {
    const name = prompt("Enter a collection name");
    if (!name) return;
    try {
      await createCollection(name);
      const updated = await getCollections();
      setCollections(updated);
      if (updated.length > 0) {
        setSelectedCollectionId(updated[updated.length - 1].collectionId);
      }
    } catch (err) {
      console.error("Failed to create collection:", err);
      const message =
        err.response?.data?.error || "Failed to create collection.";
      alert(message);
    }
  };

  const handleRenameCollection = async () => {
    const newName = prompt("Enter new collection name");
    if (!newName) return;
    try {
      await renameCollection(selectedCollectionId, newName);
      loadCollections();
    } catch (err) {
      console.error("Failed to rename collection:", err);
      const message =
        err.response?.data?.error || "Failed to rename collection.";
      alert(message);
    }
  };

  const handleDeleteCollection = async () => {
    if (!window.confirm("Delete this collection?")) return;
    try {
      await deleteCollection(selectedCollectionId);
      const updated = await getCollections();
      setCollections(updated);
      setSelectedCollectionId(
        updated.length > 0 ? updated[0].collectionId : null,
      );
    } catch (err) {
      console.error("Failed to delete collection:", err);
    }
  };

  const handleRemoveVideo = async (videoId) => {
    if (!window.confirm("Remove this video from the collection?")) return;
    try {
      await removeVideoFromCollection(selectedCollectionId, videoId);
      setSavedVideos((prev) => prev.filter((v) => v.videoId !== videoId));
    } catch (err) {
      console.error("Failed to remove video:", err);
      alert("Failed to remove video.");
    }
  };

  return (
    <>
      <Helmet>
        <title>Saved Videos</title>
      </Helmet>
      <h1>Saved Videos</h1>
      <div className="input-group-row">
        {collections.map((col) => (
          <button
            key={col.collectionId}
            className={
              selectedCollectionId === col.collectionId
                ? "button-primary-sm"
                : "button-ghost-sm"
            }
            onClick={() => handleSelectCollection(col.collectionId)}
          >
            {col.name}
          </button>
        ))}
        <button className="button-ghost-sm" onClick={handleCreateCollection}>
          ＋ Add Collection
        </button>
        <div style={{ width: "0.5rem" }} />
        {selectedCollectionId && (
          <>
            <button
              className="button-ghost-sm"
              onClick={handleRenameCollection}
            >
              ✎ Rename Collection
            </button>
            <button
              className="button-ghost-sm"
              onClick={handleDeleteCollection}
            >
              🗑 Delete Collection
            </button>
          </>
        )}
      </div>

      <section className="page-section">
        {collections.length === 0 ? (
          <div
            style={{
              color: "#888",
              padding: "4rem 1rem",
              textAlign: "center",
            }}
          >
            No collections created yet.
          </div>
        ) : !selectedCollectionId ? (
          <div
            style={{
              color: "#888",
              padding: "4rem 1rem",
              textAlign: "center",
            }}
          >
            No collection selected.
          </div>
        ) : savedVideos.length === 0 ? (
          <div
            style={{
              color: "#888",
              padding: "4rem 1rem",
              textAlign: "center",
            }}
          >
            This collection has no saved videos.
          </div>
        ) : (
          <Grid
            items={savedVideos}
            renderCard={(video, idx) => (
              <VideoCard
                key={video.videoId || idx}
                title={video.title}
                thumbnail={video.thumbnail}
                views={video.viewCount}
                publishedAt={video.publishedAt}
                length={video.length}
                videoId={video.videoId}
                channelTitle={video.channelTitle}
                showChannelTitle={true}
                channelId={video.channelId}
                onRemove={() => handleRemoveVideo(video.videoId)}
              />
            )}
          />
        )}
      </section>
    </>
  );
}

export default Collections;
