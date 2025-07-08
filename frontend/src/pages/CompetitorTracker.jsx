import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  getCompetitorLists,
  createCompetitorList,
  getCompetitorsInList,
  renameCompetitorList,
  addCompetitorToList,
  fetchChannelVideos,
  deleteCompetitorList,
  searchYoutubeChannels,
  removeCompetitorFromList,
} from "../api/apiRoutes.js";
import sortVideos from "../utils/sortVideos";
import { useChannel } from "../context/ChannelContext";
import Modal from "../components/Modal.jsx";
import ChannelHeader from "../components/ChannelHeader";
import Filters from "../components/Filters.jsx";
import ChannelCard from "../components/ChannelCard.jsx";
import VideoCard from "../components/VideoCard.jsx";
import Carousel from "../components/Carousel.jsx";
import useLoadingDots from "../utils/useLoadingDots";

function CompetitorTracker() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  const focusListId = searchParams.get("list");
  const focusChannelId = searchParams.get("focus");

  const { selectedChannel } = useChannel();
  const selectedChannelId = selectedChannel?.channelId;
  const [lists, setLists] = useState([]);
  const [selectedListId, setSelectedListId] = useState(null);
  const [competitors, setCompetitors] = useState([]);
  const [channelFilters, setChannelFilters] = useState({});
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const loadingVideosText = useLoadingDots("Loading videos", 500);
  const [searchErrors, setSearchErrors] = useState({});
  const [competitorData, setCompetitorData] = useState({});
  const [searchPerformed, setSearchPerformed] = useState(false);

  const channelRefs = useRef({}); // key: channelId -> ref

  useEffect(() => {
    if (focusListId && lists.some((l) => l.listId === focusListId)) {
      setSelectedListId(focusListId);
    }
  }, [focusListId, lists]);

  useEffect(() => {
    if (focusChannelId && channelRefs.current[focusChannelId]) {
      channelRefs.current[focusChannelId].scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      channelRefs.current[focusChannelId].classList.add("highlight-channel");

      setTimeout(() => {
        channelRefs.current[focusChannelId].classList.remove(
          "highlight-channel",
        );
      }, 2000); // Remove highlight after 2 seconds
    }
  }, [focusChannelId, competitors]);

  useEffect(() => {
    if (!selectedChannelId) return;
    setCompetitors([]);
    getCompetitorLists(selectedChannelId)
      .then((fetchedLists) => {
        setLists(fetchedLists);
        if (fetchedLists.length > 0) {
          setSelectedListId((prev) =>
            prev && fetchedLists.some((l) => l.listId === prev)
              ? prev
              : fetchedLists[0].listId,
          );
        } else {
          setSelectedListId(null);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch competitor lists:", err);
      });
  }, [selectedChannelId]);

  useEffect(() => {
    if (!selectedListId || !selectedChannelId) {
      setCompetitors([]);
      return;
    }
    getCompetitorsInList(selectedChannelId, selectedListId).then((comps) => {
      setCompetitors(comps);

      // Update competitor data from list info
      setCompetitorData((prev) => {
        const updated = { ...prev };
        comps.forEach((comp) => {
          updated[comp.competitorChannelId] = {
            ...(prev[comp.competitorChannelId] || {}),
            info: {
              channelTitle: comp.channelTitle,
              thumbnail: comp.avatar,
              subscriberCount: comp.subscriberCount || 0,
            },
          };
        });
        return updated;
      });

      // Initialize filters for each competitor
      setChannelFilters((prev) => {
        const updated = { ...prev };
        comps.forEach((comp) => {
          const id = comp.competitorChannelId;
          if (!updated[id]) {
            updated[id] = { sortOption: "recent", contentType: "longform" };
          }
        });
        return updated;
      });
    });
  }, [selectedListId, selectedChannelId]);

  useEffect(() => {
    competitors.forEach((comp) => {
      const id = comp.competitorChannelId;
      ["longform", "shorts"].forEach((type) => {
        const channelData = competitorData[id];
        const typeData = channelData?.videosByType?.[type];

        let needsFetch = true;
        if (typeData && channelData?.lastFetchedAt) {
          const lastFetched = new Date(channelData.lastFetchedAt);
          const minutesSinceFetch = (Date.now() - lastFetched) / 60000;
          if (minutesSinceFetch < 10) needsFetch = false;
        }

        if (needsFetch) setTimeout(() => loadCompetitorVideos(id, type), 0);
      });
    });
  }, [competitors, competitorData]); // Added competitorData to avoid stale reads

  const loadCompetitorVideos = async (
    channelId,
    contentType = "longform",
    channelInfo,
  ) => {
    try {
      const videoRes = await fetchChannelVideos(channelId, null, contentType);
      const latestFetched = videoRes?.videos?.[0];
      const existingLatest =
        competitorData[channelId]?.videosByType?.[contentType]?.videos?.[0];
      let hasNewVideo = false;
      if (latestFetched && existingLatest) {
        if (
          new Date(latestFetched.publishedAt) >
          new Date(existingLatest.publishedAt)
        ) {
          hasNewVideo = true;
        }
      }
      setCompetitorData((prev) => ({
        ...prev,
        [channelId]: {
          lastFetchedAt: new Date().toISOString(),
          info: channelInfo || prev[channelId]?.info,
          videosByType: {
            ...(prev[channelId]?.videosByType || {}),
            [contentType]: videoRes,
          },
          hasNewVideoByType: {
            ...(prev[channelId]?.hasNewVideoByType || {}),
            [contentType]: hasNewVideo,
          },
        },
      }));
    } catch (err) {
      alert(err.response?.data?.error || "Failed to load competitor videos.");
    }
  };

  const handleSelectFromSearch = async (channelId) => {
    try {
      setShowSearchModal(false);
      setSearchQuery("");
      setSearchResults([]);

      const res = await addCompetitorToList(selectedChannelId, selectedListId, {
        competitorChannelId: channelId,
      });

      setCompetitors((prev) => [...prev, res.competitor]);

      const channelInfo = {
        channelTitle: res.competitor.channelTitle,
        thumbnail: res.competitor.avatar,
        subscriberCount: res.competitor.subscriberCount || 0,
      };

      setCompetitorData((prev) => ({
        ...prev,
        [channelId]: { ...prev[channelId], info: channelInfo },
      }));

      setChannelFilters((prev) => ({
        ...prev,
        [channelId]: { sortOption: "recent", contentType: "longform" },
      }));

      // Load both longform & shorts videos in parallel
      await Promise.all([
        loadCompetitorVideos(channelId, "longform", channelInfo),
        loadCompetitorVideos(channelId, "shorts", channelInfo),
      ]);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to add competitor.");
    }
  };

  const handleSortChange = (channelId, newSort) => {
    setChannelFilters((prev) => ({
      ...prev,
      [channelId]: {
        ...(prev[channelId] || { contentType: "longform" }),
        sortOption: newSort,
      },
    }));
  };

  const handleTypeChange = (channelId, newType) => {
    setChannelFilters((prev) => ({
      ...prev,
      [channelId]: {
        ...(prev[channelId] || { sortOption: "recent" }),
        contentType: newType,
      },
    }));
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setSearchErrors({});
    setSearchPerformed(true);
    try {
      const res = await searchYoutubeChannels(searchQuery);
      setSearchResults(res.results || []);
    } catch (err) {
      setSearchErrors({ form: "Search failed. Try again." });
    } finally {
      setSearchLoading(false);
    }
  };

  const closeSearchModal = () => {
    setShowSearchModal(false);
    setSearchQuery("");
    setSearchResults([]);
    setSearchPerformed(false);
  };

  const handleCreateList = async () => {
    const name = prompt("Enter a competitor list name");
    if (!name) return;
    try {
      const res = await createCompetitorList(selectedChannelId, name);
      const updatedLists = await getCompetitorLists(selectedChannelId);
      setLists(updatedLists);
      setSelectedListId(res.listId);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to create list.");
    }
  };

  const handleRenameList = async () => {
    const newName = prompt("Enter new list name");
    if (!newName) return;
    try {
      await renameCompetitorList(selectedChannelId, selectedListId, newName);
      const updatedLists = await getCompetitorLists(selectedChannelId);
      setLists(updatedLists);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to rename list.");
    }
  };

  const handleDeleteList = async () => {
    if (!window.confirm("Are you sure you want to delete this list?")) return;
    try {
      await deleteCompetitorList(selectedChannelId, selectedListId);
      const updatedLists = await getCompetitorLists(selectedChannelId);
      setLists(updatedLists);
      setSelectedListId(
        updatedLists.length > 0 ? updatedLists[0].listId : null,
      );
    } catch (err) {
      console.error("Failed to delete list:", err);
    }
  };

  const handleRemoveCompetitor = async (channelId) => {
    if (!window.confirm("Remove this competitor from the list?")) return;
    try {
      await removeCompetitorFromList(
        selectedChannelId,
        selectedListId,
        channelId,
      );
      const updated = await getCompetitorsInList(
        selectedChannelId,
        selectedListId,
      );
      setCompetitors(updated);
      setCompetitorData((prev) => {
        const copy = { ...prev };
        delete copy[channelId];
        return copy;
      });
    } catch (err) {
      console.error("Failed to remove competitor.", err);
    }
  };

  return (
    <>
      <Helmet>
        <title>Competitor Tracker</title>
      </Helmet>
      <h1>Competitor Tracker</h1>

      {!selectedChannel ? (
        <div
          style={{ textAlign: "center", padding: "4rem 1rem", color: "#888" }}
        >
          Please add a channel before using the Competitor Tracker.
        </div>
      ) : (
        <>
          <div
            className="input-group-row"
            style={{ flexWrap: "wrap", gap: "0.5rem" }}
          >
            {lists.map((list) => (
              <button
                key={list.listId}
                className={
                  selectedListId === list.listId
                    ? "button-primary-sm"
                    : "button-ghost-sm"
                }
                onClick={() => {
                  if (selectedListId !== list.listId) {
                    setSelectedListId(list.listId);
                  }
                }}
              >
                {list.name}
              </button>
            ))}
            <button className="button-ghost-sm" onClick={handleCreateList}>
              ＋ Add List
            </button>
            <div style={{ width: "0.5rem" }} />
            {selectedListId && (
              <>
                <button
                  className="button-ghost-sm"
                  onClick={() => {
                    setShowSearchModal(true);
                    setSearchPerformed(false);
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                >
                  ＋ Add Competitor
                </button>
                <button className="button-ghost-sm" onClick={handleRenameList}>
                  ✎ Rename List
                </button>
                <button className="button-ghost-sm" onClick={handleDeleteList}>
                  🗑 Delete List
                </button>
              </>
            )}
          </div>

          <section className="page-section">
            {lists.length === 0 ? (
              <div
                style={{
                  color: "#888",
                  padding: "4rem 1rem",
                  textAlign: "center",
                }}
              >
                No lists have been added.
              </div>
            ) : !selectedListId ? (
              <div
                style={{
                  color: "#888",
                  padding: "4rem 1rem",
                  textAlign: "center",
                }}
              >
                No list selected.
              </div>
            ) : competitors.length === 0 ? (
              <div
                style={{
                  color: "#888",
                  padding: "4rem 1rem",
                  textAlign: "center",
                }}
              >
                No competitors in this list.
              </div>
            ) : (
              competitors.map((comp) => {
                const channelId = comp.competitorChannelId;
                const data = competitorData[channelId];
                const filters = channelFilters[channelId] || {
                  sortOption: "recent",
                  contentType: "longform",
                };
                const typeData = data?.videosByType?.[filters.contentType];
                const rawVideos = typeData?.videos || [];
                const sortedVideos = sortVideos(rawVideos, filters.sortOption);
                const hasNewVideo =
                  data?.hasNewVideoByType?.[filters.contentType] || false;

                return (
                  <div
                    key={channelId}
                    ref={(el) => (channelRefs.current[channelId] = el)}
                    className="channel-row"
                  >
                    {data && (
                      <div
                        className="channel-header-wrapper"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <ChannelHeader
                          channelId={channelId}
                          channelInfo={data.info}
                          hasNewVideo={hasNewVideo}
                          rightActions={
                            <>
                              <button
                                className="button-ghost-sm"
                                onClick={() =>
                                  window.open(
                                    `https://www.youtube.com/channel/${channelId}`,
                                    "_blank",
                                  )
                                }
                              >
                                ▶ View on YT
                              </button>
                              <button
                                className="button-ghost-sm"
                                onClick={() =>
                                  handleRemoveCompetitor(channelId)
                                }
                              >
                                ✖ Remove
                              </button>
                            </>
                          }
                        />
                      </div>
                    )}
                    <div
                      className="input-group-row"
                      style={{ margin: "1rem 0" }}
                    >
                      <Filters
                        filters={[
                          {
                            value: filters.sortOption,
                            onChange: (val) => handleSortChange(channelId, val),
                            options: [
                              { value: "views", label: "Most Viewed" },
                              { value: "views_asc", label: "Least Viewed" },
                              { value: "recent", label: "Newest First" },
                              { value: "oldest", label: "Oldest First" },
                              { value: "outlier", label: "Top Outliers" },
                              {
                                value: "outlier_low",
                                label: "Lowest Outliers",
                              },
                            ],
                          },
                          {
                            value: filters.contentType,
                            onChange: (val) => handleTypeChange(channelId, val),
                            options: [
                              { value: "shorts", label: "Shorts" },
                              { value: "longform", label: "Longform" },
                            ],
                          },
                        ]}
                      />
                    </div>

                    {!data?.videosByType?.[filters.contentType] ? (
                      <div style={{ padding: "1rem", color: "#888" }}>
                        {loadingVideosText}
                      </div>
                    ) : rawVideos.length > 0 ? (
                      <Carousel
                        items={sortedVideos}
                        renderCard={(video, idx) => (
                          <VideoCard
                            key={`vid-${idx}`}
                            title={video.title}
                            thumbnail={video.thumbnail}
                            views={video.viewCount}
                            publishedAt={video.publishedAt}
                            length={video.length}
                            videoId={video.videoId}
                            outlierScore={video.outlierScore}
                            showChannelTitle={false}
                            channelTitle={video.channelTitle}
                            channelId={video.channelId}
                          />
                        )}
                      />
                    ) : (
                      <div style={{ padding: "1rem", color: "#888" }}>
                        No{" "}
                        {filters.contentType === "shorts"
                          ? "Shorts"
                          : "Longform videos"}{" "}
                        found.
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </section>

          <Modal
            isOpen={showSearchModal}
            onClose={closeSearchModal}
            title="Add Competitor Channel"
            fields={[]}
            formData={{}}
            onChange={() => {}}
            onSubmit={handleSearch}
            errors={searchErrors}
            loading={searchLoading}
            submitLabel="Search"
            actions={
              searchResults.length > 0 ? (
                <div className="search-results">
                  {searchResults.map((ch) => (
                    <ChannelCard
                      key={ch.channelId}
                      avatar={ch.avatar}
                      channelTitle={ch.channelTitle}
                      subscriberCount={ch.subscriberCount}
                      navigateOnClick={false}
                      onAdd={() => handleSelectFromSearch(ch.channelId)}
                      disableLink
                    />
                  ))}
                </div>
              ) : searchPerformed &&
                searchQuery.trim() !== "" &&
                !searchLoading ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "2rem 0",
                    color: "#888",
                    fontSize: "1.1rem",
                  }}
                >
                  No results found.
                </div>
              ) : null
            }
          >
            <input
              type="text"
              placeholder="Search YouTube handle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ marginBottom: "0.5rem" }}
            />
          </Modal>
        </>
      )}
    </>
  );
}

export default CompetitorTracker;
