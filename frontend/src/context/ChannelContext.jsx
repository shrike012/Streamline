import { createContext, useContext, useState, useEffect } from "react";

const ChannelContext = createContext();

export const ChannelProvider = ({ children }) => {
  const LOCAL_STORAGE_KEY = "streamline_selected_channel";
  const [selectedChannel, setSelectedChannel] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
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
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(channelInfo));
    } else {
      setSelectedChannel(null);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  };

  return (
    <ChannelContext.Provider value={{ selectedChannel, updateChannel }}>
      {children}
    </ChannelContext.Provider>
  );
};

export const useChannel = () => useContext(ChannelContext);
