const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');

const db = new Database('db/tickets.db');

const username = 'admin';
const password = 'password'; // Use a more secure password in a real application
const hashedPassword = bcrypt.hashSync(password, 10);

const stmt = db.prepare('INSERT INTO users (username, password, is_admin) VALUES (?, ?, 1)');
stmt.run(username, hashedPassword);

console.log('Admin user created successfully.');
