import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const stored = localStorage.getItem('user');
    if (token && stored) {
      setUser(JSON.parse(stored));
      // Role and permissions can change on the System Administrator page: refresh them.
      api.get('/auth/me')
        .then(me => {
          setUser(u => {
            const next = { ...(u || {}), name: me.name, role: me.role, role_name: me.role_name, permissions: me.permissions };
            localStorage.setItem('user', JSON.stringify(next));
            return next;
          });
        })
        .catch(err => {
          // Deactivated or deleted accounts are signed out; a network blip keeps the stored session.
          if (/deactivated|no longer exists|Invalid token|Unauthorized/.test(err.message)) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
          }
        });
    }
    setLoading(false);
  }, []);

  const register = async (name, email, password) => {
    await api.post('/auth/register', { name, email, password });
    return login(email, password);
  };

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
    setUser(null);
  };

  /** What the signed-in user's role allows (server/permissions.js), e.g. can('pubs.edit'). */
  const can = perm => !!(user && Array.isArray(user.permissions) && user.permissions.includes(perm));

  return (
    <AuthContext.Provider value={{ user, login, register, updateSession, logout, loading, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
