// WebAuthn (Face ID / Touch ID / Windows Hello) helpers.
//
// IRON LOG is a single-user personal app — the biometric is a *local*
// gate. The actual API auth is the PIN bearer token. WebAuthn just
// proves "the same human who set up this device is opening the app."

const CRED_KEY = 'ironlog.v1.cred'   // base64url(rawId) of enrolled credential
const RP_NAME = 'IRON LOG'

const b64uEncode = (buf) => {
  const bytes = new Uint8Array(buf)
  let str = ''
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i])
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const b64uDecode = (s) => {
  const pad = '='.repeat((4 - (s.length % 4)) % 4)
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

const randomBytes = (n) => {
  const buf = new Uint8Array(n)
  crypto.getRandomValues(buf)
  return buf
}

export const supportsBiometric = () =>
  typeof window !== 'undefined' &&
  !!window.PublicKeyCredential &&
  !!navigator.credentials

export async function platformAuthenticatorAvailable() {
  if (!supportsBiometric()) return false
  try {
    return !!(await window.PublicKeyCredential
      .isUserVerifyingPlatformAuthenticatorAvailable?.())
  } catch {
    return false
  }
}

export const hasBiometric = () => {
  try { return !!localStorage.getItem(CRED_KEY) } catch { return false }
}

export const clearBiometric = () => {
  try { localStorage.removeItem(CRED_KEY) } catch {}
}

/**
 * Enroll the platform authenticator (Face ID / Touch ID).
 * Must be called from a user-activation event (button click).
 */
export async function enrollBiometric() {
  if (!supportsBiometric()) throw new Error('Biometric unsupported')

  const userId = randomBytes(16)
  const challenge = randomBytes(32)

  const cred = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: RP_NAME, id: window.location.hostname },
      user: {
        id: userId,
        name: 'iron-log',
        displayName: 'IRON LOG'
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },    // ES256
        { type: 'public-key', alg: -257 }   // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred'
      },
      timeout: 60_000,
      attestation: 'none'
    }
  })

  if (!cred) throw new Error('Cancelled')
  const credId = b64uEncode(cred.rawId)
  localStorage.setItem(CRED_KEY, credId)
  return credId
}

/**
 * Verify with the platform authenticator. Returns true on success.
 * Must be called from a user-activation event.
 */
export async function verifyBiometric() {
  if (!supportsBiometric()) throw new Error('Biometric unsupported')
  const credIdB64 = localStorage.getItem(CRED_KEY)
  if (!credIdB64) throw new Error('Not enrolled')

  const challenge = randomBytes(32)
  const credId = b64uDecode(credIdB64)

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [{
        id: credId,
        type: 'public-key',
        transports: ['internal']
      }],
      userVerification: 'required',
      timeout: 60_000
    }
  })

  return !!assertion
}
