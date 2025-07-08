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

    setLoading(true);
    setError(null);
    setTitles([]);

    try {
      const res = await generateTitle(ideaToUse, selectedChannel.channelId);
      const titlesList = Array.isArray(res.titles) ? res.titles : [];
      setTitles(titlesList);
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
        <h1 className="page-title">Title Generator</h1>

        {!selectedChannel ? (
          <p style={{ padding: "2rem", color: "#888", textAlign: "center" }}>
            Please add a channel before using the Title Generator.
          </p>
        ) : (
          <>
            {error && <p className="error-message">{error}</p>}

            <div
              className="input-group-row"
              style={{ gap: "1rem", marginBottom: "2rem" }}
            >
              <input
                type="text"
                className="form-input"
                placeholder="Enter your video idea..."
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  maxWidth: "400px",
                  whiteSpace: "nowrap",
                  overflowX: "auto",
                }}
              />
              <button
                className="button-primary"
                onClick={() => handleGenerate()}
                disabled={loading}
              >
                {loading ? loadingText : "Generate Titles"}
              </button>
            </div>

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
