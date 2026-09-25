const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const path = require('path');

const fs = require('fs');

// DB_PATH points the database at a persistent disk when hosted; locally it sits next to the server.
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'pubplanning.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// Create schema
db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    client_id INTEGER REFERENCES clients(id),
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pub_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS workflow_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    pub_type_id INTEGER NOT NULL REFERENCES pub_types(id),
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS template_stages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS template_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stage_id INTEGER NOT NULL REFERENCES template_stages(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'step',
    order_index INTEGER NOT NULL DEFAULT 0,
    default_duration_days INTEGER NOT NULL DEFAULT 7
  );

  CREATE TABLE IF NOT EXISTS publication_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS publications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER REFERENCES publication_plans(id),
    client_id INTEGER NOT NULL REFERENCES clients(id),
    pub_type_id INTEGER NOT NULL REFERENCES pub_types(id),
    title TEXT NOT NULL,
    authors TEXT,
    target_journal_or_congress TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pub_stages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    publication_id INTEGER NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS pub_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pub_stage_id INTEGER NOT NULL REFERENCES pub_stages(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'step',
    order_index INTEGER NOT NULL DEFAULT 0,
    start_date TEXT,
    end_date TEXT,
    status TEXT NOT NULL DEFAULT 'not_started',
    assignee_user_id INTEGER REFERENCES users(id),
    percent_complete INTEGER NOT NULL DEFAULT 0
  );
`);

// PubPro publication records. The form's full state is kept as JSON in `data`;
// the columns hold what lists and dashboards need without parsing it.
db.exec(`
  CREATE TABLE IF NOT EXISTS pp_publications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    pub_type TEXT NOT NULL,
    product TEXT,
    status TEXT NOT NULL DEFAULT 'Draft',
    owner TEXT,
    data TEXT NOT NULL DEFAULT '{}',
    created_by INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

