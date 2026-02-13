import { useState, useEffect, useMemo, useRef } from 'react';
import { format, isSameDay } from 'date-fns';
import { useAuth } from './contexts/AuthContext';
import Header from './components/Header';
import TaskInput from './components/TaskInput';
import TaskList from './components/TaskList';
import Dashboard from './components/Dashboard';
import AuthModal from './components/AuthModal';
import FocusTimer from './components/FocusTimer';
import YouTubeNowPlaying from './components/YouTubeNowPlaying';
import { Zap } from 'lucide-react';
import * as firestoreService from './services/firestoreService';
import { playAlertSound } from './utils/sound';


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
    const [goals, setGoals] = useState({});
    const [showGoalCelebration, setShowGoalCelebration] = useState(false);


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

        // Subscribe to goals
        const unsubGoals = firestoreService.subscribeGoals(user.uid, (firestoreGoals) => {
            setGoals(firestoreGoals);
        });


        return () => {
            unsubTasks();
            unsubReminders();
            unsubStudy();
            unsubNotes();
            unsubFolders();
            unsubGoals();
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

    // Check for reminders every minute
    useEffect(() => {
        const checkReminders = () => {
            const now = new Date();
            reminders.forEach(reminder => {
                if (reminder.active && reminder.dueDate) {
                    const due = new Date(reminder.dueDate);
                    if (isSameDay(now, due) &&
                        now.getHours() === due.getHours() &&
                        now.getMinutes() === due.getMinutes()) {

                        playAlertSound();
                        if (Notification.permission === 'granted') {
                            new Notification("Reminder", { body: reminder.title });
                        }
                    }
                }
            });
        };

        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }

        const interval = setInterval(checkReminders, 60000);
        checkReminders();

        return () => clearInterval(interval);
    }, [reminders]);

    const todaysTasks = useMemo(() => {
        return tasks.filter(task => {
            if (!task.date) return false;
            return isSameDay(new Date(task.date), new Date());
        });
    }, [tasks]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const addTask = async (text, date = null) => {
        const newTask = {
            text,
            completed: false,
            date: date || new Date().toISOString()
        };

        if (user) {
            await firestoreService.addTask(user.uid, newTask);
        } else {
            setTasks([...tasks, { ...newTask, id: Date.now().toString() }]);
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

    const addStudySession = async (hours, date = null) => {
        const newSession = {
            date: date || new Date().toISOString(),
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

    const updateGoal = async (goalId, hours) => {
        if (user) await firestoreService.updateGoal(user.uid, goalId, hours);
    };

    // Calculate daily goal progress for celebration effect
    const dailyGoalHours = goals?.dailyStudyGoal?.hours || 4;
    const todayStudyHours = useMemo(() => {
        const today = new Date();
        console.log('=== APP.JSX DEBUG ===');
        console.log('Today:', today);
        console.log('Study sessions count:', studySessions.length);
        
        if (!Array.isArray(studySessions)) {
            console.error('studySessions is not an array:', studySessions);
            return 0;
        }
        
        const todaysSessions = studySessions.filter(s => {
            const sessionDate = new Date(s.date);
            const isToday = isSameDay(sessionDate, today);
            if (isToday) {
                console.log('Today\'s session:', s.id, 'hours:', s.hours, 'date:', s.date);
            }
            return isToday;
        });
        
        const total = todaysSessions.reduce((acc, curr) => {
            const hours = parseFloat(curr.hours) || 0;
            return acc + hours;
        }, 0);
        console.log('App.jsx calculated total:', total);
        return total;
    }, [studySessions]);
    
    // Check if goal is completed and trigger celebration
    const [hasCelebrated, setHasCelebrated] = useState(false);
    const celebrationTimerRef = useRef(null);
    
    useEffect(() => {
        // Only trigger if we haven't celebrated yet today and goal is reached
        if (todayStudyHours >= dailyGoalHours && !hasCelebrated && !celebrationTimerRef.current) {
            setHasCelebrated(true);
            setShowGoalCelebration(true);
            
            // Auto-hide after 3 seconds
            celebrationTimerRef.current = setTimeout(() => {
                setShowGoalCelebration(false);
                celebrationTimerRef.current = null;
            }, 3000);
        } else if (todayStudyHours < dailyGoalHours && hasCelebrated) {
            // Reset for next day if hours drop below goal
            setHasCelebrated(false);
            setShowGoalCelebration(false);
            if (celebrationTimerRef.current) {
                clearTimeout(celebrationTimerRef.current);
                celebrationTimerRef.current = null;
            }
        }
        
        return () => {
            if (celebrationTimerRef.current) {
                clearTimeout(celebrationTimerRef.current);
            }
        };
    }, [todayStudyHours, dailyGoalHours, hasCelebrated]);


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
                            tasks={todaysTasks}
                            onToggle={toggleTask}
                            onDelete={deleteTask}
                        />

                        {/* Focus Mode - Side by Side */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-md)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Zap size={18} fill="var(--text-main)" stroke="none" />
                                <h3 style={{ fontSize: '0.95rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Focus Mode</h3>
                            </div>

                            <div className="focus-mode-grid">
                                <FocusTimer onTimerComplete={(hours) => addStudySession(hours)} />
                                <YouTubeNowPlaying />
                            </div>
                        </div>
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
                        goals={goals}
                        updateGoal={updateGoal}
                        onAddTask={addTask}
                        onDeleteTask={deleteTask}
                        onToggleTask={toggleTask}
                        goalCompleted={showGoalCelebration}
                    />

                </div>
            </div>

            <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
        </>
    );
}

export default App;
