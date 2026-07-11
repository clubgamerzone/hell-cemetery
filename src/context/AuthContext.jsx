import { createContext, useContext, useEffect, useState } from 'react';
import {
  FacebookAuthProvider,
  getMultiFactorResolver,
  OAuthProvider,
  onAuthStateChanged,
  multiFactor,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  TotpMultiFactorGenerator,
} from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';
import { isAdminUser } from '../utils/admin';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function register(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  async function loginWithFacebook() {
    const provider = new FacebookAuthProvider();
    provider.addScope('email');
    provider.addScope('public_profile');
    return signInWithPopup(auth, provider);
  }

  async function loginWithApple() {
    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    return signInWithPopup(auth, provider);
  }

  function getMfaResolver(error) {
    return getMultiFactorResolver(auth, error);
  }

  async function resolveTotpSignIn(resolver, factorUid, code) {
    const assertion = TotpMultiFactorGenerator.assertionForSignIn(factorUid, code);
    return resolver.resolveSignIn(assertion);
  }

  async function startTotpEnrollment(accountName = currentUser?.email || 'Hell Cemetery') {
    const session = await multiFactor(currentUser).getSession();
    const secret = await TotpMultiFactorGenerator.generateSecret(session);
    return {
      secret,
      qrCodeUrl: secret.generateQrCodeUrl(accountName, 'Hell Cemetery'),
    };
  }

  async function enrollTotp(secret, code, displayName = 'Authenticator app') {
    const assertion = TotpMultiFactorGenerator.assertionForEnrollment(secret, code);
    await multiFactor(currentUser).enroll(assertion, displayName);
    await currentUser.reload();
    setCurrentUser(auth.currentUser);
  }

  function getTotpFactors() {
    if (!currentUser) return [];
    return multiFactor(currentUser).enrolledFactors.filter((factor) => factor.factorId === 'totp');
  }

  async function unenrollTotp(factorUid) {
    await multiFactor(currentUser).unenroll(factorUid);
    await currentUser.reload();
    setCurrentUser(auth.currentUser);
  }

  async function logout() {
    return signOut(auth);
  }

  const value = {
    currentUser,
    isAdmin: isAdminUser(currentUser),
    loading,
    login,
    register,
    loginWithFacebook,
    loginWithApple,
    getMfaResolver,
    resolveTotpSignIn,
    startTotpEnrollment,
    enrollTotp,
    getTotpFactors,
    unenrollTotp,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
