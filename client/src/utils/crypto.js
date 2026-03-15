// E2E encryption using AES-256-GCM (Web Crypto API)
// Messages are encrypted on the client before being sent to the server.
// The server only ever stores/relays ciphertext.

function base64ToBuffer(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function importKey(keyBase64) {
  const raw = base64ToBuffer(keyBase64);
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

/**
 * Encrypt plaintext with AES-256-GCM.
 * @param {string} plaintext
 * @param {string} keyBase64 - base64-encoded 256-bit key
 * @returns {{ ciphertext: string, iv: string }} base64-encoded ciphertext and IV
 */
export async function encrypt(plaintext, keyBase64) {
  const key = await importKey(keyBase64);
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
  const encoded = new TextEncoder().encode(plaintext);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  return {
    ciphertext: bufferToBase64(encrypted),
    iv: bufferToBase64(iv),
  };
}

/**
 * Decrypt AES-256-GCM ciphertext.
 * @param {string} ciphertextBase64
 * @param {string} ivBase64
 * @param {string} keyBase64
 * @returns {string} decrypted plaintext
 */
export async function decrypt(ciphertextBase64, ivBase64, keyBase64) {
  const key = await importKey(keyBase64);
  const iv = base64ToBuffer(ivBase64);
  const ciphertext = base64ToBuffer(ciphertextBase64);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Generate a random AES-256 key and return as base64.
 */
export async function generateKey() {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const raw = await crypto.subtle.exportKey('raw', key);
  return bufferToBase64(raw);
}
