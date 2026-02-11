import { useState, useEffect, useMemo } from 'react';
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
    const [goalCompleted, setGoalCompleted] = useState(false);
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
        return studySessions
            .filter(s => {
                const sessionDate = new Date(s.date);
                return isSameDay(sessionDate, today);
            })
            .reduce((acc, curr) => acc + curr.hours, 0);
    }, [studySessions]);
    
    // Check if goal is completed and trigger celebration
    useEffect(() => {
        if (todayStudyHours >= dailyGoalHours && !goalCompleted) {
            setGoalCompleted(true);
            setShowGoalCelebration(true);
            // Auto-hide after 3 seconds
            const timer = setTimeout(() => {
                setShowGoalCelebration(false);
            }, 3000);
            return () => clearTimeout(timer);
        } else if (todayStudyHours < dailyGoalHours && goalCompleted) {
            setGoalCompleted(false);
            setShowGoalCelebration(false);
        }
    }, [todayStudyHours, dailyGoalHours, goalCompleted]);


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
            {/* Goal Completion Edge Lighting Effect - Subtle 3-second animation */}
            {showGoalCelebration && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    pointerEvents: 'none',
                    zIndex: 9999,
                    overflow: 'hidden'
                }}>
                    {/* Top edge glow */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '3px',
                        background: 'linear-gradient(90deg, #ff0080, #ff8c00, #40e0d0, #7b2cbf, #ff0080)',
                        backgroundSize: '500% 100%',
                        animation: 'edgeFlow 2s ease infinite',
                        boxShadow: '0 0 15px rgba(255,0,128,0.6), 0 0 30px rgba(255,140,0,0.4)',
                        opacity: 0.9
                    }} />
                    {/* Bottom edge glow */}
                    <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '3px',
                        background: 'linear-gradient(270deg, #ff0080, #ff8c00, #40e0d0, #7b2cbf, #ff0080)',
                        backgroundSize: '500% 100%',
                        animation: 'edgeFlow 2s ease infinite reverse',
                        boxShadow: '0 0 15px rgba(123,44,191,0.6), 0 0 30px rgba(64,224,208,0.4)',
                        opacity: 0.9
                    }} />
                    {/* Left edge glow */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        bottom: 0,
                        width: '3px',
                        background: 'linear-gradient(180deg, #ff0080, #40e0d0, #7b2cbf, #ff8c00, #ff0080)',
                        backgroundSize: '100% 500%',
                        animation: 'edgeFlowVertical 2s ease infinite',
                        boxShadow: '0 0 15px rgba(255,0,128,0.6), 0 0 30px rgba(64,224,208,0.4)',
                        opacity: 0.9
                    }} />
                    {/* Right edge glow */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        bottom: 0,
                        width: '3px',
                        background: 'linear-gradient(0deg, #ff0080, #40e0d0, #7b2cbf, #ff8c00, #ff0080)',
                        backgroundSize: '100% 500%',
                        animation: 'edgeFlowVertical 2s ease infinite reverse',
                        boxShadow: '0 0 15px rgba(255,140,0,0.6), 0 0 30px rgba(123,44,191,0.4)',
                        opacity: 0.9
                    }} />
                    {/* Corner accents */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '40px',
                        height: '40px',
                        borderTop: '2px solid rgba(255,0,128,0.8)',
                        borderLeft: '2px solid rgba(255,0,128,0.8)',
                        borderTopLeftRadius: '8px'
                    }} />
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        width: '40px',
                        height: '40px',
                        borderTop: '2px solid rgba(255,140,0,0.8)',
                        borderRight: '2px solid rgba(255,140,0,0.8)',
                        borderTopRightRadius: '8px'
                    }} />
                    <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        width: '40px',
                        height: '40px',
                        borderBottom: '2px solid rgba(64,224,208,0.8)',
                        borderLeft: '2px solid rgba(64,224,208,0.8)',
                        borderBottomLeftRadius: '8px'
                    }} />
                    <div style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: '40px',
                        height: '40px',
                        borderBottom: '2px solid rgba(123,44,191,0.8)',
                        borderRight: '2px solid rgba(123,44,191,0.8)',
                        borderBottomRightRadius: '8px'
                    }} />
                    <style>{`
                        @keyframes edgeFlow {
                            0% { background-position: 0% 50%; }
                            50% { background-position: 100% 50%; }
                            100% { background-position: 0% 50%; }
                        }
                        @keyframes edgeFlowVertical {
                            0% { background-position: 50% 0%; }
                            50% { background-position: 50% 100%; }
                            100% { background-position: 50% 0%; }
                        }
                    `}</style>
                </div>
            )}
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
                    />

                </div>
            </div>

            <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
        </>
    );
}

export default App;
