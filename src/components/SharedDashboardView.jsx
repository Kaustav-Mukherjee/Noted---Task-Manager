import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, AlertCircle, Users, CheckCircle2, Calendar, BookOpen, Target, Flame, Zap, Headphones, Music, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';
import * as firestoreService from '../services/firestoreService';
import { format, isSameDay, subDays, eachDayOfInterval } from 'date-fns';
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip } from 'recharts';
import Lottie from 'lottie-react';
import { motion, AnimatePresence } from 'framer-motion';

// Lottie Animation URLs
const LOTTIE_ANIMATIONS = {
    loading: 'https://assets2.lottiefiles.com/packages/lf20_UJNc2t.json',
    fire: 'https://assets10.lottiefiles.com/packages/lf20_3jmvq04g.json',
    check: 'https://assets2.lottiefiles.com/packages/lf20_s2lryxtd.json',
    book: 'https://assets9.lottiefiles.com/packages/lf20_1idqu1ac.json',
    zap: 'https://assets3.lottiefiles.com/packages/lf20_hu7birqV.json',
    music: 'https://assets4.lottiefiles.com/packages/lf20_6wutsrox.json',
    target: 'https://assets8.lottiefiles.com/packages/lf20_qp1q7mct.json',
    empty: 'https://assets5.lottiefiles.com/packages/lf20_s8pbrcfw.json',
    lock: 'https://assets1.lottiefiles.com/packages/lf20_6w34Hv.json',
    focus: 'https://assets3.lottiefiles.com/packages/lf20_w51pcehl.json',
    chart: 'https://assets9.lottiefiles.com/packages/lf20_qp1q7mct.json',
    calendar: 'https://assets10.lottiefiles.com/packages/lf20_u4yrau.json',
};

// Safe Date Utilities
const parseSafeDate = (dateVal) => {
    if (!dateVal) return null;
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? null : d;
};

