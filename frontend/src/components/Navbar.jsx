import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  searchYoutubeChannels,
  addChannel,
  removeChannel,
  listUserChannels,
  getSettings,
  updateEmail,
  updatePassword,
  updateNotifications,
  deleteAccount
} from '../api/apiRoutes.js';
import { useAuth } from '../context/AuthContext';
import { useChannel } from '../context/ChannelContext';
import {
  FiRefreshCw,
  FiBell,
  FiMenu,
  FiPlus,
  FiLogOut,
  FiSettings,
  FiX,
} from 'react-icons/fi';
import Modal from './Modal';
import ChannelCard from './ChannelCard.jsx';
import '../styles/navbar.css';

const LOCAL_STORAGE_KEY = 'streamline_selected_channel';

const Navbar = ({ toggleSidebar }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showChannelList, setShowChannelList] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showAddInfoModal, setShowAddInfoModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchErrors, setSearchErrors] = useState({});

  const [pendingChannelId, setPendingChannelId] = useState('');
  const [pendingTitle, setPendingTitle] = useState('');
  const [addInfoForm, setAddInfoForm] = useState({ category: '', format: '' });

  const dropdownRef = useRef();
  const { user, logout, loading } = useAuth();
  const { selectedChannel, updateChannel } = useChannel();
  const [channels, setChannels] = useState([]);

  const [form, setForm] = useState({ newEmail: '', newPassword: '', currentPassword: '' });
  const [email, setEmail] = useState('');
  const [authProvider, setAuthProvider] = useState('local');
  const [receiveNotifications, setReceiveNotifications] = useState(null);
  const [errors, setErrors] = useState({});
  const [settingsLoading, setSettingsLoading] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
        setShowChannelList(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const res = await listUserChannels();
        const fetched = res.data.channels || [];
        setChannels(fetched);

        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        const parsed = saved ? JSON.parse(saved) : null;

        if (parsed) {
          const match = fetched.find((ch) => ch.channelId === parsed.channelId);
          if (match) {
            updateChannel(match);
          } else if (fetched.length > 0) {
            updateChannel(fetched[0]);
          }
        } else if (fetched.length > 0) {
          updateChannel(fetched[0]);
        }
      } catch (err) {
        console.error('Failed to fetch channels:', err);
      }
    };

    fetchChannels();
  }, []);

  useEffect(() => {
    if (showSettingsModal) {
      getSettings()
        .then((res) => {
          setEmail(res.data.email);
          setReceiveNotifications(res.data.notifications);
          setAuthProvider(res.data.auth_provider || 'local');
        })
        .catch(() => {
          setErrors({ form: 'Failed to load settings.' });
        });
    }
  }, [showSettingsModal]);

  const closeAllModals = () => {
    setShowSearchModal(false);
    setShowAddInfoModal(false);
    setShowSettingsModal(false);
    setShowRemoveModal(false);
    setSearchQuery('');
    setSearchResults([]);
    setSearchErrors({});
    setAddInfoForm({ category: '', format: '' });
    setPendingChannelId('');
    setPendingTitle('');
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setSearchLoading(true);
    setSearchErrors({});
    try {
      const res = await searchYoutubeChannels(searchQuery);
      setSearchResults(res.data.results || []);
    } catch (err) {
      setSearchErrors({ form: 'Search failed. Try again.' });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectFromSearch = (channelId, title) => {
    setPendingChannelId(channelId);
    setPendingTitle(title);
    setShowSearchModal(false);
    setShowAddInfoModal(true);
  };

  const handleAddChannelWithInfo = async () => {
    if (!addInfoForm.category || !addInfoForm.format) {
      alert('Please select category and format.');
      return;
    }

    try {
      const res = await addChannel({
        channelId: pendingChannelId,
        category: addInfoForm.category,
        format: addInfoForm.format
      });
      const newChannel = res.data;
      setChannels((prev) => [...prev, newChannel]);
      updateChannel(newChannel);
      closeAllModals();
      setDropdownOpen(false);
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to add channel.');
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
      alert(err?.response?.data?.error || 'Failed to remove channel.');
    }
  };

  const handleSettingsChange = (e) => {
    const { name, value } = e.target;
    if (name === 'newEmail') setEmail(value);
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    setSettingsLoading(true);
    setErrors({});

    if (form.newPassword && !form.currentPassword) {
      setErrors({ form: 'Input current password' });
      setSettingsLoading(false);
      return;
    }

    try {
      if (form.newEmail && form.newEmail !== email) {
        await updateEmail({ email: form.newEmail, currentPassword: form.currentPassword });
      }

      if (form.newPassword) {
        await updatePassword({ password: form.newPassword, currentPassword: form.currentPassword });
      }

    } catch (err) {
      setErrors({ form: err?.response?.data?.error || 'Update failed.' });
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleToggleNotifications = async () => {
    try {
      await updateNotifications({ enabled: !receiveNotifications });
      setReceiveNotifications(!receiveNotifications);
    } catch {
      setErrors({ form: 'Failed to update notifications.' });
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm('Delete account permanently?');
    if (!confirmed) return;
    try {
      await deleteAccount();
      window.location.href = '/';
    } catch {
      alert('Failed to delete account.');
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
            <FiBell className="nav-icon" size={20} />

            <div className="account-menu" ref={dropdownRef}>
              <div
                className={`account-avatar ${!selectedChannel ? 'add-mode' : ''}`}
                onClick={() => setDropdownOpen((prev) => !prev)}
              >
                {!selectedChannel ? (
                  <FiPlus style={{ color: '#ccc' }} size={18} />
                ) : (
                  <img
                    src={selectedChannel.avatar}
                    alt="channel-avatar"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>

              {dropdownOpen && (
                <div className="account-dropdown">
                  <button
                    className="account-menu-item"
                    onClick={() => setShowChannelList((prev) => !prev)}
                  >
                    <FiRefreshCw /> Switch Channel
                  </button>

                  {showChannelList && channels.length > 0 && (
                    <>
                      {channels.map((ch) => (
                        <button
                          key={ch.channelId}
                          className="account-menu-item"
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
                          {ch.title}
                        </button>
                      ))}
                      <hr />
                    </>
                  )}

                  <button className="account-menu-item" onClick={() => {
                    closeAllModals();
                    setShowSearchModal(true);
                  }}>
                    <FiPlus /> Add Channel
                  </button>
                  <button className="account-menu-item" onClick={() => {
                    closeAllModals();
                    setShowRemoveModal(true);
                  }}>
                    <FiX /> Remove Channel
                  </button>
                  <button className="account-menu-item" onClick={() => {
                    closeAllModals();
                    setShowSettingsModal(true);
                  }}>
                    <FiSettings /> Settings
                  </button>
                  <button className="account-menu-item" onClick={logout}>
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
        onClose={closeAllModals}
        title="Search for Your Channel"
        fields={[]}
        formData={{}}
        onChange={() => {}}
        onSubmit={handleSearch}
        errors={searchErrors}
        loading={searchLoading}
        submitLabel="Search"
        actions={
          searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((ch) => (
                <ChannelCard
                  key={ch.channelId}
                  avatar={ch.avatar}
                  title={ch.title}
                  subscriberCount={ch.subscriberCount}
                  onAdd={() => handleSelectFromSearch(ch.channelId, ch.title)}
                />
              ))}
            </div>
          )
        }
      >
        <input
          type="text"
          placeholder="Search YouTube handle..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="form-input"
        />
      </Modal>

      {/* Add Info Modal */}
      <Modal
        isOpen={showAddInfoModal}
        onClose={closeAllModals}
        title={`Set Channel Info: ${pendingTitle}`}
        fields={[
          {
            label: 'Category',
            name: 'category',
            type: 'select',
            options: [
              'Valorant', 'Call of Duty', 'Cartoons', 'Anime', 'Chess',
              "Men's Fashion", "Women's Fashion", 'Elderly Fashion',
              'Fitness', 'Gambling', 'Lego', 'Memes', 'Minecraft',
              'Reddit Stories', 'Science', 'History', 'Software', 'Tech Gadgets',
              'ASMR', 'Quizzes', 'Religion', 'Roblox', 'Role Playing', 'Architecture',
              'AI', 'Arts', 'Basketball', 'Football', 'Soccer', 'Crime',
              'Dashcam Footage', 'Drawing', 'Automobiles', 'Motivational Videos'
            ]
          },
          {
            label: 'Format',
            name: 'format',
            type: 'select',
            options: [
              'Animation', 'Challenge Videos', 'Commentary', 'DIY',
              'Documentary', 'Drama', 'Educational', 'Gaming', 'Kids Content',
              'News', 'Podcast', 'Stories', 'Vlogs', 'Interview', 'Memes',
              'Compilation', 'Skits', 'Speeches'
            ]
          }
        ]}
        formData={addInfoForm}
        onChange={(e) => setAddInfoForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))}
        onSubmit={(e) => {
          e.preventDefault();
          handleAddChannelWithInfo();
        }}
        errors={{}}
        loading={false}
        submitLabel="Add Channel"
      />

      {/* Settings Modal */}
      <Modal
        isOpen={showSettingsModal}
        onClose={closeAllModals}
        title="Settings"
        fields={
          authProvider === 'local'
            ? [
                { label: 'Email', name: 'newEmail', type: 'email' },
                { label: 'Current Password', name: 'currentPassword', type: 'password' },
                { label: 'New Password', name: 'newPassword', type: 'password' }
              ]
            : []
        }
        formData={{ ...form, newEmail: email }}
        onChange={handleSettingsChange}
        onSubmit={authProvider === 'local' ? handleSettingsSubmit : (e) => e.preventDefault()}
        errors={errors}
        loading={settingsLoading}
        submitLabel={authProvider === 'local' ? 'Update Settings' : ''}
        actions={
          <div>
            {authProvider === 'google' && (
              <div style={{ fontSize: '0.9rem', color: '#888', marginBottom: '1rem' }}>
                Signed in via Google — you can't change your email or password here.
                <br />
                <strong>Email:</strong> {email}
              </div>
            )}

            {receiveNotifications !== null && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.2rem' }}>
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
              style={{ marginTop: '0.5rem' }}
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
                <button
                  key={ch.channelId}
                  className="account-menu-item"
                  onClick={() => handleRemoveClick(ch.channelId)}
                >
                  <img
                    src={ch.avatar}
                    className="channel-avatar"
                    alt="avatar"
                    referrerPolicy="no-referrer"
                  />
                  {ch.title}
                </button>
              ))}
            </div>
          )
        }
      />
    </>
  );
};

export default Navbar;