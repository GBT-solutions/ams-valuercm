const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    queueLimit: 0,
});

// Periodic heartbeat ping every 15 minutes to keep MySQL connections active and prevent server-side wait_timeout / inactivity disconnection
setInterval(
    async () => {
        try {
            await pool.query("SELECT 1");
        } catch (err) {}
    },
    15 * 60 * 1000
).unref();

module.exports = pool;
