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
import { subscribeUserPreferences, updateUserPreferences } from '../services/firestoreService';
import { 
    getSharedDashboard, 
    canAccessSharedDashboard, 
    canEditSharedDashboard,
    addCollaborator,
    subscribeToSharedDashboard
} from '../services/sharingService';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [googleToken, setGoogleToken] = useState(localStorage.getItem('google_access_token'));
    const [userPreferences, setUserPreferences] = useState(null);
    const [isGoogleCalendarConnected, setIsGoogleCalendarConnected] = useState(false);
    
    // Shared dashboard state
    const [sharedDashboard, setSharedDashboard] = useState(null);
    const [sharedDashboardOwnerId, setSharedDashboardOwnerId] = useState(null);
    const [canAccessShared, setCanAccessShared] = useState(false);
    const [canEditShared, setCanEditShared] = useState(false);
    const [isSharedMode, setIsSharedMode] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
            
            if (user) {
                // Check if user has previously connected Google Calendar
                const savedConnection = localStorage.getItem(`google_calendar_connected_${user.uid}`);
                if (savedConnection === 'true') {
                    setIsGoogleCalendarConnected(true);
                    // Try to refresh token on load if it was previously connected
                    const savedToken = localStorage.getItem('google_access_token');
                    if (savedToken) {
                        setGoogleToken(savedToken);
                    }
                }
                
                // Subscribe to user preferences
                const unsubPrefs = subscribeUserPreferences(user.uid, (prefs) => {
                    if (prefs) {
                        setUserPreferences(prefs);
                    } else {
                        // Set default preferences
                        setUserPreferences({
                            autoSyncGoogleCalendar: true,
                            syncRemindersToCalendar: true,
                            syncCalendarToApp: true
                        });
                    }
                });
                
                return () => {
                    if (unsubPrefs) unsubPrefs();
                };
            } else {
                // Clear token if user signs out
                setGoogleToken(null);
                setIsGoogleCalendarConnected(false);
                setUserPreferences(null);
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
                // Mark Google Calendar as connected for this user
                if (result.user) {
                    localStorage.setItem(`google_calendar_connected_${result.user.uid}`, 'true');
                    setIsGoogleCalendarConnected(true);
                }
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
                if (user) {
                    localStorage.setItem(`google_calendar_connected_${user.uid}`, 'true');
                    setIsGoogleCalendarConnected(true);
                }
            }
            return token;
        } catch (error) {
            console.error('Failed to refresh Google token:', error);
            return null;
        }
    };

    // Update user preferences
    const updatePreferences = async (newPreferences) => {
        if (user) {
            await updateUserPreferences(user.uid, newPreferences);
            setUserPreferences(prev => ({ ...prev, ...newPreferences }));
        }
    };

    // Disconnect Google Calendar
    const disconnectGoogleCalendar = () => {
        setGoogleToken(null);
        setIsGoogleCalendarConnected(false);
        localStorage.removeItem('google_access_token');
        if (user) {
            localStorage.removeItem(`google_calendar_connected_${user.uid}`);
        }
    };

    // Clear google token (for expired/invalid tokens)
    const clearGoogleToken = () => {
        setGoogleToken(null);
        localStorage.removeItem('google_access_token');
    };

    // Shared Dashboard Functions
    const loadSharedDashboard = async (shareId) => {
        try {
            const dashboard = await getSharedDashboard(shareId);
            
            if (!dashboard) {
                setSharedDashboard(null);
                setSharedDashboardOwnerId(null);
                setCanAccessShared(false);
                setCanEditShared(false);
                setIsSharedMode(false);
                return { success: false, error: 'Dashboard not found' };
            }
            
            const hasAccess = canAccessSharedDashboard(dashboard, user);
            const hasEditPermission = canEditSharedDashboard(dashboard, user);
            
            setSharedDashboard(dashboard);
            setSharedDashboardOwnerId(dashboard.ownerId);
            setCanAccessShared(hasAccess);
            setCanEditShared(hasEditPermission);
            setIsSharedMode(true);
            
            // Add current user as collaborator if they have access
            if (hasAccess && user && dashboard.id) {
                await addCollaborator(dashboard.id, user.uid, user.email, user.displayName);
            }
            
            return { 
                success: hasAccess, 
                dashboard,
                canEdit: hasEditPermission,
                error: hasAccess ? null : 'You do not have access to this dashboard'
            };
        } catch (error) {
            console.error('Error loading shared dashboard:', error);
            return { success: false, error: error.message };
        }
    };

    const clearSharedDashboard = () => {
        setSharedDashboard(null);
        setSharedDashboardOwnerId(null);
        setCanAccessShared(false);
        setCanEditShared(false);
        setIsSharedMode(false);
    };

    const refreshSharedDashboard = async (shareId) => {
        if (shareId) {
            return await loadSharedDashboard(shareId);
        }
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
        logout,
        userPreferences,
        updatePreferences,
        isGoogleCalendarConnected,
        disconnectGoogleCalendar,
        // Shared dashboard
        sharedDashboard,
        sharedDashboardOwnerId,
        canAccessShared,
        canEditShared,
        isSharedMode,
        loadSharedDashboard,
        clearSharedDashboard,
        refreshSharedDashboard
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
