import { createContext, useContext, useEffect, useState } from 'react';
import {
    onAuthStateChanged,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    GoogleAuthProvider
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [googleToken, setGoogleToken] = useState(localStorage.getItem('google_access_token'));

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
            // Clear token if user signs out
            if (!user) {
                setGoogleToken(null);
                localStorage.removeItem('google_access_token');
            }
        });

        return () => unsubscribe();
    }, []);

    // Google Sign In
    const signInWithGoogle = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential?.accessToken;
            if (token) {
                setGoogleToken(token);
                localStorage.setItem('google_access_token', token);
            }
            return { user: result.user, token, error: null };
        } catch (error) {
            return { user: null, token: null, error: error.message };
        }
    };

    // Re-authenticate to get fresh token
    const refreshGoogleToken = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential?.accessToken;
            if (token) {
                setGoogleToken(token);
                localStorage.setItem('google_access_token', token);
            }
            return token;
        } catch (error) {
            console.error('Failed to refresh Google token:', error);
            return null;
        }
    };

    // Clear google token (for expired/invalid tokens)
    const clearGoogleToken = () => {
        setGoogleToken(null);
        localStorage.removeItem('google_access_token');
    };

    // Email/Password Sign In
    const signInWithEmail = async (email, password) => {
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            return { user: result.user, error: null };
        } catch (error) {
            return { user: null, error: error.message };
        }
    };

    // Email/Password Sign Up
    const signUpWithEmail = async (email, password) => {
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            return { user: result.user, error: null };
        } catch (error) {
            return { user: null, error: error.message };
        }
    };

    // Sign Out
    const logout = async () => {
        try {
            clearGoogleToken();
            await signOut(auth);
            return { error: null };
        } catch (error) {
            return { error: error.message };
        }
    };

    const value = {
        user,
        loading,
        googleToken,
        setGoogleToken,
        clearGoogleToken,
        refreshGoogleToken,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
