const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD || undefined,
    port: process.env.DB_PORT,
});

const testDatabase = async () => {
    try {
        const result = await pool.query("SELECT NOW()");
        console.log("PostgreSQL connected:", result.rows[0].now);
    } catch (error) {
        console.error("PostgreSQL connection failed:");
        console.error(error.message);
    }
};

testDatabase();

module.exports = pool;