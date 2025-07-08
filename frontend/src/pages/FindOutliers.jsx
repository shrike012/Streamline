import { useEffect, useState } from "react";
import { fetchOutliers } from "../api/apiRoutes.js";
import VideoCard from "../components/VideoCard";
import Grid from "../components/Grid.jsx";
import "../styles/channel.css";
import { useChannel } from "../context/ChannelContext";
import { useAuth } from "../context/AuthContext";
import { Helmet } from "react-helmet-async";

function FindOutliers() {
  const { selectedChannel } = useChannel();
  const { user } = useAuth();
  const [outlierVideos, setOutlierVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadOutliers = async () => {
    if (!selectedChannel) {
      setOutlierVideos([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchOutliers(selectedChannel.channelId);
      setOutlierVideos(res || []);
    } catch (err) {
      console.error("Failed to load outliers:", err);
      alert("Failed to fetch outliers.");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user && selectedChannel) {
      loadOutliers();
    } else {
      setOutlierVideos([]);
      setLoading(false);
    }
  }, [user, selectedChannel]);

  return (
    <>
      <h1>Your Outliers</h1>
      <Helmet>
        <title>Find Outliers</title>
      </Helmet>

      {loading ? (
        <div style={{ padding: "2rem", color: "#888", textAlign: "center" }}>
          Loading outliers...
        </div>
      ) : outlierVideos.length > 0 ? (
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
      ) : (
        <div style={{ padding: "2rem", color: "#888", textAlign: "center" }}>
          No outliers found.
        </div>
      )}
    </>
  );
}

export default FindOutliers;
