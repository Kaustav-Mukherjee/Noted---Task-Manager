import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, AlertCircle, Users, CheckCircle2, Calendar, BookOpen, Target, Flame, Zap, Headphones, Music, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';
import * as firestoreService from '../services/firestoreService';
import { format, isSameDay, subDays, eachDayOfInterval } from 'date-fns';
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip } from 'recharts';
import Lottie from 'lottie-react';
import { motion, AnimatePresence } from 'framer-motion';

// Extended Lottie Animation URLs from LottieFiles - High Quality Animations
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
    success: 'https://assets5.lottiefiles.com/packages/lf20_s2lryxtd.json',
    rocket: 'https://assets9.lottiefiles.com/packages/lf20_96bovdur.json',
    trophy: 'https://assets2.lottiefiles.com/packages/lf20_touohxv0.json',
};

// Apple-style Spring Animation Configurations
const SPRING_CONFIG = {
    gentle: { type: "spring", stiffness: 120, damping: 14, mass: 0.8 },
    snappy: { type: "spring", stiffness: 300, damping: 25, mass: 0.8 },
    bouncy: { type: "spring", stiffness: 200, damping: 10, mass: 1 },
    smooth: { type: "spring", stiffness: 100, damping: 20, mass: 1 },
};

// Animation Variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            type: "spring",
            stiffness: 100,
            damping: 15,
            mass: 0.8,
        },
    },
};

const cardHoverVariants = {
    rest: { 
        scale: 1, 
        y: 0,
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
    },
    hover: { 
        scale: 1.02, 
        y: -6,
        boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 20,
        },
    },
    tap: { 
        scale: 0.98,
        transition: { duration: 0.1 }
    },
};

const headerVariants = {
    hidden: { opacity: 0, y: -30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: "spring",
            stiffness: 100,
            damping: 20,
        },
    },
};

const bannerVariants = {
    hidden: { opacity: 0, x: -30 },
    visible: {
        opacity: 1,
        x: 0,
        transition: {
            type: "spring",
            stiffness: 120,
            damping: 18,
        },
    },
};

const numberCountVariants = {
    hidden: { opacity: 0, scale: 0.5 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: {
            type: "spring",
            stiffness: 200,
            damping: 15,
        },
    },
};

const pulseVariants = {
    pulse: {
        scale: [1, 1.05, 1],
        opacity: [1, 0.8, 1],
        transition: {
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
        },
    },
};

const floatVariants = {
    float: {
        y: [0, -8, 0],
        transition: {
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
        },
    },
};

const shimmerVariants = {
    shimmer: {
        backgroundPosition: ["-200% 0", "200% 0"],
        transition: {
            duration: 3,
            repeat: Infinity,
            ease: "linear",
        },
    },
};

const slideInLeft = {
    hidden: { opacity: 0, x: -50 },
    visible: {
        opacity: 1,
        x: 0,
        transition: {
            type: "spring",
            stiffness: 100,
            damping: 15,
        },
    },
};

const slideInRight = {
    hidden: { opacity: 0, x: 50 },
    visible: {
        opacity: 1,
        x: 0,
        transition: {
            type: "spring",
            stiffness: 100,
            damping: 15,
        },
    },
};

const slideInUp = {
    hidden: { opacity: 0, y: 40 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: "spring",
            stiffness: 120,
            damping: 15,
        },
    },
};

const iconBounceVariants = {
    rest: { scale: 1, rotate: 0 },
    hover: { 
        scale: 1.15, 
        rotate: [0, -10, 10, 0],
        transition: {
            type: "spring",
            stiffness: 400,
            damping: 15,
        },
    },
};

const lottieFloatVariants = {
    animate: {
        y: [0, -5, 0],
        transition: {
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
        },
    },
};

const progressBarVariants = {
    hidden: { width: 0 },
    visible: (width) => ({
        width: `${width}%`,
        transition: {
            type: "spring",
            stiffness: 50,
            damping: 15,
            delay: 0.5,
        },
    }),
};

