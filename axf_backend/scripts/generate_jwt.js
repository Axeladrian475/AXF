// Script pequeño para generar un JWT HMAC-SHA256 sin dependencias externas
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const secret = process.env.JWT_SECRET;
if (!secret) {
  console.error('JWT_SECRET no definido en .env');
  process.exit(1);
}

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');
}

const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
const payload = base64url(JSON.stringify({ id: 1, rol: 'maestro', iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000) + 3600 }));
const signature = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');

console.log(`${header}.${payload}.${signature}`);
