import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { useAuth } from './contexts/AuthContext';
import Header from './components/Header';
import TaskInput from './components/TaskInput';
import TaskList from './components/TaskList';
import Dashboard from './components/Dashboard';
import AuthModal from './components/AuthModal';
import * as firestoreService from './services/firestoreService';

function App() {
    const { user } = useAuth();
    const [theme, setTheme] = useState('dark');
    const [showAuthModal, setShowAuthModal] = useState(false);

    // Local state (initialized empty)
    const [tasks, setTasks] = useState([]);
    const [reminders, setReminders] = useState([]);
    const [notes, setNotes] = useState([]);
    const [folders, setFolders] = useState([]);
    const [studySessions, setStudySessions] = useState([]);

    // Subscribe to Firestore when user is authenticated
    useEffect(() => {
        if (!user) {
            // Reset to empty when logged out
            setTasks([]);
            setReminders([]);
            setNotes([]);
            setFolders([]);
            setStudySessions([]);
            return;
        }

        // Subscribe to tasks
        const unsubTasks = firestoreService.subscribeTasks(user.uid, (firestoreTasks) => {
            setTasks(firestoreTasks)
        });

        // Subscribe to reminders
        const unsubReminders = firestoreService.subscribeReminders(user.uid, (firestoreReminders) => {
            setReminders(firestoreReminders);
        });

        // Subscribe to study sessions
        const unsubStudy = firestoreService.subscribeStudySessions(user.uid, (firestoreSessions) => {
            setStudySessions(firestoreSessions);
        });

        // Subscribe to sticky notes
        const unsubNotes = firestoreService.subscribeStickyNotes(user.uid, (firestoreNotes) => {
            setNotes(firestoreNotes);
        });

        // Subscribe to folders
        const unsubFolders = firestoreService.subscribeFolders(user.uid, (firestoreFolders) => {
            setFolders(firestoreFolders);
        });

        return () => {
            unsubTasks();
            unsubReminders();
            unsubStudy();
            unsubNotes();
            unsubFolders();
        };
    }, [user]);

    const streak = useMemo(() => {
        if (tasks.length === 0) return 0;

        const completedDates = [...new Set(tasks
            .filter(t => t.completed && t.date)
            .map(t => format(new Date(t.date), 'yyyy-MM-dd'))
        )].sort((a, b) => new Date(b) - new Date(a));

        if (completedDates.length === 0) return 0;

        let currentStreak = 0;
        let checkDate = new Date();

        // If nothing today, check if streak continued yesterday
        if (completedDates[0] !== format(checkDate, 'yyyy-MM-dd')) {
            checkDate.setDate(checkDate.getDate() - 1);
            if (completedDates[0] !== format(checkDate, 'yyyy-MM-dd')) {
                return 0;
            }
        }

        for (let i = 0; i < completedDates.length; i++) {
            if (completedDates[i] === format(checkDate, 'yyyy-MM-dd')) {
                currentStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }
        return currentStreak;
    }, [tasks]);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const addTask = async (text) => {
        const newTask = {
            text,
            completed: false,
            date: new Date().toISOString(),
        };

        if (user) {
            const id = await firestoreService.addTask(user.uid, newTask);
            setTasks([{ id, ...newTask }, ...tasks]);
        } else {
            setTasks([{ id: Date.now().toString(), ...newTask }, ...tasks]);
        }
    };

    const toggleTask = async (id) => {
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        const newCompleted = !task.completed;
        setTasks(tasks.map(t => t.id === id ? { ...t, completed: newCompleted } : t));

        if (user) {
            await firestoreService.updateTask(user.uid, id, { completed: newCompleted });
        }
    };

    const deleteTask = async (id) => {
        setTasks(tasks.filter(t => t.id !== id));

        if (user) {
            await firestoreService.deleteTask(user.uid, id);
        }
    };

    const addReminder = async (reminderData) => {
        const newReminder = typeof reminderData === 'string'
            ? { title: reminderData, time: 'Just now', active: true }
            : reminderData;

        if (user) {
            const id = await firestoreService.addReminder(user.uid, newReminder);
            setReminders([{ id, ...newReminder }, ...reminders]);
        } else {
            setReminders([{ id: Date.now().toString(), ...newReminder }, ...reminders]);
        }
    };

    const deleteReminder = async (id) => {
        setReminders(reminders.filter(r => r.id !== id));
        if (user) {
            await firestoreService.deleteReminder(user.uid, id);
        }
    };

    const updateReminder = async (id, updates) => {
        setReminders(reminders.map(r => r.id === id ? { ...r, ...updates } : r));
        if (user) {
            await firestoreService.updateReminder(user.uid, id, updates);
        }
    };

    const addStudySession = async (hours) => {
        const newSession = {
            date: new Date().toISOString(),
            hours: parseFloat(hours)
        };

        if (user) {
            await firestoreService.addStudySession(user.uid, newSession);
        } else {
            setStudySessions([...studySessions, newSession]);
        }
    };

    const deleteStudySession = async (id) => {
        if (user) await firestoreService.deleteStudySession(user.uid, id);
    };

    const addStickyNote = async (note) => {
        if (user) await firestoreService.addStickyNote(user.uid, note);
    };

    const updateStickyNote = async (id, updates) => {
        if (user) await firestoreService.updateStickyNote(user.uid, id, updates);
    };

    const deleteStickyNote = async (id) => {
        if (user) await firestoreService.deleteStickyNote(user.uid, id);
    };

    const addFolder = async (folder) => {
        if (user) await firestoreService.addFolder(user.uid, folder);
    };

    const updateFolder = async (id, updates) => {
        if (user) await firestoreService.updateFolder(user.uid, id, updates);
    };

    const deleteFolder = async (id) => {
        if (user) await firestoreService.deleteFolder(user.uid, id);
    };

    if (!user) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                textAlign: 'center',
                background: 'var(--bg-app)'
            }}>
                <div className="fade-in" style={{ maxWidth: '400px' }}>
                    <h1 style={{ fontSize: '3rem', marginBottom: '16px', fontWeight: '800' }}>Noted</h1>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '1.1rem' }}>
                        Your private space for tasks, reminders, and study tracking.
                    </p>
                    <button
                        onClick={() => setShowAuthModal(true)}
                        style={{
                            padding: '16px 40px',
                            borderRadius: '30px',
                            backgroundColor: 'var(--text-main)',
                            color: 'var(--bg-app)',
                            fontWeight: '700',
                            fontSize: '1.1rem',
                            cursor: 'pointer',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
                        }}
                    >
                        Enter Noted
                    </button>
                    <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="app-container">
                {/* Main Content - Left Side */}
                <div className="main-content">
                    <Header
                        theme={theme}
                        toggleTheme={toggleTheme}
                        user={user}
                        onSignInClick={() => setShowAuthModal(true)}
                    />

                    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
                        <TaskInput onAdd={addTask} />

                        <TaskList
                            tasks={tasks}
                            onToggle={toggleTask}
                            onDelete={deleteTask}
                        />
                    </div>
                </div>

                {/* Dashboard - Right Side */}
                <div className="dashboard-sidebar">
                    <Dashboard
                        tasks={tasks}
                        reminders={reminders}
                        onAddReminder={addReminder}
                        onDeleteReminder={deleteReminder}
                        onUpdateReminder={updateReminder}
                        notes={notes}
                        folders={folders}
                        onAddNote={addStickyNote}
                        onUpdateNote={updateStickyNote}
                        onDeleteNote={deleteStickyNote}
                        onAddFolder={addFolder}
                        onUpdateFolder={updateFolder}
                        onDeleteFolder={deleteFolder}
                        studySessions={studySessions}
                        addStudySession={addStudySession}
                        onDeleteStudySession={deleteStudySession}
                        streak={streak}
                    />
                </div>
            </div>

            <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
        </>
    );
}

export default App;
