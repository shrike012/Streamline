import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ChannelProvider } from "./context/ChannelContext";
import { HelmetProvider } from "react-helmet-async";

ReactDOM.createRoot(document.getElementById("root")).render(
  <HelmetProvider>
    <BrowserRouter>
      <AuthProvider>
        <ChannelProvider>
          <App />
        </ChannelProvider>
      </AuthProvider>
    </BrowserRouter>
  </HelmetProvider>,
);
