/**
 * Resolves the required-profile gate after App Check and a server-confirmed
 * Firestore read. Only an authentication event explicitly marked as account
 * creation may request the one-time profile-completion screen.
 */
async function resolveAuthenticatedProfileGate({
  isNewAccount,
  getAppCheckToken,
  readServerProfile,
  hasRequiredProfileData,
}) {
  if (typeof getAppCheckToken !== 'function' || typeof readServerProfile !== 'function' ||
      typeof hasRequiredProfileData !== 'function') {
    throw new TypeError('AuthenticatedProfileGate requires token and profile readers');
  }

  await getAppCheckToken();
  const profile = await readServerProfile();
  if (hasRequiredProfileData(profile)) {
    return Object.freeze({status: 'complete', profile});
  }
  if (isNewAccount === true) {
    return Object.freeze({status: 'requires-completion', profile});
  }
  return Object.freeze({status: 'incomplete-existing', profile: null});
}

export { resolveAuthenticatedProfileGate };
