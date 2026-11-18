import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, createUserWithEmailAndPassword, updateProfile as updateAuthProfile, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider } from '../services/firebase';
import { getUserDocument, createUserDocument, updateUserDocument } from '../services/authService';
import { mergeContactIntoProfile, saveUserContact } from '../services/userContactService';

const PRIVATE_CONTACT_KEYS = ['email', 'phoneNumber', 'whatsappNumber', 'sellerWhatsapp', 'sellerPhone'];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setCurrentUser(firebaseUser);
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!currentUser) return undefined;

    let profile = null;
    let contact = {};
    let active = true;

    // SECURITY: the public user document no longer holds phone/email/WhatsApp.
    // Both documents are subscribed so consumers keep reading `userProfile`
    // exactly as before, while the private values are only fetched for the
    // owner (Firestore rules enforce that).
    const publish = () => {
      if (!active) return;
      setUserProfile(profile ? mergeContactIntoProfile(profile, contact) : null);
    };

    const unsubProfile = onSnapshot(
      doc(db, 'users', currentUser.uid),
      (snapshot) => {
        profile = snapshot.exists() ? { uid: snapshot.id, ...snapshot.data() } : null;
        publish();
        setLoading(false);
      },
      (error) => {
        console.error('Firestore user profile error:', error);
        setLoading(false);
      }
    );

    const unsubContact = onSnapshot(
      doc(db, 'users', currentUser.uid, 'private', 'contact'),
      (snapshot) => {
        contact = snapshot.exists() ? snapshot.data() : {};
        publish();
      },
      (error) => {
        // A missing private doc is expected for accounts created before the
        // split; only log unexpected failures.
        if (error?.code !== 'permission-denied') {
          console.warn('Private contact subscription error:', error?.code);
        }
      }
    );

    return () => {
      active = false;
      unsubProfile();
      unsubContact();
    };
  }, [currentUser]);

  const login = async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const existing = await getUserDocument(user.uid);
    if (!existing) {
      await createUserDocument(user.uid, {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      });
      return { isNew: true };
    }
    return { isNew: false };
  };

  const register = async (email, password, displayName, username, phoneNumber) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateAuthProfile(cred.user, { displayName });
    await createUserDocument(cred.user.uid, { email, displayName, username, phoneNumber });
    return cred.user;
  };

  const logout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setUserProfile(null);
  };

  const updateUserProfile = async (data) => {
    if (!currentUser) return;

    // SECURITY: split the payload so contact details go to the private
    // subcollection and never onto the publicly readable user document.
    const contactFields = {};
    for (const key of PRIVATE_CONTACT_KEYS) {
      if (data[key] !== undefined) contactFields[key] = data[key];
    }

    if (Object.keys(contactFields).length > 0) {
      await saveUserContact(currentUser.uid, {
        email: contactFields.email,
        phoneNumber: contactFields.phoneNumber,
        whatsappNumber:
          contactFields.whatsappNumber !== undefined
            ? contactFields.whatsappNumber
            : contactFields.sellerWhatsapp,
      });
    }

    await updateUserDocument(currentUser.uid, data);
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    login,
    loginWithGoogle,
    register,
    logout,
    updateProfile: updateUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
