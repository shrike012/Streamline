import axios from './axios'; // custom axios instance

// Auth
export const signup = (data) => axios.post('/auth/signup', data);
export const login = (data) => axios.post('/auth/login', data);
export const getMe = () => axios.get('/auth/me');
export const logout = () => axios.post('/auth/logout');
export const requestPasswordReset = (email) => axios.post('/auth/forgot-password', { email });
export const resetPassword = (data) => axios.post('/auth/reset-password', data);

// Saved
export const getSavedLists = () => axios.get('/saved/lists');
export const updateSavedLists = (data) => axios.post('/saved/lists', data);

// Channel
export const fetchChannelVideos = (channelId) => axios.post('/channel/videos', { channelId }).then(res => res.data);
export const addChannel = (channelIdObj) => axios.post('/channel/add', channelIdObj);
export const searchYoutubeChannels = (query) => axios.get(`/channel/search?q=${encodeURIComponent(query)}`);
export const listUserChannels = () => axios.get('/channel/list');
export const removeChannel = (channelId) => axios.post("/channel/remove", { channelId });

// Dashboard Data
export const getCompetitorVideos = (channelId) => axios.get(`/dashboard/${channelId}/competitors`).then(res => res.data);
export const getTopVideos = (channelId) => axios.get(`/dashboard/${channelId}/top-videos`).then(res => res.data);
export const getRecentWork = (channelId) => axios.get(`/dashboard/${channelId}/recent-work`).then(res => res.data);

// Settings
export const updateEmail = (data) => axios.post('/settings/update/email', data);
export const updatePassword = (data) => axios.post('/settings/update/password', data);
export const updateNotifications = (data) => axios.post('/settings/update/notifications', data);
export const deleteAccount = () => axios.delete('/settings/delete');
export const getSettings = () => axios.get('/settings/get');

// Niche Explorer
export const searchNiche = (keyword) => axios.post('/niche-explorer/search', { keyword }).then(res => res.data);