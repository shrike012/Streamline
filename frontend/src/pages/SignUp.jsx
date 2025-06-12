import React, { useState } from 'react';
import {getMe, signup} from '../api/auth';
import PublicNavbar from '../components/PublicNavbar.jsx';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/auth.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI;
const SCOPE = "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid";

export default function SignUp() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validate = () => {
    if (!form.email || !form.password) {
      setErrors({ form: 'Invalid credentials.' });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      await signup(form);
      const me = await getMe();
      setUser(me.data);
      navigate('/app/dashboard');
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || 'Signup failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRedirect = () => {
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${SCOPE}&access_type=offline&prompt=consent`;
  };

  return (
    <>
      <PublicNavbar />
      <div className="auth-container">
        <div className="auth-box">
          <h2 className="auth-title">Sign Up</h2>
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className={errors.email ? 'error' : ''}
              />
              {errors.email && <p className="error-text">{errors.email}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className={errors.password ? 'error' : ''}
              />
              {errors.password && <p className="error-text">{errors.password}</p>}
            </div>

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Signing up...' : 'Sign Up'}
            </button>
          </form>

          <div className="divider">
              <span className="line" />
              <span className="or-text">OR</span>
              <span className="line" />
          </div>

          <div className="google-button-wrapper">
            <div>
              <button
                onClick={handleGoogleRedirect}
                className="auth-button"
                style={{
                  width: '100%',
                  backgroundColor: 'white',
                  color: '#333',
                  border: '1px solid #ccc',
                  marginTop: 0,
                }}
                disabled={loading}
              >
                Continue with Google
              </button>
            </div>
          </div>

          <p style={{ marginTop: '1.5rem', textAlign: 'left', fontSize: '0.95rem' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#007bff', textDecoration: 'underline' }}>
              Log in
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}