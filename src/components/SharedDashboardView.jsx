import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, AlertCircle, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Dashboard from './Dashboard';
import AuthModal from './AuthModal';
import * as firestoreService from '../services/firestoreService';

export default function SharedDashboardView() {
    const { shareId } = useParams();
    const navigate = useNavigate();
    const { 
        user, 
        loadSharedDashboard, 
        clearSharedDashboard,
        sharedDashboard,
        sharedDashboardOwnerId,
        canAccessShared,
        canEditShared,
        isSharedMode
    } = useAuth();
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAuthModal, setShowAuthModal] = useState(false);
    
    // Data states for shared dashboard
    const [tasks, setTasks] = useState([]);
    const [reminders, setReminders] = useState([]);
    const [notes, setNotes] = useState([]);
    const [folders, setFolders] = useState([]);
    const [studySessions, setStudySessions] = useState([]);
    const [goals, setGoals] = useState({});

    // Load shared dashboard on mount
    useEffect(() => {
        const initSharedDashboard = async () => {
            if (!shareId) {
                setError('Invalid share link');
                setLoading(false);
                return;
            }

            setLoading(true);
            const result = await loadSharedDashboard(shareId);
            
            if (!result.success) {
                setError(result.error);
            }
            
            setLoading(false);
        };

        initSharedDashboard();

        return () => {
            clearSharedDashboard();
        };
    }, [shareId]);

    // Subscribe to shared data when dashboard is loaded
    useEffect(() => {
        if (!isSharedMode || !sharedDashboardOwnerId || !canAccessShared) return;

        const ownerId = sharedDashboardOwnerId;

        // Subscribe to owner's tasks
        const unsubTasks = firestoreService.subscribeSharedTasks(ownerId, (data) => {
            setTasks(data);
        });

        // Subscribe to owner's reminders
        const unsubReminders = firestoreService.subscribeSharedReminders(ownerId, (data) => {
            setReminders(data);
        });

        // Subscribe to owner's study sessions
        const unsubStudy = firestoreService.subscribeSharedStudySessions(ownerId, (data) => {
            setStudySessions(data);
        });

        // Subscribe to owner's sticky notes
        const unsubNotes = firestoreService.subscribeSharedStickyNotes(ownerId, (data) => {
            setNotes(data);
        });

        // Subscribe to owner's folders
        const unsubFolders = firestoreService.subscribeSharedFolders(ownerId, (data) => {
            setFolders(data);
        });

        // Subscribe to owner's goals
        const unsubGoals = firestoreService.subscribeSharedGoals(ownerId, (data) => {
            setGoals(data);
        });

        return () => {
            unsubTasks();
            unsubReminders();
            unsubStudy();
            unsubNotes();
            unsubFolders();
            unsubGoals();
        };
    }, [isSharedMode, sharedDashboardOwnerId, canAccessShared]);

    // Handlers for shared dashboard actions
    const addTask = async (text, date = null) => {
        if (!canEditShared) return;
        const newTask = {
            text,
            completed: false,
            date: date || new Date().toISOString()
        };
        await firestoreService.addSharedTask(sharedDashboardOwnerId, newTask);
    };

    const toggleTask = async (id) => {
        if (!canEditShared) return;
        const task = tasks.find(t => t.id === id);
        if (!task) return;
        await firestoreService.updateSharedTask(sharedDashboardOwnerId, id, { completed: !task.completed });
    };

    const deleteTask = async (id) => {
        if (!canEditShared) return;
        await firestoreService.deleteSharedTask(sharedDashboardOwnerId, id);
    };

    const addReminder = async (reminderData) => {
        if (!canEditShared) return;
        // Note: Reminders would need to be handled similarly
    };

    const addStudySession = async (hours, date = null) => {
        if (!canEditShared) return;
        const newSession = {
            date: date || new Date().toISOString(),
            hours: parseFloat(hours)
        };
        await firestoreService.addSharedStudySession(sharedDashboardOwnerId, newSession);
    };

    const addStickyNote = async (note) => {
        if (!canEditShared) return;
    };

    const updateStickyNote = async (id, updates) => {
        if (!canEditShared) return;
    };

    const deleteStickyNote = async (id) => {
        if (!canEditShared) return;
    };

    const addFolder = async (folder) => {
        if (!canEditShared) return;
    };

    const updateFolder = async (id, updates) => {
        if (!canEditShared) return;
    };

    const deleteFolder = async (id) => {
        if (!canEditShared) return;
    };

    const updateGoal = async (goalId, hours) => {
        if (!canEditShared) return;
    };

    if (loading) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-app)'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="spin" style={{
                        width: '40px',
                        height: '40px',
                        border: '3px solid var(--border)',
                        borderTop: '3px solid var(--text-main)',
                        borderRadius: '50%',
                        margin: '0 auto 16px'
                    }} />
                    <p style={{ color: 'var(--text-muted)' }}>Loading shared dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-app)',
                padding: '20px'
            }}>
                <div style={{
                    textAlign: 'center',
                    maxWidth: '400px'
                }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 20px'
                    }}>
                        <Lock size={32} color="#ef4444" />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '12px' }}>
                        Access Denied
                    </h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                        {error}
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: 'var(--text-main)',
                            color: 'var(--bg-app)',
                            borderRadius: '10px',
                            fontWeight: '600',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <ArrowLeft size={18} />
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-app)' }}>
            {/* Shared Dashboard Header */}
            <div style={{
                padding: '16px 24px',
                backgroundColor: 'var(--bg-card)',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button
                        onClick={() => navigate('/')}
                        style={{
                            padding: '8px',
                            borderRadius: '8px',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <ArrowLeft size={18} />
                        <span>Back</span>
                    </button>
                    <div>
                        <h1 style={{ fontSize: '1.1rem', fontWeight: '700' }}>
                            {sharedDashboard?.title || 'Shared Dashboard'}
                        </h1>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            marginTop: '2px'
                        }}>
                            <Users size={12} />
                            <span>Shared Dashboard</span>
                            {canEditShared ? (
                                <span style={{ color: '#22c55e' }}>• Can Edit</span>
                            ) : (
                                <span style={{ color: '#3b82f6' }}>• View Only</span>
                            )}
                        </div>
                    </div>
                </div>

                {!user && (
                    <button
                        onClick={() => setShowAuthModal(true)}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: 'var(--text-main)',
                            color: 'var(--bg-app)',
                            borderRadius: '10px',
                            fontWeight: '600',
                            fontSize: '0.9rem'
                        }}
                    >
                        Sign In
                    </button>
                )}
            </div>

            {/* Dashboard Content */}
            <div style={{ padding: '24px' }}>
                {!canEditShared && (
                    <div style={{
                        padding: '12px 16px',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        borderRadius: '10px',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        color: '#3b82f6'
                    }}>
                        <AlertCircle size={18} />
                        <span style={{ fontSize: '0.9rem' }}>
                            You have view-only access to this dashboard. Contact the owner for edit permissions.
                        </span>
                    </div>
                )}

                <Dashboard
                    tasks={tasks}
                    reminders={reminders}
                    onAddReminder={addReminder}
                    onDeleteReminder={() => {}}
                    onUpdateReminder={() => {}}
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
                    onDeleteStudySession={() => {}}
                    streak={0}
                    goals={goals}
                    updateGoal={updateGoal}
                    onAddTask={addTask}
                    onDeleteTask={deleteTask}
                    onToggleTask={toggleTask}
                    isSharedView={true}
                    canEdit={canEditShared}
                />
            </div>

            <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
        </div>
    );
}
