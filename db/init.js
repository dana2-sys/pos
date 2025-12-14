const Database = require('better-sqlite3');
const db = new Database('db/tickets.db', { verbose: console.log });

function init() {
  db.exec(`DROP TABLE IF EXISTS comments;`);
  db.exec(`DROP TABLE IF EXISTS tickets;`);
  db.exec(`DROP TABLE IF EXISTS users;`);

  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0
    );
  `);

  db.exec(`
    CREATE TABLE tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      user_id INTEGER,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );
  `);

  db.exec(`
    CREATE TABLE comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ticket_id INTEGER,
      user_id INTEGER,
      FOREIGN KEY (ticket_id) REFERENCES tickets (id),
      FOREIGN KEY (user_id) REFERENCES users (id)
    );
  `);

  console.log('Database initialized successfully.');
}

init();
