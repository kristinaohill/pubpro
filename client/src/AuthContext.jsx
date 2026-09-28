import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // The administrator's own session, kept while they're signed in as someone else (Sign In As).
  const [admin, setAdmin] = useState(() => {
    try { return JSON.parse(localStorage.getItem('impersonator') || 'null'); } catch (e) { return null; }
  });

  /** Refreshes name, role and permissions from the server (they can change on System Administrator). */
  const refreshMe = () => api.get('/auth/me')
    .then(me => {
      setUser(u => {
        const next = { ...(u || {}), name: me.name, email: me.email, role: me.role, role_name: me.role_name, permissions: me.permissions, roleScopes: me.roleScopes, imp: me.impersonator || undefined };
        localStorage.setItem('user', JSON.stringify(next));
        return next;
      });
    })
    .catch(err => {
      // An expired impersonation goes back to the administrator; deactivated or deleted accounts are
      // signed out; a network blip keeps the stored session.
      if (!/deactivated|no longer exists|Invalid token|Unauthorized|waiting for an administrator/.test(err.message)) return;
      if (localStorage.getItem('impersonator')) { stopImpersonating(); return; }
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const stored = localStorage.getItem('user');
    if (token && stored) {
      setUser(JSON.parse(stored));
      refreshMe();
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Sign In As: switch to another user's session, keeping the administrator's to come back to. */
  const impersonate = async userId => {
    const r = await api.post('/admin/users/' + userId + '/impersonate', {});
    const mine = { token: localStorage.getItem('token'), user: JSON.parse(localStorage.getItem('user') || 'null') };
    localStorage.setItem('impersonator', JSON.stringify(mine));
    localStorage.setItem('token', r.token);
    localStorage.setItem('user', JSON.stringify(r.user));
    setAdmin(mine);
    setUser(r.user);
    return r.user;
  };

  /** Back to the administrator's own session. */
  function stopImpersonating() {
    let mine = null;
    try { mine = JSON.parse(localStorage.getItem('impersonator') || 'null'); } catch (e) { /* ignore */ }
    localStorage.removeItem('impersonator');
    setAdmin(null);
    if (mine && mine.token) {
      localStorage.setItem('token', mine.token);
      localStorage.setItem('user', JSON.stringify(mine.user));
      setUser(mine.user);
      return mine.user;
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    return null;
  }

  const login = async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  // Swaps in a re-issued token after a profile change (e.g. a new display name).
  const updateSession = (token, nextUser) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(nextUser));
    setUser(nextUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('impersonator');
    setAdmin(null);
    setUser(null);
  };

  /**
   * What the signed-in user's roles allow (server/permissions.js). can('pubs.edit') = anywhere;
   * can('pubs.edit', product) = on a record of that product, counting only roles whose scope covers
   * it (null = a record with no product yet). The server checks the same way.
   */
  const can = (perm, product) => {
    if (!user || !Array.isArray(user.permissions)) return false;
    if (product === undefined || !product || !Array.isArray(user.roleScopes)) return user.permissions.includes(perm);
    return user.roleScopes.some(r => r.permissions.includes(perm) && (!r.products || r.products.includes(product)));
  };

  return (
    <AuthContext.Provider value={{ user, login, updateSession, logout, loading, can, refreshMe, impersonate, stopImpersonating, impersonator: admin && admin.user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
