import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, AlertCircle, Users, CheckCircle2, Calendar, BookOpen, Target, Flame, Zap, Headphones, Music, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';
import * as firestoreService from '../services/firestoreService';
import { format, isSameDay, subDays, eachDayOfInterval } from 'date-fns';
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip } from 'recharts';
import Lottie from 'lottie-react';

// Lottie Animation URLs
const LOTTIE_ANIMATIONS = {
    loading: 'https://lottie.host/5c6d5c4d-5c3d-4c6e-9c1c-3e7d4f8e9b1a/XyZ123ABC.json', // Loading spinner
    error: 'https://lottie.host/8f9e8d7c-6b5a-4c3d-2e1f-0a9b8c7d6e5f/ErrorABC123.json', // Error/lock
    streak: 'https://lottie.host/9f8e7d6c-5b4a-3c2d-1e0f-9a8b7c6d5e4f/FireAnimation.json', // Fire/streak
    tasks: 'https://lottie.host/1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p/CheckAnimation.json', // Tasks/check
    study: 'https://lottie.host/2b3c4d5e-6f7g-8h9i-0j1k-2l3m4n5o6p7q/BookAnimation.json', // Study/book
    focus: 'https://lottie.host/3c4d5e6f-7g8h-9i0j-1k2l-3m4n5o6p7q8r/ZapAnimation.json', // Focus/zap
    music: 'https://lottie.host/4d5e6f7g-8h9i-0j1k-2l3m-4n5o6p7q8r9s/MusicAnimation.json', // Music/headphones
    goals: 'https://lottie.host/5e6f7g8h-9i0j-1k2l-3m4n-5o6p7q8r9s0t/TargetAnimation.json', // Goals/target
    empty: 'https://lottie.host/6f7g8h9i-0j1k-2l3m-4n5o-6p7q8r9s0t1u/EmptyAnimation.json', // Empty state
};

