import { expect, it } from 'vitest'
import { readDeployFirebaseConfig, readFirebaseConfig } from './firebaseConfig'

const env = {
  VITE_FIREBASE_API_KEY: 'demo-config', VITE_FIREBASE_AUTH_DOMAIN: 'demo-combat-training.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'demo-combat-training', VITE_FIREBASE_APP_ID: 'demo-app',
  VITE_FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
}
it('reads explicit demo emulator configuration', () => {
  expect(readFirebaseConfig(env)).toMatchObject({ projectId: 'demo-combat-training', emulatorHost: '127.0.0.1:9099' })
})
it.each(['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_APP_ID'])('rejects missing %s', (name) => {
  expect(() => readFirebaseConfig({ ...env, [name]: ' ' })).toThrow()
})
it.each(['https://example.test:9099', 'example.test:9099', '127.0.0.1:0', '127.0.0.1:65536'])('rejects invalid emulator host %s', (host) => {
  expect(() => readFirebaseConfig({ ...env, VITE_FIREBASE_AUTH_EMULATOR_HOST: host })).toThrow()
})
it('requires an emulator for demo projects and a demo project for the emulator', () => {
  expect(() => readFirebaseConfig({ ...env, VITE_FIREBASE_AUTH_EMULATOR_HOST: '' })).toThrow()
  expect(() => readFirebaseConfig({ ...env, VITE_FIREBASE_PROJECT_ID: 'other-project' })).toThrow()
})

const production = {
  VITE_FIREBASE_API_KEY: 'public-web-key', VITE_FIREBASE_AUTH_DOMAIN: 'combat-training-830fb.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'combat-training-830fb', VITE_FIREBASE_APP_ID: 'web-app-id',
}
it('accepts a deploy build for the expected real project', () => {
  expect(readDeployFirebaseConfig(production, 'combat-training-830fb')).toMatchObject({ projectId: 'combat-training-830fb' })
  expect(readDeployFirebaseConfig({ ...production, VITE_FIREBASE_AUTH_EMULATOR_HOST: '' }, 'combat-training-830fb').emulatorHost).toBeUndefined()
})
it('rejects deploy builds for the emulator, another project or a missing value', () => {
  expect(() => readDeployFirebaseConfig(env, 'demo-combat-training')).toThrow('emulator')
  expect(() => readDeployFirebaseConfig(production, 'other-project')).toThrow('expected other-project')
  expect(() => readDeployFirebaseConfig({ ...production, VITE_FIREBASE_APP_ID: '' }, 'combat-training-830fb')).toThrow()
})
