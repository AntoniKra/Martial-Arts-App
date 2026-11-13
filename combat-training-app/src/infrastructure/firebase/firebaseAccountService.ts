import * as z from 'zod/mini'
import { getAuth, EmailAuthProvider, GoogleAuthProvider, reauthenticateWithCredential, reauthenticateWithPopup, reauthenticateWithRedirect, getIdTokenResult, deleteUser } from 'firebase/auth'
import { collection, doc, getDocFromServer, getDocsFromServer, deleteDoc, writeBatch } from 'firebase/firestore'
import type { AccountService } from '@/application/account/accountService'
import { deletionBatches } from '@/application/account/deleteAccount'
import { chooseGoogleSignInMethod } from '@/application/auth/chooseGoogleSignInMethod'
import { readSignInEnvironment } from './firebaseAuthService'
import { getAccountDatabase, clearFirestoreCache } from './createFirestoreRepositories'
import { IMPLEMENTED_USER_COLLECTIONS } from './userCollections'
import { clearAccountLocalStorage, clearDeletionRedirect, markDeletionRedirect } from '@/infrastructure/storage/accountDeletionStorage'

const rawDocument = z.record(z.string(), z.unknown())
export function createFirebaseAccountService(uid: string): AccountService {
  const auth = getAuth()
  const currentUser = () => {
    const user = auth.currentUser
    if (!user || user.uid !== uid) throw new Error('Authentication account changed')
    return user
  }
  const requireOnline = () => { if (!navigator.onLine) throw new Error('Offline account operation') }
  const google = new GoogleAuthProvider()
  google.setCustomParameters({ prompt: 'select_account' })
  return {
    collections: IMPLEMENTED_USER_COLLECTIONS,
    providers: currentUser().providerData.map((provider) => provider.providerId),
    async readData() {
      requireOnline()
      currentUser()
      const db = getAccountDatabase()
      const [profile, ...snapshots] = await Promise.all([
        getDocFromServer(doc(db, 'users', uid)),
        ...IMPLEMENTED_USER_COLLECTIONS.map((name) => getDocsFromServer(collection(db, 'users', uid, name))),
      ])
      if ([profile, ...snapshots].some((snapshot) => snapshot.metadata.hasPendingWrites)) throw new Error('Pending writes')
      return {
        profile: profile.exists() ? rawDocument.parse(profile.data()) : null,
        collections: Object.fromEntries(snapshots.map((snapshot, index) => [
          IMPLEMENTED_USER_COLLECTIONS[index], snapshot.docs.map((item) => ({ id: item.id, data: rawDocument.parse(item.data()) })),
        ])),
      }
    },
    async reauthenticatePassword(password) {
      const user = currentUser()
      if (!user.email) throw new Error('Missing email')
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password))
    },
    async reauthenticateGoogle() {
      const method = chooseGoogleSignInMethod(readSignInEnvironment())
      if (method === 'redirect') {
        markDeletionRedirect(uid)
        try { await reauthenticateWithRedirect(currentUser(), google) } catch (cause) { clearDeletionRedirect(); throw cause }
      } else await reauthenticateWithPopup(currentUser(), google)
      return method
    },
    async refreshedAuthTime() {
      requireOnline()
      return Date.parse((await getIdTokenResult(currentUser(), true)).authTime)
    },
    async deleteCollection(name) {
      requireOnline()
      currentUser()
      if (!IMPLEMENTED_USER_COLLECTIONS.some((value) => value === name)) throw new Error('Unknown account collection')
      const db = getAccountDatabase()
      const snapshot = await getDocsFromServer(collection(db, 'users', uid, name))
      if (snapshot.metadata.hasPendingWrites) throw new Error('Pending writes')
      for (const documents of deletionBatches(snapshot.docs)) {
        requireOnline()
        currentUser()
        const batch = writeBatch(db)
        for (const document of documents) batch.delete(document.ref)
        await batch.commit()
      }
    },
    async deleteProfile() {
      requireOnline()
      currentUser()
      await deleteDoc(doc(getAccountDatabase(), 'users', uid))
    },
    async deleteAuthUser() { await deleteUser(currentUser()) },
    async cleanupDevice() {
      // Always clear per-account keys, even when another tab prevents IndexedDB cleanup.
      try { await clearFirestoreCache() } finally {
        clearAccountLocalStorage(uid)
        clearDeletionRedirect()
      }
    },
  }
}
