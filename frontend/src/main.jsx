import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ChannelProvider } from './context/ChannelContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <ChannelProvider>
        <App />
      </ChannelProvider>
    </AuthProvider>
  </BrowserRouter>
);