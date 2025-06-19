import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Sidebar from '../components/Sidebar.jsx';

const AppLayout = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 1400);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  return (
    <>
      <Navbar isMobile={isMobile} toggleSidebar={toggleSidebar} />
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} isMobile={isMobile} />

      <div className="main-content">
        <Outlet />
      </div>
    </>
  );
};

export default AppLayout;