const graphBarVariants = {
    hidden: { scaleY: 0, originY: 1 },
    visible: (delay) => ({
        scaleY: 1,
        transition: {
            type: "spring",
            stiffness: 100,
            damping: 15,
            delay: delay * 0.1,
        },
    }),
};

// Safe Date Utilities
const parseSafeDate = (dateVal) => {
    if (!dateVal) return null;
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? null : d;
};

// Enhanced Lottie Animation Component with Error Handling
function LottieAnimation({ animationData, style = {}, fallback = null, loop = true, className = "" }) {
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

    if (isLoading) {
        return (
            <motion.div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
            >
                <div style={{
                    width: '40%',
                    height: '40%',
                    borderRadius: '50%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                    backgroundSize: '200% 100%',
                }} />
            </motion.div>
        );
    }

    if (hasError || !animationJson) {
        return fallback || null;
    }

    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            style={{ width: '100%', height: '100%' }}
        >
            <Lottie
                animationData={animationJson}
                style={{ width: '100%', height: '100%', ...style }}
                loop={loop}
                autoplay={true}
            />
        </motion.div>
    );
}

// Focus Mode Indicator with Enhanced Lottie
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
        <motion.div 
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '20px'
            }}
            initial="hidden"
            animate="visible"
            variants={itemVariants}
        >
            <motion.div 
                style={{ width: 70, height: 70 }}
                variants={lottieFloatVariants}
                animate="animate"
            >
                <LottieAnimation 
                    animationData={LOTTIE_ANIMATIONS.focus}
                    fallback={
                        <motion.div 
                            style={{
                                width: 64,
                                height: 64,
                                borderRadius: '50%',
                                backgroundColor: `${modeColor}20`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                            animate={isActive ? pulseVariants.pulse : {}}
                        >
                            <Zap size={32} color={modeColor} />
                        </motion.div>
                    }
                />
            </motion.div>
            <motion.div style={{ textAlign: 'center' }}>
                <motion.div 
                    style={{ 
                        fontSize: '0.9rem', 
                        fontWeight: '700', 
                        color: isActive ? modeColor : 'var(--text-muted)',
                    }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    {isActive ? `Owner is in ${getModeLabel()}` : 'No Active Session'}
                </motion.div>
                <motion.div 
                    style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    {isActive ? 'Currently focusing' : 'Owner is not in focus mode'}
                </motion.div>
            </motion.div>
            {isActive && (
                <motion.div
                    style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: modeColor,
                        marginTop: '4px',
                    }}
                    animate={{
                        scale: [1, 1.3, 1],
                        opacity: [1, 0.7, 1],
                    }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            )}
        </motion.div>
    );
}

// Now Playing Indicator with Enhanced Lottie
function NowPlayingIndicator({ nowPlaying }) {
    const hasMusic = nowPlaying?.videoId && nowPlaying.videoId !== '';
    const youtubeUrl = hasMusic ? `https://www.youtube.com/watch?v=${nowPlaying.videoId}` : null;
    const title = nowPlaying?.title || 'Music playing';
    
    return (
        <motion.div 
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '20px'
            }}
            initial="hidden"
            animate="visible"
            variants={itemVariants}
        >
            <motion.div 
                style={{ width: 65, height: 65 }}
                variants={hasMusic ? lottieFloatVariants : {}}
                animate={hasMusic ? "animate" : ""}
            >
                <LottieAnimation 
                    animationData={LOTTIE_ANIMATIONS.music}
                    fallback={
                        <motion.div 
                            style={{
                                width: 56,
                                height: 56,
                                borderRadius: '50%',
                                backgroundColor: hasMusic ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                            animate={hasMusic ? pulseVariants.pulse : {}}
                        >
                            <Headphones size={28} color={hasMusic ? '#ef4444' : 'var(--text-muted)'} />
                        </motion.div>
                    }
                />
            </motion.div>
            <motion.div style={{ textAlign: 'center', width: '100%' }}>
                <motion.div 
                    style={{ 
                        fontSize: '0.9rem', 
                        fontWeight: '700', 
                        color: hasMusic ? '#ef4444' : 'var(--text-muted)',
                    }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    {hasMusic ? 'Owner is playing music now' : 'No Music Playing'}
                </motion.div>
                {hasMusic && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <motion.div 
                            style={{ 
                                fontSize: '0.75rem', 
                                color: 'var(--text-main)', 
                                marginTop: '4px',
                                fontWeight: '500',
                                maxWidth: '100%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                padding: '0 8px'
                            }}
                        >
                            {title}
                        </motion.div>
                        <motion.a 
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
                                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
                            }}
                            whileHover={{ 
                                scale: 1.05, 
                                backgroundColor: '#dc2626',
                                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
                            }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        >
                            <ExternalLink size={12} />
                            Listen Now
                        </motion.a>
                    </motion.div>
                )}
            </motion.div>
            {hasMusic && (
                <motion.div
                    style={{
                        display: 'flex',
                        gap: '3px',
                        marginTop: '4px',
                    }}
                >
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            style={{
                                width: 3,
                                height: 12,
                                backgroundColor: '#ef4444',
                                borderRadius: '2px',
                            }}
                            animate={{
                                height: [12, 20, 12],
                            }}
                            transition={{
                                duration: 0.8,
                                repeat: Infinity,
                                delay: i * 0.15,
                                ease: "easeInOut",
                            }}
                        />
                    ))}
                </motion.div>
            )}
        </motion.div>
    );
}

