const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Roles, permissions and the users.active column, before any route reads them.
require('./permissions');
require('./people');

// Staff directory for the author, reviewer and task pickers.
app.get('/api/people', require('./auth').requireAuth, require('./auth').blockAuthors, (req, res) => res.json(require('./people').directory()));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/clients', require('./routes/clientRoutes'));
app.use('/api/templates', require('./routes/templateRoutes'));
app.use('/api/plans', require('./routes/planRoutes'));
app.use('/api/publications', require('./routes/publicationRoutes'));
app.use('/api/pub-items', require('./routes/pubItemRoutes'));
app.use('/api/pp-publications', require('./routes/ppPublicationRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/pp-plans', require('./routes/ppPlanRoutes'));
app.use('/api/pp-authors', require('./routes/ppAuthorRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Every external author profile with an email gets a login.
require('./authorLogins').backfillAuthorLogins();

// Dashboard: upcoming milestones
app.get('/api/dashboard', require('./auth').requireAuth, (req, res) => {
  const db = require('./db');
  const today = new Date().toISOString().slice(0, 10);
  let clientFilter = '';
  const params = [today];
  if (req.user.role !== 'admin' && req.user.client_id) {
    clientFilter = 'AND p.client_id = ?';
    params.push(req.user.client_id);
  }
  const milestones = db.prepare(`
    SELECT pi.id, pi.name, pi.end_date, pi.status, p.id as pub_id, p.title as pub_title, p.client_id,
           c.name as client_name, ps.name as stage_name
    FROM pub_items pi
    JOIN pub_stages ps ON ps.id = pi.pub_stage_id
    JOIN publications p ON p.id = ps.publication_id
    JOIN clients c ON c.id = p.client_id
    WHERE pi.type = 'milestone' AND pi.end_date >= ? AND pi.status != 'complete'
    ${clientFilter}
    ORDER BY pi.end_date ASC LIMIT 20
  `).all(...params);

  const recentPubs = db.prepare(`
    SELECT p.*, pt.name as pub_type_name, c.name as client_name
    FROM publications p
    JOIN pub_types pt ON pt.id = p.pub_type_id
    JOIN clients c ON c.id = p.client_id
    WHERE 1=1 ${clientFilter.replace('p.client_id', 'p.client_id')}
    ORDER BY p.created_at DESC LIMIT 10
  `).all(...(req.user.role !== 'admin' && req.user.client_id ? [req.user.client_id] : []));

  res.json({ milestones, recentPubs });
});

// Serve the built client (npm run build) so the app and API share one address when hosted.
const path = require('path');
const DIST = path.join(__dirname, '..', 'client', 'dist');
if (require('fs').existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(DIST, 'index.html')));
}

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

// Hosting (Railway) stops the old copy with SIGTERM on every deploy. Finish open requests, close the
// database and exit cleanly, so a routine redeploy isn't reported as a crash.
let stopping = false;
function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  console.log(signal + ' received: shutting down.');
  const done = () => {
    try { require('./db').close(); } catch (e) { /* already closed */ }
    process.exit(0);
  };
  server.close(done);
  setTimeout(done, 5000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
