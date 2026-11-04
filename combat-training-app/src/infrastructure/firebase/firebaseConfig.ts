export interface FirebaseConfig {
  apiKey: string
  authDomain: string
  projectId: string
  appId: string
  emulatorHost?: string
}

export function readFirebaseConfig(env: Record<string, unknown>): FirebaseConfig {
  const required = (name: string): string => {
    const value = env[name]
    if (typeof value !== 'string' || !value.trim()) throw new Error('Missing Firebase configuration')
    return value.trim()
  }
  const config: FirebaseConfig = {
    apiKey: required('VITE_FIREBASE_API_KEY'),
    authDomain: required('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: required('VITE_FIREBASE_PROJECT_ID'),
    appId: required('VITE_FIREBASE_APP_ID'),
  }
  const host = env.VITE_FIREBASE_AUTH_EMULATOR_HOST
  if (host !== undefined && host !== '') {
    if (typeof host !== 'string' || !/^(localhost|127\.0\.0\.1):\d{1,5}$/.test(host)) throw new Error('Invalid emulator host')
    const port = Number(host.split(':')[1])
    if (port < 1 || port > 65535 || !config.projectId.startsWith('demo-')) throw new Error('Invalid emulator configuration')
    config.emulatorHost = host
  }
  if (config.projectId.startsWith('demo-') && !config.emulatorHost) throw new Error('Demo project requires an emulator')
  return config
}
