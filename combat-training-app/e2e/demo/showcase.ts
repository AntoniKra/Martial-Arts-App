import * as z from 'zod/mini'
import { profileDocumentSchema } from '@/infrastructure/firebase/profileDocumentSchemas'
import type { IMPLEMENTED_USER_COLLECTIONS } from '@/infrastructure/firebase/userCollections'
import { createDemoData, type DemoPersona } from './data'
import { assertDemoTarget, demoAuthOrigin, demoFirestoreOrigin, demoProjectId, encodeFields } from './emulator'
import { demoDocuments } from './seed'

const collections = ['workoutPlans', 'workoutSessions', 'focusSkills', 'bodyWeights', 'readiness',
  'exercises', 'weekPlans', 'recurringWeeks'] as const satisfies readonly (typeof IMPLEMENTED_USER_COLLECTIONS)[number][]
type ShowcaseCollection = typeof collections[number]

const authResult = z.object({ idToken: z.string().check(z.minLength(1)), localId: z.string().check(z.regex(/^[\w-]{1,128}$/)) })
const authClaims = z.object({ aud: z.string(), sub: z.string(), email_verified: z.optional(z.boolean()) })
const authError = z.object({ error: z.object({ message: z.string() }) })
const firestorePage = z.object({ documents: z.optional(z.array(z.object({ name: z.string() }))), nextPageToken: z.optional(z.string()) })
const firestoreProfile = z.object({ updateTime: z.iso.datetime(), fields: z.record(z.string(), z.unknown()) })
const profileFields = z.record(z.string(), z.unknown())

type Target = { mode: 'production'; projectId: string; apiKey: string } | { mode: 'emulator' }
type Job = { target: Target; persona: DemoPersona; email: string; password: string; replace: boolean }

// Firestore may require a separate round trip for a consent write before health records.
type Write = { delete: string } | {
  update: { name: string; fields: Record<string, object> }
  currentDocument: { exists: false } | { updateTime: string }
}

function decodeProfileValue(value: unknown): unknown {
  if (value && typeof value === 'object') {
    if ('nullValue' in value) return null
    if ('stringValue' in value) return value.stringValue
    if ('booleanValue' in value) return value.booleanValue
    if ('integerValue' in value && typeof value.integerValue === 'string') return Number(value.integerValue)
    if ('mapValue' in value) {
      const parsed = parseResponse(z.object({ fields: profileFields }), value.mapValue, 'Nieprawidłowe pola profilu konta.')
      return decodeProfileFields(parsed.fields)
    }
  }
  throw new Error('Nie udało się odczytać pól profilu konta.')
}

function decodeProfileFields(fields: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeProfileValue(value)]))
}

function parseResponse<T>(schema: z.ZodMiniType<T>, value: unknown, message: string) {
  const parsed = schema.safeParse(value)
  if (!parsed.success) throw new Error(message)
  return parsed.data
}

