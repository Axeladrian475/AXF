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

const [rows] = await conn.query(
  `SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
   FROM information_schema.KEY_COLUMN_USAGE
   WHERE REFERENCED_TABLE_NAME IN ('suscriptores', 'personal')
     AND CONSTRAINT_SCHEMA = ?`,
  [process.env.DB_NAME]
);

console.log(JSON.stringify(rows, null, 2));
await conn.end();
