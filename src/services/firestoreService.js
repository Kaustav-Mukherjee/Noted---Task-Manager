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
    setDoc
} from 'firebase/firestore';
import { db } from '../firebase';

// Shared Data Access Functions
// These functions allow accessing data from shared dashboards

// Get tasks from a specific user (for shared dashboard access)
export const subscribeSharedTasks = (ownerId, callback) => {
    const q = query(
        collection(db, 'users', ownerId, 'tasks'),
        orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
        const tasks = snapshot.docs.map(doc => {
            const data = doc.data();
            let taskDate;
            if (data.date) {
                if (data.date.toDate) {
                    taskDate = data.date.toDate().toISOString();
                } else if (typeof data.date === 'string') {
                    taskDate = data.date;
                } else {
                    taskDate = new Date(data.date).toISOString();
                }
            } else if (data.createdAt?.toDate) {
                taskDate = data.createdAt.toDate().toISOString();
            } else {
                taskDate = new Date().toISOString();
            }

            return {
                id: doc.id,
                ...data,
                date: taskDate
            };
        });
        callback(tasks);
    });
};

// Get reminders from a specific user (for shared dashboard access)
export const subscribeSharedReminders = (ownerId, callback) => {
    const q = query(
        collection(db, 'users', ownerId, 'reminders'),
        orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
        const reminders = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(reminders);
    });
};

// Get study sessions from a specific user (for shared dashboard access)
export const subscribeSharedStudySessions = (ownerId, callback) => {
    const q = query(
        collection(db, 'users', ownerId, 'studySessions'),
        orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
        const sessions = snapshot.docs.map(doc => {
            const data = doc.data();
            let sessionDate;
            if (data.date) {
                if (data.date.toDate) {
                    sessionDate = data.date.toDate().toISOString();
                } else if (typeof data.date === 'string') {
                    sessionDate = data.date;
                } else {
                    sessionDate = new Date(data.date).toISOString();
                }
            } else if (data.createdAt?.toDate) {
                sessionDate = data.createdAt.toDate().toISOString();
            } else {
                sessionDate = new Date().toISOString();
            }
            
            return {
                id: doc.id,
                ...data,
                date: sessionDate
            };
        });
        callback(sessions);
    });
};

// Get sticky notes from a specific user (for shared dashboard access)
export const subscribeSharedStickyNotes = (ownerId, callback) => {
    const q = query(
        collection(db, 'users', ownerId, 'stickyNotes'),
        orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
        const notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(notes);
    });
};

// Get folders from a specific user (for shared dashboard access)
export const subscribeSharedFolders = (ownerId, callback) => {
    const q = query(
        collection(db, 'users', ownerId, 'folders'),
        orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
        const folders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(folders);
    });
};

// Get goals from a specific user (for shared dashboard access)
export const subscribeSharedGoals = (ownerId, callback) => {
    const q = query(collection(db, 'users', ownerId, 'goals'));
    return onSnapshot(q, (snapshot) => {
        const goals = {};
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            goals[data.id || doc.id] = { id: doc.id, ...data };
        });
        callback(goals);
    });
};

