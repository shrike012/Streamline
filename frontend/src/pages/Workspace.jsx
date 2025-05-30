import { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';

const Workspace = () => {
  const [email, setEmail] = useState('');
  const [idea, setIdea] = useState('');
  const [ideaFeedback, setIdeaFeedback] = useState(null);
  const [title, setTitle] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [packagingFeedback, setPackagingFeedback] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:8080/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
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
      <h1>
        Hi, {email || 'loading...'}
      </h1>
    </>
  );
};

export default Workspace;