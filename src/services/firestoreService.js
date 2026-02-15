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

// Get user preferences from a specific user (for shared dashboard access)
export const subscribeSharedUserPreferences = (ownerId, callback) => {
    const prefRef = doc(db, 'users', ownerId, 'preferences', 'main');
    return onSnapshot(prefRef, (snapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.data());
        } else {
            callback({});
        }
    });
};

// Get user stats/streak from a specific user (for shared dashboard access)
export const subscribeSharedUserStats = (ownerId, callback) => {
    console.log('Firestore: Subscribing to user stats for', ownerId);
    const statsRef = doc(db, 'users', ownerId, 'stats', 'main');
    return onSnapshot(statsRef, 
        (snapshot) => {
            if (snapshot.exists()) {
                console.log('Firestore: User stats received:', snapshot.data());
                callback(snapshot.data());
            } else {
                console.log('Firestore: No user stats found, returning default');
                callback({ streak: 0 });
            }
        },
        (error) => {
            console.error('Firestore: Error subscribing to user stats:', error);
            callback({ streak: 0 });
        }
    );
};

// Get timer state from a specific user (for shared dashboard access)
export const subscribeSharedTimerState = (ownerId, callback) => {
    console.log('Firestore: Subscribing to timer state for', ownerId);
    const timerRef = doc(db, 'users', ownerId, 'timer', 'state');
    return onSnapshot(timerRef, 
        (snapshot) => {
            if (snapshot.exists()) {
                console.log('Firestore: Timer state received:', snapshot.data());
                callback(snapshot.data());
            } else {
                console.log('Firestore: No timer state found');
                callback(null);
            }
        },
        (error) => {
            console.error('Firestore: Error subscribing to timer state:', error);
            callback(null);
        }
    );
};

// Get now playing from a specific user (for shared dashboard access)
export const subscribeSharedNowPlaying = (ownerId, callback) => {
    console.log('Firestore: Subscribing to now playing for', ownerId);
    const nowPlayingRef = doc(db, 'users', ownerId, 'nowPlaying', 'current');
    return onSnapshot(nowPlayingRef, 
        (snapshot) => {
            if (snapshot.exists()) {
                console.log('Firestore: Now playing received:', snapshot.data());
                callback(snapshot.data());
            } else {
                console.log('Firestore: No now playing found, returning default');
                callback({ videoId: 'jfKfPfyJRdk' }); // Default lofi
            }
        },
        (error) => {
            console.error('Firestore: Error subscribing to now playing:', error);
            callback({ videoId: 'jfKfPfyJRdk' });
        }
    );
};

// Save user's timer state to Firestore (for sharing)
export const saveUserTimerState = async (userId, timerState) => {
    try {
        const timerRef = doc(db, 'users', userId, 'timer', 'state');
        await setDoc(timerRef, {
            ...timerState,
            updatedAt: serverTimestamp()
        });
        console.log('Firestore: Timer state saved');
    } catch (error) {
        console.error('Firestore: Error saving timer state:', error);
    }
};

// Save user's now playing to Firestore (for sharing)
export const saveUserNowPlaying = async (userId, nowPlayingData) => {
    try {
        const nowPlayingRef = doc(db, 'users', userId, 'nowPlaying', 'current');
        await setDoc(nowPlayingRef, {
            ...nowPlayingData,
            updatedAt: serverTimestamp()
        });
        console.log('Firestore: Now playing saved');
    } catch (error) {
        console.error('Firestore: Error saving now playing:', error);
    }
};

// Save user's stats to Firestore (for sharing)
export const saveUserStats = async (userId, stats) => {
    try {
        const statsRef = doc(db, 'users', userId, 'stats', 'main');
        await setDoc(statsRef, {
            ...stats,
            updatedAt: serverTimestamp()
        });
        console.log('Firestore: User stats saved');
    } catch (error) {
        console.error('Firestore: Error saving user stats:', error);
    }
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
    console.log('Updating goal:', goalId, 'hours:', goalHours, 'for user:', userId);
    // Use setDoc with merge to create or update the goal document with the specific ID
    const goalRef = doc(db, 'users', userId, 'goals', goalId);
    await setDoc(goalRef, {
        id: goalId,
        hours: parseFloat(goalHours),
        updatedAt: serverTimestamp()
    }, { merge: true });
    console.log('Goal updated successfully');
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
            // Prioritize documents where doc.id matches the goal ID (properly created documents)
            // over documents that only have data.id field (legacy documents with random IDs)
            const goalKey = doc.id === 'dailyStudyGoal' ? 'dailyStudyGoal' : (data.id || doc.id);
            goals[goalKey] = { id: doc.id, ...data };
            console.log('Goal loaded:', goalKey, 'doc.id:', doc.id, 'hours:', data.hours, 'updatedAt:', data.updatedAt);
        });
        console.log('All goals:', goals);
        callback(goals);
    });
};

// Habits Collection
export const habitsCollection = (userId) => collection(db, 'users', userId, 'habits');

export const addHabit = async (userId, habitData) => {
    const docRef = await addDoc(habitsCollection(userId), {
        ...habitData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
    return docRef.id;
};

export const updateHabit = async (userId, habitId, updates) => {
    const habitRef = doc(db, 'users', userId, 'habits', habitId);
    await updateDoc(habitRef, {
        ...updates,
        updatedAt: serverTimestamp()
    });
};

export const deleteHabit = async (userId, habitId) => {
    const habitRef = doc(db, 'users', userId, 'habits', habitId);
    await deleteDoc(habitRef);
};

export const subscribeHabits = (userId, callback) => {
    const q = query(habitsCollection(userId), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const habits = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(habits);
    });
};

// Habit Completions Collection
export const habitCompletionsCollection = (userId) => collection(db, 'users', userId, 'habitCompletions');

export const addHabitCompletion = async (userId, habitId, date, value = 1) => {
    const completionId = `${habitId}_${date}`;
    const completionRef = doc(db, 'users', userId, 'habitCompletions', completionId);
    await setDoc(completionRef, {
        habitId,
        date,
        value,
        completed: value > 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
    return completionId;
};

export const updateHabitCompletion = async (userId, habitId, date, value) => {
    const completionId = `${habitId}_${date}`;
    const completionRef = doc(db, 'users', userId, 'habitCompletions', completionId);
    await setDoc(completionRef, {
        habitId,
        date,
        value,
        completed: value > 0,
        updatedAt: serverTimestamp()
    }, { merge: true });
};

export const removeHabitCompletion = async (userId, habitId, date) => {
    const completionId = `${habitId}_${date}`;
    const completionRef = doc(db, 'users', userId, 'habitCompletions', completionId);
    await deleteDoc(completionRef);
};

export const toggleHabitCompletion = async (userId, habitId, date, isCompleted) => {
    if (isCompleted) {
        await addHabitCompletion(userId, habitId, date, 1);
    } else {
        await removeHabitCompletion(userId, habitId, date);
    }
};

export const subscribeHabitCompletions = (userId, callback) => {
    const q = query(habitCompletionsCollection(userId), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const completions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(completions);
    });
};


