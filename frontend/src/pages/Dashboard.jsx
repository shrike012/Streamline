import { useState, useEffect } from 'react';
import { getMe } from '../api/auth';
import Navbar from '../components/Navbar';

const Dashboard = () => {
  const [email, setEmail] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await getMe();
        setEmail(res.data.email);
      } catch (err) {
        console.error('Failed to fetch user info:', err);
      }
    };

    fetchUser();
  }, []);

  return (
    <>
      <Navbar />
      <h1>Hi, {email || 'loading...'}</h1>
    </>
  );
};

export default Dashboard;