// PubPro publication plans, stored the same way as publications.
db.exec(`
  CREATE TABLE IF NOT EXISTS pp_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    product TEXT,
    status TEXT NOT NULL DEFAULT 'Draft',
    owner TEXT,
    summary TEXT NOT NULL DEFAULT '{}',
    data TEXT NOT NULL DEFAULT '{}',
    created_by INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

// External author profiles, stored the same way as publications and plans.
db.exec(`
  CREATE TABLE IF NOT EXISTS pp_authors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT,
    status TEXT NOT NULL DEFAULT 'Active',
    owner TEXT,
    summary TEXT NOT NULL DEFAULT '{}',
    data TEXT NOT NULL DEFAULT '{}',
    created_by INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

// In-app notifications (the app sends these instead of email). Recipients are people by name,
// since reviewers and authors come from directories rather than app accounts.
db.exec(`
  CREATE TABLE IF NOT EXISTS pp_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient TEXT NOT NULL,
    sender TEXT,
    pub_id INTEGER,
    record_id TEXT,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    tab TEXT,
    dedupe_key TEXT UNIQUE,
    created_at TEXT DEFAULT (datetime('now')),
    read_at TEXT
  );
`);

// Migrate: dashboard summary of each PubPro publication (current step, due dates, reviewers).
try {
  db.exec("ALTER TABLE pp_publications ADD COLUMN summary TEXT NOT NULL DEFAULT '{}'");
} catch (e) { /* column already exists */ }

// Migrate: add percent_complete if it doesn't exist yet
try {
  db.exec('ALTER TABLE pub_items ADD COLUMN percent_complete INTEGER NOT NULL DEFAULT 0');
} catch (e) { /* column already exists */ }

// Wrap node:sqlite to match better-sqlite3 API style used elsewhere
// node:sqlite prepare().get() returns an object, .all() returns array, .run() returns { changes, lastInsertRowid }
// This is already compatible — just export db directly.

// Seed data
function seedIfNeeded() {
  const row = db.prepare('SELECT COUNT(*) as c FROM pub_types').get();
  if (row.c > 0) return;

  // Pub types
  const insertPubType = db.prepare('INSERT INTO pub_types (name) VALUES (?)');
  const ptManuscript = insertPubType.run('Manuscript').lastInsertRowid;
  const ptAbstract = insertPubType.run('Congress Abstract').lastInsertRowid;
  const ptPoster = insertPubType.run('Poster').lastInsertRowid;
  const ptOral = insertPubType.run('Oral Presentation').lastInsertRowid;

  // Admin user
  const pw = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10);
  db.prepare('INSERT OR IGNORE INTO users (email, password_hash, name, role) VALUES (?,?,?,?)').run('admin@example.com', pw, 'Admin User', 'admin');

  // Acme Pharma client
  const clientId = db.prepare('INSERT INTO clients (name) VALUES (?)').run('Acme Pharma').lastInsertRowid;

  // Templates for each pub type
  const templateData = [
    {
      pubTypeId: ptManuscript,
      name: 'Acme Pharma - Manuscript',
      stages: [
        { name: 'Planning', items: [
          { name: 'Define publication scope', type: 'step', days: 7 },
          { name: 'Scope approved', type: 'milestone', days: 1 },
          { name: 'Literature review', type: 'step', days: 14 },
        ]},
        { name: 'Writing', items: [
          { name: 'First draft', type: 'step', days: 21 },
          { name: 'Internal review', type: 'step', days: 14 },
          { name: 'Author review round 1', type: 'step', days: 14 },
          { name: 'Draft approved', type: 'milestone', days: 1 },
        ]},
        { name: 'Submission', items: [
          { name: 'Journal selection', type: 'step', days: 7 },
          { name: 'Format for submission', type: 'step', days: 5 },
          { name: 'Submit to journal', type: 'milestone', days: 1 },
          { name: 'Peer review response', type: 'step', days: 30 },
          { name: 'Revisions', type: 'step', days: 14 },
          { name: 'Final acceptance', type: 'milestone', days: 1 },
        ]},
      ],
    },
    {
      pubTypeId: ptAbstract,
      name: 'Acme Pharma - Congress Abstract',
      stages: [
        { name: 'Planning', items: [
          { name: 'Identify congress', type: 'step', days: 5 },
          { name: 'Congress selected', type: 'milestone', days: 1 },
        ]},
        { name: 'Writing', items: [
          { name: 'Abstract draft', type: 'step', days: 7 },
          { name: 'Internal review', type: 'step', days: 7 },
          { name: 'Author approval', type: 'milestone', days: 1 },
        ]},
        { name: 'Submission', items: [
          { name: 'Final formatting', type: 'step', days: 3 },
          { name: 'Abstract submitted', type: 'milestone', days: 1 },
          { name: 'Notification of acceptance', type: 'milestone', days: 1 },
        ]},
      ],
    },
    {
      pubTypeId: ptPoster,
      name: 'Acme Pharma - Poster',
      stages: [
        { name: 'Content', items: [
          { name: 'Content outline', type: 'step', days: 5 },
          { name: 'Outline approved', type: 'milestone', days: 1 },
          { name: 'Draft copy', type: 'step', days: 10 },
        ]},
        { name: 'Design', items: [
          { name: 'Design v1', type: 'step', days: 7 },
          { name: 'Review and revise', type: 'step', days: 7 },
          { name: 'Final design approved', type: 'milestone', days: 1 },
        ]},
        { name: 'Production', items: [
          { name: 'Print production', type: 'step', days: 5 },
          { name: 'Poster ready', type: 'milestone', days: 1 },
        ]},
      ],
    },
    {
      pubTypeId: ptOral,
      name: 'Acme Pharma - Oral Presentation',
      stages: [
        { name: 'Speaker outline', items: [
          { name: 'Speaker outline', type: 'step', days: 5 },
          { name: 'Outline approved', type: 'milestone', days: 1 },
          { name: 'Slide deck draft', type: 'step', days: 10 },
        ]},
        { name: 'Review', items: [
          { name: 'Medical/legal review', type: 'step', days: 7 },
          { name: 'Speaker run-through', type: 'step', days: 5 },
          { name: 'Final deck approved', type: 'milestone', days: 1 },
        ]},
        { name: 'Delivery', items: [
          { name: 'Speaker rehearsal', type: 'step', days: 3 },
          { name: 'Presentation delivered', type: 'milestone', days: 1 },
        ]},
      ],
    },
  ];

  const insertTemplate = db.prepare('INSERT INTO workflow_templates (client_id, pub_type_id, name) VALUES (?,?,?)');
  const insertStage = db.prepare('INSERT INTO template_stages (template_id, name, order_index) VALUES (?,?,?)');
  const insertItem = db.prepare('INSERT INTO template_items (stage_id, name, type, order_index, default_duration_days) VALUES (?,?,?,?,?)');

  for (const t of templateData) {
    const tmplId = insertTemplate.run(clientId, t.pubTypeId, t.name).lastInsertRowid;
    t.stages.forEach((stage, si) => {
      const stageId = insertStage.run(tmplId, stage.name, si).lastInsertRowid;
      stage.items.forEach((item, ii) => {
        insertItem.run(stageId, item.name, item.type, ii, item.days);
      });
    });
  }

  // Example plan
  db.prepare('INSERT INTO publication_plans (client_id, name, description) VALUES (?,?,?)').run(clientId, 'Q3 2026 Publications', 'Q3 publications for Acme Pharma pipeline');

  console.log('Database seeded successfully.');
}

seedIfNeeded();

module.exports = db;
