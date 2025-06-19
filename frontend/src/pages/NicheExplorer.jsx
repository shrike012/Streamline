import React, { useState, useEffect } from 'react';
import { searchNiche } from '../api/apiRoutes';
import VideoCard from '../components/VideoCard';
import ChannelCard from '../components/ChannelCard';
import Grid from '../components/Grid';

function NicheExplorer() {
  const STORAGE_KEY = 'niche_explorer_state';

  const [type, setType] = useState('channels');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [format, setFormat] = useState('any');
  const [minOutlierScore, setMinOutlierScore] = useState(1);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      setType(parsed.type || 'channels');
      setQuery(parsed.query || '');
      setResults(parsed.results || []);
    }
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim())sreturn;

    setLoading(true);
    setError(null);

    try {
      const data = await searchNiche(query, type, {
        format,
        minOutlierScore
      });

      const sorted = type === 'channels'
        ? [...data].sort((a, b) => b.score - a.score)
        : data;

      setResults(sorted);

      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        type,
        query,
        results: sorted
      }));

    } catch (err) {
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="page-title">Niche Explorer</h1>

      <form onSubmit={handleSearch} className="input-group-row">
        <input
          type="text"
          placeholder={`Search ${type}`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="form-input"
        />

        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);

            if (e.target.value === 'videos') {
              setFormat('any');
              setMinOutlierScore(1);
            }
          }}
          className="form-input"
        >
          <option value="channels">Channels</option>
          <option value="videos">Videos</option>
        </select>

        {type === 'videos' && (
          <>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="form-input"
            >
              <option value="any">Any Format</option>
              <option value="shorts">Shorts</option>
              <option value="longform">Longform</option>
            </select>

            <label className="slider-label">
              Min Outlier Score: {minOutlierScore}
            </label>
            <input
              type="range"
              min="1"
              max="50"
              value={minOutlierScore}
              onChange={(e) => setMinOutlierScore(Number(e.target.value))}
            />
          </>
        )}

        <button type="submit" className="button-primary">
          Search
        </button>
      </form>

      {error && <p className="error-message">{error}</p>}
      {loading && <p>Loading...</p>}

      <Grid
        items={results}
        emptyMessage={`No ${type} found.`}
        renderCard={(item, idx) =>
          type === 'videos' ? (
            <VideoCard
              key={idx}
              title={item.title}
              thumbnail={item.thumbnail}
              views={item.views}
              timeAgo={item.timeAgo}
              length={item.length}
              videoId={item.videoId}
              showActions={false}
            />
          ) : (
            <ChannelCard
              key={idx}
              channelId={item.channelId}
              title={item.title}
              avatar={item.avatar}
              subscriberCount={item.subscriberCount}
            />
          )
        }
      />
    </>
  );
}

export default NicheExplorer;