const test = require('node:test');
const assert = require('node:assert/strict');

const implementations = [
  ['UMD', () => Promise.resolve(require('../../firebase-auth-sdk.js'))],
  ['ESM factory', async () => import('../../firebase-auth-sdk.js').then(() => globalThis.FirebaseAuthSdk)],
];

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    snapshot() { return Object.fromEntries(values); },
  };
}

function user(uid, extra = {}) {
  return {
    uid,
    emailVerified: true,
    async getIdToken(forceRefresh) { return `${uid}:${forceRefresh ? 'fresh' : 'cached'}`; },
    ...extra,
  };
}

function fixture(createFirebaseAuthSdk, {currentUser = null, local = {}, userLifecycle = null} = {}) {
  const calls = [];
  const auth = {
    currentUser,
    async authStateReady() { calls.push(['authStateReady']); },
  };
  const sdk = {
    browserLocalPersistence: {name: 'browserLocalPersistence'},
    async setPersistence(receivedAuth, persistence) {
      calls.push(['setPersistence', receivedAuth, persistence]);
    },
    async signInWithEmailAndPassword(receivedAuth, email, password) {
      calls.push(['signIn', email, password]);
      receivedAuth.currentUser = user('signed-in', {email});
      return {user: receivedAuth.currentUser};
    },
    async createUserWithEmailAndPassword(receivedAuth, email, password) {
      calls.push(['signUp', email, password]);
      receivedAuth.currentUser = user('signed-up', {email});
      return {user: receivedAuth.currentUser};
    },
    async updateProfile(receivedUser, values) { calls.push(['updateProfile', receivedUser.uid, values]); },
    async sendEmailVerification(receivedUser) { calls.push(['verify', receivedUser.uid]); },
    async sendPasswordResetEmail(receivedAuth, email) { calls.push(['resetPassword', email]); },
    async reload(receivedUser) { calls.push(['reload', receivedUser.uid]); },
    emailCredential(email, password) { calls.push(['credential', email, password]); return {email}; },
    async reauthenticateWithCredential(receivedUser, credential) {
      calls.push(['reauthenticate', receivedUser.uid, credential.email]);
    },
    async updatePassword(receivedUser, password) { calls.push(['updatePassword', receivedUser.uid, password]); },
    async signOut(receivedAuth) { calls.push(['signOut']); receivedAuth.currentUser = null; },
  };
  let cacheResets = 0;
  const localStorage = memoryStorage(local);
  const client = createFirebaseAuthSdk({
    auth,
    sdk,
    localStorage,
    resetStorageCaches() { cacheResets++; },
    userLifecycle,
  });
  return {auth, calls, client, localStorage, cacheResets: () => cacheResets};
}

