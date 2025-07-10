# Streamline

Streamline helps YouTube creators uncover trends, analyze competition, and generate better video ideas.

---

## 🚀 Features

- 🔍 Niche Explorer – Semantic search for popular channels
- 📊 Channel Analyzer – Detects viral outliers and scoring patterns
- 🧠 Competitor Tracker – Catch uploads from your rivals
- 🧰 Title Generator – Generates titles tailored to your channel
- 🔐 Auth – JWT + Google OAuth
- ✉️ Email – Password resets via Resend
- 🛡️ Secure – CSRF, rate limiting, cookie security
- ⚙️ Background Jobs – Daily outlier + competitor updates

---

## 🧱 Tech Stack

| Layer  | Stack           |
|--------|------------------|
| Frontend | React (Vite)     |
| Backend | Flask (Python)   |
| Database | MongoDB          |
| Cache  | Redis            |
| Auth   | JWT + Google OAuth |
| Deploy | Railway          |

---

## 🧠 Scoring Logic

Streamline uses a weighted formula to evaluate each video’s impact, based on:

- Performance vs. channel median
- Upload consistency
- Subscriber-adjusted benchmarks
- Semantic relevance

---

## 🔐 Security

- Secure, HttpOnly cookies
- Refresh tokens
- CSRF tokens for state-changing requests
- Per-user rate limiting via Flask-Limiter
- Validated inputs + session-aware Redis

---

## 📃 License

MIT License — free to use, modify, or build upon.