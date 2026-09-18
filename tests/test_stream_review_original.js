const assert = require('assert');
const { Readable, PassThrough } = require('stream');
const fs = require('fs');
const vm = require('vm');

console.log('🧪 Starting streamReviewOriginal & Preview URL Security Test Suite (Hardened v3)...\n');

let passed = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// Canonical Valid Binary Headers
const VALID_PNG_BUFFER = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('IHDR_VALID_PNG_CHUNKS_DATA_1234567890')
]);

const VALID_JPEG_BUFFER = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]),
  Buffer.from('VALID_JPEG_IMAGE_DATA_12345')
]);

const VALID_WEBP_BUFFER = Buffer.concat([
  Buffer.from([0x52, 0x49, 0x46, 0x46, 0x20, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]),
  Buffer.from('VALID_WEBP_IMAGE_DATA_12345')
]);

// Mock Request & Response Builder
function createMockReqRes(options = {}) {
  const reqHeaders = {
    origin: options.origin !== undefined ? options.origin : 'https://healimbd.com',
    authorization: options.authorization !== undefined ? options.authorization : 'Bearer valid-id-token',
    'x-firebase-appcheck': options.appCheck !== undefined ? options.appCheck : 'valid-appcheck-token',
    referer: options.referer || '',
    ...(options.headers || {})
  };

  const req = {
    method: options.method || 'GET',
    query: options.query || { reviewId: 'tr_1789535343267_3bltw9' },
    get(name) {
      return reqHeaders[name.toLowerCase()] || '';
    }
  };

  const resHeaders = {};
  let statusCode = 200;
  let responseData = null;
  const writtenChunks = [];
  const res = new PassThrough();

  res.statusCode = 200;
  res.headersSent = false;
  const origWrite = res.write.bind(res);
  res.write = function(chunk, encoding, cb) {
    this.headersSent = true;
    return origWrite(chunk, encoding, cb);
  };
  res.setHeader = function(key, value) {
    resHeaders[key.toLowerCase()] = value;
  };
  res.set = res.setHeader;
  res.getHeader = function(key) {
    return resHeaders[key.toLowerCase()];
  };
  res.status = function(code) {
    statusCode = code;
    this.statusCode = code;
    return this;
  };
  res.json = function(data) {
    this.headersSent = true;
    responseData = data;
    this.end();
    return this;
  };
  res.send = function(data) {
    this.headersSent = true;
    responseData = data;
    this.end();
    return this;
  };

  // Capture all written output chunks (from both res.write and stream.pipe)
  res.on('data', (chunk) => {
    writtenChunks.push(chunk);
  });

  res._getStatusCode = () => statusCode;
  res._getHeaders = () => resHeaders;
  res._getData = () => responseData;
  res._getOutputBuffer = () => Buffer.concat(writtenChunks);

  return { req, res };
}

