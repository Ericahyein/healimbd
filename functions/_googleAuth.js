// Helper module for Google Cloud Service Account Authentication, Web Crypto PBKDF2 Hashing, and Firestore REST API

// Convert hex string to Uint8Array
export function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// Convert Uint8Array to hex string
export function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate cryptographically secure 16-byte random salt in hex
export function generateSaltHex() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return bytesToHex(arr);
}

// PBKDF2-HMAC-SHA256 password hasher with secret pepper
export async function hashPassword(password, saltHex, pepper = '') {
  const encoder = new TextEncoder();
  const combined = encoder.encode(password + pepper);
  const salt = hexToBytes(saltHex);

  const baseKey = await crypto.subtle.importKey(
    'raw',
    combined,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt']
  );

  const rawBytes = await crypto.subtle.exportKey('raw', derivedKey);
  return bytesToHex(new Uint8Array(rawBytes));
}

// Convert Base64 / Base64URL
function base64UrlEncode(str) {
  const b64 = btoa(str);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function arrayBufferToBase64Url(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return base64UrlEncode(binary);
}

// Convert PEM private key to binary ArrayBuffer for crypto.subtle.importKey
function pemToArrayBuffer(pem) {
  const cleanPem = pem
    .replace(/-----BEGIN[ A-Z_-]+-----/g, '')
    .replace(/-----END[ A-Z_-]+-----/g, '')
    .replace(/[\r\n\s]/g, '');
  const binary = atob(cleanPem);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Cached access token in Worker isolate
let cachedToken = null;
let tokenExpiresAt = 0;

// Obtain Google OAuth2 Access Token for Firestore API using Service Account Key
export async function getGoogleAccessToken(env) {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && tokenExpiresAt > now + 60) {
    return cachedToken;
  }

  const clientEmail = env.FIREBASE_SERVICE_ACCOUNT_EMAIL;
  let privateKeyPem = env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!clientEmail || !privateKeyPem) {
    throw new Error('MISSING_SERVICE_ACCOUNT_CONFIG: Cloudflare Secrets (FIREBASE_SERVICE_ACCOUNT_EMAIL / FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY) not configured');
  }

  // Handle escaped newlines in env secret
  privateKeyPem = privateKeyPem.replace(/\\n/g, '\n');

  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const claimSet = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaim = base64UrlEncode(JSON.stringify(claimSet));
  const unsignedJwt = `${encodedHeader}.${encodedClaim}`;

  const keyBuffer = pemToArrayBuffer(privateKeyPem);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: { name: 'SHA-256' }
    },
    false,
    ['sign']
  );

  const encoder = new TextEncoder();
  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(unsignedJwt)
  );

  const signedJwt = `${unsignedJwt}.${arrayBufferToBase64Url(signatureBuffer)}`;

  // Exchange JWT for OAuth2 Access Token
  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${signedJwt}`
  });

  if (!tokenResp.ok) {
    const errText = await tokenResp.text();
    throw new Error(`Google OAuth Token Exchange Failed: ${tokenResp.status} ${errText}`);
  }

  const tokenData = await tokenResp.json();
  cachedToken = tokenData.access_token;
  tokenExpiresAt = now + (tokenData.expires_in || 3600);

  return cachedToken;
}

// In-memory Rate Limiting table per edge worker instance
const rateLimitTable = new Map();

export function checkRateLimit(key, maxAttempts = 5, windowSeconds = 600) {
  const now = Date.now();
  const entry = rateLimitTable.get(key) || { count: 0, resetAt: now + windowSeconds * 1000 };

  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + windowSeconds * 1000;
  }

  entry.count += 1;
  rateLimitTable.set(key, entry);

  if (entry.count > maxAttempts) {
    const remainingSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, remainingSeconds };
  }

  return { allowed: true };
}
