import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, AlertCircle, Users, CheckCircle2, Calendar, BookOpen, Target, Flame, Zap, Play, Pause, RotateCcw, Youtube, Music } from 'lucide-react';
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

// Simple Focus Timer for Shared View
function SharedFocusTimer({ onTimerComplete }) {
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [isActive, setIsActive] = useState(false);
    const [mode, setMode] = useState('focus');

    useEffect(() => {
        let interval = null;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(time => {
                    if (time <= 1) {
                        setIsActive(false);
                        onTimerComplete && onTimerComplete(25/60);
                        return 25 * 60;
                    }
                    return time - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft, onTimerComplete]);

    const toggleTimer = () => setIsActive(!isActive);
    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(mode === 'focus' ? 25 * 60 : mode === 'short' ? 5 * 60 : 15 * 60);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = ((mode === 'focus' ? 25 * 60 : mode === 'short' ? 5 * 60 : 15 * 60) - timeLeft) / (mode === 'focus' ? 25 * 60 : mode === 'short' ? 5 * 60 : 15 * 60) * 100;

    return (
        <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '24px',
            gap: '20px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={16} color="#8b5cf6" />
                <h3 style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Focus Session
                </h3>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
                {/* Circular Progress */}
                <div style={{ position: 'relative', width: '180px', height: '180px' }}>
                    <svg width="180" height="180" viewBox="0 0 180 180">
                        <circle cx="90" cy="90" r="80" fill="none" stroke="var(--border)" strokeWidth="8" />
                        <circle 
                            cx="90" 
                            cy="90" 
                            r="80" 
                            fill="none" 
                            stroke="#8b5cf6" 
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 80}`}
                            strokeDashoffset={`${2 * Math.PI * 80 * (1 - progress / 100)}`}
                            transform="rotate(-90 90 90)"
                            style={{ transition: 'stroke-dashoffset 1s linear' }}
                        />
                    </svg>
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '2.5rem', fontWeight: '300', color: 'var(--text-main)' }}>
                            {formatTime(timeLeft)}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {mode === 'focus' ? 'Focus' : mode === 'short' ? 'Short Break' : 'Long Break'}
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={toggleTimer}
                        style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            backgroundColor: '#8b5cf6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        {isActive ? <Pause size={24} color="white" /> : <Play size={24} color="white" />}
                    </button>
                    <button
                        onClick={resetTimer}
                        style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--bg-hover)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid var(--border)',
                            cursor: 'pointer'
                        }}
                    >
                        <RotateCcw size={24} color="var(--text-muted)" />
                    </button>
                </div>

                {/* Mode Selector */}
                <div style={{ display: 'flex', gap: '8px', backgroundColor: 'var(--bg-hover)', padding: '4px', borderRadius: '10px' }}>
                    {['focus', 'short', 'long'].map((m) => (
                        <button
                            key={m}
                            onClick={() => {
                                setMode(m);
                                setTimeLeft(m === 'focus' ? 25 * 60 : m === 'short' ? 5 * 60 : 15 * 60);
                                setIsActive(false);
                            }}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                backgroundColor: mode === m ? 'var(--bg-card)' : 'transparent',
                                color: mode === m ? 'var(--text-main)' : 'var(--text-muted)',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            {m === 'focus' ? 'Focus' : m === 'short' ? 'Short' : 'Long'}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Simple Now Playing for Shared View
function SharedNowPlaying() {
    const [videoId, setVideoId] = useState('jfKfPfyJRdk');
    const [tempUrl, setTempUrl] = useState('');
    const [showInput, setShowInput] = useState(false);

    const extractVideoId = (url) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const handleUpdateVideo = (e) => {
        e.preventDefault();
        const id = extractVideoId(tempUrl);
        if (id) {
            setVideoId(id);
            setShowInput(false);
            setTempUrl('');
        } else if (tempUrl.length === 11) {
            setVideoId(tempUrl);
            setShowInput(false);
            setTempUrl('');
        }
    };

    return (
        <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '16px',
            gap: '12px'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Youtube size={20} color="#ff0000" />
                    <h3 style={{ fontSize: '0.9rem', fontWeight: '600' }}>Now Playing</h3>
                </div>
                <button
                    onClick={() => setShowInput(!showInput)}
                    style={{
                        padding: '8px',
                        borderRadius: '8px',
                        backgroundColor: showInput ? 'var(--text-main)' : 'var(--bg-hover)',
                        color: showInput ? 'var(--bg-app)' : 'var(--text-muted)',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    {showInput ? '✕' : '🔗'}
                </button>
            </div>

            {showInput && (
                <form onSubmit={handleUpdateVideo} style={{ display: 'flex', gap: '8px' }}>
                    <input
                        type="text"
                        placeholder="YouTube URL or ID"
                        value={tempUrl}
                        onChange={(e) => setTempUrl(e.target.value)}
                        style={{
                            flex: 1,
                            padding: '10px',
                            backgroundColor: 'var(--bg-hover)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            color: 'var(--text-main)'
                        }}
                    />
                    <button 
                        type="submit"
                        style={{
                            padding: '10px 16px',
                            backgroundColor: 'var(--text-main)',
                            color: 'var(--bg-app)',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        Set
                    </button>
                </form>
            )}

            <div style={{
                flex: 1,
                minHeight: '200px',
                borderRadius: '12px',
                overflow: 'hidden',
                backgroundColor: '#000'
            }}>
                <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=0&controls=1&rel=0&modestbranding=1`}
                    title="YouTube"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ border: 'none' }}
                />
            </div>
        </div>
    );
}

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
    
    // Data states
    const [tasks, setTasks] = useState([]);
    const [studySessions, setStudySessions] = useState([]);
    const [goals, setGoals] = useState({});
    const [streak, setStreak] = useState(0);

    // Load shared dashboard
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

    // Subscribe to data
    useEffect(() => {
        if (!isSharedMode || !sharedDashboardOwnerId || !canAccessShared) return;

        const ownerId = sharedDashboardOwnerId;

        const unsubTasks = firestoreService.subscribeSharedTasks(ownerId, (data) => {
            setTasks(data || []);
        });

        const unsubStudy = firestoreService.subscribeSharedStudySessions(ownerId, (data) => {
            setStudySessions(data || []);
        });

        const unsubGoals = firestoreService.subscribeSharedGoals(ownerId, (data) => {
            setGoals(data || {});
        });

        return () => {
            unsubTasks();
            unsubStudy();
            unsubGoals();
        };
    }, [isSharedMode, sharedDashboardOwnerId, canAccessShared]);

    // Calculate streak
    useEffect(() => {
        if (tasks.length === 0) {
            setStreak(0);
            return;
        }

        const today = new Date();
        let currentStreak = 0;
        
        for (let i = 0; i < 365; i++) {
            const checkDate = subDays(today, i);
            const dayTasks = tasks.filter(t => {
                const taskDate = parseSafeDate(t.date);
                return taskDate && isSameDay(taskDate, checkDate);
            });
            
            if (dayTasks.length > 0 && dayTasks.every(t => t.completed)) {
                currentStreak++;
            } else if (i === 0 && dayTasks.length === 0) {
                continue;
            } else {
                break;
            }
        }
        
        setStreak(currentStreak);
    }, [tasks]);

    // Stats
    const stats = useMemo(() => {
        const today = new Date();
        const completedTasks = tasks.filter(t => t.completed).length;
        const totalTasks = tasks.length;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        const todayTasks = tasks.filter(t => {
            const taskDate = parseSafeDate(t.date);
            return taskDate && isSameDay(taskDate, today);
        });
        
        const totalStudyHours = studySessions.reduce((sum, s) => sum + (parseFloat(s.hours) || 0), 0);
        
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
            taskGraphData
        };
    }, [tasks, studySessions]);

    const handleTimerComplete = (hours) => {
        if (canEditShared && sharedDashboardOwnerId) {
            firestoreService.addSharedStudySession(sharedDashboardOwnerId, {
                date: new Date().toISOString(),
                hours: parseFloat(hours)
            });
        }
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
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
                <div style={{ textAlign: 'center', maxWidth: '400px' }}>
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
                    <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>{error}</p>
                    <button
                        onClick={() => navigate('/')}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: 'var(--text-main)',
                            color: 'var(--bg-app)',
                            borderRadius: '10px',
                            fontWeight: '600',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
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
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
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

            {/* Main Content */}
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
                    gridTemplateColumns: 'repeat(12, 1fr)',
                    gridAutoRows: 'minmax(200px, auto)'
                }}>
                    {/* Streak Card */}
                    <div style={{
                        gridColumn: 'span 3',
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '20px',
                        border: '1px solid var(--border)',
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px'
                    }}>
                        <div style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '16px',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Flame size={32} color="#ef4444" />
                        </div>
                        <div style={{ fontSize: '3rem', fontWeight: '800', color: '#ef4444' }}>
                            {streak}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            Day Streak
                        </div>
                    </div>

                    {/* Tasks Overview */}
                    <div style={{
                        gridColumn: 'span 5',
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

                        <div style={{ flex: 1, minHeight: '120px' }}>
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
                                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#22c55e' }}>
                                    {stats.completionRate}%
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Completion</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                                    {stats.todayCompleted}/{stats.todayTasks}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Today</div>
                            </div>
                        </div>
                    </div>

                    {/* Study Hours */}
                    <div style={{
                        gridColumn: 'span 4',
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

                        <div style={{ flex: 1, minHeight: '100px' }}>
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
                            <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#3b82f6' }}>
                                {stats.totalStudyHours}h
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Hours</div>
                        </div>
                    </div>

                    {/* Focus Timer - Using simplified version */}
                    <div style={{
                        gridColumn: 'span 4',
                        gridRow: 'span 2',
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '20px',
                        border: '1px solid var(--border)',
                        overflow: 'hidden',
                        minHeight: '400px'
                    }}>
                        <SharedFocusTimer onTimerComplete={handleTimerComplete} />
                    </div>

                    {/* Now Playing - Using simplified version */}
                    <div style={{
                        gridColumn: 'span 5',
                        gridRow: 'span 2',
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '20px',
                        border: '1px solid var(--border)',
                        overflow: 'hidden',
                        minHeight: '400px'
                    }}>
                        <SharedNowPlaying />
                    </div>

                    {/* Daily Goals */}
                    <div style={{
                        gridColumn: 'span 3',
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

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                            {goals && Object.keys(goals).length > 0 ? (
                                Object.entries(goals).slice(0, 3).map(([key, goal]) => (
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
                                ))
                            ) : (
                                <div style={{ 
                                    flex: 1, 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    color: 'var(--text-muted)',
                                    fontSize: '0.85rem'
                                }}>
                                    No goals set yet
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Tasks */}
                    <div style={{
                        gridColumn: 'span 12',
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '20px',
                        border: '1px solid var(--border)',
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        maxHeight: '350px'
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
                            {tasks.slice(0, 8).map((task) => (
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
                </div>
            </main>

            <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

            {/* Responsive Styles */}
            <style>{`
                @media (max-width: 1200px) {
                    main > div {
                        grid-template-columns: repeat(6, 1fr) !important;
                    }
                    main > div > div {
                        grid-column: span 3 !important;
                    }
                    main > div > div:last-child {
                        grid-column: span 6 !important;
                    }
                }
                
                @media (max-width: 768px) {
                    main > div {
                        grid-template-columns: 1fr !important;
                    }
                    main > div > div {
                        grid-column: span 1 !important;
                        grid-row: span 1 !important;
                    }
                }
            `}</style>
        </div>
    );
}
