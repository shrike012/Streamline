import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

const AppLayout = () => {
  return (
    <>
      <Navbar />
       <Sidebar />
      <main style={{ paddingTop: '4rem' }}>
        <Outlet />
      </main>
    </>
  );
};

export default AppLayout;