export async function seedShowcase(job: Job, now = new Date(), fetchRequest = fetch) {
  const emulator = job.target.mode === 'emulator'
  const projectId = job.target.mode === 'emulator' ? demoProjectId : job.target.projectId
  const apiKey = job.target.mode === 'emulator' ? 'demo-config' : job.target.apiKey
  const authOrigin = emulator ? demoAuthOrigin : 'https://identitytoolkit.googleapis.com'
  const firestoreOrigin = emulator ? demoFirestoreOrigin : 'https://firestore.googleapis.com'
  if (emulator) {
    assertDemoTarget(projectId, authOrigin)
    assertDemoTarget(projectId, firestoreOrigin)
  } else if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId) || projectId.startsWith('demo-') || !apiKey) {
    throw new Error('Nieprawidłowy projekt Firebase lub brak konfiguracji logowania w .env.')
  }

  async function request(url: string, init: RequestInit, action: string) {
    try {
      return await fetchRequest(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(30_000) })
    } catch {
      throw new Error(`Błąd połączenia podczas operacji „${action}”.`)
    }
  }

  const authPath = emulator ? '/identitytoolkit.googleapis.com/v1' : '/v1'
  const signedIn = await request(`${authOrigin}${authPath}/accounts:signInWithPassword?${new URLSearchParams({ key: apiKey })}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: job.email, password: job.password, returnSecureToken: true }),
  }, 'logowanie')
  const signedInBody: unknown = await signedIn.json().catch(() => null)
  if (!signedIn.ok) {
    const parsed = authError.safeParse(signedInBody)
    const code = parsed.success ? parsed.data.error.message : ''
    if (['INVALID_PASSWORD', 'EMAIL_NOT_FOUND', 'INVALID_LOGIN_CREDENTIALS', 'INVALID_EMAIL'].includes(code)) {
      throw new Error('Błędny e-mail lub hasło konta pokazowego.')
    }
    if (code === 'USER_DISABLED') throw new Error('Konto pokazowe jest wyłączone.')
    throw new Error(`Firebase Auth odmówił logowania (HTTP ${signedIn.status}). Sprawdź projekt i konfigurację logowania e-mailem.`)
  }
  const login = parseResponse(authResult, signedInBody, 'Nieprawidłowa odpowiedź Firebase Auth.')
  // This token comes directly from sign-in. Firestore independently verifies its signature and claims.
  let rawClaims: unknown
  try {
    rawClaims = JSON.parse(Buffer.from(login.idToken.split('.')[1] ?? '', 'base64url').toString('utf8'))
  } catch {
    throw new Error('Nieprawidłowy token z Firebase Auth.')
  }
  const claims = parseResponse(authClaims, rawClaims, 'Nieprawidłowy token z Firebase Auth.')
  if (claims.aud !== projectId || claims.sub !== login.localId) throw new Error('Zalogowane konto nie należy do wskazanego projektu Firebase.')
  if (claims.email_verified !== true) throw new Error('E-mail konta pokazowego nie jest potwierdzony. Potwierdź adres w aplikacji.')

  const database = `projects/${projectId}/databases/(default)`
  const userPath = `${database}/documents/users/${login.localId}`
  const firestoreUrl = `${firestoreOrigin}/v1`
  const headers = { Authorization: `Bearer ${login.idToken}`, 'Content-Type': 'application/json' }

  async function firestore(path: string, action: string, init: RequestInit = {}, allowMissing = false) {
    const response = await request(`${firestoreUrl}/${path}`, { ...init, headers }, action)
    if (allowMissing && response.status === 404) {
      await response.body?.cancel()
      return null
    }
    if (response.status === 403) throw new Error(`Reguły Firestore odmówiły dostępu podczas operacji „${action}”.`)
    if (response.status === 409 || response.status === 412) {
      throw new Error(`Konflikt danych podczas operacji „${action}”. Sprawdź stan konta przed ponowieniem.`)
    }
    if (!response.ok) throw new Error(`Błąd Firestore podczas operacji „${action}” (HTTP ${response.status}).`)
    return response.json() as Promise<unknown>
  }

  async function* listCollection(collection: ShowcaseCollection, pageSize: number) {
    const prefix = `${userPath}/${collection}/`
    const query = new URLSearchParams({ pageSize: String(pageSize), 'mask.fieldPaths': 'schemaVersion' })
    let previousToken: string | undefined
    do {
      const value = await firestore(`${userPath}/${collection}?${query}`, `odczyt ${collection}`)
      const page = parseResponse(firestorePage, value, `Nieprawidłowa odpowiedź Firestore dla ${collection}.`)
      for (const { name } of page.documents ?? []) {
        const id = name.slice(prefix.length)
        if (!name.startsWith(prefix) || !id || id.includes('/')) throw new Error('Firestore zwrócił dokument spoza kolekcji konta.')
        yield name
      }
      if (!page.nextPageToken) return
      if (page.nextPageToken === previousToken) throw new Error('Nie udało się przejść na kolejną stronę wyników Firestore.')
      previousToken = page.nextPageToken
      query.set('pageToken', previousToken)
    } while (true)
  }

  const data = createDemoData(now, job.persona)
  if (!job.replace) {
    for await (const _session of listCollection('workoutSessions', 1)) {
      throw new Error('Konto ma już treningi. Użyj --replace, aby zastąpić dane pokazowe.')
    }
  }
  const rawProfile = await firestore(userPath, 'odczyt profilu', {}, true)
  const stored = rawProfile === null ? null : parseResponse(firestoreProfile, rawProfile, 'Nieprawidłowa odpowiedź Firestore dla profilu.')
  if (stored) {
    const profile = parseResponse(profileDocumentSchema, decodeProfileFields(stored.fields), 'Profil konta ma nieprawidłowe pola.')
    if (profile.wellbeingWithdrawal?.pending && data.demoWellbeing.length) {
      throw new Error('Na koncie trwa wycofywanie zgody na samopoczucie. Dokończ je w aplikacji przed ponowieniem.')
    }
    data.demoProfile = {
      ...data.demoProfile, ...profile,
      wellbeingConsent: profile.wellbeingConsent ?? data.demoProfile.wellbeingConsent,
      healthDataConsent: profile.healthDataConsent ?? data.demoProfile.healthDataConsent,
      weightClassLabel: profile.weightClassLabel ?? data.demoProfile.weightClassLabel,
      updatedAt: profile.updatedAt > data.demoProfile.updatedAt ? profile.updatedAt : data.demoProfile.updatedAt,
    }
  }
  const [profileDocument, ...entries] = demoDocuments(data)
  const expectedCollections = new Set<string>(collections)
  function toWrite({ path, data }: typeof profileDocument): Write {
    if (path && !expectedCollections.has(path.split('/')[0])) throw new Error('Generator zwrócił dokument spoza kolekcji pokazowych.')
    return {
      update: { name: path ? `${userPath}/${path}` : userPath, fields: encodeFields(data) },
      currentDocument: !path && stored ? { updateTime: stored.updateTime } : { exists: false },
    }
  }
  const profileWrite = toWrite(profileDocument)
  const isHealth = ({ path }: typeof profileDocument) => path.startsWith('bodyWeights/') || path.startsWith('readiness/')
  const health = entries.filter(isHealth).map(toWrite)
  const remaining = entries.filter((entry) => !isHealth(entry)).map(toWrite)

  async function commit(writes: Write[], action: string, batchSize: number) {
    for (let offset = 0; offset < writes.length; offset += batchSize) {
      await firestore(`${database}/documents:commit`, action, {
        method: 'POST', body: JSON.stringify({ writes: writes.slice(offset, offset + batchSize) }),
      })
    }
  }

  if (job.replace) {
    const deletions: Write[] = []
    for (const collection of collections) {
      for await (const name of listCollection(collection, 100)) deletions.push({ delete: name })
    }
    await commit(deletions, 'usuwanie poprzednich danych pokazowych', 400)
  }

  await commit([profileWrite], 'zapis profilu', 1)
  await commit(health, 'zapis samopoczucia i pomiarów masy ciała', 10)
  await commit(remaining, 'zapis treningów, planów i biblioteki', 100)
  return { sessions: data.demoSessions.length, documents: entries.length + 1 }
}
