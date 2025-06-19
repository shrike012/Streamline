import { useEffect, useState } from 'react';
import { useChannel } from '../context/ChannelContext';
import VideoCard from '../components/VideoCard';
import Grid from '../components/Grid.jsx';
import { getCompetitorVideos, getRecentWork, getTopVideos } from "../api/apiRoutes.js";

function Dashboard() {
  const { selectedChannel } = useChannel();

  const [competitorVideos, setCompetitorVideos] = useState([]);
  const [yourTopVideos, setYourTopVideos] = useState([]);
  const [recentWork, setRecentWork] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!selectedChannel || !selectedChannel.channel_id) return;

    const fetchDashboardData = async () => {
      try {
        const [comp, top, recent] = await Promise.all([
          getCompetitorVideos(selectedChannel.channel_id),
          getTopVideos(selectedChannel.channel_id),
          // getRecentWork(selectedChannel.channel_id),
        ]);

        setCompetitorVideos(comp);
        setYourTopVideos(top);
        setRecentWork(recent);
        setError(null);
      }
      catch (err) {
         setError('Failed to load data. Please try again later.');
      }
    };

    fetchDashboardData();
  }, [selectedChannel]);

  return (
    <>
      <h1>Your Dashboard</h1>

      {error && <p className="error-message" style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}

      {/* Recently Worked-On */}
      <section className="page-section">
        <h2 className="section-title">Recently Worked On</h2>
      </section>

      {/* Competitors' Recent Videos */}
      <section className="page-section">
        <h2 className="section-title">Competitors' Recent Videos</h2>
        <Grid
          items={competitorVideos}
          renderCard={(video, idx) => (
            <VideoCard
              key={`competitor-${idx}`}
              title={video.title}
              thumbnail={video.thumbnail}
              views={video.views}
              timeAgo={video.timeAgo}
              length={video.length}
              videoId={video.videoId}
              showActions={true}
            />
          )}
        />
      </section>

      {/* Your Top Videos */}
      <section className="page-section">
        <h2 className="section-title">Your Top Videos</h2>
        <Grid
          items={yourTopVideos}
          renderCard={(video, idx) => (
            <VideoCard
              key={`top-${idx}`}
              title={video.title}
              thumbnail={video.thumbnail}
              views={video.views}
              timeAgo={video.timeAgo}
              length={video.length}
              videoId={video.videoId}
              showActions={true}
            />
          )}
        />
      </section>
    </>
  );
}

export default Dashboard;