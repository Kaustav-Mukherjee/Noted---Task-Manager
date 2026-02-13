import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    onSnapshot,
    orderBy,
    serverTimestamp,
    getDoc,
    setDoc,
    getDocs
} from 'firebase/firestore';
import { db } from '../firebase';

// Shared Dashboards Collection
export const sharedDashboardsCollection = () => collection(db, 'sharedDashboards');

// Generate a unique share link ID
export const generateShareId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Create a shared dashboard
export const createSharedDashboard = async (ownerId, dashboardData) => {
    const shareId = generateShareId();
    const shareLink = `${window.location.origin}/dashboard/${shareId}`;
    
    const sharedDashboardData = {
        shareId,
        ownerId,
        shareLink,
        title: dashboardData.title || 'Shared Dashboard',
        description: dashboardData.description || '',
        permissions: dashboardData.permissions || 'view', // 'view', 'edit'
        allowedEmails: dashboardData.allowedEmails || [], // empty = anyone with link
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true,
        collaborators: []
    };
    
    const docRef = await addDoc(sharedDashboardsCollection(), sharedDashboardData);
    return { id: docRef.id, ...sharedDashboardData, shareLink };
};

// Get shared dashboard by shareId
export const getSharedDashboard = async (shareId) => {
    const q = query(sharedDashboardsCollection(), where('shareId', '==', shareId));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return null;
    
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
};

// Update shared dashboard
export const updateSharedDashboard = async (shareDocId, updates) => {
    const docRef = doc(db, 'sharedDashboards', shareDocId);
    await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
    });
};

// Delete shared dashboard
export const deleteSharedDashboard = async (shareDocId) => {
    const docRef = doc(db, 'sharedDashboards', shareDocId);
    await deleteDoc(docRef);
};

// Add collaborator to shared dashboard
export const addCollaborator = async (shareDocId, userId, userEmail, displayName) => {
    const docRef = doc(db, 'sharedDashboards', shareDocId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return;
    
    const data = docSnap.data();
    const collaborators = data.collaborators || [];
    
    // Check if already a collaborator
    if (!collaborators.find(c => c.userId === userId)) {
        collaborators.push({
            userId,
            email: userEmail,
            displayName: displayName || userEmail,
            joinedAt: serverTimestamp()
        });
        
        await updateDoc(docRef, { collaborators });
    }
};

// Subscribe to user's shared dashboards
export const subscribeToUserSharedDashboards = (userId, callback) => {
    const q = query(
        sharedDashboardsCollection(),
        where('ownerId', '==', userId),
        orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
        const dashboards = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(dashboards);
    });
};

// Subscribe to shared dashboard by shareId
export const subscribeToSharedDashboard = (shareId, callback) => {
    const q = query(sharedDashboardsCollection(), where('shareId', '==', shareId));
    
    return onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            callback(null);
        } else {
            const doc = snapshot.docs[0];
            callback({ id: doc.id, ...doc.data() });
        }
    });
};

// Check if user can access shared dashboard
export const canAccessSharedDashboard = (sharedDashboard, user) => {
    if (!sharedDashboard || !sharedDashboard.isActive) return false;
    
    // Owner always has access
    if (user && sharedDashboard.ownerId === user.uid) return true;
    
    // If allowedEmails is empty, anyone with link can access
    if (!sharedDashboard.allowedEmails || sharedDashboard.allowedEmails.length === 0) {
        return true;
    }
    
    // Check if user's email is in allowed list
    if (user && user.email) {
        return sharedDashboard.allowedEmails.includes(user.email);
    }
    
    return false;
};

// Check if user can edit shared dashboard
export const canEditSharedDashboard = (sharedDashboard, user) => {
    if (!canAccessSharedDashboard(sharedDashboard, user)) return false;
    
    // Owner can always edit
    if (user && sharedDashboard.ownerId === user.uid) return true;
    
    // Check permissions
    return sharedDashboard.permissions === 'edit';
};

// Copy share link to clipboard
export const copyShareLink = async (shareLink) => {
    try {
        await navigator.clipboard.writeText(shareLink);
        return true;
    } catch (err) {
        console.error('Failed to copy:', err);
        return false;
    }
};
