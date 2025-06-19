import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchChannelVideos } from '../api/apiRoutes.js';
import VideoCard from '../components/VideoCard';
import Grid from '../components/Grid.jsx';
import '../styles/channel.css';

function Channel() {
  const { id } = useParams();
  const [channelInfo, setChannelInfo] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState('views');
  const [typeFilter, setTypeFilter] = useState('any');
  const [tab, setTab] = useState('videos');

  useEffect(() => {
    const loadChannel = async () => {
      setLoading(true);

      const CACHE_KEY = `channel_data_${id}`;
      const CACHE_TTL = 12 * 3600 * 1000;

      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL) {
            setChannelInfo(data.channel);
            setVideos(data.videos);
            setLoading(false);
            return;
          }
        }

        const res = await fetchChannelVideos(id);
        setChannelInfo(res.channel || null);
        setVideos(res.videos || []);

        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ data: res, timestamp: Date.now() })
        );
      } catch (err) {
        console.error('Failed to load channel:', err);
        alert('Failed to fetch channel data.');
      }

      setLoading(false);
    };

    loadChannel();
  }, [id]);

  const filtered = videos.filter((video) => {
    const durationSeconds = parseLengthToSeconds(video.length);
    if (typeFilter === 'shorts') return durationSeconds < 60;
    if (typeFilter === 'longform') return durationSeconds >= 60;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortOption === 'views') return (b.viewCount || 0) - (a.viewCount || 0);
    if (sortOption === 'views_asc') return (a.viewCount || 0) - (b.viewCount || 0);
    if (sortOption === 'recent') return new Date(b.publishedAt) - new Date(a.publishedAt);
    if (sortOption === 'oldest') return new Date(a.publishedAt) - new Date(b.publishedAt);
    if (sortOption === 'outlier') return (b.outlierScore || 0) - (a.outlierScore || 0);
    if (sortOption === 'outlier_low') return (a.outlierScore || 0) - (b.outlierScore || 0);
    return 0;
  });

  const formatInsights = analyzeChannelFormat(videos);

  function parseLengthToSeconds(length) {
    if (!length) return 0;
    const parts = length.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0];
  }

  function analyzeChannelFormat(videos) {
    if (!videos || videos.length === 0) return null;

    let totalSeconds = 0;
    let shortsCount = 0;
    let longformCount = 0;

    videos.forEach(video => {
      const secs = parseLengthToSeconds(video.length);
      totalSeconds += secs;
      if (secs < 60) shortsCount++;
      else longformCount++;
    });

    const avgSeconds = totalSeconds / videos.length;
    const avgMinutes = (avgSeconds / 60).toFixed(1);

    let formatSummary = '';
    if (shortsCount > videos.length * 0.8) {
      formatSummary = 'Mostly Shorts (under 60s)';
    } else if (longformCount > videos.length * 0.8) {
      formatSummary = `Mostly Longform (${avgMinutes} min avg)`;
    } else {
      formatSummary = `Mixed (avg length: ${avgMinutes} min)`;
    }

    const dates = videos
      .map(v => new Date(v.publishedAt))
      .sort((a, b) => b - a);

    let avgDaysBetween = null;
    if (dates.length >= 2) {
      let gaps = [];
      for (let i = 1; i < dates.length; i++) {
        const gap = (dates[i - 1] - dates[i]) / (1000 * 60 * 60 * 24);
        gaps.push(gap);
      }
      avgDaysBetween = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    }

    let cadence = '';
    if (avgDaysBetween === null) {
      cadence = 'Unknown';
    } else if (avgDaysBetween <= 2) {
      cadence = '~3-4 uploads per week';
    } else if (avgDaysBetween <= 7) {
      cadence = '~1-2 uploads per week';
    } else if (avgDaysBetween <= 14) {
      cadence = '~2-3 uploads per month';
    } else if (avgDaysBetween <= 30) {
      cadence = '~1 upload per month';
    } else {
      cadence = 'Infrequent / inactive';
    }

    return {
      formatSummary,
      cadence
    };
  }

  return (
    <div className="channel-page">
      {channelInfo && (
        <div className="channel-header">
          <a
            href={`https://www.youtube.com/channel/${id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="channel-link"
          >
            <img
              src={channelInfo.avatar}
              alt="channel avatar"
              className="channel-avatar"
            />
            <div>
              <h2>{channelInfo.title}</h2>
              <p className="channel-meta">
                {channelInfo.subscriberCount.toLocaleString()} subscribers •{' '}
                {channelInfo.total_views.toLocaleString()} views •{' '}
                {channelInfo.num_videos_total.toLocaleString()} videos
              </p>
            </div>
          </a>
        </div>
      )}

      {/* Tabs */}
      {videos.length > 0 && (
        <div className="input-group-row">
          <button
            onClick={() => setTab('videos')}
            className={`button-primary-sm ${tab === 'videos' ? '' : 'button-ghost-sm'}`}
          >
            Videos
          </button>
          <button
            onClick={() => setTab('insights')}
            className={`button-primary-sm ${tab === 'insights' ? '' : 'button-ghost-sm'}`}
          >
            Insights
          </button>
        </div>
      )}

      {/* Videos Tab */}
      {tab === 'videos' && videos.length > 0 && (
        <>
          <div className="input-group-row">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="form-input"
            >
              <option value="views">Most Viewed</option>
              <option value="views_asc">Least Viewed</option>
              <option value="recent">Most Recent</option>
              <option value="oldest">Oldest</option>
              <option value="outlier">Highest Score</option>
              <option value="outlier_low">Lowest Score</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="form-input"
            >
              <option value="any">Any Format</option>
              <option value="shorts">Shorts</option>
              <option value="longform">Longform</option>
            </select>
          </div>

          <Grid
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
        </>
      )}

      {/* Insights Tab */}
      {tab === 'insights' && formatInsights && (
        <div className="channel-insights">
          <p><strong>Format:</strong> {formatInsights.formatSummary}</p>
          <p><strong>Cadence:</strong> {formatInsights.cadence}</p>
        </div>
      )}

      {loading && <p>Loading channel...</p>}
    </div>
  );
}

export default Channel;