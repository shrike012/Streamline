import { listUserChannels } from "../api/apiRoutes.js";

const SESSION_STORAGE_KEY = "streamline_selected_channel";

// Sync user channels and selected channel
export async function syncChannelsAndSelected(setChannels, updateChannel) {
  const res = await listUserChannels();
  const fetched = res.channels || [];
  setChannels(fetched);

  const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
  const parsed = saved ? JSON.parse(saved) : null;

  if (parsed) {
    const match = fetched.find((ch) => ch.channelId === parsed.channelId);
    if (match) {
      updateChannel(match);
      return;
    }
  }

  if (fetched.length > 0) {
    updateChannel(fetched[0]);
  }
}
