import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useChannel } from "../context/ChannelContext";
import VideoCard from "../components/VideoCard";
import InfoCard from "../components/InfoCard";
import Grid from "../components/Grid.jsx";
import { fetchOutliers, fetchChannelStats } from "../api/apiRoutes.js";
import useLoadingDots from "../utils/useLoadingDots";

function Dashboard() {
  const { selectedChannel } = useChannel();

  const [videos, setVideos] = useState([]);
  const [outlierVideos, setOutlierVideos] = useState([]);
  const [channelStats, setChannelStats] = useState(null);
  const [error, setError] = useState(null);

  const loadingOverview = useLoadingDots("Loading insights", 500);
  const loadingVideos = useLoadingDots("Loading videos", 500);
  const loadingOutliers = useLoadingDots("Loading outliers", 500);

  useEffect(() => {
    if (!selectedChannel || !selectedChannel.channelId) return;

    const fetchDashboardData = async () => {
      try {
        const [outliersData, statsData] = await Promise.all([
          fetchOutliers(selectedChannel.channelId),
          fetchChannelStats(selectedChannel.channelId),
        ]);

        setVideos((statsData.recentVideos || []).slice(0, 4));
        setOutlierVideos((outliersData || []).slice(0, 4));
        setChannelStats(statsData);
        setError(null);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
        setError("Failed to load data. Please try again later.");
      }
    };

    fetchDashboardData();
  }, [selectedChannel]);

  return (
    <>
      <Helmet>
        <title>Streamline</title>
      </Helmet>
      <h1>Your Dashboard</h1>

      {error && (
        <p className="error-message" style={{ marginBottom: "1rem" }}>
          {error}
        </p>
      )}

      {/* Performance Overview */}
      <section className="page-section">
        <h2 className="section-title">Performance Overview</h2>
        {selectedChannel && !channelStats ? (
          <div style={{ padding: "1rem", color: "#888" }}>
            {loadingOverview}
          </div>
        ) : (
          <Grid
            items={[
              {
                text: channelStats?.uploadsLast30d,
                subtext: "Uploads (30d)",
              },
              {
                text: channelStats?.medianViewsRecent10?.toLocaleString(),
                subtext: "Median Views (Last 10)",
              },
              {
                text: channelStats?.numRecentOutliers,
                subtext: "Recent Outliers",
              },
              {
                text: channelStats?.totalSubscribers?.toLocaleString(),
                subtext: "Total Subscribers",
              },
            ]}
            renderCard={(item, idx) => (
              <InfoCard key={idx} text={item.text} subtext={item.subtext} />
            )}
          />
        )}
      </section>

      {/* Recently Uploaded */}
      <section className="page-section">
        <h2 className="section-title">Recently Uploaded</h2>
        {videos.length === 0 ? (
          <div style={{ padding: "1rem", color: "#888" }}>{loadingVideos}</div>
        ) : (
          <Grid
            items={videos}
            renderCard={(video, idx) => (
              <VideoCard
                key={`video-${idx}`}
                title={video.title}
                thumbnail={video.thumbnail}
                views={video.viewCount}
                outlierScore={video.outlierScore}
                publishedAt={video.publishedAt}
                length={video.length}
                videoId={video.videoId}
                showChannelTitle={false}
                channelTitle={selectedChannel?.title}
                channelId={video.channelId}
              />
            )}
          />
        )}
      </section>

      {/* Relevant Outliers */}
      <section className="page-section">
        <h2 className="section-title">Relevant Outliers</h2>
        {outlierVideos.length === 0 ? (
          <div style={{ padding: "1rem", color: "#888" }}>
            {loadingOutliers}
          </div>
        ) : (
          <Grid
            items={outlierVideos}
            renderCard={(video, idx) => (
              <VideoCard
                key={`outlier-${idx}`}
                title={video.title}
                thumbnail={`https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`}
                views={video.views || 0}
                publishedAt={video.publishedAt}
                length={video.length}
                videoId={video.videoId}
                outlierScore={video.outlierScore}
                showChannelTitle={true}
                channelTitle={video.channelTitle}
                channelId={video.channelId}
              />
            )}
          />
        )}
      </section>
    </>
  );
}

export default Dashboard;
