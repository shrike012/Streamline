import React, { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  searchYoutubeChannels,
  addChannel,
  removeChannel,
  getSettings,
  updateEmail,
  updatePassword,
  updateNotifications,
  deleteAccount,
  getNotifications,
  markNotificationsRead,
} from "../api/apiRoutes.js";
import { useAuth } from "../context/AuthContext";
import { useChannel } from "../context/ChannelContext";
import {
  FiRefreshCw,
  FiBell,
  FiMenu,
  FiEye,
  FiPlus,
  FiLogOut,
  FiSettings,
  FiX,
} from "react-icons/fi";
import Modal from "./Modal";
import ChannelCard from "./ChannelCard.jsx";
import "../styles/navbar.css";
import { syncChannelsAndSelected } from "../utils/channelHelpers.js";
import useLoadingDots from "../utils/useLoadingDots";

const Navbar = ({ toggleSidebar }) => {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showChannelList, setShowChannelList] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchErrors, setSearchErrors] = useState({});
  const [searchPerformed, setSearchPerformed] = useState(false);

  const channelDropdownRef = useRef();
  const notificationDropdownRef = useRef();
  const { _, logout, loading } = useAuth();
  const { selectedChannel, updateChannel } = useChannel();
  const [channels, setChannels] = useState([]);

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [forgotEmail, setForgotEmail] = useState(email);
  const [forgotMessage, setForgotMessage] = useState("");

  const [form, setForm] = useState({
    newEmail: "",
    newPassword: "",
    currentPassword: "",
  });
  const [authProvider, setAuthProvider] = useState("local");
  const [receiveNotifications, setReceiveNotifications] = useState(null);
  const [errors, setErrors] = useState({});
  const [settingsLoading, setSettingsLoading] = useState(false);

  const loadingAdd = useLoadingDots("Adding channel", 500);

  useEffect(() => {
    async function fetchNotifications() {
      if (!selectedChannel) return;
      try {
        const res = await getNotifications(selectedChannel.channelId);
        setNotifications(res);
      } catch {}
    }
    fetchNotifications();
  }, [selectedChannel]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        channelDropdownRef.current &&
        !channelDropdownRef.current.contains(e.target)
      ) {
        setDropdownOpen(false);
        setShowChannelList(false);
      }

      if (
        notificationDropdownRef.current &&
        !notificationDropdownRef.current.contains(e.target)
      ) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    syncChannelsAndSelected(setChannels, updateChannel).catch(() => {});
  }, []);

  useEffect(() => {
    if (showSettingsModal) {
      getSettings()
        .then((res) => {
          setEmail(res.data.email);
          setReceiveNotifications(res.data.notificationsEnabled);
          setAuthProvider(res.data.authProvider || "local");
        })
        .catch(() => {
          setErrors({ form: "Failed to load settings." });
        });
    }
  }, [showSettingsModal]);

  const handleBellClick = async () => {
    setShowNotifications((prev) => !prev);

    if (!showNotifications && notifications.some((n) => !n.read)) {
      try {
        await markNotificationsRead(selectedChannel.channelId);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      } catch (err) {}
    }
  };

  const closeAllModals = () => {
    setShowSearchModal(false);
    setShowSettingsModal(false);
    setShowRemoveModal(false);
    setSearchQuery("");
    setSearchResults([]);
    setSearchErrors({});
    setSearchPerformed(false);
    setForm({
      newEmail: "",
      newPassword: "",
      currentPassword: "",
    });
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchLoading) return;
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

  const handleSelectFromSearch = async (channelId) => {
    setIsSubmitting(true);
    setSearchResults([]);
    setSearchPerformed(false);
    try {
      const res = await addChannel({ channelId });
      const newChannel = res.data;

      setChannels((prev) => [...prev, newChannel]);
      updateChannel(newChannel);
      setDropdownOpen(false);
      closeAllModals();
      navigate("/app/dashboard");
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to add channel.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveClick = async (channelId) => {
    try {
      await removeChannel(channelId);
      const updated = channels.filter((ch) => ch.channelId !== channelId);
      setChannels(updated);

      if (selectedChannel?.channelId === channelId) {
        updateChannel(updated[0] || null);
      }

      closeAllModals();
      setDropdownOpen(false);
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to remove channel.");
    }
  };

  const handleSettingsChange = (e) => {
    const { name, value } = e.target;
    if (name === "newEmail") setEmail(value.trim());
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    if (settingsLoading) return;
    setSettingsLoading(true);
    setErrors({});

    if (form.newPassword && !form.currentPassword) {
      setErrors({ form: "Input current password" });
      setSettingsLoading(false);
      return;
    }

    try {
      if (form.newEmail && form.newEmail !== email) {
        await updateEmail({
          email: form.newEmail,
          currentPassword: form.currentPassword,
        });
        setEmail(form.newEmail);
      }

      if (form.newPassword) {
        await updatePassword({
          password: form.newPassword,
          currentPassword: form.currentPassword,
        });
      }

      setForm({
        newEmail: "",
        newPassword: "",
        currentPassword: "",
      });
    } catch (err) {
      setErrors({ form: err?.response?.data?.error || "Update failed." });
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleToggleNotifications = async () => {
    try {
      await updateNotifications({ enabled: !receiveNotifications });
      setReceiveNotifications(!receiveNotifications);
    } catch {
      setErrors({ form: "Failed to update notifications." });
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm("Delete account permanently?");
    if (!confirmed) return;
    try {
      await deleteAccount();
      window.location.href = "/";
    } catch {
      alert("Failed to delete account.");
    }
  };

  if (loading) {
    return (
      <header className="navbar auth-navbar">
        <div className="navbar-content">Loading...</div>
      </header>
    );
  }

  return (
    <>
      <header className="navbar auth-navbar">
        <div className="navbar-content">
          <div className="navbar-section">
            <button className="menu-toggle" onClick={toggleSidebar}>
              <FiMenu size={20} />
            </button>
            <Link to="/app/dashboard" className="navbar-logo">
              <img src="/logo.ico" alt="logo" className="logo-img" />
              <span className="logo-text">Streamline</span>
            </Link>
          </div>

          <div className="navbar-section">
            <div className="notification-wrapper" ref={notificationDropdownRef}>
              <FiBell
                className="nav-icon"
                size={20}
                onClick={handleBellClick}
                style={{ cursor: "pointer" }}
              />
              {notifications.some((n) => !n.read) && (
                <span className="badge">
                  {notifications.filter((n) => !n.read).length}
                </span>
              )}

              {showNotifications && (
                <div
                  className="navbar-dropdown"
                  style={{
                    maxHeight: "400px",
                    overflowY: "auto",
                    width: "300px",
                  }}
                >
                  {notifications.length === 0 ? (
                    <p
                      style={{
                        color: "#888",
                        padding: "1rem",
                        textAlign: "center",
                      }}
                    >
                      No notifications.
                    </p>
                  ) : (
                    notifications.map((n, idx) => (
                      <div key={idx} className="navbar-dropdown-item">
                        <a
                          href={n.link || "#"}
                          style={{
                            textDecoration: "none",
                            color: "white",
                            display: "block",
                            padding: "0.5rem 1rem",
                          }}
                        >
                          {n.message}
                        </a>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="account-menu" ref={channelDropdownRef}>
              <div
                className={`account-avatar ${!selectedChannel ? "add-mode" : ""}`}
                onClick={() => {
                  setDropdownOpen((prev) => !prev);
                  setShowChannelList(false);
                }}
              >
                {!selectedChannel ? (
                  <FiPlus style={{ color: "#ccc" }} size={18} />
                ) : (
                  <img
                    src={selectedChannel.avatar}
                    alt="channel-avatar"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>

              {dropdownOpen && (
                <div className="navbar-dropdown">
                  <button
                    className="navbar-dropdown-item"
                    onClick={() => setShowChannelList((prev) => !prev)}
                  >
                    <FiRefreshCw /> Switch Channel
                  </button>

                  {showChannelList && channels.length > 0 && (
                    <>
                      {channels.map((ch) => (
                        <button
                          key={ch.channelId}
                          className="navbar-dropdown-item"
                          onClick={() => {
                            updateChannel(ch);
                            setDropdownOpen(false);
                            setShowChannelList(false);
                          }}
                        >
                          <img
                            src={ch.avatar}
                            className="channel-avatar"
                            alt="avatar"
                            referrerPolicy="no-referrer"
                          />
                          {ch.channelTitle}
                        </button>
                      ))}
                      <hr />
                    </>
                  )}

                  {selectedChannel && (
                    <button
                      className="navbar-dropdown-item"
                      onClick={() => {
                        navigate(`/app/channel/${selectedChannel.channelId}`);
                        setDropdownOpen(false);
                      }}
                    >
                      <FiEye /> View My Channel
                    </button>
                  )}

                  <button
                    className="navbar-dropdown-item"
                    onClick={() => {
                      closeAllModals();
                      setShowSearchModal(true);
                    }}
                  >
                    <FiPlus /> Add Channel
                  </button>
                  <button
                    className="navbar-dropdown-item"
                    onClick={() => {
                      closeAllModals();
                      setShowRemoveModal(true);
                    }}
                  >
                    <FiX /> Remove Channel
                  </button>
                  <button
                    className="navbar-dropdown-item"
                    onClick={() => {
                      closeAllModals();
                      setShowSettingsModal(true);
                    }}
                  >
                    <FiSettings /> Settings
                  </button>
                  <button className="navbar-dropdown-item" onClick={logout}>
                    <FiLogOut /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Search Modal */}
      <Modal
        isOpen={showSearchModal}
        onClose={isSubmitting ? null : closeAllModals}
        title="Search for Your Channel"
        fields={[]}
        formData={{}}
        onChange={() => {}}
        onSubmit={handleSearch}
        errors={searchErrors}
        loading={searchLoading}
        submitLabel="Search"
        actions={
          isSubmitting ? (
            <div
              style={{
                textAlign: "center",
                padding: "2rem 0",
                color: "#888",
                fontSize: "1.1rem",
              }}
            >
              {loadingAdd}
            </div>
          ) : searchResults.length > 0 ? (
            <div className="search-results">
              {searchResults.map((ch) => (
                <ChannelCard
                  key={ch.channelId}
                  avatar={ch.avatar}
                  channelTitle={ch.channelTitle}
                  channelId={ch.channelId}
                  subscriberCount={ch.subscriberCount}
                  navigateOnClick={false}
                  onAdd={() => handleSelectFromSearch(ch.channelId)}
                />
              ))}
            </div>
          ) : searchPerformed && searchQuery.trim() !== "" && !searchLoading ? (
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

      {/* Settings Modal */}
      <Modal
        isOpen={showSettingsModal}
        onClose={closeAllModals}
        title="Settings"
        fields={
          authProvider === "local"
            ? [
                { label: "Email", name: "newEmail", type: "email" },
                {
                  label: "Current Password",
                  name: "currentPassword",
                  type: "password",
                },
                {
                  label: "New Password",
                  name: "newPassword",
                  type: "password",
                },
              ]
            : []
        }
        formData={{ ...form, newEmail: email }}
        onChange={handleSettingsChange}
        onSubmit={
          authProvider === "local"
            ? handleSettingsSubmit
            : (e) => e.preventDefault()
        }
        errors={errors}
        loading={settingsLoading}
        submitLabel={authProvider === "local" ? "Update Settings" : ""}
        actions={
          <div>
            {authProvider === "google" && (
              <div
                style={{
                  fontSize: "0.9rem",
                  color: "#888",
                  marginBottom: "1rem",
                }}
              >
                Signed in via Google.
                <br />
                <strong>Email:</strong> {email}
              </div>
            )}

            {authProvider === "local" && (
              <div
                style={{
                  marginTop: "0.5rem",
                  marginBottom: "0.5rem",
                }}
              >
                <span
                  onClick={() => setShowForgotPassword(true)}
                  style={{
                    color: "#007bff",
                    textDecoration: "none",
                    cursor: "pointer",
                  }}
                >
                  Forgot your password?
                </span>
              </div>
            )}

            {receiveNotifications !== null && (
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.25rem",
                }}
              >
                <input
                  type="checkbox"
                  checked={receiveNotifications}
                  onChange={handleToggleNotifications}
                />
                Receive notifications for competitor uploads
              </label>
            )}

            <button
              className="button-danger"
              onClick={handleDeleteAccount}
              style={{ marginTop: "0.5rem" }}
            >
              Delete Account
            </button>
          </div>
        }
      />

      {/* Remove Channel Modal */}
      <Modal
        isOpen={showRemoveModal}
        onClose={closeAllModals}
        title="Remove a Channel"
        fields={[]}
        formData={{}}
        onChange={() => {}}
        onSubmit={(e) => e.preventDefault()}
        errors={{}}
        loading={false}
        submitLabel={""}
        actions={
          channels.length > 0 && (
            <div className="search-results">
              {channels.map((ch) => (
                <ChannelCard
                  key={ch.channelId}
                  avatar={ch.avatar}
                  channelTitle={ch.channelTitle}
                  navigateOnClick={false}
                  subscriberCount={ch.subscriberCount}
                  onAdd={() => handleRemoveClick(ch.channelId)}
                  disableLink
                />
              ))}
            </div>
          )
        }
      />

      <Modal
        isOpen={showForgotPassword}
        onClose={() => {
          setShowForgotPassword(false);
          setForgotEmail(email);
          setForgotMessage("");
        }}
        title="Reset Password"
        fields={[{ label: "Email", name: "forgotEmail", type: "email" }]}
        formData={{ forgotEmail }}
        onChange={(e) => setForgotEmail(e.target.value)}
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await requestPasswordReset(forgotEmail);
            setForgotMessage(
              "If your account supports password login, a reset link has been sent.",
            );
          } catch {
            setForgotMessage("Something went wrong. Try again.");
          }
        }}
        errors={forgotMessage ? { form: forgotMessage } : {}}
        loading={false}
        submitLabel="Send Reset Link"
      />
    </>
  );
};

export default Navbar;
