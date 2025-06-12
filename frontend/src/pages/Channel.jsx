import { useState } from 'react';
import { fetchChannelVideos } from '../api/auth';
import VideoCard from '../components/VideoCard';
import VideoGrid from '../components/VideoGrid';

function Channel() {
  const [channelUrl, setChannelUrl] = useState('');
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortOption, setSortOption] = useState('views');
  const [typeFilter, setTypeFilter] = useState('all');

  const handleAnalyze = async () => {
    if (!channelUrl.trim()) return;
    setLoading(true);
    try {
      const res = await fetchChannelVideos(channelUrl);
      setVideos(res.data.videos || []);
    } catch (err) {
      console.error('Failed to analyze channel:', err);
      alert('Failed to fetch channel data.');
    }
    setLoading(false);
  };

  const filtered = videos.filter((video) => {
    const durationSeconds = parseLengthToSeconds(video.length);
    if (typeFilter === 'shorts') return durationSeconds < 60;
    if (typeFilter === 'longform') return durationSeconds >= 60;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortOption === 'views') return (b.viewCount || 0) - (a.viewCount || 0);
    if (sortOption === 'recent') return new Date(b.publishedAt) - new Date(a.publishedAt);
    return 0;
  });

  function parseLengthToSeconds(length) {
    if (!length) return 0;
    const parts = length.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0];
  }

  return (
    <div className="page-container">
      <h1 className="page-title">Channel Analyzer</h1>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Enter YouTube channel URL"
          value={channelUrl}
          onChange={(e) => setChannelUrl(e.target.value)}
          style={{
            flex: 1,
            padding: '0.6rem 0.9rem',
            borderRadius: '8px',
            background: '#1e1e1e',
            color: 'white',
            border: '1px solid #333',
          }}
        />
        <button
          onClick={handleAnalyze}
          style={{
            padding: '0.6rem 1.2rem',
            backgroundColor: '#0972ce',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
      </div>

      {videos.length > 0 && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <label style={{ color: 'white', fontSize: '0.95rem' }}>
            Sort by:
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              style={{
                marginLeft: '0.5rem',
                padding: '0.4rem 0.6rem',
                borderRadius: '6px',
                backgroundColor: '#1e1e1e',
                color: 'white',
                border: '1px solid #444',
              }}
            >
              <option value="views">Most Viewed</option>
              <option value="recent">Most Recent</option>
            </select>
          </label>

          <label style={{ color: 'white', fontSize: '0.95rem' }}>
            Type:
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{
                marginLeft: '0.5rem',
                padding: '0.4rem 0.6rem',
                borderRadius: '6px',
                backgroundColor: '#1e1e1e',
                color: 'white',
                border: '1px solid #444',
              }}
            >
              <option value="all">All</option>
              <option value="shorts">Shorts</option>
              <option value="longform">Longform</option>
            </select>
          </label>
        </div>
      )}

      <VideoGrid
        items={sorted}
        renderCard={(video, idx) => (
          <VideoCard
            key={video.videoId || idx}
            title={video.title}
            thumbnail={video.thumbnail}
            views={`${video.viewCount.toLocaleString()} views`}
            timeAgo={video.timeAgo}
            length={video.length}
            videoId={video.videoId}
            score={video.outlierScore}
            showActions={true}
          />
        )}
      />
    </div>
  );
}

export default Channel;