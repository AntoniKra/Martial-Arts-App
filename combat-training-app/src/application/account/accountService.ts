export interface RawAccountDocument { id: string; data: Record<string, unknown> }
export interface AccountData {
  profile: Record<string, unknown> | null
  collections: Record<string, RawAccountDocument[]>
}
export interface AccountService {
  collections: readonly string[]
  providers: readonly string[]
  readData(): Promise<AccountData>
  reauthenticatePassword(password: string): Promise<void>
  reauthenticateGoogle(): Promise<'redirect' | 'popup'>
  /** Age of the last sign-in confirmation, from the server times in one fresh ID token (immune to device clock skew). */
  confirmationAgeMs(): Promise<number>
  deleteCollection(name: string): Promise<void>
  deleteProfile(): Promise<void>
  deleteAuthUser(): Promise<void>
  cleanupDevice(): Promise<void>
}
export interface DeletionNotice { set(): void; clear(): void; cleanupFailed(): void }
