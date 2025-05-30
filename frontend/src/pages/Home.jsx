import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

const Home = () => {
  const navigate = useNavigate();

  return (
    <>
      <Navbar />

      <div className="container" style={{ textAlign: 'center', padding: '10rem 2rem 8rem'}}>
        <h1 className={'heading'}>Make videos that stand out, <br /> starting with the idea.</h1>
        <p className={'text-secondary'}>Find, test and refine ideas, without the chaos.</p>
        <button className="primary" onClick={() => navigate('/signup')}>
          Sign Up Now
        </button>
      </div>

      <div className="container" style={{ textAlign: 'center', padding: '6rem 0' }}>
        <h1 className="heading">A workspace for your next big hit.</h1>
      </div>
    </>
  );
};

export default Home;