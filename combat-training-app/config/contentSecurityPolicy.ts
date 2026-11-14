import firebaseConfig from '../firebase.json' with { type: 'json' }

const policy = firebaseConfig.hosting.headers
  .flatMap(({ headers }) => headers)
  .find(({ key }) => key === 'Content-Security-Policy')?.value

if (!policy) throw new Error('Missing hosting Content-Security-Policy')

export const productionContentSecurityPolicy = policy

// Only preview can reach the demo Auth/Firestore emulators. The production policy stays unchanged.
export const previewContentSecurityPolicy = policy
  .replace("connect-src 'self'", "connect-src 'self' http://127.0.0.1:8080 http://127.0.0.1:9099")
  .replace("frame-src 'self'", "frame-src 'self' http://127.0.0.1:9099")
