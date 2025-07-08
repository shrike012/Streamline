import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  fetchChannelVideos,
  fetchChannelInsights,
  fetchChannelMetadata,
} from "../api/apiRoutes.js";
import VideoCard from "../components/VideoCard";
import Grid from "../components/Grid.jsx";
import ChannelHeader from "../components/ChannelHeader";
import InfoCard from "../components/InfoCard";
import Filters from "../components/Filters.jsx";
import { useChannel } from "../context/ChannelContext";
import sortVideos from "../utils/sortVideos.js";
import "../styles/channel.css";

function Channel() {
  const { id } = useParams();
  const [channelInfo, setChannelInfo] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState("recent");
  const [contentType, setContentType] = useState("longform");
  const [loadingMore, setLoadingMore] = useState(false);
  const { selectedChannel } = useChannel();
  const [tab, setTab] = useState("videos");
  const [insights, setInsights] = useState(null);
  const [nextPageTokens, setNextPageTokens] = useState({
    longform: null,
    shorts: null,
  });

  useEffect(() => {
    const loadChannel = async () => {
      setLoading(true);
      setVideos([]);
      try {
        const meta = await fetchChannelMetadata(id);
        setChannelInfo(meta.channel || null);

        const res = await fetchChannelVideos(id, null, contentType);
        setVideos(res.videos || []);
        setNextPageTokens((prev) => ({
          ...prev,
          [contentType]: res.nextPageToken || null,
        }));
      } catch (err) {
        console.error("Failed to load channel:", err);
        alert("Failed to fetch channel data.");
      }
      setLoading(false);
    };

    loadChannel();
  }, [id, contentType]);

  useEffect(() => {
    const loadInsights = async () => {
      if (tab !== "insights" || !id || !selectedChannel?.channelId) return;
      try {
        const res = await fetchChannelInsights(id, selectedChannel.channelId);
        setInsights(res?.insights || null);
      } catch (err) {
        console.error("Failed to fetch channel insights:", err);
      }
    };

    loadInsights();
  }, [tab, id, selectedChannel?.channelId]);

  const sorted = sortVideos(videos, sortOption);

  const loadMoreVideos = async () => {
    const token = nextPageTokens[contentType];
    if (!token || loadingMore) return;

    setLoadingMore(true);
    try {
      const res = await fetchChannelVideos(id, token, contentType);
      setVideos((prev) => [...prev, ...(res.videos || [])]);
      setNextPageTokens((prev) => ({
        ...prev,
        [contentType]: res.nextPageToken || null,
      }));
    } catch (err) {
      console.error("Failed to load more videos:", err);
    }
    setLoadingMore(false);
  };

  return (
    <div className="channel-page">
      {channelInfo && (
        <ChannelHeader
          channelId={id}
          channelInfo={channelInfo}
          rightActions={
            <button
              className="button-ghost-sm"
              onClick={() =>
                window.open(`https://www.youtube.com/channel/${id}`, "_blank")
              }
            >
              ▶ View on YT
            </button>
          }
        />
      )}

      <div className="input-group-row">
        <button
          onClick={() => setTab("videos")}
          className={`button-primary-sm ${tab === "videos" ? "" : "button-ghost-sm"}`}
        >
          Videos
        </button>
        <button
          onClick={() => setTab("insights")}
          className={`button-primary-sm ${tab === "insights" ? "" : "button-ghost-sm"}`}
        >
          Insights
        </button>
      </div>

      {tab === "videos" && (
        <>
          <div className="input-group-row">
            <Filters
              filters={[
                {
                  value: sortOption,
                  onChange: setSortOption,
                  options: [
                    { value: "views", label: "Most Viewed" },
                    { value: "views_asc", label: "Least Viewed" },
                    { value: "recent", label: "Most Recent" },
                    { value: "oldest", label: "Oldest" },
                    { value: "outlier", label: "Highest Score" },
                    { value: "outlier_low", label: "Lowest Score" },
                  ],
                },
                {
                  value: contentType,
                  onChange: setContentType,
                  options: [
                    { value: "shorts", label: "Shorts" },
                    { value: "longform", label: "Longform" },
                  ],
                },
              ]}
            />
          </div>

          {loading ? (
            <div
              style={{ padding: "2rem", color: "#888", textAlign: "center" }}
            >
              Loading videos...
            </div>
          ) : videos.length > 0 ? (
            <>
              <Grid
                items={sorted}
                renderCard={(video, idx) => (
                  <VideoCard
                    key={video.videoId || idx}
                    title={video.title}
                    thumbnail={video.thumbnail}
                    views={video.viewCount}
                    publishedAt={video.publishedAt}
                    length={video.length}
                    videoId={video.videoId}
                    outlierScore={video.outlierScore}
                    channelTitle={channelInfo?.title || ""}
                    showChannelTitle={false}
                  />
                )}
              />

              {nextPageTokens[contentType] && (
                <div style={{ textAlign: "center", margin: "1rem" }}>
                  <button
                    onClick={loadMoreVideos}
                    className="button-primary"
                    disabled={loadingMore}
                  >
                    {loadingMore ? "Loading..." : "Load More"}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div
              style={{ padding: "2rem", color: "#888", textAlign: "center" }}
            >
              No {contentType === "shorts" ? "Shorts" : "Longform videos"} found
              for this channel.
            </div>
          )}
        </>
      )}
      {tab === "insights" && insights && (
        <Grid
          items={[
            { text: insights.niche || "N/A", subtext: "Niche" },
            { text: insights.style || "N/A", subtext: "Style" },
            { text: insights.attentionMarket || "N/A", subtext: "Audience" },
            {
              text: insights.competitorType || "N/A",
              subtext: "Competitor Type",
            },
          ]}
          renderCard={(item, idx) => (
            <InfoCard key={idx} text={item.text} subtext={item.subtext} />
          )}
        />
      )}
    </div>
  );
}

export default Channel;
