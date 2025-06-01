import { Outlet } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';

const PublicLayout = () => {
  return (
    <>
      <PublicNavbar />
      <main>
        <Outlet />
      </main>
    </>
  );
};

export default PublicLayout;