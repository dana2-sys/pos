require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');

const app = express();
const port = 3000;
const db = new Database('db/tickets.db');

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}));

// Middleware to fetch user data
app.use((req, res, next) => {
  if (req.session.userId) {
    const userStmt = db.prepare('SELECT * FROM users WHERE id = ?');
    res.locals.user = userStmt.get(req.session.userId);
  } else {
    res.locals.user = null;
  }
  next();
});

// Routes
app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
  stmt.run(username, hashedPassword);
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  const user = stmt.get(username);

  if (user && bcrypt.compareSync(password, user.password)) {
    req.session.userId = user.id;
    res.redirect('/');
  } else {
    res.render('login', { error: 'Invalid username or password' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

app.get('/', (req, res) => {
  if (req.session.userId) {
    res.redirect('/tickets');
  } else {
    res.redirect('/login');
  }
});

// Middleware to protect routes
function requireLogin(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.redirect('/login');
  }
}

// Middleware to check for admin privileges
function requireAdmin(req, res, next) {
  if (res.locals.user && res.locals.user.is_admin) {
    next();
  } else {
    res.status(403).send('Forbidden');
  }
}

// Admin routes
app.get('/admin/dashboard', requireLogin, requireAdmin, (req, res) => {
  const stats = {
    open: db.prepare('SELECT COUNT(*) as count FROM tickets WHERE status = ?').get('open').count,
    inProgress: db.prepare('SELECT COUNT(*) as count FROM tickets WHERE status = ?').get('in_progress').count,
    closed: db.prepare('SELECT COUNT(*) as count FROM tickets WHERE status = ?').get('closed').count,
  };

  const users = db.prepare('SELECT * FROM users').all();

  res.render('admin/dashboard', { stats, users });
});

app.post('/admin/users/:id/toggle-admin', requireLogin, requireAdmin, (req, res) => {
  const userToUpdate = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (userToUpdate) {
    const newAdminStatus = userToUpdate.is_admin ? 0 : 1;
    db.prepare('UPDATE users SET is_admin = ? WHERE id = ?').run(newAdminStatus, req.params.id);
  }
  res.redirect('/admin/dashboard');
});

// Ticket routes
app.get('/tickets/new', requireLogin, (req, res) => {
  res.render('create-ticket');
});

app.post('/tickets', requireLogin, (req, res) => {
  const { title, description } = req.body;
  const stmt = db.prepare('INSERT INTO tickets (title, description, user_id) VALUES (?, ?, ?)');
  stmt.run(title, description, req.session.userId);
  res.redirect('/tickets');
});

app.get('/tickets', requireLogin, (req, res) => {
  const stmt = db.prepare('SELECT * FROM tickets');
  const tickets = stmt.all();
  res.render('tickets', { tickets });
});

app.get('/tickets/:id', requireLogin, (req, res) => {
  const ticketStmt = db.prepare('SELECT * FROM tickets WHERE id = ?');
  const ticket = ticketStmt.get(req.params.id);

  const commentsStmt = db.prepare(`
    SELECT comments.content, users.username
    FROM comments
    JOIN users ON comments.user_id = users.id
    WHERE comments.ticket_id = ?
  `);
  const comments = commentsStmt.all(req.params.id);

  res.render('ticket', { ticket, comments });
});

app.post('/tickets/:id/status', requireLogin, requireAdmin, (req, res) => {
  const { status } = req.body;
  const stmt = db.prepare('UPDATE tickets SET status = ? WHERE id = ?');
  stmt.run(status, req.params.id);
  res.redirect(`/tickets/${req.params.id}`);
});

app.post('/tickets/:id/comments', requireLogin, (req, res) => {
  const { content } = req.body;
  const stmt = db.prepare('INSERT INTO comments (content, ticket_id, user_id) VALUES (?, ?, ?)');
  stmt.run(content, req.params.id, req.session.userId);
  res.redirect(`/tickets/${req.params.id}`);
});


app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