// Enhanced Stat Card Component
function StatCard({ title, value, color, animationData, icon: Icon, delay }) {
    return (
        <motion.div
            className="bento-card stat-card"
            style={{
                backgroundColor: 'var(--bg-card)',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
            }}
            variants={itemVariants}
            initial="rest"
            whileHover="hover"
            whileTap="tap"
            custom={delay}
        >
            <motion.div 
                style={{ width: 55, height: 55 }}
                variants={lottieFloatVariants}
                animate="animate"
            >
                <LottieAnimation 
                    animationData={animationData}
                    fallback={
                        <motion.div 
                            style={{
                                width: 44,
                                height: 44,
                                borderRadius: '12px',
                                backgroundColor: `${color}15`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        >
                            <Icon size={24} color={color} />
                        </motion.div>
                    }
                />
            </motion.div>
            <motion.div 
                style={{ fontSize: '2rem', fontWeight: '800', color: color }}
                variants={numberCountVariants}
            >
                {value}
            </motion.div>
            <motion.div 
                style={{ 
                    fontSize: '0.7rem', 
                    color: 'var(--text-muted)', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.05em',
                    fontWeight: '600',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 + delay * 0.1 }}
            >
                {title}
            </motion.div>
        </motion.div>
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
    
    return (
        <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
            {displayValue}{suffix}
        </motion.span>
    );
}

// Loading Screen with Lottie
function LoadingScreen() {
    return (
        <motion.div
            style={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-app)',
                flexDirection: 'column',
                gap: '20px',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
        >
            <motion.div 
                style={{ width: 150, height: 150 }}
                animate={{
                    scale: [1, 1.05, 1],
                    rotate: [0, 5, -5, 0],
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            >
                <LottieAnimation 
                    animationData={LOTTIE_ANIMATIONS.loading}
                    fallback={
                        <motion.div
                            style={{
                                width: 80,
                                height: 80,
                                border: '4px solid var(--border)',
                                borderTop: '4px solid #3b82f6',
                                borderRadius: '50%',
                            }}
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                    }
                />
            </motion.div>
            <motion.p 
                style={{ 
                    color: 'var(--text-muted)', 
                    fontSize: '1rem', 
                    fontWeight: 500,
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                Loading shared dashboard...
            </motion.p>
            <motion.div
                style={{
                    width: 200,
                    height: 4,
                    backgroundColor: 'var(--border)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                }}
            >
                <motion.div
                    style={{
                        height: '100%',
                        backgroundColor: '#3b82f6',
                        borderRadius: '2px',
                    }}
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            </motion.div>
        </motion.div>
    );
}

// Error Screen with Lottie
function ErrorScreen({ error, onBack }) {
    return (
        <motion.div
            style={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-app)',
                padding: '20px',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <motion.div 
                style={{ textAlign: 'center', maxWidth: '400px' }}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
            >
                <motion.div 
                    style={{ width: 120, height: 120, margin: '0 auto 20px' }}
                    animate={{
                        y: [0, -10, 0],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                >
                    <LottieAnimation 
                        animationData={LOTTIE_ANIMATIONS.lock}
                        fallback={
                            <motion.div
                                style={{
                                    width: 100,
                                    height: 100,
                                    borderRadius: '50%',
                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                                animate={{
                                    scale: [1, 1.05, 1],
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                }}
                            >
                                <Lock size={48} color="#ef4444" />
                            </motion.div>
                        }
                    />
                </motion.div>
                <motion.h2 
                    style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '12px' }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    Access Denied
                </motion.h2>
                <motion.p 
                    style={{ color: 'var(--text-muted)', marginBottom: '24px' }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    {error}
                </motion.p>
                <motion.button
                    onClick={onBack}
                    style={{
                        padding: '12px 24px',
                        backgroundColor: 'var(--text-main)',
                        color: 'var(--bg-app)',
                        borderRadius: '10px',
                        fontWeight: '600',
                        border: 'none',
                        cursor: 'pointer',
                    }}
                    whileHover={{ scale: 1.05, backgroundColor: '#3b82f6' }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    Go Home
                </motion.button>
            </motion.div>
        </motion.div>
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
        <motion.div 
            className="shared-dashboard" 
            style={{ 
                minHeight: '100vh', 
                background: 'var(--bg-app)',
                display: 'flex',
                flexDirection: 'column',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            {/* Animated Header */}
            <motion.header
                style={{
                    padding: '16px 24px',
                    backgroundColor: 'var(--bg-card)',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexShrink: 0,
                }}
                variants={headerVariants}
                initial="hidden"
                animate="visible"
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <motion.button
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
                            gap: '6px',
                        }}
                        whileHover={{ 
                            scale: 1.05, 
                            backgroundColor: 'var(--bg-hover)',
                            color: 'var(--text-main)',
                        }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                        <ArrowLeft size={18} />
                        <span>Back</span>
                    </motion.button>
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
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
                            <motion.span 
                                style={{ color: '#3b82f6' }}
                                animate={{ opacity: [1, 0.5, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            >
                                • View Only
                            </motion.span>
                        </div>
                    </motion.div>
                </div>

                {!user && (
                    <motion.button
                        onClick={() => setShowAuthModal(true)}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: 'var(--text-main)',
                            color: 'var(--bg-app)',
                            borderRadius: '10px',
                            fontWeight: '600',
                            fontSize: '0.9rem',
                            border: 'none',
                            cursor: 'pointer',
                        }}
                        whileHover={{ 
                            scale: 1.05,
                            boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
                        }}
                        whileTap={{ scale: 0.95 }}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        Sign In
                    </motion.button>
                )}
            </motion.header>

            {/* Animated View-only Banner */}
            <motion.div
                style={{
                    padding: '12px 24px',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: '#3b82f6',
                    fontSize: '0.9rem',
                    flexShrink: 0,
                }}
                variants={bannerVariants}
                initial="hidden"
                animate="visible"
            >
                <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                    <AlertCircle size={18} />
                </motion.div>
                <span>You have view-only access to this dashboard.</span>
            </motion.div>

            {/* Main Content - Animated Bento Grid */}
            <main className="bento-grid-container" style={{
                flex: 1,
                padding: '20px',
                overflow: 'auto',
            }}>
                <motion.div 
                    className="bento-grid" 
                    style={{
                        maxWidth: '1200px',
                        margin: '0 auto',
                        display: 'grid',
                        gap: '16px',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gridAutoRows: 'minmax(140px, auto)',
                    }}
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {/* Streak Card with Enhanced Lottie */}
                    <motion.div 
                        className="bento-card streak-card" 
                        style={{
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
                            gap: '8px',
                            cursor: 'pointer',
                            position: 'relative',
                            overflow: 'hidden',
                        }}
                        variants={itemVariants}
                        whileHover={{
                            scale: 1.03,
                            y: -6,
                            boxShadow: '0 20px 40px rgba(239, 68, 68, 0.2)',
                            borderColor: 'rgba(239, 68, 68, 0.4)',
                        }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                        <motion.div 
                            style={{ 
                                position: 'absolute', 
                                inset: 0, 
                                background: 'radial-gradient(circle at 50% 0%, rgba(239, 68, 68, 0.1) 0%, transparent 70%)',
                                opacity: 0,
                            }}
                            whileHover={{ opacity: 1 }}
                        />
                        <motion.div 
                            style={{ width: 55, height: 55, position: 'relative', zIndex: 1 }}
                            variants={lottieFloatVariants}
                            animate="animate"
                        >
                            <LottieAnimation 
                                animationData={LOTTIE_ANIMATIONS.fire}
                                fallback={
                                    <motion.div 
                                        style={{
                                            width: 44,
                                            height: 44,
                                            borderRadius: '12px',
                                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                        whileHover={{ scale: 1.1 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                    >
                                        <Flame size={24} color="#ef4444" />
                                    </motion.div>
                                }
                            />
                        </motion.div>
                        <motion.div 
                            style={{ fontSize: '2rem', fontWeight: '800', color: '#ef4444', position: 'relative', zIndex: 1 }}
                            key={streak}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 15 }}
                        >
                            <AnimatedNumber value={streak} />
                        </motion.div>
                        <motion.div 
                            style={{ 
                                fontSize: '0.7rem', 
                                color: 'var(--text-muted)', 
                                textTransform: 'uppercase', 
                                letterSpacing: '0.05em',
                                fontWeight: '600',
                                position: 'relative',
                                zIndex: 1,
                            }}
                        >
                            Day Streak
                        </motion.div>
                    </motion.div>

                    {/* Completion Rate Card with Enhanced Lottie */}
                    <motion.div 
                        className="bento-card completion-card" 
                        style={{
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
                            gap: '8px',
                            cursor: 'pointer',
                            position: 'relative',
                            overflow: 'hidden',
                        }}
                        variants={itemVariants}
                        whileHover={{
                            scale: 1.03,
                            y: -6,
                            boxShadow: '0 20px 40px rgba(34, 197, 94, 0.2)',
                            borderColor: 'rgba(34, 197, 94, 0.4)',
                        }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                        <motion.div 
                            style={{ 
                                position: 'absolute', 
                                inset: 0, 
                                background: 'radial-gradient(circle at 50% 0%, rgba(34, 197, 94, 0.1) 0%, transparent 70%)',
                                opacity: 0,
                            }}
                            whileHover={{ opacity: 1 }}
                        />
                        <motion.div 
                            style={{ width: 55, height: 55, position: 'relative', zIndex: 1 }}
                            variants={lottieFloatVariants}
                            animate="animate"
                        >
                            <LottieAnimation 
                                animationData={LOTTIE_ANIMATIONS.check}
                                fallback={
                                    <motion.div 
                                        style={{
                                            width: 44,
                                            height: 44,
                                            borderRadius: '12px',
                                            backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                        whileHover={{ scale: 1.1, rotate: 5 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                    >
                                        <CheckCircle2 size={24} color="#22c55e" />
                                    </motion.div>
                                }
                            />
                        </motion.div>
                        <motion.div 
                            style={{ fontSize: '2rem', fontWeight: '800', color: '#22c55e', position: 'relative', zIndex: 1 }}
                            key={stats.completionRate}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 15 }}
                        >
                            <AnimatedNumber value={stats.completionRate} suffix="%" />
                        </motion.div>
                        <motion.div 
                            style={{ 
                                fontSize: '0.7rem', 
                                color: 'var(--text-muted)', 
                                textTransform: 'uppercase', 
                                letterSpacing: '0.05em',
                                fontWeight: '600',
                                position: 'relative',
                                zIndex: 1,
                            }}
                        >
                            Completion
                        </motion.div>
                    </motion.div>

                    {/* Focus Mode Card with Enhanced Lottie */}
                    <motion.div 
                        className="bento-card focus-card" 
                        style={{
                            gridColumn: 'span 1',
                            gridRow: 'span 1',
                            backgroundColor: 'var(--bg-card)',
                            borderRadius: '16px',
                            border: '1px solid var(--border)',
                            overflow: 'hidden',
                            cursor: 'pointer',
                        }}
                        variants={itemVariants}
                        whileHover={{
                            scale: 1.03,
                            y: -6,
                            boxShadow: '0 20px 40px rgba(139, 92, 246, 0.2)',
                            borderColor: 'rgba(139, 92, 246, 0.4)',
                        }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                        <FocusModeIndicator timerState={ownerTimerState} />
                    </motion.div>

                    {/* Now Playing Card with Enhanced Lottie */}
                    <motion.div 
                        className="bento-card music-card" 
                        style={{
                            gridColumn: 'span 1',
                            gridRow: 'span 1',
                            backgroundColor: 'var(--bg-card)',
                            borderRadius: '16px',
                            border: '1px solid var(--border)',
                            overflow: 'hidden',
                            cursor: 'pointer',
                        }}
                        variants={itemVariants}
                        whileHover={{
                            scale: 1.03,
                            y: -6,
                            boxShadow: '0 20px 40px rgba(239, 68, 68, 0.2)',
                            borderColor: 'rgba(239, 68, 68, 0.4)',
                        }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                        <NowPlayingIndicator nowPlaying={ownerNowPlaying} />
                    </motion.div>

                    {/* Tasks Overview - Large with Enhanced Animations */}
                    <motion.div 
                        className="bento-card tasks-card" 
                        style={{
                            gridColumn: 'span 2',
                            gridRow: 'span 2',
                            backgroundColor: 'var(--bg-card)',
                            borderRadius: '16px',
                            border: '1px solid var(--border)',
                            padding: '20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                        }}
                        variants={itemVariants}
                        whileHover={{
                            scale: 1.01,
                            y: -4,
                            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
                            borderColor: 'rgba(255, 255, 255, 0.1)',
                        }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    >
                        <motion.div 
                            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <motion.div 
                                style={{ width: 45, height: 45 }}
                                whileHover={{ scale: 1.1, rotate: 10 }}
                                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                            >
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
                            </motion.div>
                            <div>
                                <h3 style={{ fontSize: '0.95rem', fontWeight: '600' }}>Tasks Overview</h3>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                    {stats.completedTasks} of {stats.totalTasks} completed
                                </p>
                            </div>
                        </motion.div>

                        <motion.div 
                            style={{ flex: 1, minHeight: '150px' }}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4 }}
                        >
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
                                    <Bar 
                                        dataKey="completed" 
                                        stackId="a" 
                                        fill="#22c55e" 
                                        radius={[4, 4, 0, 0]}
                                        animationDuration={1500}
                                        animationBegin={500}
                                    />
                                    <Bar 
                                        dataKey="remaining" 
                                        stackId="a" 
                                        fill="var(--border)" 
                                        radius={[4, 4, 0, 0]}
                                        animationDuration={1500}
                                        animationBegin={500}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </motion.div>

                        <motion.div 
                            style={{ display: 'flex', gap: '16px' }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                            >
                                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#22c55e' }}>
                                    {stats.todayCompleted}/{stats.todayTasks}
                                </div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Today</div>
                            </motion.div>
                        </motion.div>
                    </motion.div>

                    {/* Study Hours - Medium with Enhanced Animations */}
                    <motion.div 
                        className="bento-card study-card" 
                        style={{
                            gridColumn: 'span 2',
                            gridRow: 'span 1',
                            backgroundColor: 'var(--bg-card)',
                            borderRadius: '16px',
                            border: '1px solid var(--border)',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                        }}
                        variants={itemVariants}
                        whileHover={{
                            scale: 1.02,
                            y: -4,
                            boxShadow: '0 20px 40px rgba(59, 130, 246, 0.15)',
                            borderColor: 'rgba(59, 130, 246, 0.3)',
                        }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    >
                        <motion.div 
                            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <motion.div 
                                style={{ width: 45, height: 45 }}
                                whileHover={{ scale: 1.1, rotate: -10 }}
                                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                            >
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
                            </motion.div>
                            <div>
                                <h3 style={{ fontSize: '0.9rem', fontWeight: '600' }}>Study Hours</h3>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Last 7 days</p>
                            </div>
                            <motion.div 
                                style={{ marginLeft: 'auto', textAlign: 'right' }}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.4, type: "spring", stiffness: 200, damping: 15 }}
                            >
                                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#3b82f6' }}>
                                    {stats.totalStudyHours}h
                                </div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Total</div>
                            </motion.div>
                        </motion.div>

                        <motion.div 
                            style={{ flex: 1, minHeight: '80px' }}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.5 }}
                        >
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
                                    <Bar 
                                        dataKey="hours" 
                                        fill="#3b82f6" 
                                        radius={[4, 4, 0, 0]}
                                        animationDuration={1500}
                                        animationBegin={600}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </motion.div>
                    </motion.div>

                    {/* Daily Goals - Medium with Enhanced Animations */}
                    <motion.div 
                        className="bento-card goals-card" 
                        style={{
                            gridColumn: 'span 2',
                            gridRow: 'span 1',
                            backgroundColor: 'var(--bg-card)',
                            borderRadius: '16px',
                            border: '1px solid var(--border)',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                        }}
                        variants={itemVariants}
                        whileHover={{
                            scale: 1.02,
                            y: -4,
                            boxShadow: '0 20px 40px rgba(34, 197, 94, 0.15)',
                            borderColor: 'rgba(34, 197, 94, 0.3)',
                        }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    >
                        <motion.div 
                            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <motion.div 
                                style={{ width: 45, height: 45 }}
                                whileHover={{ scale: 1.1, rotate: 360 }}
                                transition={{ type: "spring", stiffness: 200, damping: 20, duration: 0.8 }}
                            >
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
                            </motion.div>
                            <h3 style={{ fontSize: '0.9rem', fontWeight: '600' }}>Daily Goals</h3>
                        </motion.div>

                        <motion.div 
                            style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, justifyContent: 'center' }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                        >
                            {goals && Object.keys(goals).length > 0 ? (
                                (() => {
                                    const today = new Date();
                                    const todayHours = studySessions
                                        .filter(s => {
                                            const sessionDate = parseSafeDate(s.date);
                                            return sessionDate && isSameDay(sessionDate, today);
                                        })
                                        .reduce((sum, s) => sum + (parseFloat(s.hours) || 0), 0);
                                    
                                    return Object.entries(goals).slice(0, 2).map(([key, goal], index) => {
                                        const completed = Math.min(todayHours, goal.hours);
                                        const percentage = goal.hours > 0 ? (completed / goal.hours) * 100 : 0;
                                        
                                        return (
                                            <motion.div 
                                                key={key}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.5 + index * 0.1 }}
                                            >
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
                                                    <motion.div 
                                                        style={{
                                                            height: '100%',
                                                            backgroundColor: percentage >= 100 ? '#22c55e' : '#3b82f6',
                                                            borderRadius: '4px',
                                                            boxShadow: percentage >= 100 ? '0 0 10px rgba(34, 197, 94, 0.5)' : '0 0 10px rgba(59, 130, 246, 0.3)',
                                                        }}
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${Math.min(percentage, 100)}%` }}
                                                        transition={{ 
                                                            type: "spring", 
                                                            stiffness: 50, 
                                                            damping: 15, 
                                                            delay: 0.6 + index * 0.1 
                                                        }}
                                                    />
                                                </div>
                                            </motion.div>
                                        );
                                    });
                                })()
                            ) : (
                                <motion.div 
                                    style={{ 
                                        textAlign: 'center',
                                        color: 'var(--text-muted)',
                                        fontSize: '0.8rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '12px',
                                    }}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.5 }}
                                >
                                    <motion.div 
                                        style={{ width: 60, height: 60 }}
                                        animate={{ y: [0, -5, 0] }}
                                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                    >
                                        <LottieAnimation 
                                            animationData={LOTTIE_ANIMATIONS.empty}
                                            fallback={<Target size={32} color="var(--text-muted)" />}
                                        />
                                    </motion.div>
                                    No goals set yet
                                </motion.div>
                            )}
                        </motion.div>
                    </motion.div>

                    {/* Recent Tasks - Wide with Enhanced Animations */}
                    <motion.div 
                        className="bento-card recent-tasks-card" 
                        style={{
                            gridColumn: 'span 4',
                            gridRow: 'span 1',
                            backgroundColor: 'var(--bg-card)',
                            borderRadius: '16px',
                            border: '1px solid var(--border)',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                        }}
                        variants={itemVariants}
                        whileHover={{
                            scale: 1.005,
                            y: -2,
                            boxShadow: '0 16px 35px rgba(0, 0, 0, 0.2)',
                        }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    >
                        <motion.div 
                            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <motion.div
                                whileHover={{ rotate: 360 }}
                                transition={{ type: "spring", stiffness: 200, damping: 20, duration: 0.8 }}
                            >
                                <Calendar size={18} color="var(--text-muted)" />
                            </motion.div>
                            <h3 style={{ fontSize: '0.9rem', fontWeight: '600' }}>Recent Tasks</h3>
                        </motion.div>

                        <motion.div 
                            style={{ 
                                flex: 1,
                                overflow: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                                maxHeight: '150px',
                            }}
                        >
                            <AnimatePresence mode="popLayout">
                                {tasks.length > 0 ? (
                                    tasks.slice(0, 6).map((task, index) => (
                                        <motion.div
                                            key={task.id}
                                            style={{
                                                padding: '8px 12px',
                                                backgroundColor: 'var(--bg-hover)',
                                                borderRadius: '8px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                opacity: task.completed ? 0.6 : 1,
                                            }}
                                            initial={{ opacity: 0, x: -30, scale: 0.95 }}
                                            animate={{ opacity: task.completed ? 0.6 : 1, x: 0, scale: 1 }}
                                            exit={{ opacity: 0, x: 30, scale: 0.95 }}
                                            transition={{ 
                                                delay: index * 0.05,
                                                type: "spring",
                                                stiffness: 100,
                                                damping: 15,
                                            }}
                                            whileHover={{
                                                scale: 1.02,
                                                backgroundColor: 'var(--bg-card)',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                            }}
                                            layout
                                        >
                                            <motion.div 
                                                style={{
                                                    width: '16px',
                                                    height: '16px',
                                                    borderRadius: '50%',
                                                    border: `2px solid ${task.completed ? '#22c55e' : 'var(--border)'}`,
                                                    backgroundColor: task.completed ? '#22c55e' : 'transparent',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                }}
                                                initial={task.completed ? { scale: 0 } : { scale: 1 }}
                                                animate={{ scale: 1 }}
                                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                            >
                                                {task.completed && <CheckCircle2 size={10} color="white" />}
                                            </motion.div>
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
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.3 }}
                                    >
                                        <motion.div 
                                            style={{ width: 70, height: 70 }}
                                            animate={{ y: [0, -8, 0] }}
                                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                        >
                                            <LottieAnimation 
                                                animationData={LOTTIE_ANIMATIONS.empty}
                                                fallback={<Calendar size={36} color="var(--text-muted)" />}
                                            />
                                        </motion.div>
                                        No tasks yet
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </motion.div>
                </motion.div>
            </main>

            <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

            {/* Enhanced Responsive Styles */}
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

                .bento-card {
                    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
                                box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                                border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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

                /* Smooth scrolling for tasks */
                .bento-card > div:last-child::-webkit-scrollbar {
                    width: 4px;
                }

                .bento-card > div:last-child::-webkit-scrollbar-track {
                    background: transparent;
                }

                .bento-card > div:last-child::-webkit-scrollbar-thumb {
                    background: var(--border);
                    border-radius: 2px;
                }

                .bento-card > div:last-child::-webkit-scrollbar-thumb:hover {
                    background: var(--text-muted);
                }
            `}</style>
        </motion.div>
    );
}
