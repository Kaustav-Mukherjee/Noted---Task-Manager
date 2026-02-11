// Firebase configuration for Noted App
// Using Firebase project: tasker-6c7a4

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyDcFpmxo6KWqIuXm0q9ozkFuYu_ky1TRc8", // You need to replace this with your actual API key from Firebase Console
    authDomain: "tasker-6c7a4.firebaseapp.com",
    projectId: "tasker-6c7a4",
    storageBucket: "tasker-6c7a4.appspot.com",
    messagingSenderId: "932826658010",
    appId: "1:932826658010:web:a9415ddc61eba34c9a21e3" // Replace with actual app ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/calendar.events');
googleProvider.addScope('https://www.googleapis.com/auth/calendar.readonly');

// Initialize Firestore
export const db = getFirestore(app);

export default app;
