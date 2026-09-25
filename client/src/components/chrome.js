// Per-route TopNav / WorkspaceTabs setup, taken from each page's Claude Design file.

const HELP = { label: 'Help', icon: 'info' };

// Short product nav used by the Publication Planning pages.
const PLANNING_NAV = [
  { label: 'Workspaces', menuItems: ['Publication Manager Dashboard', 'User Dashboard', 'External Author Dashboard', 'Reports', HELP] },
];

// Full product nav used by the User Dashboard record pages.
const FULL_NAV = [
  'Home', 'Content List',
  { label: 'Workspaces', menuItems: ['Publication Manager Dashboard', 'User Dashboard', 'External Author Dashboard', 'Reports', 'System Administrator', HELP] },
  { label: 'Settings', menu: true },
];

const CREATE_SHORT = { label: 'Create New', menuItems: ['Publication', 'Publication Planning', 'External Author'] };
const SEARCH_SHORT = { label: 'Searches', menuItems: ['Publications', 'Publication Plans', 'Conferences', 'Journals', 'Studies', 'External Authors'] };
const CREATE_FULL = { label: 'Create New', menuItems: ['Publication', 'Publication Planning', 'External Author', 'IIS Request', 'Grants Management', 'Medical Information Request', 'Review Process Form', 'Standard Medical Response'] };
const SEARCH_FULL = { label: 'Searches', menuItems: ['Publications', 'Publication Plans', 'Conferences', 'Journals', 'Studies', 'External Authors', 'Approvia', 'Medical Information Requests'] };

const USER_DASHBOARD = {
  nav: FULL_NAV, active: 'Home',
  workspace: 'User Dashboard', tabs: ['My Alerts (16)', CREATE_FULL, SEARCH_FULL],
};

export const CHROME = {
  '/dashboard': {
    nav: [FULL_NAV[2], FULL_NAV[3]], active: 'Workspaces',
    workspace: 'User Dashboard', tabs: ['My Alerts (5)', CREATE_FULL, SEARCH_FULL],
  },
  // Informational page, opened from the workflow icon in the TopNav rather than a workspace.
  '/workflows': USER_DASHBOARD,
  '/publication-manager': {
    nav: PLANNING_NAV, active: 'Workspaces',
    workspace: 'Publication Manager Dashboard', tabs: ['My Alerts (3)', CREATE_SHORT, SEARCH_SHORT],
  },
  '/external-author': USER_DASHBOARD,
  '/external-authors': USER_DASHBOARD,
  '/author-dashboard': {
    nav: FULL_NAV, active: 'Workspaces',
    workspace: 'External Author Dashboard', tabs: ['My Tasks'], activeTab: 'My Tasks',
  },
  '/publications': USER_DASHBOARD,
  '/publication': USER_DASHBOARD,
  '/publication-plan': USER_DASHBOARD,
  '/publication-plans': USER_DASHBOARD,
  '/studies': USER_DASHBOARD,
  '/profile': USER_DASHBOARD,
  '/vendor': USER_DASHBOARD,
  // The Financial Report design has its own navy back bar and no app chrome.
  '/financial-report': null,
};

/** What a signed-in external author sees: their dashboard and nothing else. */
export const AUTHOR_CHROME = { nav: [], active: '', workspace: 'My Author Dashboard', tabs: ['My Tasks'], activeTab: 'My Tasks' };

// Menu rows and tabs that open another page.
export const MENU_ROUTES = {
  'Publication Manager Dashboard': '/publication-manager',
  'User Dashboard': '/dashboard',
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
