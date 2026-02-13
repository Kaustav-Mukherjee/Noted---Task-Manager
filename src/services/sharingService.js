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
import emailjs from '@emailjs/browser';

// EmailJS Configuration - using hardcoded values since env vars might not load properly
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_f4komv3';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_gepgwjj';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '_qHcO5cOQB2J1EOKI';

// Debug logging
console.log('EmailJS Config:', {
    serviceId: EMAILJS_SERVICE_ID ? 'Set' : 'Not set',
    templateId: EMAILJS_TEMPLATE_ID ? 'Set' : 'Not set',
    publicKey: EMAILJS_PUBLIC_KEY ? 'Set' : 'Not set'
});

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

// Initialize EmailJS
let emailjsInitialized = false;
const initializeEmailJS = () => {
    if (!emailjsInitialized && EMAILJS_PUBLIC_KEY) {
        emailjs.init(EMAILJS_PUBLIC_KEY);
        emailjsInitialized = true;
        console.log('EmailJS initialized successfully');
    }
};

// Send invitation email using EmailJS
export const sendInvitationEmail = async (recipientEmail, shareLink, dashboardTitle, ownerEmail, permissions) => {
    // Initialize EmailJS first
    initializeEmailJS();
    
    // Check if EmailJS is configured
    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
        console.warn('EmailJS not configured. Service ID:', EMAILJS_SERVICE_ID, 'Template ID:', EMAILJS_TEMPLATE_ID, 'Public Key exists:', !!EMAILJS_PUBLIC_KEY);
        return { success: false, error: 'Email service not configured' };
    }

    try {
        const templateParams = {
            to_email: recipientEmail,
            to_name: recipientEmail.split('@')[0],
            from_name: ownerEmail || 'Noted App',
            reply_to: ownerEmail || 'noreply@noted.app',
            dashboard_title: dashboardTitle || 'Shared Dashboard',
            share_link: shareLink,
            permissions: permissions === 'edit' ? 'Can Edit' : 'View Only',
            message: `You've been invited to collaborate on a dashboard. Click the link above to access it.`,
            time: new Date().toLocaleString()
        };

        console.log('Sending email to:', recipientEmail, 'with params:', templateParams);

        const response = await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            templateParams
        );

        console.log('Email sent successfully to', recipientEmail, ':', response);
        return { success: true, response };
    } catch (error) {
        console.error('Failed to send email to', recipientEmail, ':', error);
        console.error('Error details:', {
            message: error.message,
            text: error.text,
            status: error.status
        });
        return { success: false, error: error.message || error.text || 'Unknown error' };
    }
};

// Send invitation emails to multiple recipients
export const sendInvitationEmails = async (emails, shareLink, dashboardTitle, ownerEmail, permissions) => {
    const results = [];
    
    for (const email of emails) {
        const result = await sendInvitationEmail(email, shareLink, dashboardTitle, ownerEmail, permissions);
        results.push({ email, ...result });
    }
    
    return results;
};
