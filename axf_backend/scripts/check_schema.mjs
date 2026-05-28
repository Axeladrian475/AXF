import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '3306', 10),
});

const [rows] = await conn.query('SHOW CREATE TABLE sucursales');
console.log(rows[0]['Create Table']);
await conn.end();
