import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { searchNiche } from "../api/apiRoutes";
import ChannelCard from "../components/ChannelCard";
import Grid from "../components/Grid";
import Filters from "../components/Filters";
import useLoadingDots from "../utils/useLoadingDots";
import { useChannel } from "../context/ChannelContext";

function NicheExplorer() {
  const { selectedChannel } = useChannel();
  const [timeFrame, setTimeFrame] = useState("last_month");
  const [videoType, setVideoType] = useState("longform");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const loadingText = useLoadingDots("Searching", 500);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const data = await searchNiche(query, { timeFrame, videoType });

      setResults(data);
      sessionStorage.setItem("streamline_niche_query", query);
      sessionStorage.setItem("streamline_niche_results", JSON.stringify(data));
    } catch (err) {
      setError("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedQuery = sessionStorage.getItem("streamline_niche_query");
    const savedResults = sessionStorage.getItem("streamline_niche_results");

    if (savedQuery && savedResults) {
      setQuery(savedQuery);
      setResults(JSON.parse(savedResults));
    }
  }, []);

  useEffect(() => {
    setQuery("");
    setResults([]);
    setError(null);
    sessionStorage.removeItem("streamline_niche_query");
    sessionStorage.removeItem("streamline_niche_results");
  }, [selectedChannel]);

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
          query.trim() !== "" && !loading ? "No channels found." : null
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
