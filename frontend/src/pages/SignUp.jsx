import React, { useState } from 'react';
import {googleLogin, getMe, signup} from '../api/auth';
import PublicNavbar from '../components/PublicNavbar.jsx';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import '../styles/auth.css';

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
    const newErrors = {};
    if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Invalid email.';
    if (form.password.length < 6) newErrors.password = 'Minimum 6 characters.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      const res = await signup(form);
      localStorage.setItem('token', res.data.token);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || 'Signup failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (res) => {
    try {
      const response = await googleLogin(res.credential);

      const token = response.data.token;
      localStorage.setItem('token', token);

      const me = await getMe();
      setUser(me.data);

      navigate('/app/dashboard');
    } catch (err) {
      console.error('Google sign-up error:', err);
      alert(err?.response?.data?.error || 'Google sign-up failed.');
    }
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
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => console.log('Google Login Failed')}
              theme="outline"
              size="large"
              shape="rectangular"
              text="signin_with"
              useOneTap={false}
              containerProps={{
                style: {
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center'
                }
              }}
            />
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