// Fallback simple animations using CSS when Lottie fails or for specific states
const SimpleAnimations = {
    LoadingSpinner: () => (
        <div style={{
            width: '80px',
            height: '80px',
            border: '4px solid var(--border)',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
        }} />
    ),
    PulseCircle: ({ color = '#3b82f6', size = 60 }) => (
        <div style={{
            width: size,
            height: size,
            borderRadius: '50%',
            backgroundColor: `${color}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'pulse 2s ease-in-out infinite'
        }}>
            <div style={{
                width: size * 0.5,
                height: size * 0.5,
                borderRadius: '50%',
                backgroundColor: color
            }} />
        </div>
    ),
    Bounce: ({ children }) => (
        <div style={{ animation: 'bounce 2s ease-in-out infinite' }}>
            {children}
        </div>
    )
};

// Safe Date Utilities
const parseSafeDate = (dateVal) => {
    if (!dateVal) return null;
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? null : d;
};

// Lottie Animation Component with fallback
function LottieAnimation({ animationData, style = {}, fallback = null }) {
    const [hasError, setHasError] = useState(false);
    const [animationJson, setAnimationJson] = useState(null);

    useEffect(() => {
        if (typeof animationData === 'string' && animationData.startsWith('http')) {
            fetch(animationData)
                .then(res => res.json())
                .then(data => setAnimationJson(data))
                .catch(() => setHasError(true));
        } else {
            setAnimationJson(animationData);
        }
    }, [animationData]);

    if (hasError || !animationJson) {
        return fallback || null;
    }

    return (
        <Lottie
            animationData={animationJson}
            style={{ width: '100%', height: '100%', ...style }}
            loop={true}
            autoplay={true}
        />
    );
}

// Focus Mode Indicator with Lottie
function FocusModeIndicator({ timerState }) {
    const isActive = timerState?.isActive || false;
    const mode = timerState?.mode || 'FOCUS';
    
    const getModeLabel = () => {
        if (mode === 'FOCUS' || mode === 'focus') return 'Focus Session';
        if (mode === 'SHORT_BREAK' || mode === 'short') return 'Short Break';
        if (mode === 'LONG_BREAK' || mode === 'long') return 'Long Break';
        return 'Focus Session';
    };
    
    if (!isActive) {
        return (
            <div style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '20px'
            }}>
                <div style={{ width: 60, height: 60 }}>
                    <LottieAnimation 
                        animationData={LOTTIE_ANIMATIONS.focus}
                        fallback={<Zap size={32} color="var(--text-muted)" />}
                    />
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                        No Active Session
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Owner is not in focus mode
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '16px'
        }}>
            <div style={{ width: 70, height: 70 }}>
                <LottieAnimation 
                    animationData={LOTTIE_ANIMATIONS.focus}
                    fallback={
                        <div style={{
                            width: 64,
                            height: 64,
                            borderRadius: '50%',
                            backgroundColor: 'rgba(139, 92, 246, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            animation: 'pulse 2s ease-in-out infinite'
                        }}>
                            <Zap size={32} color="#8b5cf6" />
                        </div>
                    }
                />
            </div>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#8b5cf6' }}>
                    Owner is in {getModeLabel()}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Currently focusing
                </div>
            </div>
        </div>
    );
}

// Now Playing Indicator with Lottie
function NowPlayingIndicator({ nowPlaying }) {
    const hasMusic = nowPlaying?.videoId && nowPlaying.videoId !== '';
    const youtubeUrl = hasMusic ? `https://www.youtube.com/watch?v=${nowPlaying.videoId}` : null;
    const title = nowPlaying?.title || 'Music playing';
    
    if (!hasMusic) {
        return (
            <div style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '20px'
            }}>
                <div style={{ width: 60, height: 60 }}>
                    <LottieAnimation 
                        animationData={LOTTIE_ANIMATIONS.music}
                        fallback={<Music size={28} color="var(--text-muted)" />}
                    />
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                        No Music Playing
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Owner is not listening to anything
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            padding: '16px'
        }}>
            <div style={{ width: 56, height: 56 }}>
                <LottieAnimation 
                    animationData={LOTTIE_ANIMATIONS.music}
                    fallback={
                        <div style={{
                            width: 56,
                            height: 56,
                            borderRadius: '50%',
                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            animation: 'pulse 2s ease-in-out infinite'
                        }}>
                            <Headphones size={28} color="#ef4444" />
                        </div>
                    }
                />
            </div>
            <div style={{ textAlign: 'center', width: '100%' }}>
                <div style={{ 
                    fontSize: '0.85rem', 
                    fontWeight: '700', 
                    color: '#ef4444'
                }}>
                    Owner is playing music now
                </div>
                <div style={{ 
                    fontSize: '0.75rem', 
                    color: 'var(--text-main)', 
                    marginTop: '4px',
                    fontWeight: '500',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    padding: '0 8px'
                }}>
                    {title}
                </div>
                <a 
                    href={youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginTop: '8px',
                        padding: '8px 14px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        textDecoration: 'none',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#dc2626';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#ef4444';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.3)';
                    }}
                >
                    <ExternalLink size={12} />
                    Listen Now
                </a>
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
    
    const [tasks, setTasks] = useState([]);
    const [studySessions, setStudySessions] = useState([]);
    const [goals, setGoals] = useState({});
    const [streak, setStreak] = useState(0);
    const [ownerTimerState, setOwnerTimerState] = useState(null);
    const [ownerNowPlaying, setOwnerNowPlaying] = useState(null);

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

        const unsubStats = firestoreService.subscribeSharedUserStats(ownerId, (data) => {
            setStreak(data?.streak || 0);
        });

        const unsubTimer = firestoreService.subscribeSharedTimerState(ownerId, (data) => {
            setOwnerTimerState(data);
        });

        const unsubNowPlaying = firestoreService.subscribeSharedNowPlaying(ownerId, (data) => {
            setOwnerNowPlaying(data);
        });

        return () => {
            unsubTasks();
            unsubStudy();
            unsubGoals();
            unsubStats();
            unsubTimer();
            unsubNowPlaying();
        };
    }, [isSharedMode, sharedDashboardOwnerId, canAccessShared]);

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

    if (loading) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-app)',
                flexDirection: 'column',
                gap: '20px'
            }}>
                <div style={{ width: 120, height: 120 }}>
                    <SimpleAnimations.LoadingSpinner />
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 500 }}>
                    Loading shared dashboard...
                </p>
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
                    <div style={{ width: 100, height: 100, margin: '0 auto 20px' }}>
                        <div style={{
                            width: 100,
                            height: 100,
                            borderRadius: '50%',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Lock size={48} color="#ef4444" />
                        </div>
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
        <div className="shared-dashboard" style={{ 
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
                            <span style={{ color: '#3b82f6' }}>• View Only</span>
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
                <span>You have view-only access to this dashboard.</span>
            </div>

            {/* Main Content - Bento Grid */}
            <main className="bento-grid-container" style={{
                flex: 1,
                padding: '20px',
                overflow: 'auto'
            }}>
                <div className="bento-grid" style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                    display: 'grid',
                    gap: '16px',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gridAutoRows: 'minmax(140px, auto)'
                }}>
                    {/* Streak Card with Lottie */}
                    <div className="bento-card streak-card" style={{
                        gridColumn: 'span 1',
                        gridRow: 'span 1',
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '16px',
                        border: '1px solid var(--border)',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}>
                        <div style={{ width: 50, height: 50 }}>
                            <LottieAnimation 
                                animationData={LOTTIE_ANIMATIONS.streak}
                                fallback={
                                    <div style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: '12px',
                                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Flame size={24} color="#ef4444" />
                                    </div>
                                }
                            />
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: '800', color: '#ef4444' }}>
                            {streak}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Day Streak
                        </div>
                    </div>

                    {/* Completion Rate Card with Lottie */}
                    <div className="bento-card completion-card" style={{
                        gridColumn: 'span 1',
                        gridRow: 'span 1',
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '16px',
                        border: '1px solid var(--border)',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}>
                        <div style={{ width: 50, height: 50 }}>
                            <LottieAnimation 
                                animationData={LOTTIE_ANIMATIONS.tasks}
                                fallback={
                                    <div style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: '12px',
                                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <CheckCircle2 size={24} color="#22c55e" />
                                    </div>
                                }
                            />
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: '800', color: '#22c55e' }}>
                            {stats.completionRate}%
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Completion
                        </div>
                    </div>

                    {/* Focus Mode Card with Lottie */}
                    <div className="bento-card focus-card" style={{
                        gridColumn: 'span 1',
                        gridRow: 'span 1',
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '16px',
                        border: '1px solid var(--border)',
                        overflow: 'hidden'
                    }}>
                        <FocusModeIndicator timerState={ownerTimerState} />
                    </div>

                    {/* Now Playing Card with Lottie */}
                    <div className="bento-card music-card" style={{
                        gridColumn: 'span 1',
                        gridRow: 'span 1',
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '16px',
                        border: '1px solid var(--border)',
                        overflow: 'hidden'
                    }}>
                        <NowPlayingIndicator nowPlaying={ownerNowPlaying} />
                    </div>

                    {/* Tasks Overview - Large */}
                    <div className="bento-card tasks-card" style={{
                        gridColumn: 'span 2',
                        gridRow: 'span 2',
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '16px',
                        border: '1px solid var(--border)',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: 40, height: 40 }}>
                                <LottieAnimation 
                                    animationData={LOTTIE_ANIMATIONS.tasks}
                                    fallback={
                                        <div style={{
                                            width: 36,
                                            height: 36,
                                            borderRadius: '10px',
                                            backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <CheckCircle2 size={18} color="#22c55e" />
                                        </div>
                                    }
                                />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '0.95rem', fontWeight: '600' }}>Tasks Overview</h3>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                    {stats.completedTasks} of {stats.totalTasks} completed
                                </p>
                            </div>
                        </div>

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

                        <div style={{ display: 'flex', gap: '16px' }}>
                            <div>
                                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#22c55e' }}>
                                    {stats.todayCompleted}/{stats.todayTasks}
                                </div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Today</div>
                            </div>
                        </div>
                    </div>

                    {/* Study Hours - Medium */}
                    <div className="bento-card study-card" style={{
                        gridColumn: 'span 2',
                        gridRow: 'span 1',
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '16px',
                        border: '1px solid var(--border)',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: 40, height: 40 }}>
                                <LottieAnimation 
                                    animationData={LOTTIE_ANIMATIONS.study}
                                    fallback={
                                        <div style={{
                                            width: 36,
                                            height: 36,
                                            borderRadius: '10px',
                                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <BookOpen size={18} color="#3b82f6" />
                                        </div>
                                    }
                                />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '0.9rem', fontWeight: '600' }}>Study Hours</h3>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Last 7 days</p>
                            </div>
                            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#3b82f6' }}>
                                    {stats.totalStudyHours}h
                                </div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Total</div>
                            </div>
                        </div>

                        <div style={{ flex: 1, minHeight: '80px' }}>
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
                                        tick={{ fill: 'var(--text-muted)', fontSize: 9 }}
                                    />
                                    <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Daily Goals - Medium */}
                    <div className="bento-card goals-card" style={{
                        gridColumn: 'span 2',
                        gridRow: 'span 1',
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '16px',
                        border: '1px solid var(--border)',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: 40, height: 40 }}>
                                <LottieAnimation 
                                    animationData={LOTTIE_ANIMATIONS.goals}
                                    fallback={
                                        <div style={{
                                            width: 36,
                                            height: 36,
                                            borderRadius: '10px',
                                            backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <Target size={18} color="#22c55e" />
                                        </div>
                                    }
                                />
                            </div>
                            <h3 style={{ fontSize: '0.9rem', fontWeight: '600' }}>Daily Goals</h3>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, justifyContent: 'center' }}>
                            {goals && Object.keys(goals).length > 0 ? (
                                (() => {
                                    const today = new Date();
                                    const todayHours = studySessions
                                        .filter(s => {
                                            const sessionDate = parseSafeDate(s.date);
                                            return sessionDate && isSameDay(sessionDate, today);
                                        })
                                        .reduce((sum, s) => sum + (parseFloat(s.hours) || 0), 0);
                                    
                                    return Object.entries(goals).slice(0, 2).map(([key, goal]) => {
                                        const completed = Math.min(todayHours, goal.hours);
                                        const percentage = goal.hours > 0 ? (completed / goal.hours) * 100 : 0;
                                        
                                        return (
                                            <div key={key}>
                                                <div style={{ 
                                                    display: 'flex', 
                                                    justifyContent: 'space-between',
                                                    fontSize: '0.75rem',
                                                    marginBottom: '4px'
                                                }}>
                                                    <span style={{ color: 'var(--text-muted)' }}>Goal</span>
                                                    <span style={{ fontWeight: '600', fontSize: '0.8rem' }}>
                                                        {completed.toFixed(1)}h / {goal.hours}h
                                                    </span>
                                                </div>
                                                <div style={{
                                                    height: '6px',
                                                    backgroundColor: 'var(--border)',
                                                    borderRadius: '3px',
                                                    overflow: 'hidden'
                                                }}>
                                                    <div style={{
                                                        height: '100%',
                                                        width: `${Math.min(percentage, 100)}%`,
                                                        backgroundColor: percentage >= 100 ? '#22c55e' : '#3b82f6',
                                                        borderRadius: '3px',
                                                        transition: 'width 0.3s ease'
                                                    }} />
                                                </div>
                                            </div>
                                        );
                                    });
                                })()
                            ) : (
                                <div style={{ 
                                    textAlign: 'center',
                                    color: 'var(--text-muted)',
                                    fontSize: '0.8rem'
                                }}>
                                    No goals set yet
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Tasks - Wide */}
                    <div className="bento-card recent-tasks-card" style={{
                        gridColumn: 'span 4',
                        gridRow: 'span 1',
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '16px',
                        border: '1px solid var(--border)',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Calendar size={18} color="var(--text-muted)" />
                            <h3 style={{ fontSize: '0.9rem', fontWeight: '600' }}>Recent Tasks</h3>
                        </div>

                        <div style={{ 
                            flex: 1,
                            overflow: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            maxHeight: '150px'
                        }}>
                            {tasks.length > 0 ? (
                                tasks.slice(0, 6).map((task, index) => (
                                    <div
                                        key={task.id}
                                        style={{
                                            padding: '8px 12px',
                                            backgroundColor: 'var(--bg-hover)',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            opacity: task.completed ? 0.6 : 1,
                                            animation: `fadeInUp 0.3s ease forwards`,
                                            animationDelay: `${index * 0.05}s`
                                        }}
                                    >
                                        <div style={{
                                            width: '16px',
                                            height: '16px',
                                            borderRadius: '50%',
                                            border: `2px solid ${task.completed ? '#22c55e' : 'var(--border)'}`,
                                            backgroundColor: task.completed ? '#22c55e' : 'transparent',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            {task.completed && <CheckCircle2 size={10} color="white" />}
                                        </div>
                                        <span style={{
                                            flex: 1,
                                            textDecoration: task.completed ? 'line-through' : 'none',
                                            color: task.completed ? 'var(--text-muted)' : 'var(--text-main)',
                                            fontSize: '0.85rem'
                                        }}>
                                            {task.text}
                                        </span>
                                        {task.date && (
                                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                                {format(parseSafeDate(task.date), 'MMM d')}
                                            </span>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div style={{ 
                                    textAlign: 'center', 
                                    padding: '20px', 
                                    color: 'var(--text-muted)', 
                                    fontSize: '0.85rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '12px'
                                }}>
                                    <div style={{ width: 60, height: 60 }}>
                                        <LottieAnimation 
                                            animationData={LOTTIE_ANIMATIONS.empty}
                                            fallback={<Calendar size={32} color="var(--text-muted)" />}
                                        />
                                    </div>
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
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.05); opacity: 0.8; }
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                @media (max-width: 1024px) {
                    .bento-grid {
                        grid-template-columns: repeat(2, 1fr) !important;
                    }
                    .bento-card {
                        grid-column: span 1 !important;
                    }
                    .tasks-card {
                        grid-column: span 2 !important;
                        grid-row: span 2 !important;
                    }
                    .study-card, .goals-card {
                        grid-column: span 1 !important;
                    }
                    .recent-tasks-card {
                        grid-column: span 2 !important;
                    }
                }
                
                @media (max-width: 640px) {
                    .bento-grid {
                        grid-template-columns: 1fr !important;
                        gap: 12px !important;
                    }
                    .bento-card {
                        grid-column: span 1 !important;
                        grid-row: span 1 !important;
                    }
                    .tasks-card {
                        grid-row: span 2 !important;
                    }
                    .shared-dashboard header {
                        padding: 12px 16px !important;
                    }
                    .shared-dashboard header h1 {
                        font-size: 1rem !important;
                    }
                    .bento-grid-container {
                        padding: 12px !important;
                    }
                }
            `}</style>
        </div>
    );
}
