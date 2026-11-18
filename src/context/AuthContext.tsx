import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, UserApprovalStatus } from '../types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  isApproved: boolean;
  isPending: boolean;
  isRejected: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  isAdmin: false,
  isApproved: false,
  isPending: false,
  isRejected: false,
  loading: true,
  signInWithGoogle: async () => {},
  signOutUser: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const initUserProfile = async (currentUser: User) => {
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const snap = await getDoc(userRef);

      const emailLower = (currentUser.email || '').toLowerCase().trim();
      const isDefaultAdmin = emailLower === 'afyan.ikhlas@gmail.com';

      // Check if user's email was pre-approved by admin
      let isPreApproved = false;
      let preRole: 'user' | 'admin' = 'user';
      try {
        const preQuery = query(collection(db, 'preApprovedUsers'), where('email', '==', emailLower));
        const preSnap = await getDocs(preQuery);
        if (!preSnap.empty) {
          isPreApproved = true;
          const preData = preSnap.docs[0].data();
          if (preData.role === 'admin') preRole = 'admin';
        }
      } catch (err) {
        console.warn('Pre-approval check notice:', err);
      }

      if (!snap.exists()) {
        const newProfile: UserProfile = {
          userId: currentUser.uid,
          email: currentUser.email || '',
          displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Pengguna',
          photoURL: currentUser.photoURL || '',
          role: isDefaultAdmin || preRole === 'admin' ? 'admin' : 'user',
          status: isDefaultAdmin || isPreApproved ? 'approved' : 'pending',
          approvedAt: (isDefaultAdmin || isPreApproved) ? new Date().toISOString() : undefined,
          approvedBy: isDefaultAdmin ? 'system' : isPreApproved ? 'admin-preapproval' : undefined,
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
          habitsCount: 0,
        };
        await setDoc(userRef, newProfile);
        setUserProfile(newProfile);

        if (isDefaultAdmin) {
          try {
            await setDoc(doc(db, 'admins', currentUser.uid), {
              userId: currentUser.uid,
              email: currentUser.email || '',
              createdAt: new Date().toISOString(),
            });
          } catch (e) {
            console.warn('Admin doc creation notice:', e);
          }
        }
      } else {
        const existingData = snap.data() as UserProfile;
        const assignedRole: 'user' | 'admin' = isDefaultAdmin ? 'admin' : (existingData.role || 'user');
        
        let finalStatus: UserApprovalStatus = existingData.status || (isDefaultAdmin ? 'approved' : 'pending');
        if (isDefaultAdmin || (isPreApproved && finalStatus === 'pending')) {
          finalStatus = 'approved';
        }

        try {
          await updateDoc(userRef, {
            lastActiveAt: new Date().toISOString(),
            role: assignedRole,
            status: finalStatus,
            ...(currentUser.photoURL ? { photoURL: currentUser.photoURL } : {}),
            ...(currentUser.displayName ? { displayName: currentUser.displayName } : {}),
          });
        } catch {
          // ignore background update error
        }

        setUserProfile({
          ...existingData,
          role: assignedRole,
          status: finalStatus,
        });

        if (isDefaultAdmin) {
          try {
            await setDoc(doc(db, 'admins', currentUser.uid), {
              userId: currentUser.uid,
              email: currentUser.email || '',
              createdAt: new Date().toISOString(),
            }, { merge: true });
          } catch {
            // ignore
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
    }
  };

  useEffect(() => {
    let unsubscribeProfile: () => void = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await initUserProfile(currentUser);

        // Real-time listener for current user's profile to immediately react to Admin approval/role changes
        const userRef = doc(db, 'users', currentUser.uid);
        unsubscribeProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            const isDefaultAdmin = (currentUser.email || '').toLowerCase() === 'afyan.ikhlas@gmail.com';
            setUserProfile({
              ...data,
              role: isDefaultAdmin ? 'admin' : (data.role || 'user'),
              status: isDefaultAdmin ? 'approved' : (data.status || 'pending'),
            });
          }
        }, (error) => {
          console.warn('Profile listener error:', error);
        });
      } else {
        setUserProfile(null);
        unsubscribeProfile();
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeProfile();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      setLoading(false);
      throw error;
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error('Sign Out Error:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await initUserProfile(user);
    }
  };

  const emailLower = (user?.email || '').toLowerCase();
  const isDefaultAdmin = emailLower === 'afyan.ikhlas@gmail.com';
  const isAdmin = isDefaultAdmin || userProfile?.role === 'admin';
  const isApproved = isAdmin || userProfile?.status === 'approved';
  const isPending = !isAdmin && userProfile?.status === 'pending';
  const isRejected = !isAdmin && userProfile?.status === 'rejected';

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        isAdmin,
        isApproved,
        isPending,
        isRejected,
        loading,
        signInWithGoogle,
        signOutUser,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
