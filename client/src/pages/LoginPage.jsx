import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrandMark, Button, Field, InlineMessage, TextField } from '../ds/pubpro';
import { useAuth } from '../AuthContext';
import './LoginPage.css';

// Sign in only. Nobody creates their own account: a System Administrator adds internal and library
// users, and external authors get their login when they're invited from their author profile.
export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  // The default admin login is only prefilled when running locally.
  const [email, setEmail] = useState(import.meta.env.DEV ? 'admin@bplogix.com' : '');
  const [password, setPassword] = useState(import.meta.env.DEV ? 'Password2' : '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
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

        <h2 className="login-heading">Sign in</h2>

        <form onSubmit={handleSubmit} className="login-form">
          <Field label="Email" required>
            <TextField type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus autoComplete="email" />
          </Field>
          <Field label="Password" required>
            <TextField type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
          </Field>
          {error && <InlineMessage kind="error">{error}</InlineMessage>}
          <Button type="submit" variant="primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>

        <div className="login-switch-row">No account? Your system administrator sets one up, or you&rsquo;ll get an invitation from BP Logix.</div>
        {import.meta.env.DEV && <div className="login-hint">Local default: admin@bplogix.com / Password2</div>}
      </div>
    </div>
  );
}
