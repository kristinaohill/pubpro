import React, { useEffect, useState } from 'react';
import { api } from '../api';
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
  // Sign-up rules from System Administrator > Sign-up: open, approval, or closed (+ email domains).
  const [rules, setRules] = useState({ mode: 'open', domains: [] });
  const [notice, setNotice] = useState('');
  useEffect(() => { api.get('/auth/signup-options').then(setRules).catch(() => {}); }, []);
  const domainHint = rules.domains.length ? 'Use your work email (' + rules.domains.map(d => '@' + d).join(' or ') + ').' : undefined;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (signup) {
        const r = await register(name, email, password);
        if (r && r.pending) {
          setMode('signin');
          setPassword('');
          setNotice('Thanks, ' + name.trim().split(/\s+/)[0] + '. An administrator needs to approve your account. You can sign in once they have.');
          return;
        }
      } else await login(email, password);
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
          {notice && <InlineMessage kind="info">{notice}</InlineMessage>}
          <Field label="Email" required help={signup ? domainHint : undefined}>
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

        {signup && rules.mode === 'approval' && (
          <div className="login-hint">New accounts are approved by an administrator before you can sign in.</div>
        )}
        {rules.mode === 'closed' ? (
          <div className="login-switch-row">New to PubPro? Ask your system administrator for an account.</div>
        ) : (
          <div className="login-switch-row">
            {signup ? 'Already have an account?' : 'New to PubPro?'}
            <button type="button" className="login-switch" onClick={() => { setMode(m => (m === 'signup' ? 'signin' : 'signup')); setError(''); setNotice(''); }}>
              {signup ? 'Sign in' : 'Create an account'}
            </button>
          </div>
        )}
        {import.meta.env.DEV && !signup && <div className="login-hint">Local default: admin@example.com / admin123</div>}
      </div>
    </div>
  );
}
