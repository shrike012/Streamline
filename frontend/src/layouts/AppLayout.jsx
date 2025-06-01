import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';

const AppLayout = () => {
  return (
    <>
      <Navbar />
      <main style={{ paddingTop: '4rem' }}>
        <Outlet />
      </main>
    </>
  );
};

export default AppLayout;