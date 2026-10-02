// Per-route TopNav / WorkspaceTabs setup, taken from each page's Claude Design file.

const HELP = { label: 'Help', icon: 'info' };

// One product nav on every staff page (menu items without a page yet are placeholders).
const FULL_NAV = [
  'Home', 'Content List',
  { label: 'Workspaces', menuItems: ['Publication Manager Dashboard', 'Executive Dashboard', 'External Author Dashboard', 'Publication Library', 'Reports', HELP] },
  // System Administrator lives under Settings (only people who can manage users see it).
  { label: 'Settings', menuItems: ['System Administrator'] },
];

const CREATE_FULL = { label: 'Create New', menuItems: ['Publication', 'Publication Planning', 'External Author', 'IIS Request', 'Grants Management', 'Medical Information Request', 'Review Process Form', 'Standard Medical Response'] };
const SEARCH_FULL = { label: 'Searches', menuItems: ['Publications', 'Publication Plans', 'Conferences', 'Journals', 'Studies', 'External Authors', 'Approvia', 'Medical Information Requests'] };

// Layout adds the live unread count from the notifications bell to this tab.
export const ALERTS_TAB = 'My Alerts';

const EXECUTIVE_DASHBOARD = {
  nav: FULL_NAV, active: 'Home',
  workspace: 'Executive Dashboard', tabs: [ALERTS_TAB, CREATE_FULL, SEARCH_FULL],
};

export const CHROME = {
  '/dashboard': {
    nav: FULL_NAV, active: 'Workspaces',
    workspace: 'Executive Dashboard', tabs: [ALERTS_TAB, CREATE_FULL, SEARCH_FULL],
  },
  // Informational page, opened from the workflow icon in the TopNav rather than a workspace.
  '/workflows': EXECUTIVE_DASHBOARD,
  '/publication-manager': {
    nav: FULL_NAV, active: 'Workspaces',
    workspace: 'Publication Manager Dashboard', tabs: [ALERTS_TAB, CREATE_FULL, SEARCH_FULL],
  },
  '/external-author': EXECUTIVE_DASHBOARD,
  '/external-authors': EXECUTIVE_DASHBOARD,
  '/author-dashboard': {
    nav: FULL_NAV, active: 'Workspaces',
    workspace: 'External Author Dashboard', tabs: ['My Tasks'], activeTab: 'My Tasks',
  },
  '/publications': EXECUTIVE_DASHBOARD,
  '/publication': EXECUTIVE_DASHBOARD,
  '/publication-plan': EXECUTIVE_DASHBOARD,
  '/publication-plans': EXECUTIVE_DASHBOARD,
  '/studies': EXECUTIVE_DASHBOARD,
  '/profile': EXECUTIVE_DASHBOARD,
  // Publication Library workspace (its publication pages use it too; see Layout).
  '/library': {
    nav: FULL_NAV, active: 'Workspaces',
    workspace: 'Publication Library', tabs: [ALERTS_TAB, CREATE_FULL, SEARCH_FULL],
  },
  '/vendor': EXECUTIVE_DASHBOARD,
  '/admin': {
    nav: FULL_NAV, active: 'Settings',
    workspace: 'System Administrator', tabs: [ALERTS_TAB, CREATE_FULL, SEARCH_FULL],
  },
  // The Financial Report design has its own navy back bar and no app chrome.
  '/financial-report': null,
};

/** What a Library User (read-only) sees: the Publication Library and nothing else. */
export const LIBRARY_CHROME = { nav: [], active: '', workspace: 'Publication Library', tabs: ['Library'], activeTab: 'Library' };

/** What a signed-in external author sees: their dashboard and nothing else. */
export const AUTHOR_CHROME = { nav: [], active: '', workspace: 'My Author Dashboard', tabs: ['My Tasks'], activeTab: 'My Tasks' };

// Menu rows and tabs that open another page.
export const MENU_ROUTES = {
  'Publication Manager Dashboard': '/publication-manager',
  'Executive Dashboard': '/dashboard',
  'Home': '/publication-manager',
  'Reports': '/financial-report',
  'External Author Dashboard': '/author-dashboard',
  'Publication Library': '/library',
  'System Administrator': '/admin',
};

export const SEARCH_ROUTES = {
  'Publications': '/publications',
  'Publication Plans': '/publication-plans',
  'Studies': '/studies',
  'External Authors': '/external-authors',
};

// Permission each menu row needs (rows not listed are open to all staff).
export const MENU_PERMS = {
  'System Administrator': 'admin.users',
  'Publication': 'pubs.edit',
  'Publication Planning': 'plans.edit',
  'External Author': 'authors.edit',
};

export const CREATE_ROUTES = {
  'Publication': '/publication/new',
  'Publication Planning': '/publication-plan/new',
  'External Author': '/external-author/new',
};
