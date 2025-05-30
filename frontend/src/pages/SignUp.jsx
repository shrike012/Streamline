import React, { useState } from 'react';
import { signup } from '../api/auth';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function SignUp() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const validate = () => {
    const validEmail = /\S+@\S+\.\S+/.test(form.email);
    const validPassword = form.password.length >= 6;
    if (!validEmail || !validPassword) {
      setError('Invalid email or password.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await signup(form);
      navigate('/login');
    } catch (err) {
      setError(
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Signup failed.'
      );
    }
  };

  return (
    <>
      <Navbar />
      <div className="auth-container">
        <div className="auth-box">
          <h2 className="auth-title">Sign up</h2>
          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className={`form-input ${error ? 'form-error' : ''}`}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className={`form-input ${error ? 'form-error' : ''}`}
              />
            </div>

            <p className="error-message" style={{ visibility: error ? 'visible' : 'hidden' }}>
              {error || 'placeholder'}
            </p>

            <button type="submit" className="auth-button">
              Create Account
            </button>

            <p className="auth-switch">
              Already registered? <a href="/login">Log in</a>
            </p>
          </form>
        </div>
      </div>
    </>
  );
}