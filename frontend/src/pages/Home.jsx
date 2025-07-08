import React from "react";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();

  return (
    <>
      {/* Hero Section */}
      <section
        style={{
          textAlign: "center",
          padding: "10rem 2rem 6rem",
          maxWidth: "800px",
          margin: "0 auto",
        }}
      >
        <h1
          style={{ fontSize: "3rem", marginBottom: "1rem", lineHeight: "1.2" }}
        >
          Make videos that stand out,
          <br /> starting with the idea.
        </h1>
        <p style={{ fontSize: "1.2rem", color: "#666", marginBottom: "2rem" }}>
          Find, test, and refine your YouTube ideas — before you hit record.
        </p>
        <button
          onClick={() => window.dispatchEvent(new Event("open-signup"))}
          className={"button-primary"}
        >
          Start Free
        </button>
      </section>

      {/* Features Section */}
      <section
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
          padding: "4rem 1rem",
          textAlign: "center",
        }}
      >
        <h2 style={{ fontSize: "2.2rem", marginBottom: "2rem" }}>
          Everything you need to create viral videos
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "2rem",
            justifyItems: "start",
          }}
        >
          <div>
            <h3 style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>
              🎯 Research Proven Ideas
            </h3>
            <p style={{ color: "#555" }}>
              Discover topics that have already performed well on YouTube, in
              your niche.
            </p>
          </div>
          <div>
            <h3 style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>
              👀 Track Competitors
            </h3>
            <p style={{ color: "#555" }}>
              Get notifications when your rivals post new videos, so you stay
              ahead.
            </p>
          </div>
          <div>
            <h3 style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>
              🚀 Find Outliers
            </h3>
            <p style={{ color: "#555" }}>
              Spot videos that outperformed their channels — the fastest way to
              find viral content opportunities.
            </p>
          </div>
          <div>
            <h3 style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>
              📂 Organize Your Ideas
            </h3>
            <p style={{ color: "#555" }}>
              Save, sort, and refine your video concepts with a simple
              workspace.
            </p>
          </div>
          <div>
            <h3 style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>
              ✨ Generate Engaging Titles
            </h3>
            <p style={{ color: "#555" }}>
              Instantly create compelling video titles based on your ideas,
              designed to capture clicks and maximize views.
            </p>
          </div>
          <div>
            <h3 style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>
              🕵️ Competitor Insights
            </h3>
            <p style={{ color: "#555" }}>
              Compare your channel’s performance to your competitors’ to uncover
              content gaps and opportunities.
            </p>
          </div>
        </div>
      </section>

      <section
        style={{
          textAlign: "center",
          padding: "3rem 2rem",
          maxWidth: "800px",
          margin: "0 auto",
          marginBottom: "6rem",
        }}
      >
        <h2 style={{ fontSize: "2.2rem", marginBottom: "1.5rem" }}>
          Ready to find your next big idea?
        </h2>
        <button
          onClick={() => window.dispatchEvent(new Event("open-signup"))}
          className={"button-primary"}
        >
          Start Free
        </button>
      </section>

      {/* Footer */}
      <footer
        style={{
          backgroundColor: "#f5f5f5",
          color: "#333",
          textAlign: "center",
          padding: "2rem",
          fontSize: "0.9rem",
        }}
      >
        <p>
          &copy; {new Date().getFullYear()} Streamline. All rights reserved.
        </p>
        <div style={{ marginTop: "1rem" }}>
          <a
            href="/privacy"
            style={{
              color: "#007bff",
              marginRight: "1rem",
              textDecoration: "none",
            }}
          >
            Privacy Policy
          </a>
          <a href="/terms" style={{ color: "#007bff", textDecoration: "none" }}>
            Terms of Service
          </a>
        </div>
      </footer>
    </>
  );
};

export default Home;
