const mysql = require("mysql2/promise");
require("dotenv").config();

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Check the connection once at startup so problems show up immediately
// with a clear message, instead of failing later on every API request.
db.getConnection()
    .then((conn) => {
        console.log(`MySQL connected: ${process.env.DB_USER}@${process.env.DB_HOST}/${process.env.DB_NAME}`);
        conn.release();
    })
    .catch((err) => {
        console.error("\n MySQL connection FAILED:", err.code, "-", err.message);
        if (err.code === "ER_ACCESS_DENIED_ERROR") {
            console.error("   -> Wrong DB_USER / DB_PASSWORD in backend/.env. Wrap the password in double quotes.");
        } else if (err.code === "ER_BAD_DB_ERROR") {
            console.error(`   -> Database "${process.env.DB_NAME}" doesn't exist. Create it: CREATE DATABASE ${process.env.DB_NAME};`);
        } else if (err.code === "ECONNREFUSED") {
            console.error("   -> MySQL server isn't running. Start the MySQL service.");
        }
        console.error("");
    });

module.exports = db;
