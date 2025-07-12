import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { useChannel } from "../context/ChannelContext";
import { generateTitle } from "../api/apiRoutes";
import useLoadingDots from "../utils/useLoadingDots";
import Grid from "../components/Grid";
import InfoCard from "../components/InfoCard";

function TitleGenerator() {
  const { selectedChannel } = useChannel();
  const location = useLocation();
  const [idea, setIdea] = useState("");
  const [titles, setTitles] = useState([]);
  const [loading, setLoading] = useState(false);
  const loadingText = useLoadingDots("Generating", 500);
  const [error, setError] = useState(null);

  useEffect(() => {
    const savedChannel = sessionStorage.getItem("streamline_selected_channel");
    const savedIdea = sessionStorage.getItem("streamline_title_idea");
    const savedTitles = sessionStorage.getItem("streamline_title_results");

    const parsedChannel = savedChannel ? JSON.parse(savedChannel) : null;

    if (
      selectedChannel &&
      parsedChannel &&
      selectedChannel.channelId === parsedChannel.channelId &&
      savedIdea &&
      savedTitles
    ) {
      setIdea(savedIdea);
      setTitles(JSON.parse(savedTitles));
    }
  }, [selectedChannel]);

  useEffect(() => {
    if (location.state?.initialIdea) {
      setIdea(location.state.initialIdea);
      setTimeout(() => {
        handleGenerate(location.state.initialIdea);
      }, 0);
    }
  }, [location.state]);

  const handleGenerate = async (forcedIdea) => {
    const ideaToUse = (forcedIdea ?? idea).trim();

    if (!ideaToUse || !selectedChannel?.channelId) {
      setError("Please enter an idea and select a channel.");
      return;
    }

    if (ideaToUse.length > 100) {
      setError("Idea is too long (keep it under 100 characters).");
      return;
    }

    setLoading(true);
    setError(null);
    setTitles([]);

    try {
      const res = await generateTitle(ideaToUse, selectedChannel.channelId);
      const titlesList = Array.isArray(res.titles) ? res.titles : [];
      setTitles(titlesList);

      sessionStorage.setItem("streamline_title_idea", ideaToUse);
      sessionStorage.setItem(
        "streamline_title_results",
        JSON.stringify(titlesList),
      );
      sessionStorage.setItem(
        "streamline_selected_channel",
        JSON.stringify(selectedChannel),
      );
    } catch (err) {
      console.error("Failed to generate titles:", err);
      setError("Failed to generate titles. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Title Generator</title>
      </Helmet>
      <div className="page-content">
        <h1>Title Generator</h1>

        {!selectedChannel ? (
          <p style={{ padding: "2rem", color: "#888", textAlign: "center" }}>
            Add a channel to use the Title Generator.
          </p>
        ) : (
          <>
            {error && <p className="error-message">{error}</p>}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleGenerate();
              }}
              className="input-group-row"
              style={{
                gap: "1rem",
                marginBottom: "2rem",
                flexDirection: "column",
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  width: "100%",
                  maxWidth: "500px",
                }}
              >
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter your video idea..."
                  value={idea}
                  maxLength={100}
                  onChange={(e) => {
                    setIdea(e.target.value);
                    if (error) setError(null);
                  }}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    whiteSpace: "nowrap",
                    overflowX: "auto",
                    borderColor: idea.length > 100 ? "red" : undefined,
                  }}
                />
                <button
                  type="submit"
                  className="button-primary"
                  disabled={loading}
                  style={{
                    minWidth: "160px",
                    textAlign: "center",
                  }}
                >
                  {loading ? loadingText : "Generate Titles"}
                </button>
              </div>
            </form>

            {titles.length > 0 && (
              <div className="generated-titles">
                <Grid
                  items={titles}
                  renderCard={(title, idx) => (
                    <InfoCard key={idx} text={title} />
                  )}
                />
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

export default TitleGenerator;
