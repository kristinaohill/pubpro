import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrandMark, Button, Field, InlineMessage, TextField } from '../ds/pubpro';
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
  const signup = mode === 'signup';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (signup) await register(name, email, password);
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
      <BrandMark variant="white" height={30} />

      <div className="login-card">
        <div className="login-brand">
          <img src="/ds/assets/icons/icon-pubpro.svg" alt="" className="login-product-icon" />
          <div>
            <h1 className="login-title">PubPro</h1>
            <div className="login-sub">Publication planning and management</div>
          </div>
        </div>

        <h2 className="login-heading">{signup ? 'Create your account' : 'Sign in'}</h2>

        <form onSubmit={handleSubmit} className="login-form">
          {signup && (
            <Field label="Name" required>
              <TextField value={name} onChange={e => setName(e.target.value)} required autoFocus autoComplete="name" />
            </Field>
          )}
          <Field label="Email" required>
            <TextField type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus={!signup} autoComplete="email" />
          </Field>
          <Field label="Password" required help={signup ? 'At least 8 characters.' : undefined}>
            <TextField
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={signup ? 8 : undefined}
              autoComplete={signup ? 'new-password' : 'current-password'}
            />
          </Field>
          {error && <InlineMessage kind="error">{error}</InlineMessage>}
          <Button type="submit" variant="primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? (signup ? 'Creating account…' : 'Signing in…') : (signup ? 'Create Account' : 'Sign In')}
          </Button>
        </form>

        <div className="login-switch-row">
          {signup ? 'Already have an account?' : 'New to PubPro?'}
          <button type="button" className="login-switch" onClick={() => { setMode(m => (m === 'signup' ? 'signin' : 'signup')); setError(''); }}>
            {signup ? 'Sign in' : 'Create an account'}
          </button>
        </div>
        {import.meta.env.DEV && !signup && <div className="login-hint">Local default: admin@example.com / admin123</div>}
      </div>
    </div>
  );
}