// Lottie Animation Component
function LottieAnimation({ animationData, style = {}, fallback = null }) {
    const [hasError, setHasError] = useState(false);
    const [animationJson, setAnimationJson] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (typeof animationData === 'string' && animationData.startsWith('http')) {
            fetch(animationData)
                .then(res => res.json())
                .then(data => {
                    setAnimationJson(data);
                    setIsLoading(false);
                })
                .catch(() => {
                    setHasError(true);
                    setIsLoading(false);
                });
        } else {
            setAnimationJson(animationData);
            setIsLoading(false);
        }
    }, [animationData]);

    if (isLoading || hasError || !animationJson) {
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

// Focus Mode Indicator Component
function FocusModeIndicator({ timerState }) {
    const isActive = timerState?.isActive || false;
    const mode = timerState?.mode || 'FOCUS';
    
    const getModeLabel = () => {
        if (mode === 'FOCUS' || mode === 'focus') return 'Focus Session';
        if (mode === 'SHORT_BREAK' || mode === 'short') return 'Short Break';
        if (mode === 'LONG_BREAK' || mode === 'long') return 'Long Break';
        return 'Focus Session';
    };
    
    const getModeColor = () => {
        if (mode === 'FOCUS' || mode === 'focus') return '#8b5cf6';
        if (mode === 'SHORT_BREAK' || mode === 'short') return '#22c55e';
        if (mode === 'LONG_BREAK' || mode === 'long') return '#3b82f6';
        return '#8b5cf6';
    };
    
    const modeColor = getModeColor();
    
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
            <div style={{ width: 70, height: 70 }}>
                <LottieAnimation 
                    animationData={LOTTIE_ANIMATIONS.focus}
                    fallback={
                        <div style={{
                            width: 64,
                            height: 64,
                            borderRadius: '50%',
                            backgroundColor: `${modeColor}20`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Zap size={32} color={modeColor} />
                        </div>
                    }
                />
            </div>
            <div style={{ textAlign: 'center' }}>
                <div style={{ 
                    fontSize: '0.9rem', 
                    fontWeight: '700', 
                    color: isActive ? modeColor : 'var(--text-muted)',
                }}>
                    {isActive ? `Owner is in ${getModeLabel()}` : 'No Active Session'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {isActive ? 'Currently focusing' : 'Owner is not in focus mode'}
                </div>
            </div>
            {isActive && (
                <div
                    style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: modeColor,
                        marginTop: '4px',
                        animation: 'pulse 1.5s ease-in-out infinite',
                    }}
                />
            )}
        </div>
    );
}

// Now Playing Indicator Component
function NowPlayingIndicator({ nowPlaying }) {
    const hasMusic = nowPlaying?.videoId && nowPlaying.videoId !== '';
    const youtubeUrl = hasMusic ? `https://www.youtube.com/watch?v=${nowPlaying.videoId}` : null;
    const title = nowPlaying?.title || 'Music playing';
    
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
            <div style={{ width: 65, height: 65 }}>
                <LottieAnimation 
                    animationData={LOTTIE_ANIMATIONS.music}
                    fallback={
                        <div style={{
                            width: 56,
                            height: 56,
                            borderRadius: '50%',
                            backgroundColor: hasMusic ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Headphones size={28} color={hasMusic ? '#ef4444' : 'var(--text-muted)'} />
                        </div>
                    }
                />
            </div>
            <div style={{ textAlign: 'center', width: '100%' }}>
                <div style={{ 
                    fontSize: '0.9rem', 
                    fontWeight: '700', 
                    color: hasMusic ? '#ef4444' : 'var(--text-muted)',
                }}>
                    {hasMusic ? 'Owner is playing music now' : 'No Music Playing'}
                </div>
                {hasMusic && (
                    <div>
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
                            className="listen-button"
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
                                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <ExternalLink size={12} />
                            Listen Now
                        </a>
                    </div>
                )}
            </div>
            {hasMusic && (
                <div
                    style={{
                        display: 'flex',
                        gap: '3px',
                        marginTop: '4px',
                        height: '20px',
                        alignItems: 'flex-end',
                    }}
                >
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            style={{
                                width: 3,
                                height: '12px',
                                backgroundColor: '#ef4444',
                                borderRadius: '2px',
                                transformOrigin: 'bottom',
                                animation: `equalizer-scale 0.8s ease-in-out ${i * 0.15}s infinite`,
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// Animated Number Component
function AnimatedNumber({ value, suffix = '' }) {
    const [displayValue, setDisplayValue] = useState(0);
    
    useEffect(() => {
        const duration = 1500;
        const steps = 60;
        const stepValue = value / steps;
        const stepDuration = duration / steps;
        let current = 0;
        
        const timer = setInterval(() => {
            current += stepValue;
            if (current >= value) {
                setDisplayValue(value);
                clearInterval(timer);
            } else {
                setDisplayValue(Math.floor(current));
            }
        }, stepDuration);
        
        return () => clearInterval(timer);
    }, [value]);
    
    return <span>{displayValue}{suffix}</span>;
}

// Loading Screen Component
function LoadingScreen() {
    return (
        <div
            style={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-app)',
                flexDirection: 'column',
                gap: '20px',
            }}
        >
            <div style={{ width: 150, height: 150 }}>
                <LottieAnimation 
                    animationData={LOTTIE_ANIMATIONS.loading}
                    fallback={
                        <div
                            style={{
                                width: 80,
                                height: 80,
                                border: '4px solid var(--border)',
                                borderTop: '4px solid #3b82f6',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite',
                            }}
                        />
                    }
                />
            </div>
            <p style={{ 
                color: 'var(--text-muted)', 
                fontSize: '1rem', 
                fontWeight: 500,
            }}>
                Loading shared dashboard...
            </p>
            <div
                style={{
                    width: 200,
                    height: 4,
                    backgroundColor: 'var(--border)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        height: '100%',
                        backgroundColor: '#3b82f6',
                        borderRadius: '2px',
                        animation: 'progress 2s ease-in-out infinite',
                    }}
                />
            </div>
        </div>
    );
}

// Error Screen Component
function ErrorScreen({ error, onBack }) {
    return (
        <div
            style={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-app)',
                padding: '20px',
            }}
        >
            <div style={{ textAlign: 'center', maxWidth: '400px' }}>
                <div style={{ width: 120, height: 120, margin: '0 auto 20px' }}>
                    <LottieAnimation 
                        animationData={LOTTIE_ANIMATIONS.lock}
                        fallback={
                            <div
                                style={{
                                    width: 100,
                                    height: 100,
                                    borderRadius: '50%',
                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Lock size={48} color="#ef4444" />
                            </div>
                        }
                    />
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '12px' }}>
                    Access Denied
                </h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                    {error}
                </p>
                <button
                    onClick={onBack}
                    style={{
                        padding: '12px 24px',
                        backgroundColor: 'var(--text-main)',
                        color: 'var(--bg-app)',
                        borderRadius: '10px',
                        fontWeight: '600',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                    }}
                >
                    Go Home
                </button>
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
        return <LoadingScreen />;
    }

    if (error) {
        return <ErrorScreen error={error} onBack={() => navigate('/')} />;
    }

    return (
        <div className="shared-dashboard">
            {/* CSS Styles */}
            <style>{`
                .shared-dashboard {
                    min-height: 100vh;
                    background: var(--bg-app);
                    display: flex;
                    flex-direction: column;
                }
                
                .dashboard-header {
                    padding: 16px 24px;
                    background-color: var(--bg-card);
                    border-bottom: 1px solid var(--border);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-shrink: 0;
                }
                
                .back-button {
                    padding: 8px;
                    border-radius: 8px;
                    color: var(--text-muted);
                    background: none;
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.2s ease;
                }
                
                .back-button:hover {
                    background-color: var(--bg-hover);
                    color: var(--text-main);
                    transform: scale(1.05);
                }
                
                .sign-in-button {
                    padding: 10px 20px;
                    background-color: var(--text-main);
                    color: var(--bg-app);
                    border-radius: 10px;
                    font-weight: 600;
                    font-size: 0.9rem;
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                
                .sign-in-button:hover {
                    transform: scale(1.05);
                    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
                }
                
                .view-only-banner {
                    padding: 12px 24px;
                    background-color: rgba(59, 130, 246, 0.1);
                    border-bottom: 1px solid rgba(59, 130, 246, 0.2);
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    color: #3b82f6;
                    font-size: 0.9rem;
                    flex-shrink: 0;
                }
                
                .bento-grid-container {
                    flex: 1;
                    padding: 20px;
                    overflow: auto;
                }
                
                .bento-grid {
                    max-width: 1200px;
                    margin: 0 auto;
                    display: grid;
                    gap: 16px;
                    grid-template-columns: repeat(4, 1fr);
                    grid-auto-rows: minmax(140px, auto);
                }
                
                /* Bento Card Base Styles with Hover Glow */
                .bento-card {
                    background-color: var(--bg-card);
                    border-radius: 16px;
                    border: 1px solid var(--border);
                    position: relative;
                    overflow: hidden;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                
                .bento-card::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: radial-gradient(circle at 50% 100%, transparent 0%, transparent 100%);
                    opacity: 0;
                    transition: opacity 0.3s ease;
                    pointer-events: none;
                    z-index: 0;
                }
                
                .bento-card:hover {
                    transform: translateY(-4px);
                    border-color: rgba(255, 255, 255, 0.2);
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                }
                
                .bento-card:hover::before {
                    opacity: 1;
                }
                
                /* Card-specific glow colors */
                .streak-card:hover {
                    box-shadow: 0 20px 40px rgba(239, 68, 68, 0.25), 
                                0 0 60px rgba(239, 68, 68, 0.15),
                                inset 0 1px 0 rgba(255, 255, 255, 0.1);
                    border-color: rgba(239, 68, 68, 0.4);
                }
                
                .streak-card:hover::before {
                    background: radial-gradient(circle at 50% 0%, rgba(239, 68, 68, 0.15) 0%, transparent 70%);
                }
                
                .completion-card:hover {
                    box-shadow: 0 20px 40px rgba(34, 197, 94, 0.25), 
                                0 0 60px rgba(34, 197, 94, 0.15),
                                inset 0 1px 0 rgba(255, 255, 255, 0.1);
                    border-color: rgba(34, 197, 94, 0.4);
                }
                
                .completion-card:hover::before {
                    background: radial-gradient(circle at 50% 0%, rgba(34, 197, 94, 0.15) 0%, transparent 70%);
                }
                
                .focus-card:hover {
                    box-shadow: 0 20px 40px rgba(139, 92, 246, 0.25), 
                                0 0 60px rgba(139, 92, 246, 0.15),
                                inset 0 1px 0 rgba(255, 255, 255, 0.1);
                    border-color: rgba(139, 92, 246, 0.4);
                }
                
                .focus-card:hover::before {
                    background: radial-gradient(circle at 50% 0%, rgba(139, 92, 246, 0.15) 0%, transparent 70%);
                }
                
                .music-card:hover {
                    box-shadow: 0 20px 40px rgba(239, 68, 68, 0.25), 
                                0 0 60px rgba(239, 68, 68, 0.15),
                                inset 0 1px 0 rgba(255, 255, 255, 0.1);
                    border-color: rgba(239, 68, 68, 0.4);
                }
                
                .music-card:hover::before {
                    background: radial-gradient(circle at 50% 0%, rgba(239, 68, 68, 0.15) 0%, transparent 70%);
                }
                
                .tasks-card:hover {
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3), 
                                0 0 40px rgba(34, 197, 94, 0.1),
                                inset 0 1px 0 rgba(255, 255, 255, 0.1);
                }
                
                .tasks-card:hover::before {
                    background: radial-gradient(circle at 50% 0%, rgba(34, 197, 94, 0.1) 0%, transparent 70%);
                }
                
                .study-card:hover {
                    box-shadow: 0 20px 40px rgba(59, 130, 246, 0.25), 
                                0 0 60px rgba(59, 130, 246, 0.15),
                                inset 0 1px 0 rgba(255, 255, 255, 0.1);
                    border-color: rgba(59, 130, 246, 0.4);
                }
                
                .study-card:hover::before {
                    background: radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.15) 0%, transparent 70%);
                }
                
                .goals-card:hover {
                    box-shadow: 0 20px 40px rgba(34, 197, 94, 0.25), 
                                0 0 60px rgba(34, 197, 94, 0.15),
                                inset 0 1px 0 rgba(255, 255, 255, 0.1);
                    border-color: rgba(34, 197, 94, 0.4);
                }
                
                .goals-card:hover::before {
                    background: radial-gradient(circle at 50% 0%, rgba(34, 197, 94, 0.15) 0%, transparent 70%);
                }
                
                .recent-tasks-card:hover {
                    box-shadow: 0 16px 35px rgba(0, 0, 0, 0.25),
                                inset 0 1px 0 rgba(255, 255, 255, 0.1);
                }
                
                .recent-tasks-card:hover::before {
                    background: radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.05) 0%, transparent 70%);
                }
                
                /* Card content positioning */
                .card-content {
                    position: relative;
                    z-index: 1;
                    height: 100%;
                }
                
                /* Animations */
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                
                @keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.3); opacity: 0.7; }
                }
                
                @keyframes equalizer-scale {
                    0%, 100% { transform: scaleY(1); }
                    50% { transform: scaleY(1.6); }
                }
                
                @keyframes progress {
                    0% { width: 0%; margin-left: 0%; }
                    50% { width: 100%; margin-left: 0%; }
                    100% { width: 0%; margin-left: 100%; }
                }
                
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                /* Listen button hover */
                .listen-button:hover {
                    background-color: #dc2626 !important;
                    transform: scale(1.05);
                    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4) !important;
                }
                
                /* Task item hover */
                .task-item {
                    transition: all 0.2s ease;
                }
                
                .task-item:hover {
                    transform: scale(1.02);
                    background-color: var(--bg-card) !important;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                }
                
                /* Grid positioning */
                .streak-card, .completion-card, .focus-card, .music-card {
                    grid-column: span 1;
                    grid-row: span 1;
                }
                
                .tasks-card {
                    grid-column: span 2;
                    grid-row: span 2;
                    padding: 20px;
                }
                
                .study-card, .goals-card {
                    grid-column: span 2;
                    grid-row: span 1;
                    padding: 16px;
                }
                
                .recent-tasks-card {
                    grid-column: span 4;
                    grid-row: span 1;
                    padding: 16px;
                }
                
                /* Responsive */
                @media (max-width: 1024px) {
                    .bento-grid {
                        grid-template-columns: repeat(2, 1fr) !important;
                    }
                    .streak-card, .completion-card, .focus-card, .music-card {
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
                    .streak-card, .completion-card, .focus-card, .music-card,
                    .tasks-card, .study-card, .goals-card, .recent-tasks-card {
                        grid-column: span 1 !important;
                        grid-row: span 1 !important;
                    }
                    .tasks-card {
                        grid-row: span 2 !important;
                    }
                    .dashboard-header {
                        padding: 12px 16px !important;
                    }
                    .dashboard-header h1 {
                        font-size: 1rem !important;
                    }
                    .bento-grid-container {
                        padding: 12px !important;
                    }
                }
            `}</style>

            {/* Header */}
            <header className="dashboard-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button className="back-button" onClick={() => navigate('/')}>
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
                            marginTop: '2px',
                        }}>
                            <Users size={12} />
                            <span>Shared Dashboard</span>
                            <span style={{ color: '#3b82f6' }}>• View Only</span>
                        </div>
                    </div>
                </div>

                {!user && (
                    <button className="sign-in-button" onClick={() => setShowAuthModal(true)}>
                        Sign In
                    </button>
                )}
            </header>

            {/* View-only Banner */}
            <div className="view-only-banner">
                <AlertCircle size={18} />
                <span>You have view-only access to this dashboard.</span>
            </div>

            {/* Main Content - Bento Grid */}
            <main className="bento-grid-container">
                <motion.div 
                    className="bento-grid"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    {/* Streak Card */}
                    <motion.div 
                        className="bento-card streak-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.5 }}
                    >
                        <div className="card-content" style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '16px',
                            height: '100%',
                        }}>
                            <div style={{ width: 55, height: 55 }}>
                                <LottieAnimation 
                                    animationData={LOTTIE_ANIMATIONS.fire}
                                    fallback={
                                        <div style={{
                                            width: 44,
                                            height: 44,
                                            borderRadius: '12px',
                                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}>
                                            <Flame size={24} color="#ef4444" />
                                        </div>
                                    }
                                />
                            </div>
                            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#ef4444' }}>
                                <AnimatedNumber value={streak} />
                            </div>
                            <div style={{ 
                                fontSize: '0.7rem', 
                                color: 'var(--text-muted)', 
                                textTransform: 'uppercase', 
                                letterSpacing: '0.05em',
                                fontWeight: '600',
                            }}>
                                Day Streak
                            </div>
                        </div>
                    </motion.div>

                    {/* Completion Rate Card */}
                    <motion.div 
                        className="bento-card completion-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15, duration: 0.5 }}
                    >
                        <div className="card-content" style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '16px',
                            height: '100%',
                        }}>
                            <div style={{ width: 55, height: 55 }}>
                                <LottieAnimation 
                                    animationData={LOTTIE_ANIMATIONS.check}
                                    fallback={
                                        <div style={{
                                            width: 44,
                                            height: 44,
                                            borderRadius: '12px',
                                            backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}>
                                            <CheckCircle2 size={24} color="#22c55e" />
                                        </div>
                                    }
                                />
                            </div>
                            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#22c55e' }}>
                                <AnimatedNumber value={stats.completionRate} suffix="%" />
                            </div>
                            <div style={{ 
                                fontSize: '0.7rem', 
                                color: 'var(--text-muted)', 
                                textTransform: 'uppercase', 
                                letterSpacing: '0.05em',
                                fontWeight: '600',
                            }}>
                                Completion
                            </div>
                        </div>
                    </motion.div>

                    {/* Focus Mode Card */}
                    <motion.div 
                        className="bento-card focus-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                    >
                        <div className="card-content">
                            <FocusModeIndicator timerState={ownerTimerState} />
                        </div>
                    </motion.div>

                    {/* Now Playing Card */}
                    <motion.div 
                        className="bento-card music-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25, duration: 0.5 }}
                    >
                        <div className="card-content">
                            <NowPlayingIndicator nowPlaying={ownerNowPlaying} />
                        </div>
                    </motion.div>

                    {/* Tasks Overview Card */}
                    <motion.div 
                        className="bento-card tasks-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                    >
                        <div className="card-content" style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: 45, height: 45 }}>
                                    <LottieAnimation 
                                        animationData={LOTTIE_ANIMATIONS.chart}
                                        fallback={
                                            <div style={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: '10px',
                                                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
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
                                                fontSize: '0.75rem',
                                                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
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
                    </motion.div>

                    {/* Study Hours Card */}
                    <motion.div 
                        className="bento-card study-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35, duration: 0.5 }}
                    >
                        <div className="card-content" style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: 45, height: 45 }}>
                                    <LottieAnimation 
                                        animationData={LOTTIE_ANIMATIONS.book}
                                        fallback={
                                            <div style={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: '10px',
                                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
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
                                                fontSize: '0.75rem',
                                                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
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
                    </motion.div>

                    {/* Daily Goals Card */}
                    <motion.div 
                        className="bento-card goals-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                    >
                        <div className="card-content" style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: 45, height: 45 }}>
                                    <LottieAnimation 
                                        animationData={LOTTIE_ANIMATIONS.target}
                                        fallback={
                                            <div style={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: '10px',
                                                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}>
                                                <Target size={18} color="#22c55e" />
                                            </div>
                                        }
                                    />
                                </div>
                                <h3 style={{ fontSize: '0.9rem', fontWeight: '600' }}>Daily Goals</h3>
                            </div>

                            <div style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '8px', 
                                flex: 1, 
                                justifyContent: 'center',
                            }}>
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
                                                        marginBottom: '4px',
                                                    }}>
                                                        <span style={{ color: 'var(--text-muted)' }}>Goal</span>
                                                        <span style={{ fontWeight: '600', fontSize: '0.8rem' }}>
                                                            {completed.toFixed(1)}h / {goal.hours}h
                                                        </span>
                                                    </div>
                                                    <div style={{
                                                        height: '8px',
                                                        backgroundColor: 'var(--border)',
                                                        borderRadius: '4px',
                                                        overflow: 'hidden',
                                                        position: 'relative',
                                                    }}>
                                                        <div style={{
                                                            height: '100%',
                                                            width: `${Math.min(percentage, 100)}%`,
                                                            backgroundColor: percentage >= 100 ? '#22c55e' : '#3b82f6',
                                                            borderRadius: '4px',
                                                            transition: 'width 0.5s ease-out',
                                                            boxShadow: percentage >= 100 ? '0 0 10px rgba(34, 197, 94, 0.5)' : '0 0 10px rgba(59, 130, 246, 0.3)',
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
                                        fontSize: '0.8rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '12px',
                                    }}>
                                        <div style={{ width: 60, height: 60 }}>
                                            <LottieAnimation 
                                                animationData={LOTTIE_ANIMATIONS.empty}
                                                fallback={<Target size={32} color="var(--text-muted)" />}
                                            />
                                        </div>
                                        No goals set yet
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>

                    {/* Recent Tasks Card */}
                    <motion.div 
                        className="bento-card recent-tasks-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45, duration: 0.5 }}
                    >
                        <div className="card-content" style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
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
                                maxHeight: '150px',
                            }}>
                                <AnimatePresence mode="popLayout">
                                    {tasks.length > 0 ? (
                                        tasks.slice(0, 6).map((task, index) => (
                                            <motion.div
                                                key={task.id}
                                                className="task-item"
                                                style={{
                                                    padding: '8px 12px',
                                                    backgroundColor: 'var(--bg-hover)',
                                                    borderRadius: '8px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    opacity: task.completed ? 0.6 : 1,
                                                }}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: task.completed ? 0.6 : 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                transition={{ delay: index * 0.05 }}
                                                layout
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
                                                    flexShrink: 0,
                                                }}>
                                                    {task.completed && <CheckCircle2 size={10} color="white" />}
                                                </div>
                                                <span style={{
                                                    flex: 1,
                                                    textDecoration: task.completed ? 'line-through' : 'none',
                                                    color: task.completed ? 'var(--text-muted)' : 'var(--text-main)',
                                                    fontSize: '0.85rem',
                                                }}>
                                                    {task.text}
                                                </span>
                                                {task.date && (
                                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                                        {format(parseSafeDate(task.date), 'MMM d')}
                                                    </span>
                                                )}
                                            </motion.div>
                                        ))
                                    ) : (
                                        <motion.div 
                                            style={{ 
                                                textAlign: 'center', 
                                                padding: '20px', 
                                                color: 'var(--text-muted)', 
                                                fontSize: '0.85rem',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '12px',
                                            }}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                        >
                                            <div style={{ width: 70, height: 70 }}>
                                                <LottieAnimation 
                                                    animationData={LOTTIE_ANIMATIONS.empty}
                                                    fallback={<Calendar size={36} color="var(--text-muted)" />}
                                                />
                                            </div>
                                            No tasks yet
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </main>

            <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
        </div>
    );
}
