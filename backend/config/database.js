const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.DB_HOST || "194.163.46.7",
  user: process.env.DB_USER || "u742355347_waiver_replit",
  password: process.env.DB_PASSWORD || "Arona1@1@1@1",
  database: process.env.DB_NAME || "u742355347_waiver_replit",
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

const promisePool = pool.promise();

pool.on('connection', (connection) => {
  console.log('New MySQL connection established');
});

pool.on('error', (err) => {
  console.error('MySQL Pool Error:', err);
});

module.exports = promisePool;