// Add task to shared dashboard (with ownerId)
export const addSharedTask = async (ownerId, taskData) => {
    const docRef = await addDoc(collection(db, 'users', ownerId, 'tasks'), {
        ...taskData,
        date: taskData.date || new Date().toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
    return docRef.id;
};

// Update task in shared dashboard
export const updateSharedTask = async (ownerId, taskId, updates) => {
    const taskRef = doc(db, 'users', ownerId, 'tasks', taskId);
    await updateDoc(taskRef, {
        ...updates,
        updatedAt: serverTimestamp()
    });
};

// Delete task from shared dashboard
export const deleteSharedTask = async (ownerId, taskId) => {
    const taskRef = doc(db, 'users', ownerId, 'tasks', taskId);
    await deleteDoc(taskRef);
};

// Add study session to shared dashboard
export const addSharedStudySession = async (ownerId, sessionData) => {
    const docRef = await addDoc(collection(db, 'users', ownerId, 'studySessions'), {
        ...sessionData,
        date: sessionData.date || new Date().toISOString(),
        createdAt: serverTimestamp()
    });
    return docRef.id;
};

// Tasks Collection
export const tasksCollection = (userId) => collection(db, 'users', userId, 'tasks');

export const addTask = async (userId, taskData) => {
    const docRef = await addDoc(tasksCollection(userId), {
        ...taskData,
        date: taskData.date || new Date().toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
    return docRef.id;
};

export const updateTask = async (userId, taskId, updates) => {
    const taskRef = doc(db, 'users', userId, 'tasks', taskId);
    await updateDoc(taskRef, {
        ...updates,
        updatedAt: serverTimestamp()
    });
};

export const deleteTask = async (userId, taskId) => {
    const taskRef = doc(db, 'users', userId, 'tasks', taskId);
    await deleteDoc(taskRef);
};

export const subscribeTasks = (userId, callback) => {
    const q = query(tasksCollection(userId), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const tasks = snapshot.docs.map(doc => {
            const data = doc.data();
            // Handle Firestore Timestamp or string dates
            let taskDate;
            if (data.date) {
                // Check if it's a Firestore Timestamp object
                if (data.date.toDate) {
                    taskDate = data.date.toDate().toISOString();
                } else if (typeof data.date === 'string') {
                    taskDate = data.date;
                } else {
                    taskDate = new Date(data.date).toISOString();
                }
            } else if (data.createdAt?.toDate) {
                // Fallback to createdAt only if date is missing
                taskDate = data.createdAt.toDate().toISOString();
            } else {
                taskDate = new Date().toISOString();
            }

            return {
                id: doc.id,
                ...data,
                date: taskDate
            };
        });
        callback(tasks);
    });
};

// Reminders Collection
export const remindersCollection = (userId) => collection(db, 'users', userId, 'reminders');

export const addReminder = async (userId, reminder) => {
    const docRef = await addDoc(remindersCollection(userId), {
        ...reminder,
        createdAt: serverTimestamp()
    });
    return docRef.id;
};

export const deleteReminder = async (userId, reminderId) => {
    const reminderRef = doc(db, 'users', userId, 'reminders', reminderId);
    await deleteDoc(reminderRef);
};

export const updateReminder = async (userId, reminderId, updates) => {
    const reminderRef = doc(db, 'users', userId, 'reminders', reminderId);
    await updateDoc(reminderRef, {
        ...updates,
        updatedAt: serverTimestamp()
    });
};

export const subscribeReminders = (userId, callback) => {
    const q = query(remindersCollection(userId), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const reminders = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(reminders);
    });
};

// Study Sessions Collection
export const studySessionsCollection = (userId) => collection(db, 'users', userId, 'studySessions');

export const addStudySession = async (userId, sessionData) => {
    const docRef = await addDoc(studySessionsCollection(userId), {
        ...sessionData,
        date: sessionData.date || new Date().toISOString(),
        createdAt: serverTimestamp()
    });
    return docRef.id;
};

export const deleteStudySession = async (userId, sessionId) => {
    const sessionRef = doc(db, 'users', userId, 'studySessions', sessionId);
    await deleteDoc(sessionRef);
};

export const subscribeStudySessions = (userId, callback) => {
    const q = query(studySessionsCollection(userId), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const sessions = snapshot.docs.map(doc => {
            const data = doc.data();
            // Handle Firestore Timestamp or string dates
            let sessionDate;
            if (data.date) {
                // Check if it's a Firestore Timestamp object
                if (data.date.toDate) {
                    sessionDate = data.date.toDate().toISOString();
                } else if (typeof data.date === 'string') {
                    sessionDate = data.date;
                } else {
                    sessionDate = new Date(data.date).toISOString();
                }
            } else if (data.createdAt?.toDate) {
                sessionDate = data.createdAt.toDate().toISOString();
            } else {
                sessionDate = new Date().toISOString();
            }
            
            return {
                id: doc.id,
                ...data,
                date: sessionDate
            };
        });
        callback(sessions);
    });
};

// Sticky Notes & Folders
export const stickyNotesCollection = (userId) => collection(db, 'users', userId, 'stickyNotes');
export const foldersCollection = (userId) => collection(db, 'users', userId, 'folders');

export const addStickyNote = async (userId, note) => {
    const docRef = await addDoc(stickyNotesCollection(userId), {
        ...note,
        createdAt: serverTimestamp()
    });
    return docRef.id;
};

export const updateStickyNote = async (userId, noteId, updates) => {
    const noteRef = doc(db, 'users', userId, 'stickyNotes', noteId);
    await updateDoc(noteRef, {
        ...updates,
        updatedAt: serverTimestamp()
    });
};

export const deleteStickyNote = async (userId, noteId) => {
    const noteRef = doc(db, 'users', userId, 'stickyNotes', noteId);
    await deleteDoc(noteRef);
};

export const subscribeStickyNotes = (userId, callback) => {
    const q = query(stickyNotesCollection(userId), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(notes);
    });
};

