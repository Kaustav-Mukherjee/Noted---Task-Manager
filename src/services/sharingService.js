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

// EmailJS Configuration - Priority: Environment variables > Hardcoded values
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

// Check if EmailJS is properly configured
const isEmailJSConfigured = () => {
    return EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY;
};

// Initialize EmailJS
if (isEmailJSConfigured()) {
    emailjs.init(EMAILJS_PUBLIC_KEY);
}

// Debug logging
console.log('EmailJS Config Status:', {
    configured: isEmailJSConfigured(),
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
        permissions: dashboardData.permissions || 'view',
        allowedEmails: dashboardData.allowedEmails || [],
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
    
    if (user && sharedDashboard.ownerId === user.uid) return true;
    
    if (!sharedDashboard.allowedEmails || sharedDashboard.allowedEmails.length === 0) {
        return true;
    }
    
    if (user && user.email) {
        return sharedDashboard.allowedEmails.includes(user.email);
    }
    
    return false;
};

// Check if user can edit shared dashboard
export const canEditSharedDashboard = (sharedDashboard, user) => {
    if (!canAccessSharedDashboard(sharedDashboard, user)) return false;
    
    if (user && sharedDashboard.ownerId === user.uid) return true;
    
    return sharedDashboard.permissions === 'edit';
};

// Copy share link to clipboard with multiple fallback methods
export const copyShareLink = async (shareLink) => {
    const errors = [];
    
    // Method 1: Modern Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(shareLink);
            console.log('Link copied using Clipboard API');
            return { success: true, method: 'clipboard-api' };
        } catch (err) {
            console.warn('Clipboard API failed:', err);
            errors.push('Clipboard API: ' + err.message);
        }
    }
    
    // Method 2: Legacy execCommand
    try {
        const textArea = document.createElement('textarea');
        textArea.value = shareLink;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
            console.log('Link copied using execCommand');
            return { success: true, method: 'execCommand' };
        } else {
            errors.push('execCommand: returned false');
        }
    } catch (err) {
        console.warn('execCommand failed:', err);
        errors.push('execCommand: ' + err.message);
    }
    
    // Method 3: Selection API
    try {
        const textArea = document.createElement('textarea');
        textArea.value = shareLink;
        textArea.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
        document.body.appendChild(textArea);
        
        const range = document.createRange();
        range.selectNode(textArea);
        
        const selection = window.getSelection();
        if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
        }
        
        document.execCommand('copy');
        
        if (selection) {
            selection.removeAllRanges();
        }
        document.body.removeChild(textArea);
        
        console.log('Link copied using Selection API');
        return { success: true, method: 'selection-api' };
    } catch (err) {
        console.warn('Selection API failed:', err);
        errors.push('Selection API: ' + err.message);
    }
    
    // All methods failed
    console.error('All copy methods failed:', errors);
    return { 
        success: false, 
        error: 'Failed to copy to clipboard. Please copy manually.',
        details: errors
    };
};

// Generate mailto link as fallback for email sending
export const generateMailtoLink = (recipientEmail, shareLink, dashboardTitle, ownerEmail, permissions) => {
    const subject = encodeURIComponent(`Invitation to collaborate on "${dashboardTitle}"`);
    const body = encodeURIComponent(
        `Hi there!\n\n` +
        `${ownerEmail || 'Someone'} has invited you to collaborate on a dashboard titled "${dashboardTitle}".\n\n` +
        `Permissions: ${permissions === 'edit' ? 'Can Edit' : 'View Only'}\n\n` +
        `Click the link below to access the dashboard:\n` +
        `${shareLink}\n\n` +
        `Best regards,\n` +
        `Noted App Team`
    );
    
    return `mailto:${recipientEmail}?subject=${subject}&body=${body}`;
};

// Send invitation email using EmailJS with fallback
export const sendInvitationEmail = async (recipientEmail, shareLink, dashboardTitle, ownerEmail, permissions) => {
    // Check if EmailJS is configured
    if (!isEmailJSConfigured()) {
        console.warn('EmailJS not configured. Available env vars:', {
            service: !!EMAILJS_SERVICE_ID,
            template: !!EMAILJS_TEMPLATE_ID,
            key: !!EMAILJS_PUBLIC_KEY
        });
        
        // Return fallback option
        return { 
            success: false, 
            fallback: true,
            mailtoLink: generateMailtoLink(recipientEmail, shareLink, dashboardTitle, ownerEmail, permissions),
            error: 'Email service not configured. Use the copy link feature or mailto link instead.'
        };
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

        console.log('Sending email to:', recipientEmail);
        console.log('Using EmailJS with service:', EMAILJS_SERVICE_ID);

        const response = await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            templateParams,
            EMAILJS_PUBLIC_KEY
        );

        console.log('Email sent successfully to', recipientEmail, ':', response);
        return { success: true, response };
    } catch (error) {
        console.error('Failed to send email to', recipientEmail, ':', error);
        
        // Return fallback option
        return { 
            success: false, 
            fallback: true,
            mailtoLink: generateMailtoLink(recipientEmail, shareLink, dashboardTitle, ownerEmail, permissions),
            error: error?.message || error?.text || 'Email service error. Use the copy link feature instead.'
        };
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

// Get email configuration status
export const getEmailConfigStatus = () => {
    return {
        configured: isEmailJSConfigured(),
        serviceId: EMAILJS_SERVICE_ID,
        templateId: EMAILJS_TEMPLATE_ID,
        publicKeySet: !!EMAILJS_PUBLIC_KEY
    };
};
