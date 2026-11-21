import { describe, expect, it, vi } from 'vitest'
import { demoAuthOrigin, demoFirestoreOrigin, demoProjectId } from './emulator'
import { seedShowcase } from './showcase'

const uid = 'showcaseUser'
const database = `projects/${demoProjectId}/databases/(default)`
const userPath = `${database}/documents/users/${uid}`
const job = {
  target: { mode: 'emulator' as const }, persona: 'kuba' as const, email: 'showcase@example.test',
  password: 'fixture-only', replace: false,
}
const now = new Date('2026-11-21T12:00:00.000Z')

function signedIn(overrides: { aud?: string; email_verified?: boolean } = {}) {
  const payload = Buffer.from(JSON.stringify({ aud: demoProjectId, sub: uid, email_verified: true, ...overrides })).toString('base64url')
  return Response.json({ idToken: `header.${payload}.signature`, localId: uid })
}

describe('showcase transport with no network', () => {
  it.each([
    ['unverified email', { email_verified: false }, /E-mail .*potwierdzony/],
    ['unexpected project', { aud: 'different-project' }, /nie należy do wskazanego projektu/],
  ] as const)('stops after sign-in for %s', async (_case, claims, message) => {
    const fetchRequest = vi.fn<typeof fetch>().mockResolvedValueOnce(signedIn(claims))
    await expect(seedShowcase(job, now, fetchRequest)).rejects.toThrow(message)
    expect(fetchRequest).toHaveBeenCalledExactlyOnceWith(
      `${demoAuthOrigin}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-config`,
      expect.objectContaining({ method: 'POST', redirect: 'error' }),
    )
  })

  it('reports invalid login credentials without making any Firestore requests', async () => {
    const fetchRequest = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json(
      { error: { message: 'INVALID_LOGIN_CREDENTIALS' } }, { status: 400 },
    ))
    await expect(seedShowcase(job, now, fetchRequest)).rejects.toThrow(/e-mail lub hasło/)
    expect(fetchRequest).toHaveBeenCalledTimes(1)
  })

  it('stops before any writes when the user already has a workout', async () => {
    const fetchRequest = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(signedIn())
      .mockResolvedValueOnce(Response.json({ documents: [{ name: `${userPath}/workoutSessions/existing` }] }))
    await expect(seedShowcase(job, now, fetchRequest)).rejects.toThrow(/Konto ma już treningi/)
    expect(fetchRequest).toHaveBeenCalledTimes(2)
  })

  it('verifies all deletion paths before mutating a replacement account', async () => {
    const fetchRequest = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(signedIn())
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(Response.json({ documents: [{ name: `${userPath}/workoutPlans/previous` }], nextPageToken: 'next' }))
      .mockResolvedValueOnce(Response.json({ documents: [{ name: `${database}/documents/users/anotherUser/workoutPlans/other` }] }))
    await expect(seedShowcase({ ...job, replace: true }, now, fetchRequest)).rejects.toThrow(/spoza kolekcji konta/)
    expect(fetchRequest).toHaveBeenCalledTimes(4)
    expect(fetchRequest).toHaveBeenLastCalledWith(
      `${demoFirestoreOrigin}/v1/${userPath}/workoutPlans?pageSize=100&mask.fieldPaths=schemaVersion&pageToken=next`,
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: expect.stringMatching(/^Bearer /) }) }),
    )
  })

  it('reports a rule denial and stops before writing health records', async () => {
    const fetchRequest = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(signedIn())
      .mockResolvedValueOnce(Response.json({}))
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(null, { status: 403 }))
    await expect(seedShowcase(job, now, fetchRequest)).rejects.toThrow(/Reguły Firestore odmówiły .*zapis profilu/)
    expect(fetchRequest).toHaveBeenCalledTimes(4)
    expect(fetchRequest).toHaveBeenLastCalledWith(
      `${demoFirestoreOrigin}/v1/${database}/documents:commit`,
      expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ Authorization: expect.stringMatching(/^Bearer /) }) }),
    )
  })
})
