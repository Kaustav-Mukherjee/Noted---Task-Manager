import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, AlertCircle, Users, CheckCircle2, Clock, Calendar, BookOpen, StickyNote, Folder, Target } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';
import * as firestoreService from '../services/firestoreService';
import { format, isSameDay, subDays, eachDayOfInterval } from 'date-fns';
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip } from 'recharts';

// Safe Date Utilities
const parseSafeDate = (dateVal) => {
    if (!dateVal) return null;
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? null : d;
};

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

        const unsubTasks = firestoreService.subscribeSharedTasks(ownerId, (data) => {
            setTasks(data);
        });

        const unsubReminders = firestoreService.subscribeSharedReminders(ownerId, (data) => {
            setReminders(data);
        });

        const unsubStudy = firestoreService.subscribeSharedStudySessions(ownerId, (data) => {
            setStudySessions(data);
        });

        const unsubNotes = firestoreService.subscribeSharedStickyNotes(ownerId, (data) => {
            setNotes(data);
        });

        const unsubFolders = firestoreService.subscribeSharedFolders(ownerId, (data) => {
            setFolders(data);
        });

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

    // Computed statistics
    const stats = useMemo(() => {
        const today = new Date();
        const completedTasks = tasks.filter(t => t.completed).length;
        const totalTasks = tasks.length;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        // Today's tasks
        const todayTasks = tasks.filter(t => {
            const taskDate = parseSafeDate(t.date);
            return taskDate && isSameDay(taskDate, today);
        });
        
        // Study hours total
        const totalStudyHours = studySessions.reduce((sum, s) => sum + (parseFloat(s.hours) || 0), 0);
        
        // Recent study sessions (last 7 days)
        const last7Days = eachDayOfInterval({ start: subDays(today, 6), end: today });
        const studyGraphData = last7Days.map(day => ({
            name: format(day, 'EEE'),
            hours: studySessions
                .filter(s => {
                    const sessionDate = parseSafeDate(s.date);
                    return sessionDate && isSameDay(sessionDate, day);
                })
                .reduce((sum, s) => sum + (parseFloat(s.hours) || 0), 0)
        }));
        
        // Task activity for last 7 days
        const taskGraphData = last7Days.map(day => ({
            name: format(day, 'EEE'),
            completed: tasks.filter(t => {
                const taskDate = parseSafeDate(t.date);
                return taskDate && isSameDay(taskDate, day) && t.completed;
            }).length,
            remaining: tasks.filter(t => {
                const taskDate = parseSafeDate(t.date);
                return taskDate && isSameDay(taskDate, day) && !t.completed;
            }).length
        }));
        
        return {
            completedTasks,
            totalTasks,
            completionRate,
            todayTasks: todayTasks.length,
            todayCompleted: todayTasks.filter(t => t.completed).length,
            totalStudyHours: Math.round(totalStudyHours * 10) / 10,
            studyGraphData,
            taskGraphData,
            activeReminders: reminders.filter(r => !r.completed).length,
            notesCount: notes.length,
            foldersCount: folders.length
        };
    }, [tasks, reminders, studySessions, notes, folders]);

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
                    <div style={{
                        width: '40px',
                        height: '40px',
                        border: '3px solid var(--border)',
                        borderTop: '3px solid var(--text-main)',
                        borderRadius: '50%',
                        margin: '0 auto 16px',
                        animation: 'spin 1s linear infinite'
                    }} />
                    <p style={{ color: 'var(--text-muted)' }}>Loading shared dashboard...</p>
                </div>
                <style>{`
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
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
                            gap: '8px',
                            border: 'none',
                            cursor: 'pointer'
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
        <div style={{ 
            minHeight: '100vh', 
            background: 'var(--bg-app)',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Header */}
            <header style={{
                padding: '16px 24px',
                backgroundColor: 'var(--bg-card)',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0
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
                            gap: '6px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer'
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
                            fontSize: '0.9rem',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        Sign In
                    </button>
                )}
            </header>

            {/* View-only Banner */}
            {!canEditShared && (
                <div style={{
                    padding: '12px 24px',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: '#3b82f6',
                    fontSize: '0.9rem',
                    flexShrink: 0
                }}>
                    <AlertCircle size={18} />
                    <span>You have view-only access to this dashboard. Contact the owner for edit permissions.</span>
                </div>
            )}

            {/* Main Content - Bento Grid */}
            <main style={{
                flex: 1,
                padding: '24px',
                overflow: 'auto'
            }}>
                <div style={{
                    maxWidth: '1400px',
                    margin: '0 auto',
                    display: 'grid',
                    gap: '20px',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gridAutoRows: 'minmax(180px, auto)',
                    gridAutoFlow: 'dense'
                }}>
                    {/* Tasks Overview Card - Large */}
                    <div style={{
                        gridColumn: 'span 2',
                        gridRow: 'span 2',
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '20px',
                        border: '1px solid var(--border)',
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '12px',
                                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <CheckCircle2 size={20} color="#22c55e" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Tasks Overview</h3>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {stats.completedTasks} of {stats.totalTasks} completed
                                </p>
                            </div>
                        </div>

                        {/* Task Activity Chart */}
                        <div style={{ flex: 1, minHeight: '150px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.taskGraphData} barGap={4}>
                                    <Tooltip
                                        contentStyle={{ 
                                            backgroundColor: 'var(--bg-card)', 
                                            border: '1px solid var(--border)', 
                                            borderRadius: '8px',
                                            fontSize: '0.75rem'
                                        }}
                                        cursor={false}
                                    />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                                    />
                                    <Bar dataKey="completed" stackId="a" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="remaining" stackId="a" fill="var(--border)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div style={{ display: 'flex', gap: '24px' }}>
                            <div>
                                <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#22c55e' }}>
                                    {stats.completionRate}%
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Completion Rate</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '1.75rem', fontWeight: '700' }}>
                                    {stats.todayCompleted}/{stats.todayTasks}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Today</div>
                            </div>
                        </div>
                    </div>

                    {/* Study Hours Card - Medium */}
                    <div style={{
                        gridColumn: 'span 1',
                        gridRow: 'span 2',
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '20px',
                        border: '1px solid var(--border)',
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '12px',
                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <BookOpen size={20} color="#3b82f6" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Study Hours</h3>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Last 7 days</p>
                            </div>
                        </div>

                        <div style={{ flex: 1, minHeight: '120px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.studyGraphData}>
                                    <Tooltip
                                        contentStyle={{ 
                                            backgroundColor: 'var(--bg-card)', 
                                            border: '1px solid var(--border)', 
                                            borderRadius: '8px',
                                            fontSize: '0.75rem'
                                        }}
                                        cursor={false}
                                    />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                                    />
                                    <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div>
                            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#3b82f6' }}>
                                {stats.totalStudyHours}h
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Hours</div>
                        </div>
                    </div>

                    {/* Quick Stats Row */}
                    {/* Reminders Card */}
                    <div style={{
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '16px',
                        border: '1px solid var(--border)',
                        padding: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px'
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '14px',
                            backgroundColor: 'rgba(245, 158, 11, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <Clock size={24} color="#f59e0b" />
                        </div>
                        <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{stats.activeReminders}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active Reminders</div>
                        </div>
                    </div>

                    {/* Notes Card */}
                    <div style={{
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '16px',
                        border: '1px solid var(--border)',
                        padding: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px'
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '14px',
                            backgroundColor: 'rgba(168, 85, 247, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <StickyNote size={24} color="#a855f7" />
                        </div>
                        <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{stats.notesCount}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sticky Notes</div>
                        </div>
                    </div>

                    {/* Folders Card */}
                    <div style={{
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '16px',
                        border: '1px solid var(--border)',
                        padding: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px'
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '14px',
                            backgroundColor: 'rgba(236, 72, 153, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <Folder size={24} color="#ec4899" />
                        </div>
                        <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{stats.foldersCount}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Folders</div>
                        </div>
                    </div>

                    {/* Recent Tasks List - Wide */}
                    <div style={{
                        gridColumn: 'span 2',
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '20px',
                        border: '1px solid var(--border)',
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        maxHeight: '400px',
                        overflow: 'hidden'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Calendar size={20} color="var(--text-muted)" />
                            <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Recent Tasks</h3>
                        </div>

                        <div style={{ 
                            flex: 1,
                            overflow: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                        }}>
                            {tasks.slice(0, 10).map((task) => (
                                <div
                                    key={task.id}
                                    style={{
                                        padding: '12px 16px',
                                        backgroundColor: 'var(--bg-hover)',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        opacity: task.completed ? 0.6 : 1
                                    }}
                                >
                                    <div style={{
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '50%',
                                        border: `2px solid ${task.completed ? '#22c55e' : 'var(--border)'}`,
                                        backgroundColor: task.completed ? '#22c55e' : 'transparent',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        {task.completed && <CheckCircle2 size={12} color="white" />}
                                    </div>
                                    <span style={{
                                        flex: 1,
                                        textDecoration: task.completed ? 'line-through' : 'none',
                                        color: task.completed ? 'var(--text-muted)' : 'var(--text-main)',
                                        fontSize: '0.9rem'
                                    }}>
                                        {task.text}
                                    </span>
                                    {task.date && (
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                            {format(parseSafeDate(task.date), 'MMM d')}
                                        </span>
                                    )}
                                </div>
                            ))}
                            {tasks.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                    No tasks yet
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Goals Card */}
                    {goals && Object.keys(goals).length > 0 && (
                        <div style={{
                            gridColumn: 'span 1',
                            backgroundColor: 'var(--bg-card)',
                            borderRadius: '20px',
                            border: '1px solid var(--border)',
                            padding: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '12px',
                                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Target size={20} color="#22c55e" />
                                </div>
                                <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Daily Goals</h3>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {Object.entries(goals).slice(0, 4).map(([key, goal]) => (
                                    <div key={key} style={{
                                        padding: '12px',
                                        backgroundColor: 'var(--bg-hover)',
                                        borderRadius: '10px'
                                    }}>
                                        <div style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between',
                                            fontSize: '0.8rem',
                                            marginBottom: '6px'
                                        }}>
                                            <span>Goal</span>
                                            <span>{goal.hours}h</span>
                                        </div>
                                        <div style={{
                                            height: '6px',
                                            backgroundColor: 'var(--border)',
                                            borderRadius: '3px',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                height: '100%',
                                                width: `${Math.min((goal.completed || 0) / goal.hours * 100, 100)}%`,
                                                backgroundColor: '#22c55e',
                                                borderRadius: '3px'
                                            }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Recent Notes Preview */}
                    {notes.length > 0 && (
                        <div style={{
                            gridColumn: 'span 2',
                            backgroundColor: 'var(--bg-card)',
                            borderRadius: '20px',
                            border: '1px solid var(--border)',
                            padding: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <StickyNote size={20} color="#a855f7" />
                                <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Recent Notes</h3>
                            </div>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                gap: '12px'
                            }}>
                                {notes.slice(0, 4).map((note) => (
                                    <div
                                        key={note.id}
                                        style={{
                                            padding: '16px',
                                            backgroundColor: note.color || '#fef3c7',
                                            borderRadius: '12px',
                                            minHeight: '100px',
                                            color: '#1f2937'
                                        }}
                                    >
                                        <p style={{ 
                                            fontSize: '0.85rem', 
                                            lineHeight: '1.5',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 4,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden'
                                        }}>
                                            {note.text}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

            {/* Responsive Styles */}
            <style>{`
                @media (max-width: 968px) {
                    main > div {
                        grid-template-columns: 1fr !important;
                    }
                    main > div > div {
                        grid-column: span 1 !important;
                        grid-row: span 1 !important;
                    }
                }
                
                @media (max-width: 640px) {
                    header {
                        padding: 12px 16px !important;
                    }
                    main {
                        padding: 16px !important;
                    }
                    h1 {
                        font-size: 1rem !important;
                    }
                }
            `}</style>
        </div>
    );
}
