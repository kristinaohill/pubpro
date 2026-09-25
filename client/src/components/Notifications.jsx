import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Icon, IconButton, SegmentedToggle } from '../ds/pubpro';
import { api } from '../api';
import './Notifications.css';

const POLL_MS = 60000;

const KIND_LOOK = {
  review_request: ['rate_review', 'var(--high-emphasis)'],
  reminder: ['schedule', 'var(--warn-text)'],
  round_closed: ['task_alt', 'var(--ok)'],
  invitation: ['person_add', 'var(--high-emphasis)'],
  cancelled: ['block', 'var(--fatal-text)'],
  reinstated: ['restore', 'var(--ok)'],
  overdue: ['error', 'var(--fatal-text)'],
  due_soon: ['event_upcoming', 'var(--warn-text)'],
  response: ['mark_email_read', 'var(--ok)'],
};

// SQLite stores UTC as "YYYY-MM-DD HH:MM:SS".
const ago = s => {
  if (!s) return '';
  const t = new Date(s.replace(' ', 'T') + 'Z');
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  if (mins < 60 * 24) return Math.round(mins / 60) + 'h ago';
  return t.toLocaleDateString('en-US');
};

/**
 * Bell in the TopNav: in-app notifications instead of email. (The TopNav's own chat icon is
 * reserved for the Approvia AI chatbot.)
 */
export default function Notifications({ canOpenRecords = true }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState('Inbox');
  const [items, setItems] = useState(null);
  const [unread, setUnread] = useState(0);
  const wrapRef = useRef(null);

  const refreshCount = useCallback(() => {
    api.get('/notifications/unread-count').then(r => setUnread(r.count)).catch(() => {});
  }, []);

  const loadItems = useCallback(which => {
    setItems(null);
    api.get('/notifications?box=' + (which === 'Sent' ? 'sent' : 'inbox'))
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  // Refresh the badge on each page change and once a minute.
  useEffect(() => { refreshCount(); }, [pathname, refreshCount]);
  useEffect(() => {
    const t = setInterval(refreshCount, POLL_MS);
    return () => clearInterval(t);
  }, [refreshCount]);

  useEffect(() => { if (open) loadItems(box); }, [open, box, loadItems]);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onKey = e => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const openItem = async n => {
    if (box === 'Inbox' && !n.read_at) {
      await api.post(`/notifications/${n.id}/read`).catch(() => {});
      refreshCount();
    }
    setOpen(false);
    // Staff jump to the record; external authors act on it from their dashboard.
    if (n.pub_id && canOpenRecords) navigate('/publication/' + n.pub_id, { state: { tab: n.tab || undefined } });
  };

  const markAllRead = async () => {
    await api.post('/notifications/read-all').catch(() => {});
    refreshCount();
    loadItems('Inbox');
  };

  return (
    <div className="nt-wrap" ref={wrapRef}>
      <IconButton
        icon="notifications"
        tone="primary"
        size={34}
        title={unread ? `Notifications (${unread} unread)` : 'Notifications'}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        tabIndex={0}
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o); } }}
      />
      {unread > 0 && <span className="nt-badge" aria-hidden="true">{unread > 99 ? '99+' : unread}</span>}

      {open && (
        <div className="nt-panel" role="dialog" aria-label="Notifications">
          <div className="nt-head">
            <div className="nt-title">Notifications</div>
            {box === 'Inbox' && unread > 0 && (
              <Button variant="tertiary" onClick={markAllRead} style={{ marginLeft: 'auto' }}>Mark all read</Button>
            )}
          </div>
          <div className="nt-toggle">
            <SegmentedToggle options={['Inbox', 'Sent']} value={box} onChange={setBox} />
          </div>
          <div className="nt-list">
            {items === null && <div className="nt-empty">Loading…</div>}
            {items && items.length === 0 && (
              <div className="nt-empty">
                {box === 'Inbox'
                  ? 'Nothing for you yet. Due-date alerts for your publications show up here.'
                  : 'Nothing sent yet. Review requests, reminders and invitations you send appear here.'}
              </div>
            )}
            {items && items.map(n => {
              const [glyph, color] = KIND_LOOK[n.kind] || ['notifications', 'var(--nav)'];
              const unreadItem = box === 'Inbox' && !n.read_at;
              return (
                <div
                  key={n.id}
                  className={'nt-item' + (unreadItem ? ' nt-item--unread' : '')}
                  role="button"
                  tabIndex={0}
                  onClick={() => openItem(n)}
                  onKeyDown={e => { if (e.key === 'Enter') openItem(n); }}
                >
                  <span className="nt-glyph" style={{ color }}><Icon name={glyph} size={20} /></span>
                  <div className="nt-body">
                    <div className="nt-item-title">{n.title}</div>
                    {n.body && <div className="nt-item-text">{n.body}</div>}
                    <div className="nt-meta">
                      {box === 'Sent' ? 'To ' + n.recipient : 'From ' + (n.sender || 'PubPro')} · {ago(n.created_at)}
                    </div>
                  </div>
                  {unreadItem && <span className="nt-dot" aria-label="Unread" />}
                </div>
              );
            })}
          </div>
          <div className="nt-foot">In-app only. PubPro doesn't send these by email.</div>
        </div>
      )}
    </div>
  );
}
