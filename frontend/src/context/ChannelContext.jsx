import { createContext, useContext, useState, useEffect } from 'react';

const ChannelContext = createContext();

export const ChannelProvider = ({ children }) => {
  const LOCAL_STORAGE_KEY = 'streamline_selected_channel';
  const [selectedChannel, setSelectedChannel] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) setSelectedChannel(JSON.parse(saved));
  }, []);

  const updateChannel = (channel) => {
    setSelectedChannel(channel);
    if (channel) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(channel));
    } else {
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