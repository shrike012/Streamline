import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { searchNiche } from "../api/apiRoutes";
import ChannelCard from "../components/ChannelCard";
import Grid from "../components/Grid";
import Filters from "../components/Filters";
import useLoadingDots from "../utils/useLoadingDots";

function NicheExplorer() {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialQuery = searchParams.get("query") || "";
  const initialVideoType = searchParams.get("videoType") || "longform";
  const initialTimeFrame = searchParams.get("timeFrame") || "last_month";

  const [query, setQuery] = useState(initialQuery);
  const [videoType, setVideoType] = useState(initialVideoType);
  const [timeFrame, setTimeFrame] = useState(initialTimeFrame);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const loadingText = useLoadingDots("Searching", 500);
  const [error, setError] = useState(null);
  const [searchAttempted, setSearchAttempted] = useState(false);

  const runSearch = async (q, tf, vt) => {
    if (!q.trim()) return;
    setSearchAttempted(true);
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const data = await searchNiche(q.trim(), {
        timeFrame: tf,
        videoType: vt,
      });
      setResults(data);

      sessionStorage.setItem("streamline_niche_query", q.trim());
      sessionStorage.setItem("streamline_niche_video_type", vt);
      sessionStorage.setItem("streamline_niche_time_frame", tf);
      sessionStorage.setItem("streamline_niche_results", JSON.stringify(data));
    } catch (err) {
      setError("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearchParams({
      query: query.trim(),
      timeFrame,
      videoType,
    });

    runSearch(query, timeFrame, videoType);
  };

  useEffect(() => {
    const cachedQuery = sessionStorage.getItem("streamline_niche_query");
    const cachedResults = sessionStorage.getItem("streamline_niche_results");
    const cachedVideoType = sessionStorage.getItem(
      "streamline_niche_video_type",
    );
    const cachedTimeFrame = sessionStorage.getItem(
      "streamline_niche_time_frame",
    );

    if (cachedQuery && cachedResults) {
      setQuery(cachedQuery);
      setVideoType(cachedVideoType || "longform");
      setTimeFrame(cachedTimeFrame || "last_month");
      setResults(JSON.parse(cachedResults));
      setSearchAttempted(true);

      setSearchParams({
        query: cachedQuery,
        videoType: cachedVideoType || "longform",
        timeFrame: cachedTimeFrame || "last_month",
      });
    }
  }, []);

  useEffect(() => {
    // Keep filters and input synced to URL
    setQuery(initialQuery);
    setVideoType(initialVideoType);
    setTimeFrame(initialTimeFrame);
  }, [initialQuery, initialTimeFrame, initialVideoType]);

  return (
    <>
      <Helmet>
        <title>Niche Explorer</title>
      </Helmet>
      <h1 className="page-title">Niche Explorer</h1>
      <form onSubmit={handleSearch}>
        <div className="input-group-row">
          <input
            type="text"
            placeholder="Search Channels"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="form-input"
          />

          <Filters
            filters={[
              {
                value: timeFrame,
                onChange: setTimeFrame,
                options: [
                  { value: "last_week", label: "Last Week" },
                  { value: "last_month", label: "Last Month" },
                  { value: "last_year", label: "Last Year" },
                  { value: "last_2_years", label: "Last 2 Years" },
                ],
              },
              {
                value: videoType,
                onChange: setVideoType,
                options: [
                  { value: "shorts", label: "Shorts" },
                  { value: "longform", label: "Longform" },
                ],
              },
            ]}
          />

          <button type="submit" className="button-primary" disabled={loading}>
            {loading ? loadingText : "Search"}
          </button>
        </div>
      </form>

      {error && <p className="error-message">{error}</p>}

      <Grid
        items={results}
        emptyMessage={
          searchAttempted && !loading && results.length === 0
            ? "No channels found."
            : null
        }
        renderCard={(channel, idx) => (
          <ChannelCard
            key={idx}
            channelId={channel.channelId}
            channelTitle={channel.channelTitle}
            avatar={channel.avatar}
            subscriberCount={channel.subscriberCount}
            forceUniformSize={true}
          />
        )}
      />
    </>
  );
}

export default NicheExplorer;