for (const [format, load] of implementations) {
  test(`${format}: initializes SDK persistence once and discards legacy REST credentials`, async () => {
    const {createFirebaseAuthSdk} = await load();
    const f = fixture(createFirebaseAuthSdk, {
      local: {fb_refresh: 'legacy-refresh', fb_uid: 'legacy-uid', fb_email: 'kept@example.test'},
    });
    await Promise.all([f.client.initialize(), f.client.initialize()]);
    assert.deepEqual(f.calls.map(call => call[0]), ['setPersistence', 'authStateReady']);
    assert.deepEqual(f.localStorage.snapshot(), {fb_email: 'kept@example.test'});
    assert.equal(f.client.fbIsLoggedIn(), false);
  });

  test(`${format}: provides sign-in and token operations from modular Auth`, async () => {
    const {createFirebaseAuthSdk} = await load();
    const f = fixture(createFirebaseAuthSdk);
    const credential = await f.client.fbSignIn(' person@example.test ', 'secret');
    assert.equal(credential.user.uid, 'signed-in');
    assert.equal(f.client.getUid(), 'signed-in');
    assert.equal(f.client.fbIsLoggedIn(), true);
    assert.equal(await f.client.fbToken(), 'signed-in:cached');
    assert.equal(await f.client.fbRefreshToken(), 'signed-in:fresh');
    assert.equal(f.localStorage.getItem('fb_email'), 'person@example.test');
    assert.equal(f.cacheResets(), 1);
  });

  test(`${format}: supports account creation and current profile operations`, async () => {
    const {createFirebaseAuthSdk} = await load();
    const f = fixture(createFirebaseAuthSdk);
    await f.client.fbSignUp(' new@example.test ', 'secret');
    await f.client.fbUpdateProfile('New Person');
    await f.client.fbSendVerificationEmail();
    assert.equal(await f.client.fbCheckEmailVerified(), true);
    await f.client.fbSendPasswordResetEmail(' reset@example.test ');
    await f.client.fbReauthenticate('current-password');
    await f.client.fbUpdatePassword('new-password');
    assert.deepEqual(f.calls.filter(call =>
      ['signUp', 'updateProfile', 'verify', 'reload', 'resetPassword', 'credential', 'reauthenticate', 'updatePassword'].includes(call[0])), [
      ['signUp', 'new@example.test', 'secret'],
      ['updateProfile', 'signed-up', {displayName: 'New Person'}],
      ['verify', 'signed-up'],
      ['reload', 'signed-up'],
      ['resetPassword', 'reset@example.test'],
      ['credential', 'new@example.test', 'current-password'],
      ['reauthenticate', 'signed-up', 'new@example.test'],
      ['updatePassword', 'signed-up', 'new-password'],
    ]);
  });

  test(`${format}: keeps established UI error identifiers during SDK migration`, async () => {
    const {createFirebaseAuthSdk} = await load();
    const f = fixture(createFirebaseAuthSdk);
    f.auth.currentUser = null;
    const original = f.client;
    // The injected SDK fixture is intentionally reached through sign-in; replace
    // its operation by constructing the minimal failing dependency set.
    const sdkError = Object.assign(new Error('Firebase detail'), {code: 'auth/invalid-credential'});
    const failing = createFirebaseAuthSdk({
      auth: f.auth,
      sdk: {
        browserLocalPersistence: {},
        setPersistence: async () => {},
        signInWithEmailAndPassword: async () => { throw sdkError; },
        createUserWithEmailAndPassword: async () => {},
        updateProfile: async () => {},
        sendEmailVerification: async () => {},
        sendPasswordResetEmail: async () => {},
        reload: async () => {},
        signOut: async () => {},
        emailCredential: () => ({}),
        reauthenticateWithCredential: async () => {},
        updatePassword: async () => {},
      },
      localStorage: f.localStorage,
      resetStorageCaches() {},
    });
    assert.ok(original);
    await assert.rejects(failing.fbSignIn('person@example.test', 'wrong'), /INVALID_LOGIN_CREDENTIALS/);
  });

  test(`${format}: signs out through SDK and clears account session markers`, async () => {
    const {createFirebaseAuthSdk} = await load();
    const f = fixture(createFirebaseAuthSdk, {
      currentUser: user('existing'),
      local: {fb_refresh: 'legacy', fb_uid: 'existing', fb_email: 'person@example.test'},
    });
    await f.client.fbSignOut();
    assert.deepEqual(f.localStorage.snapshot(), {});
    assert.equal(f.client.fbIsLoggedIn(), false);
    assert.equal(f.cacheResets(), 1);
    await assert.rejects(f.client.fbToken(), /Sem sessão/);
  });

  test(`${format}: coordinates persistent data lifecycle on login, deletion, and logout`, async () => {
    const {createFirebaseAuthSdk} = await load();
    const lifecycleCalls = [];
    let f;
    const userLifecycle = {
      async synchronizeUser(uid) { lifecycleCalls.push(['synchronize', uid]); },
      async clearForSignOut(uid) {
        lifecycleCalls.push(['clear', uid]);
        f.calls.push(['persistentCleanup']);
      },
      async flushBeforeAccountDeletion() { lifecycleCalls.push(['flush']); },
      async sealAccountDeletion(uid) { lifecycleCalls.push(['seal', uid]); },
    };
    f = fixture(createFirebaseAuthSdk, {userLifecycle});
    await f.client.fbSignIn('person@example.test', 'secret');
    await f.client.flushBeforeAccountDeletion();
    await f.client.sealAccountDeletion();
    await f.client.fbSignOut();

    assert.deepEqual(lifecycleCalls, [
      ['synchronize', null],
      ['synchronize', 'signed-in'],
      ['flush'],
      ['seal', 'signed-in'],
      ['clear', 'signed-in'],
    ]);
    assert.equal(f.cacheResets(), 0);
    assert.equal(
      f.calls.findIndex(call => call[0] === 'persistentCleanup') <
        f.calls.findIndex(call => call[0] === 'signOut'),
      true,
    );
  });

  test(`${format}: refuses to sign out if persistent cleanup cannot complete`, async () => {
    const {createFirebaseAuthSdk} = await load();
    const cleanupError = new Error('firestore-cache-cleanup-failed');
    const f = fixture(createFirebaseAuthSdk, {
      currentUser: user('existing'),
      userLifecycle: {
        async synchronizeUser() {},
        async clearForSignOut() { throw cleanupError; },
        async flushBeforeAccountDeletion() {},
        async sealAccountDeletion() {},
      },
    });
    await assert.rejects(f.client.fbSignOut(), error => error === cleanupError);
    assert.equal(f.calls.some(call => call[0] === 'signOut'), false);
    assert.equal(f.client.fbIsLoggedIn(), true);
  });
}
