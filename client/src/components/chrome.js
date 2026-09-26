// Per-route TopNav / WorkspaceTabs setup, taken from each page's Claude Design file.

const HELP = { label: 'Help', icon: 'info' };

// One product nav on every staff page (menu items without a page yet are placeholders).
const FULL_NAV = [
  'Home', 'Content List',
  { label: 'Workspaces', menuItems: ['Publication Manager Dashboard', 'Executive Dashboard', 'External Author Dashboard', 'Reports', 'System Administrator', HELP] },
  { label: 'Settings', menu: true },
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
  '/vendor': EXECUTIVE_DASHBOARD,
  // The Financial Report design has its own navy back bar and no app chrome.
  '/financial-report': null,
};

/** What a signed-in external author sees: their dashboard and nothing else. */
export const AUTHOR_CHROME = { nav: [], active: '', workspace: 'My Author Dashboard', tabs: ['My Tasks'], activeTab: 'My Tasks' };

// Menu rows and tabs that open another page.
export const MENU_ROUTES = {
  'Publication Manager Dashboard': '/publication-manager',
  'Executive Dashboard': '/dashboard',
  'Home': '/dashboard',
  'Reports': '/financial-report',
  'External Author Dashboard': '/author-dashboard',
};

export const SEARCH_ROUTES = {
  'Publications': '/publications',
  'Publication Plans': '/publication-plans',
  'Studies': '/studies',
  'External Authors': '/external-authors',
};

export const CREATE_ROUTES = {
  'Publication': '/publication/new',
  'Publication Planning': '/publication-plan/new',
  'External Author': '/external-author/new',
};
