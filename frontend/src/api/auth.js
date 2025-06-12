import axios from './axios'; // uses custom axios instance (not the axios library directly)

// Auth
export const signup = (data) => axios.post('/auth/signup', data);
export const login = (data) => axios.post('/auth/login', data);
export const getMe = () => axios.get('/auth/me');
export const logout = () => axios.post('/auth/logout');

// Saved
export const getSavedLists = () => axios.get('/saved/lists');
export const updateSavedLists = (data) => axios.post('/saved/lists', data);

// Channel Analyzer
export const fetchChannelVideos = (channelUrl) => axios.post('/channel/videos', { url: channelUrl });