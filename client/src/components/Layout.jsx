import React, { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { TopNav, WorkspaceTabs, IconButton } from '../ds/pubpro';
import { AUTHOR_CHROME, CHROME, MENU_ROUTES, CREATE_ROUTES, SEARCH_ROUTES } from './chrome';
import Notifications from './Notifications';
import AccountMenu from './AccountMenu';
import './Layout.css';

// The DS TopNav and WorkspaceTabs keep their open menu to themselves and only close it on a
// second click. An open menu is their NavMenu (inline z-index 50); the bell's panel in the tenant
// slot closes itself, so it is skipped.
const openNavMenu = root => root && [...root.querySelectorAll('[style*="z-index: 50"]')].some(el => !el.closest('.layout-tenant'));

/** Remount key that closes a DS bar's menu on an outside click or Escape. */
function useMenuReset() {
  const ref = useRef(null);
  const [key, setKey] = useState(0);
  useEffect(() => {
    const bar = () => ref.current && ref.current.firstElementChild;
    const onDown = e => { if (openNavMenu(bar()) && !bar().contains(e.target)) setKey(k => k + 1); };
    const onKey = e => { if (e.key === 'Escape' && openNavMenu(bar())) setKey(k => k + 1); };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown, true); document.removeEventListener('keydown', onKey); };
  }, []);
  return [ref, key];
}

const WORKSPACE_HOME = {
  'User Dashboard': '/dashboard',
  'Writer Dashboard': '/writer-dashboard',
  'External Author Dashboard': '/author-dashboard',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [navRef, navKey] = useMenuReset();
  const [tabsRef, tabsKey] = useMenuReset();

  const isAuthor = !!user && user.role === 'author';
  const chrome = isAuthor ? AUTHOR_CHROME : pathname in CHROME ? CHROME[pathname] : CHROME['/external-author'];

  const go = label => {
    if (MENU_ROUTES[label]) navigate(MENU_ROUTES[label]);
  };

  const handleMenuSelect = (item, row) => go(row);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleTabMenuSelect = (tab, row) => {
    if (tab === 'Create New' && CREATE_ROUTES[row]) navigate(CREATE_ROUTES[row]);
    if (tab === 'Searches' && SEARCH_ROUTES[row]) navigate(SEARCH_ROUTES[row]);
  };

  const openWorkflows = () => navigate('/workflows');

  // TopNav has no slot for extra header icons, so the workflow reference icon and the
  // notifications bell ride in the tenant slot, just left of the chat and avatar circles.
  const tenant = (
    <span className="layout-tenant">
      Approvia DEV
      {!isAuthor && (
      <IconButton
        icon="account_tree"
        tone="primary"
        size={34}
        title="Publication Workflows"
        aria-label="Publication Workflows"
        tabIndex={0}
        onClick={openWorkflows}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openWorkflows(); } }}
      />
      )}
      <Notifications canOpenRecords={!isAuthor} />
    </span>
  );

  return (
    <div className="layout">
      {chrome && (
        <div className="layout-chrome">
          <div className="layout-topnav" ref={navRef}>
            <TopNav key={navKey} items={chrome.nav} active={chrome.active} tenant={tenant} onNavigate={go} onMenuSelect={handleMenuSelect} />
            <AccountMenu userName={user && user.name} onLogout={handleLogout} />
          </div>
          <div className="layout-wstabs" ref={tabsRef}>
            <WorkspaceTabs
              key={tabsKey}
              workspace={chrome.workspace}
              tabs={chrome.tabs}
              active={chrome.activeTab}
              onSelect={go}
              onMenuSelect={handleTabMenuSelect}
            />
            {WORKSPACE_HOME[chrome.workspace] && (
              <button
                type="button"
                className="layout-workspace-link"
                title={`Go to ${chrome.workspace}`}
                onClick={() => navigate(WORKSPACE_HOME[chrome.workspace])}
              >
                {chrome.workspace}
              </button>
            )}
          </div>
        </div>
      )}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