async function run() {
  // Load firebase-admin and functions/index.js
  const admin = require('../firebase_functions/node_modules/firebase-admin');
  const proto = Object.getPrototypeOf(admin);

  // Backup original admin prototype descriptors
  const origAuthDesc = Object.getOwnPropertyDescriptor(proto, 'auth');
  const origAppCheckDesc = Object.getOwnPropertyDescriptor(proto, 'appCheck');
  const origFirestoreDesc = Object.getOwnPropertyDescriptor(proto, 'firestore');
  const origStorageDesc = Object.getOwnPropertyDescriptor(proto, 'storage');

  const fnModule = require('../firebase_functions/index.js');
  const streamReviewOriginal = fnModule.streamReviewOriginal;

  assert.strictEqual(typeof streamReviewOriginal, 'function', 'streamReviewOriginal must be exported as a function');

  // Helper to install mock services
  function setupMocks(overrides = {}) {
    Object.defineProperty(proto, 'auth', {
      value: () => ({
        verifyIdToken: async (token) => {
          if (overrides.authFail) throw new Error('Invalid token');
          if (overrides.isAnonymous) {
            return { uid: 'anon_123', firebase: { sign_in_provider: 'anonymous' } };
          }
          return { uid: 'user_123', firebase: { sign_in_provider: 'kakao' } };
        }
      }),
      configurable: true
    });

    Object.defineProperty(proto, 'appCheck', {
      value: () => ({
        verifyToken: async (token) => {
          if (overrides.appCheckFail) throw new Error('Invalid App Check');
          return { appId: 'healim-web-app' };
        }
      }),
      configurable: true
    });

    Object.defineProperty(proto, 'firestore', {
      value: () => ({
        collection: (colName) => ({
          doc: (docId) => ({
            get: async () => {
              if (overrides.docNotFound) return { exists: false };
              const imagePath = overrides.imagePath !== undefined
                ? overrides.imagePath
                : `treatment-reviews/${docId}/original.png`;
              return {
                exists: true,
                data: () => ({
                  id: docId,
                  title: '치료 후기',
                  imagePath: imagePath
                })
              };
            }
          })
        })
      }),
      configurable: true
    });

    Object.defineProperty(proto, 'storage', {
      value: () => ({
        bucket: () => ({
          file: (filePath) => {
            const isJpeg = (overrides.contentType === 'image/jpeg') || filePath.endsWith('.jpg') || filePath.endsWith('.jpeg');
            const isWebp = (overrides.contentType === 'image/webp') || filePath.endsWith('.webp');
            let defaultBuf = VALID_PNG_BUFFER;
            let defaultMime = 'image/png';
            if (isJpeg) {
              defaultBuf = VALID_JPEG_BUFFER;
              defaultMime = 'image/jpeg';
            } else if (isWebp) {
              defaultBuf = VALID_WEBP_BUFFER;
              defaultMime = 'image/webp';
            }

            const targetBuf = overrides.fileBuffer !== undefined ? overrides.fileBuffer : defaultBuf;
            const targetMime = overrides.contentType !== undefined ? overrides.contentType : defaultMime;

            return {
              exists: async () => [!overrides.fileNotFound],
              getMetadata: async () => [{
                contentType: targetMime,
                size: overrides.fileSize !== undefined ? overrides.fileSize : targetBuf.length
              }],
              createReadStream: () => {
                if (overrides.streamFail) {
                  const s = new Readable({ read() {} });
                  process.nextTick(() => s.emit('error', new Error('Stream read failed')));
                  return s;
                }
                return Readable.from(targetBuf);
              }
            };
          }
        })
      }),
      configurable: true
    });
  }

  // --- SCENARIO TESTS ---

  // 1. Allowed Origin OPTIONS -> 204
  await test('1. Preflight OPTIONS with allowed origin returns 204 with complete CORS headers', async () => {
    setupMocks();
    const { req, res } = createMockReqRes({ method: 'OPTIONS', origin: 'https://healimbd.com' });
    await streamReviewOriginal(req, res);
    assert.strictEqual(res._getStatusCode(), 204);
    assert.strictEqual(res._getHeaders()['access-control-allow-origin'], 'https://healimbd.com');
    assert.strictEqual(res._getHeaders()['access-control-allow-methods'], 'GET, OPTIONS');
    assert.ok(res._getHeaders()['access-control-allow-headers'].includes('Authorization'));
    assert.ok(res._getHeaders()['access-control-allow-headers'].includes('X-Firebase-AppCheck'));
    assert.strictEqual(res._getHeaders()['vary'], 'Origin');
  });

  // 2. Disallowed Origin OPTIONS -> 403
  await test('2. Preflight OPTIONS with disallowed origin returns 403 Forbidden', async () => {
    setupMocks();
    const { req, res } = createMockReqRes({ method: 'OPTIONS', origin: 'https://malicious-site.com' });
    await streamReviewOriginal(req, res);
    assert.strictEqual(res._getStatusCode(), 403);
    assert.strictEqual(res._getData().error, 'Origin not allowed');
  });

  // 3. Wrong HTTP Method -> 405
  await test('3. Disallowed HTTP methods (POST, PUT, DELETE) return 405 Method Not Allowed', async () => {
    setupMocks();
    for (const method of ['POST', 'PUT', 'DELETE']) {
      const { req, res } = createMockReqRes({ method: method, origin: 'https://healimbd.com' });
      await streamReviewOriginal(req, res);
      assert.strictEqual(res._getStatusCode(), 405);
      assert.strictEqual(res._getHeaders()['allow'], 'GET, OPTIONS');
    }
  });

  // 4. Disallowed Origin on GET -> 403
  await test('4. GET request with disallowed origin returns 403 Forbidden', async () => {
    setupMocks();
    const { req, res } = createMockReqRes({ method: 'GET', origin: 'https://hacker.com' });
    await streamReviewOriginal(req, res);
    assert.strictEqual(res._getStatusCode(), 403);
  });

  // 5. Missing Authorization Header -> 401
  await test('5. Missing Authorization header returns 401 Unauthorized', async () => {
    setupMocks();
    const { req, res } = createMockReqRes({ authorization: '' });
    await streamReviewOriginal(req, res);
    assert.strictEqual(res._getStatusCode(), 401);
    assert.strictEqual(res._getData().error, 'Authentication required');
  });

  // 6. Invalid ID Token -> 401
  await test('6. Invalid ID Token verification failure returns 401 Unauthorized', async () => {
    setupMocks({ authFail: true });
    const { req, res } = createMockReqRes();
    await streamReviewOriginal(req, res);
    assert.strictEqual(res._getStatusCode(), 401);
    assert.strictEqual(res._getData().error, 'Invalid authentication token');
  });

  // 7. Anonymous user token -> 403
  await test('7. Anonymous user access is blocked with 403 Forbidden', async () => {
    setupMocks({ isAnonymous: true });
    const { req, res } = createMockReqRes();
    await streamReviewOriginal(req, res);
    assert.strictEqual(res._getStatusCode(), 403);
    assert.strictEqual(res._getData().error, 'Anonymous access forbidden');
  });

  // 8. Missing App Check Header -> 401
  await test('8. Missing X-Firebase-AppCheck header returns 401 Unauthorized', async () => {
    setupMocks();
    const { req, res } = createMockReqRes({ appCheck: '' });
    await streamReviewOriginal(req, res);
    assert.strictEqual(res._getStatusCode(), 401);
    assert.strictEqual(res._getData().error, 'App Check token required');
  });

  // 9. Invalid App Check Token -> 401
  await test('9. Invalid App Check token verification failure returns 401 Unauthorized', async () => {
    setupMocks({ appCheckFail: true });
    const { req, res } = createMockReqRes();
    await streamReviewOriginal(req, res);
    assert.strictEqual(res._getStatusCode(), 401);
    assert.strictEqual(res._getData().error, 'Invalid App Check token');
  });

  // 10. Malformed reviewId -> 400
  await test('10. Invalid reviewId format (traversal, SQLi, unknown prefix) returns 400 Bad Request', async () => {
    setupMocks();
    const invalidIds = ['../../etc/passwd', 'random_id_123', 'tr_', 'legacy_', 'tr_1234;DROP TABLE', ''];
    for (const rid of invalidIds) {
      const { req, res } = createMockReqRes({ query: { reviewId: rid } });
      await streamReviewOriginal(req, res);
      assert.strictEqual(res._getStatusCode(), 400, `Expected 400 for reviewId: ${rid}`);
    }
  });

  // 11. Firestore Document Not Found -> 404
  await test('11. Non-existent reviewId document in Firestore returns 404 Not Found', async () => {
    setupMocks({ docNotFound: true });
    const { req, res } = createMockReqRes();
    await streamReviewOriginal(req, res);
    assert.strictEqual(res._getStatusCode(), 404);
    assert.strictEqual(res._getData().error, 'Review not found');
  });

  // 12. imagePath does not match requested reviewId -> 403
  await test('12. imagePath pointing outside reviewId directory is rejected with 403 Path mismatch violation', async () => {
    setupMocks({ imagePath: 'treatment-reviews/tr_999999999999_other/original.png' });
    const { req, res } = createMockReqRes({ query: { reviewId: 'tr_1789535343267_3bltw9' } });
    await streamReviewOriginal(req, res);
    assert.strictEqual(res._getStatusCode(), 403);
    assert.strictEqual(res._getData().error, 'Path mismatch violation');
  });

  // 13. Path traversal in imagePath -> 400
  await test('13. Path traversal sequence in imagePath is rejected with 400 Illegal path traversal sequence', async () => {
    setupMocks({ imagePath: 'treatment-reviews/tr_1789535343267_3bltw9/../secrets/original.png' });
    const { req, res } = createMockReqRes({ query: { reviewId: 'tr_1789535343267_3bltw9' } });
    await streamReviewOriginal(req, res);
    assert.strictEqual(res._getStatusCode(), 400);
    assert.strictEqual(res._getData().error, 'Illegal path traversal sequence');
  });

  // 14. Unsupported file extension in imagePath -> 400
  await test('14. Unsupported file extension (e.g. .exe, .sh, .pdf) returns 400 Unsupported file extension', async () => {
    setupMocks({ imagePath: 'treatment-reviews/tr_1789535343267_3bltw9/original.exe' });
    const { req, res } = createMockReqRes({ query: { reviewId: 'tr_1789535343267_3bltw9' } });
    await streamReviewOriginal(req, res);
    assert.strictEqual(res._getStatusCode(), 400);
    assert.strictEqual(res._getData().error, 'Unsupported file extension');
  });

  // 15. Storage Object Not Found -> 404
  await test('15. Non-existent Storage object returns 404 Image object not found', async () => {
    setupMocks({ fileNotFound: true });
    const { req, res } = createMockReqRes();
    await streamReviewOriginal(req, res);
    assert.strictEqual(res._getStatusCode(), 404);
    assert.strictEqual(res._getData().error, 'Image object not found');
  });

  // 16. Unsupported MIME type in Storage metadata -> 415
  await test('16. Unsupported Storage metadata contentType (e.g. text/plain, image/gif) returns 415', async () => {
    setupMocks({ contentType: 'image/gif' });
    const { req, res } = createMockReqRes();
    await streamReviewOriginal(req, res);
    assert.strictEqual(res._getStatusCode(), 415);
    assert.strictEqual(res._getData().error, 'Unsupported media type');
  });

  // 17. Extension vs Metadata MIME Mismatch -> 415
  await test('17. Extension vs Storage metadata MIME mismatch (.png with image/jpeg) returns 415', async () => {
    setupMocks({ imagePath: 'treatment-reviews/tr_1789535343267_3bltw9/original.png', contentType: 'image/jpeg' });
    const { req, res } = createMockReqRes();
    await streamReviewOriginal(req, res);
    assert.strictEqual(res._getStatusCode(), 415);
    assert.strictEqual(res._getData().error, 'Unsupported media type');
  });

  // 18. Truncated image header (< 12 bytes) -> 415
  await test('18. Truncated image file header (< 12 bytes) is rejected with 415', async () => {
    setupMocks({ fileBuffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d]) }); // Only 5 bytes
    const { req, res } = createMockReqRes();
    await streamReviewOriginal(req, res);
    assert.strictEqual(res._getStatusCode(), 415);
    assert.strictEqual(res._getData().error, 'Unsupported media type');
  });

  // 19. Disguised Magic Bytes (MIME is image/png but magic bytes are fake) -> 415
  await test('19. Disguised file (valid extension & MIME but fake magic bytes) returns 415', async () => {
    const fakeBytes = Buffer.from('DISGUISED_FAKE_BYTES_THAT_ARE_NOT_PNG');
    setupMocks({ fileBuffer: fakeBytes, contentType: 'image/png' });
    const { req, res } = createMockReqRes();
    await streamReviewOriginal(req, res);
    assert.strictEqual(res._getStatusCode(), 415);
    assert.strictEqual(res._getData().error, 'Unsupported media type');
  });

  // 20. Successful PNG Streaming with Valid Magic Bytes -> 200 & Byte Conservation
  await test('20. Valid PNG magic bytes stream 200 with byte-for-byte exact fidelity', async () => {
    setupMocks({ fileBuffer: VALID_PNG_BUFFER, contentType: 'image/png' });
    const { req, res } = createMockReqRes({ origin: 'https://healimbd.com' });
    await streamReviewOriginal(req, res);
    assert.strictEqual(res._getStatusCode(), 200);
    assert.strictEqual(res._getHeaders()['content-type'], 'image/png');
    assert.strictEqual(res._getHeaders()['content-disposition'], 'inline');
    assert.strictEqual(res._getHeaders()['cache-control'], 'private, no-store, max-age=0');
    assert.strictEqual(res._getHeaders()['pragma'], 'no-cache');
    assert.strictEqual(res._getHeaders()['x-content-type-options'], 'nosniff');
    assert.strictEqual(res._getHeaders()['access-control-allow-origin'], 'https://healimbd.com');

    const received = res._getOutputBuffer();
    assert.strictEqual(received.length, VALID_PNG_BUFFER.length, 'Total streamed bytes must match exactly');
    assert.deepStrictEqual(received, VALID_PNG_BUFFER, 'Streamed content must match input buffer byte-for-byte');
  });

  // 21. Successful JPEG Streaming with Valid Magic Bytes -> 200 & Byte Conservation
  await test('21. Valid JPEG magic bytes stream 200 with byte-for-byte exact fidelity', async () => {
    setupMocks({
      imagePath: 'treatment-reviews/tr_1789535343267_3bltw9/original.jpg',
      fileBuffer: VALID_JPEG_BUFFER,
      contentType: 'image/jpeg'
    });
    const { req, res } = createMockReqRes({ origin: 'https://healimbd.com' });
    await streamReviewOriginal(req, res);
    assert.strictEqual(res._getStatusCode(), 200);
    assert.strictEqual(res._getHeaders()['content-type'], 'image/jpeg');

    const received = res._getOutputBuffer();
    assert.strictEqual(received.length, VALID_JPEG_BUFFER.length);
    assert.deepStrictEqual(received, VALID_JPEG_BUFFER);
  });

  // 22. Successful WebP Streaming with Valid Magic Bytes -> 200 & Byte Conservation
  await test('22. Valid WebP magic bytes stream 200 with byte-for-byte exact fidelity', async () => {
    setupMocks({
      imagePath: 'treatment-reviews/tr_1789535343267_3bltw9/original.webp',
      fileBuffer: VALID_WEBP_BUFFER,
      contentType: 'image/webp'
    });
    const { req, res } = createMockReqRes({ origin: 'https://healimbd.com' });
    await streamReviewOriginal(req, res);
    assert.strictEqual(res._getStatusCode(), 200);
    assert.strictEqual(res._getHeaders()['content-type'], 'image/webp');

    const received = res._getOutputBuffer();
    assert.strictEqual(received.length, VALID_WEBP_BUFFER.length);
    assert.deepStrictEqual(received, VALID_WEBP_BUFFER);
  });

  // 23. Localhost:1313 Origin supported with matched CORS headers
  await test('23. http://localhost:1313 origin is fully supported with matched CORS headers', async () => {
    setupMocks({ fileBuffer: VALID_PNG_BUFFER, contentType: 'image/png' });
    const { req, res } = createMockReqRes({ origin: 'http://localhost:1313' });
    await streamReviewOriginal(req, res);
    assert.strictEqual(res._getStatusCode(), 200);
    assert.strictEqual(res._getHeaders()['access-control-allow-origin'], 'http://localhost:1313');
  });

  // 24. Sanitized Logging Verification (No sensitive tokens, UID, email, err.message in logs)
  await test('24. Error logging strictly emits whitelisted category codes without sensitive info', async () => {
    const loggedCodes = [];
    const origWarn = console.warn;
    const origError = console.error;
    console.warn = (tag, code) => {
      if (tag === '[STREAM_REVIEW_ORIGINAL]') loggedCodes.push(code);
    };
    console.error = (tag, code) => {
      if (tag === '[STREAM_REVIEW_ORIGINAL]') loggedCodes.push(code);
    };

    try {
      setupMocks({ authFail: true });
      const { req, res } = createMockReqRes();
      await streamReviewOriginal(req, res);

      assert.ok(loggedCodes.includes('auth_failed'), 'Must log auth_failed');
      for (const item of loggedCodes) {
        assert.ok(
          ['invalid_origin', 'invalid_method', 'auth_failed', 'app_check_failed',
           'invalid_review_id', 'document_not_found', 'invalid_image_path',
           'object_not_found', 'unsupported_image_type', 'stream_failed', 'internal_error'].includes(item),
          `Unapproved log item: ${item}`
        );
      }
    } finally {
      console.warn = origWarn;
      console.error = origError;
    }
  });

  // --- CLIENT-SIDE LOGIC TESTS FROM MAIN.JS ---
  const mainJs = fs.readFileSync('assets/js/main.js', 'utf8');

  await test('25. main.js contains getPublicPreviewMediaUrl helper with strict prefix and character validation', () => {
    assert.ok(mainJs.includes('function getPublicPreviewMediaUrl(previewPath)'), 'getPublicPreviewMediaUrl exists');
    assert.ok(mainJs.includes("trimmed.startsWith('public-review-previews/')"), 'Enforces exact public-review-previews/ prefix');
    assert.ok(mainJs.includes("trimmed.includes('treatment-reviews/')"), 'Rejects treatment-reviews/ protected paths');
    assert.ok(mainJs.includes("trimmed.includes('token=')"), 'Rejects token= URLs');
    assert.ok(mainJs.includes('?alt=media'), 'Returns media URL without token');
  });

  await test('26. main.js getStreamReviewOriginalUrl strictly enforces official endpoints and rejects arbitrary URLs', () => {
    // Extract the constants and function from main.js to execute in a strict sandbox
    const match = mainJs.match(/(const OFFICIAL_STREAM_PROD_URL = '[\s\S]*?function getStreamReviewOriginalUrl\(\) \{[\s\S]*?\n\})/);
    assert.ok(match, 'getStreamReviewOriginalUrl and constants found in main.js');

    const fnCode = match[1];

    function evalInMockWindow(mockWindow) {
      const sandbox = { window: mockWindow };
      vm.createContext(sandbox);
      vm.runInContext(`${fnCode}; sandboxResult = getStreamReviewOriginalUrl();`, sandbox);
      return sandbox.sandboxResult;
    }

    const PROD_URL = 'https://asia-northeast3-healimbd-b726f.cloudfunctions.net/streamReviewOriginal';
    const EMULATOR_URL = 'http://127.0.0.1:5001/healimbd-b726f/asia-northeast3/streamReviewOriginal';

    // 1. Production hostname -> unconditionally PROD_URL
    assert.strictEqual(evalInMockWindow({ location: { hostname: 'healimbd.com' } }), PROD_URL);
    assert.strictEqual(evalInMockWindow({ location: { hostname: 'www.healimbd.com' } }), PROD_URL);
    assert.strictEqual(evalInMockWindow({ location: { hostname: 'm.healimbd.com' } }), PROD_URL);

    // 2. Production hostname with arbitrary attacker variable set -> still PROD_URL
    assert.strictEqual(evalInMockWindow({
      location: { hostname: 'healimbd.com' },
      HEALIM_STREAM_REVIEW_ORIGINAL_URL: 'https://attacker.com/steal',
      HEALIM_USE_PROD_STREAM_ON_LOCALHOST: true
    }), PROD_URL);

    // 3. Localhost default -> EMULATOR_URL
    assert.strictEqual(evalInMockWindow({ location: { hostname: 'localhost' } }), EMULATOR_URL);
    assert.strictEqual(evalInMockWindow({ location: { hostname: '127.0.0.1' } }), EMULATOR_URL);

    // 4. Localhost with HEALIM_USE_PROD_STREAM_ON_LOCALHOST === true -> PROD_URL
    assert.strictEqual(evalInMockWindow({
      location: { hostname: 'localhost' },
      HEALIM_USE_PROD_STREAM_ON_LOCALHOST: true
    }), PROD_URL);
    assert.strictEqual(evalInMockWindow({
      location: { hostname: '127.0.0.1' },
      HEALIM_USE_PROD_STREAM_ON_LOCALHOST: true
    }), PROD_URL);

    // 5. Localhost with string/falsy/object (non-boolean) -> stays on EMULATOR_URL
    assert.strictEqual(evalInMockWindow({
      location: { hostname: 'localhost' },
      HEALIM_USE_PROD_STREAM_ON_LOCALHOST: 'true'
    }), EMULATOR_URL);
    assert.strictEqual(evalInMockWindow({
      location: { hostname: 'localhost' },
      HEALIM_USE_PROD_STREAM_ON_LOCALHOST: 1
    }), EMULATOR_URL);
    assert.strictEqual(evalInMockWindow({
      location: { hostname: 'localhost' },
      HEALIM_USE_PROD_STREAM_ON_LOCALHOST: {}
    }), EMULATOR_URL);

    // 6. Old HEALIM_STREAM_REVIEW_ORIGINAL_URL is completely ignored
    assert.strictEqual(evalInMockWindow({
      location: { hostname: 'localhost' },
      HEALIM_STREAM_REVIEW_ORIGINAL_URL: 'https://attacker.com/endpoint'
    }), EMULATOR_URL);

    // 7. javascript: or data: is completely impossible to return
    const res = evalInMockWindow({
      location: { hostname: 'localhost' },
      HEALIM_STREAM_REVIEW_ORIGINAL_URL: 'javascript:alert(1)'
    });
    assert.strictEqual(res, EMULATOR_URL);
  });

  await test('27. main.js openCustomCaseReader validates natural dimensions and event cleanup', () => {
    assert.ok(mainJs.includes('this.naturalWidth > 0 && this.naturalHeight > 0'), 'naturalWidth and naturalHeight checked');
    assert.ok(mainJs.includes('photoEl.onload = null;'), 'Cleans up onload on close');
    assert.ok(mainJs.includes('photoEl.onerror = null;'), 'Cleans up onerror on close');
    assert.ok(mainJs.includes('revokeActiveReviewBlobUrl()'), 'Revokes active blob URL');
  });

  // 28. Chunk division testing (1-byte, 5-byte, 11-byte, single large chunk)
  await test('28. Chunk divisions (1-byte, 5-byte, 11-byte, single chunk) stream with 100% byte fidelity and no duplication', async () => {
    setupMocks();
    for (const chunkSize of [1, 5, 11, VALID_PNG_BUFFER.length]) {
      function makeChunkedStream(buf, size) {
        let offset = 0;
        return new Readable({
          read() {
            if (offset >= buf.length) {
              this.push(null);
              return;
            }
            const end = Math.min(offset + size, buf.length);
            const slice = buf.subarray(offset, end);
            offset = end;
            this.push(slice);
          }
        });
      }

      // Override storage to yield chunked stream
      Object.defineProperty(proto, 'storage', {
        value: () => ({
          bucket: () => ({
            file: () => ({
              exists: async () => [true],
              getMetadata: async () => [{ contentType: 'image/png', size: VALID_PNG_BUFFER.length }],
              createReadStream: () => makeChunkedStream(VALID_PNG_BUFFER, chunkSize)
            })
          })
        }),
        configurable: true
      });

      const { req, res } = createMockReqRes({ origin: 'https://healimbd.com' });
      await streamReviewOriginal(req, res);
      assert.strictEqual(res._getStatusCode(), 200, `Chunk size ${chunkSize} should succeed with 200`);

      const received = res._getOutputBuffer();
      assert.strictEqual(received.length, VALID_PNG_BUFFER.length, `Chunk size ${chunkSize}: total length must match exactly`);
      assert.deepStrictEqual(received, VALID_PNG_BUFFER, `Chunk size ${chunkSize}: content must match byte-for-byte with no first-chunk duplicate`);
    }
  });

  // 29. Client disconnect aborts Storage read stream
  await test('29. Client disconnect event destroys Storage read stream immediately', async () => {
    setupMocks();
    let streamInstance = null;
    Object.defineProperty(proto, 'storage', {
      value: () => ({
        bucket: () => ({
          file: () => ({
            exists: async () => [true],
            getMetadata: async () => [{ contentType: 'image/png', size: VALID_PNG_BUFFER.length }],
            createReadStream: () => {
              let pushed = false;
              streamInstance = new Readable({
                read() {
                  if (!pushed) {
                    pushed = true;
                    this.push(VALID_PNG_BUFFER.subarray(0, 16));
                  }
                }
              });
              return streamInstance;
            }
          })
        })
      }),
      configurable: true
    });

    const { req, res } = createMockReqRes({ origin: 'https://healimbd.com' });
    res.once('pipe', () => {
      setImmediate(() => res.destroy());
    });

    await streamReviewOriginal(req, res);
    assert.ok(streamInstance, 'Stream instance must have been created');
    assert.strictEqual(streamInstance.destroyed, true, 'Stream must be destroyed on client disconnect');
  });

  // 30. Dedicated serviceAccount option isolation in firebase_functions/index.js
  await test('30. dedicated serviceAccount is configured ONLY for streamReviewOriginal and OAuth functions remain untouched', () => {
    const fnSource = fs.readFileSync('firebase_functions/index.js', 'utf8');

    // 1. streamReviewOriginal must declare dedicated serviceAccount
    const streamDecl = fnSource.match(/exports\.streamReviewOriginal\s*=\s*onRequest\(\s*\{([\s\S]*?)\}/);
    assert.ok(streamDecl, 'streamReviewOriginal onRequest declaration exists');
    assert.ok(
      streamDecl[1].includes("serviceAccount: 'healimbd-review-streamer@healimbd-b726f.iam.gserviceaccount.com'"),
      'streamReviewOriginal has dedicated serviceAccount'
    );

    // 2. OAuth functions must NOT declare serviceAccount
    for (const oauthFn of ['kakaoAuthStart', 'kakaoAuthCallback', 'naverAuthStart', 'naverAuthCallback']) {
      const regex = new RegExp(`exports\\.${oauthFn}\\s*=\\s*onRequest\\(\\s*\\{([\\s\\S]*?)\\}`);
      const oauthMatch = fnSource.match(regex);
      assert.ok(oauthMatch, `${oauthFn} declaration exists`);
      assert.ok(!oauthMatch[1].includes('serviceAccount'), `${oauthFn} must NOT have serviceAccount override`);
    }
  });

  // Restore admin prototype descriptors
  if (origAuthDesc) Object.defineProperty(proto, 'auth', origAuthDesc);
  if (origAppCheckDesc) Object.defineProperty(proto, 'appCheck', origAppCheckDesc);
  if (origFirestoreDesc) Object.defineProperty(proto, 'firestore', origFirestoreDesc);
  if (origStorageDesc) Object.defineProperty(proto, 'storage', origStorageDesc);

  console.log(`\n==================================================`);
  console.log(`📊 Total Tests: ${passed} | Passed: ${passed} | Failed: 0`);
  console.log(`==================================================\n`);
}

run();
