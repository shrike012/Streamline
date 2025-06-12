import { useEffect } from 'react';
import { getMe } from '../api/auth';
import VideoCard from '../components/VideoCard';
import VideoGrid from '../components/VideoGrid';

function Dashboard() {

  const competitorVideos = Array(5).fill({
    title: "Hybrid LLMs with Gemma",
    thumbnail: "https://i.ytimg.com/vi/PvKEHPbZ4-Y/hqdefault.jpg",
    views: "97K views",
    timeAgo: "3 days ago",
    length: "14:20",
    videoId: "PvKEHPbZ4-Y",
  });

  const yourTopVideos = [
    {
      title: 'Your Video 1',
      thumbnail: '',
      views: '500K views',
      timeAgo: '1 week ago',
      length: '10:02',
      videoId: 'abc123',
    },
    {
      title: 'Your Video 2',
      thumbnail: '',
      views: '1.1M views',
      timeAgo: '2 weeks ago',
      length: '12:45',
      videoId: 'def456',
    },
  ];

  return (
    <div className="page-container">
      <h1 className="page-title">Your Dashboard</h1>

      {/* Recently Worked-On */}
      <section className="page-section">
        <h2 className="section-title">Recently Worked On</h2>
        <div className="card-grid">
          <div className="work-card">Idea: "What If Rome Never Fell"</div>
          <div className="work-card">Title: "The Most Unfair Tactics in History"</div>
          <div className="work-card">Thumbnail: Egyptian Sandstorm</div>
        </div>
      </section>

      {/* Competitors' Recent Videos */}
      <section className="page-section">
        <h2 className="section-title">Competitors' Recent Videos</h2>
        <VideoGrid
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
        <VideoGrid
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
    </div>
  );
}

export default Dashboard;