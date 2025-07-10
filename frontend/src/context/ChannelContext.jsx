import { createContext, useContext, useState, useEffect } from "react";

const ChannelContext = createContext();
const SESSION_STORAGE_KEY = "streamline_selected_channel";

export const ChannelProvider = ({ children }) => {
  const [selectedChannel, setSelectedChannel] = useState(null);

  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (saved) setSelectedChannel(JSON.parse(saved));
  }, []);

  const updateChannel = (channel) => {
    if (channel) {
      const channelInfo = {
        channelId: channel.channelId,
        title: channel.channelTitle,
        avatar: channel.avatar,
        handle: channel.handle,
      };
      setSelectedChannel(channelInfo);
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(channelInfo));
    } else {
      setSelectedChannel(null);
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  };

  return (
    <ChannelContext.Provider value={{ selectedChannel, updateChannel }}>
      {children}
    </ChannelContext.Provider>
  );
};

export const useChannel = () => useContext(ChannelContext);
