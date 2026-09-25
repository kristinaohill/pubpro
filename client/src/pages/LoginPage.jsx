import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import './LoginPage.css';

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [name, setName] = useState('');
  // The default admin login is only prefilled when running locally.
  const [email, setEmail] = useState(import.meta.env.DEV ? 'admin@example.com' : '');
  const [password, setPassword] = useState(import.meta.env.DEV ? 'admin123' : '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signup') await register(name, email, password);
      else await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <span style={{ fontSize: 36 }}>📰</span>
          <h1>PubPlanner</h1>
          <p>Publication Management Platform</p>
        </div>
        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div className="form-group">
              <label>Name</label>
              <input value={name} onChange={e => setName(e.target.value)} required autoFocus />
            </div>
          )}
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus={mode === 'signin'}
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={mode === 'signup' ? 8 : undefined}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          </div>
          {error && <div className="error">{error}</div>}
          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: 8, padding: '10px' }} disabled={loading}>
            {loading ? (mode === 'signup' ? 'Creating account…' : 'Signing in…') : (mode === 'signup' ? 'Create Account' : 'Sign In')}
          </button>
        </form>
        <p className="login-hint">
          {mode === 'signup' ? 'Already have an account? ' : 'New here? '}
          <button type="button" className="login-switch" onClick={() => { setMode(m => (m === 'signup' ? 'signin' : 'signup')); setError(''); }}>
            {mode === 'signup' ? 'Sign in' : 'Create an account'}
          </button>
        </p>
        {import.meta.env.DEV && mode === 'signin' && <p className="login-hint">Default: admin@example.com / admin123</p>}
      </div>
    </div>
  );
}
