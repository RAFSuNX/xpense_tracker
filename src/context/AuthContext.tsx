import { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { UserData } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  userCurrency: string | null;
  userData: UserData | null;
  signUp: (email: string, password: string, currency: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userCurrency, setUserCurrency] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);

  // Subscribe to user document changes
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as UserData;
        setUserCurrency(data.currency);
        setUserData(data);
      }
    });

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (!user) {
        setUserCurrency(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signUp = async (email: string, password: string, currency: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const initialUserData: UserData = {
      email,
      currency,
      balance: 0,
      totalIncome: 0,
      totalExpense: 0,
      totalPayable: 0,
      totalReceivable: 0,
      createdAt: new Date().toISOString()
    };
    
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      ...initialUserData
    });
    setUserCurrency(currency);
    setUserData(initialUserData);
    
    // Send verification email
    await sendEmailVerification(userCredential.user);
    toast.success('Verification email sent. Please check your inbox.');
  };

  const signIn = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    if (userDoc.exists()) {
      const data = userDoc.data() as UserData;
      setUserCurrency(data.currency);
      setUserData(data);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUserCurrency(null);
    setUserData(null);
  };

  const resendVerificationEmail = async () => {
    if (!user) throw new Error('No user logged in');
    await sendEmailVerification(user);
    toast.success('Verification email sent. Please check your inbox.');
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
    toast.success('Password reset email sent. Please check your inbox.');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      userCurrency, 
      userData,
      signUp, 
      signIn, 
      logout,
      resendVerificationEmail,
      resetPassword
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}