import { useEffect, useState } from "react";
import { fetchOutliers } from "../api/apiRoutes.js";
import VideoCard from "../components/VideoCard";
import Grid from "../components/Grid.jsx";
import "../styles/channel.css";
import { useChannel } from "../context/ChannelContext";
import { useAuth } from "../context/AuthContext";
import { Helmet } from "react-helmet-async";
import useLoadingDots from "../utils/useLoadingDots";

function FindOutliers() {
  const { selectedChannel } = useChannel();
  const { user } = useAuth();
  const [outlierVideos, setOutlierVideos] = useState([]);
  const [status, setStatus] = useState("idle"); // 'idle' | 'loading' | 'pending' | 'ready'

  const loadingOutliers = useLoadingDots("Loading outliers", 500);

  useEffect(() => {
    if (!user || !selectedChannel) {
      setOutlierVideos([]);
      setStatus("idle");
      return;
    }

    const loadOutliers = async () => {
      setStatus("loading");
      try {
        const res = await fetchOutliers(selectedChannel.channelId);

        if (Array.isArray(res) && res.length > 0) {
          setOutlierVideos(res);
          setStatus("ready");
        } else if (res?.status === "pending") {
          setOutlierVideos([]);
          setStatus("pending");
        } else {
          setOutlierVideos([]);
          setStatus("pending");
        }
      } catch (err) {
        console.error("Failed to load outliers:", err);
        setStatus("pending");
      }
    };

    loadOutliers();
  }, [user, selectedChannel]);

  useEffect(() => {
    if (status !== "pending" || !selectedChannel) return;

    let pollAttempts = 0;
    const MAX_ATTEMPTS = 12;
    const POLL_INTERVAL = 10000;

    const intervalId = setInterval(async () => {
      pollAttempts++;
      try {
        const updated = await fetchOutliers(selectedChannel.channelId);
        if (Array.isArray(updated) && updated.length > 0) {
          setOutlierVideos(updated);
          setStatus("ready");
          clearInterval(intervalId);
        }
      } catch (err) {
        console.warn("Polling failed:", err);
      }

      if (pollAttempts >= MAX_ATTEMPTS) {
        clearInterval(intervalId);
      }
    }, POLL_INTERVAL);

    return () => clearInterval(intervalId);
  }, [status, selectedChannel]);

  return (
    <>
      <Helmet>
        <title>Find Outliers</title>
      </Helmet>
      <h1>Your Outliers</h1>

      {!selectedChannel ? (
        <div style={{ padding: "2rem", color: "#888", textAlign: "center" }}>
          Add a channel to view outliers.
        </div>
      ) : status === "pending" || status === "loading" ? (
        <div style={{ padding: "2rem", color: "#888", textAlign: "center" }}>
          {loadingOutliers}
        </div>
      ) : (
        <Grid
          items={outlierVideos}
          renderCard={(video, idx) => (
            <VideoCard
              key={video._id || idx}
              title={video.title}
              thumbnail={`https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`}
              views={video.views || 0}
              publishedAt={video.publishedAt}
              length={null}
              videoId={video.videoId}
              outlierScore={video.outlierScore}
              showChannelTitle={true}
              channelTitle={video.channelTitle}
              channelId={video.channelId}
            />
          )}
        />
      )}
    </>
  );
}

export default FindOutliers;
