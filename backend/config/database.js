const mysql = require('mysql2');

const pool = mysql.createPool({

  host:"194.163.46.7",
  user:"u742355347_waiver_replit",
  password:"Arona1@1@1@1",
  database:"u742355347_waiver_replit",
  
  // host: process.env.DB_HOST,
  // user: process.env.DB_USER,
  // password: process.env.DB_PASSWORD,
  // database: process.env.DB_NAME,  
  
  // port: process.env.DB_PORT,
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
