// Minimal ULID generator — Crockford base32, lexicographically sortable, 26 chars.
// (48-bit timestamp + 80-bit randomness.) No dependency; uses Web Crypto (available in Workers).
const ENC = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

export function ulid(seedTime = Date.now()) {
  let ts = ''
  let t = seedTime
  for (let i = 0; i < 10; i++) {
    ts = ENC[t % 32] + ts
    t = Math.floor(t / 32)
  }
  let rand = ''
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  for (let i = 0; i < 16; i++) rand += ENC[bytes[i] & 31]
  return ts + rand
}

export const nowMs = () => Date.now()