export const addFolder = async (userId, folder) => {
    const docRef = await addDoc(foldersCollection(userId), {
        ...folder,
        createdAt: serverTimestamp()
    });
    return docRef.id;
};

export const updateFolder = async (userId, folderId, updates) => {
    const folderRef = doc(db, 'users', userId, 'folders', folderId);
    await updateDoc(folderRef, updates);
};

export const deleteFolder = async (userId, folderId) => {
    const folderRef = doc(db, 'users', userId, 'folders', folderId);
    await deleteDoc(folderRef);
};

export const subscribeFolders = (userId, callback) => {
    const q = query(foldersCollection(userId), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const folders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(folders);
    });
};
// User Preferences Collection
export const preferencesCollection = (userId) => collection(db, 'users', userId, 'preferences');

export const getUserPreferences = async (userId) => {
    const prefsRef = doc(db, 'users', userId, 'preferences', 'settings');
    const prefsSnap = await getDoc(prefsRef);
    if (prefsSnap.exists()) {
        return prefsSnap.data();
    }
    return null;
};

export const updateUserPreferences = async (userId, preferences) => {
    const prefsRef = doc(db, 'users', userId, 'preferences', 'settings');
    await setDoc(prefsRef, {
        ...preferences,
        updatedAt: serverTimestamp()
    }, { merge: true });
};

export const subscribeUserPreferences = (userId, callback) => {
    const prefsRef = doc(db, 'users', userId, 'preferences', 'settings');
    return onSnapshot(prefsRef, (snapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.data());
        } else {
            callback(null);
        }
    });
};

// Goals Collection
export const goalsCollection = (userId) => collection(db, 'users', userId, 'goals');

export const updateGoal = async (userId, goalId, goalHours) => {
    // For simplicity, we'll use 'dailyStudyGoal' as the ID for now
    const goalRef = doc(db, 'users', userId, 'goals', goalId);
    await updateDoc(goalRef, {
        hours: parseFloat(goalHours),
        updatedAt: serverTimestamp()
    }).catch(async (error) => {
        if (error.code === 'not-found') {
            await addDoc(goalsCollection(userId), {
                id: goalId,
                hours: parseFloat(goalHours),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        }
    });
};

export const setInitialGoal = async (userId, goalHours) => {
    const q = query(goalsCollection(userId), where('id', '==', 'dailyStudyGoal'));
    // If doesn't exist, create it
    await addDoc(goalsCollection(userId), {
        id: 'dailyStudyGoal',
        hours: parseFloat(goalHours),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
};

export const subscribeGoals = (userId, callback) => {
    const q = query(goalsCollection(userId));
    return onSnapshot(q, (snapshot) => {
        const goals = {};
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            goals[data.id || doc.id] = { id: doc.id, ...data };
        });
        callback(goals);
    });
};


