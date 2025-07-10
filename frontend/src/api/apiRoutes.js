import axios from "./axios"; // custom axios instance

// Auth
export const signup = (data) => axios.post("/auth/signup", data);
export const login = (data) => axios.post("/auth/login", data);
export const getMe = () => axios.get("/auth/me");
export const logout = () => axios.post("/auth/logout");

export const requestPasswordReset = (email) =>
  axios.post("/auth/forgot-password", { email });

export const resetPassword = (data) => axios.post("/auth/reset-password", data);

// Collections
export const getCollections = () =>
  axios.get("/collections/list").then((res) => res.data);

export const createCollection = (name) =>
  axios.post("/collections/create", { name }).then((res) => res.data);

export const renameCollection = (collectionId, newName) =>
  axios
    .post(`/collections/${encodeURIComponent(collectionId)}/rename`, {
      name: newName,
    })
    .then((res) => res.data);

export const removeVideoFromCollection = (collectionId, videoId) =>
  axios
    .delete(
      `/collections/${encodeURIComponent(collectionId)}/videos/${encodeURIComponent(videoId)}`,
    )
    .then((res) => res.data);

export const deleteCollection = (collectionId) =>
  axios
    .delete(`/collections/${encodeURIComponent(collectionId)}`)
    .then((res) => res.data);

export const getVideosInCollection = (collectionId) =>
  axios
    .get(`/collections/${encodeURIComponent(collectionId)}/videos`)
    .then((res) => res.data);

export const addVideoToCollection = (collectionId, video) =>
  axios
    .post(`/collections/${encodeURIComponent(collectionId)}/videos`, {
      video,
    })
    .then((res) => res.data);

// Outliers
export const fetchOutliers = (channelId) =>
  axios.get(`/outliers/list?channelId=${channelId}`).then((res) => res.data);

// Channel
export const fetchChannelStats = (channelId) =>
  axios
    .get(`/channel/${encodeURIComponent(channelId)}/stats`)
    .then((res) => res.data);

export const fetchChannelVideos = (
  channelId,
  pageToken = null,
  contentType = null,
) =>
  axios
    .post(`/channel/${encodeURIComponent(channelId)}/videos`, {
      pageToken,
      contentType,
    })
    .then((res) => res.data);

export const fetchChannelMetadata = (channelId) =>
  axios
    .get(`/channel/${encodeURIComponent(channelId)}/metadata`)
    .then((res) => res.data);

export const addChannel = (channelData) =>
  axios.post("/channel/add", channelData);

export const removeChannel = (channelId) =>
  axios.post("/channel/remove", { channelId });

export const listUserChannels = () =>
  axios.get("/channel/list").then((res) => res.data);

export const searchYoutubeChannels = (query) =>
  axios
    .get(`/channel/search?q=${encodeURIComponent(query)}`)
    .then((res) => res.data);

export const fetchChannelInsights = (channelId, myChannelId) =>
  axios
    .post(`/channel/${encodeURIComponent(channelId)}/insights`, {
      my_channel_id: myChannelId,
    })
    .then((res) => res.data);

// NicheExplorer
export const searchNiche = (query, options = {}) =>
  axios
    .post("/niche-explorer/search", {
      query,
      time_frame: options.timeFrame || "last_month",
      video_type: options.videoType || "longform",
    })
    .then((res) => res.data);

// Settings
export const updateEmail = (data) => axios.post("/settings/update/email", data);
export const updatePassword = (data) =>
  axios.post("/settings/update/password", data);
export const updateNotifications = (data) =>
  axios.post("/settings/update/notifications", data);
export const deleteAccount = () => axios.delete("/settings/delete");
export const getSettings = () => axios.get("/settings/get");

// Notifications
export const getNotifications = (channelId) =>
  axios
    .get(`/notifications/list?channelId=${encodeURIComponent(channelId)}`)
    .then((res) => res.data);

export const markNotificationsRead = (channelId) =>
  axios.post("/notifications/mark-read", { channelId }).then((res) => res.data);

// CompetitorTracker
export const getCompetitorLists = (channelId) =>
  axios
    .get(`/competitor-tracker/lists/${encodeURIComponent(channelId)}`)
    .then((res) => res.data);

export const createCompetitorList = (channelId, name) =>
  axios
    .post(`/competitor-tracker/lists/${encodeURIComponent(channelId)}/create`, {
      name,
    })
    .then((res) => res.data);

export const renameCompetitorList = (channelId, listId, name) =>
  axios
    .post(
      `/competitor-tracker/lists/${encodeURIComponent(channelId)}/${encodeURIComponent(listId)}/rename`,
      { name },
    )
    .then((res) => res.data);

export const deleteCompetitorList = (channelId, listId) =>
  axios
    .post(
      `/competitor-tracker/lists/${encodeURIComponent(channelId)}/${encodeURIComponent(listId)}/delete`,
    )
    .then((res) => res.data);

export const getCompetitorsInList = (channelId, listId) =>
  axios
    .get(
      `/competitor-tracker/competitors/${encodeURIComponent(channelId)}/${encodeURIComponent(listId)}`,
    )
    .then((res) => res.data);

export const addCompetitorToList = (channelId, listId, competitorData) =>
  axios
    .post(
      `/competitor-tracker/competitors/${encodeURIComponent(channelId)}/${encodeURIComponent(listId)}/add`,
      competitorData,
    )
    .then((res) => res.data);

export async function removeCompetitorFromList(
  channelId,
  listId,
  competitorChannelId,
) {
  return axios.post(
    `/competitor-tracker/competitors/${channelId}/${listId}/remove`,
    {
      competitor_channel_id: competitorChannelId,
    },
  );
}

// Generators
export const generateTitle = (idea, channelId) =>
  axios.post("/generators/title", { idea, channelId }).then((res) => res.data);
