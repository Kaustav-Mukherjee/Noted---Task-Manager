import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Zap, MoreHorizontal, Settings, Clock, Timer as TimerIcon } from 'lucide-react';
import { playAlertSound } from '../utils/sound';
import { useAuth } from '../contexts/AuthContext';
import { saveUserTimerState } from '../services/firestoreService';

const MODES = {
    FOCUS: { label: 'Focus', minutes: 25, color: '#3b82f6' },
    SHORT_BREAK: { label: 'Short Break', minutes: 5, color: '#22c55e' },
    LONG_BREAK: { label: 'Long Break', minutes: 15, color: '#3b82f6' }
};

function FocusTimer({ onTimerComplete }) {
    const { user } = useAuth();
    const [mode, setMode] = useState('FOCUS');
    const [isTimerMode, setIsTimerMode] = useState(true);
    const [timeLeft, setTimeLeft] = useState(MODES.FOCUS.minutes * 60);
    const [useSeconds, setUseSeconds] = useState(0); // For stopwatch
    const [isActive, setIsActive] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    // Custom Duration Handling
    const [customDuration, setCustomDuration] = useState(25);
    const [isEditingDuration, setIsEditingDuration] = useState(false);

    const timerRef = useRef(null);
    const startTimeRef = useRef(null);
    const elapsedRef = useRef(0);

    // Load saved state on mount
    useEffect(() => {
        const savedState = localStorage.getItem('focusTimerState');
        if (savedState) {
            const state = JSON.parse(savedState);
            setMode(state.mode || 'FOCUS');
            setIsTimerMode(state.isTimerMode !== false);
            setTimeLeft(state.timeLeft || MODES.FOCUS.minutes * 60);
            setUseSeconds(state.useSeconds || 0);
            setIsActive(false); // Always start paused to prevent auto-completion
            if (state.customDuration) setCustomDuration(state.customDuration); // Restore custom duration

            if (state.isActive && state.startTime) {
                const elapsedSinceStart = Math.floor((Date.now() - state.startTime) / 1000);
                if (state.isTimerMode) {
                    const newTimeLeft = state.timeLeft - elapsedSinceStart;
                    if (newTimeLeft > 0) {
                        setTimeLeft(newTimeLeft);
                        startTimeRef.current = state.startTime;
                        elapsedRef.current = elapsedSinceStart;
                    } else {
                        // Timer expired while away - reset without logging
                        setTimeLeft(MODES.FOCUS.minutes * 60);
                        setIsActive(false);
                        // Clear the saved state to prevent issues
                        localStorage.removeItem('focusTimerState');
                    }
                } else {
                    setUseSeconds(state.useSeconds + elapsedSinceStart);
                    startTimeRef.current = state.startTime;
                    elapsedRef.current = elapsedSinceStart;
                }
            }
        }
    }, []);

    // Save state to localStorage and Firestore whenever it changes
    useEffect(() => {
        const stateToSave = {
            mode,
            isTimerMode,
            timeLeft,
            useSeconds,
            isActive,
            customDuration,
            startTime: isActive ? (startTimeRef.current || Date.now()) : null
        };
        localStorage.setItem('focusTimerState', JSON.stringify(stateToSave));
        
        // Also save to Firestore for sharing
        if (user) {
            saveUserTimerState(user.uid, stateToSave);
        }
    }, [mode, isTimerMode, timeLeft, useSeconds, isActive, customDuration, user]);

    useEffect(() => {
        if (isActive) {
            clearInterval(timerRef.current);
            if (!startTimeRef.current) {
                startTimeRef.current = Date.now();
                elapsedRef.current = 0;
            }

            timerRef.current = setInterval(() => {
                const totalElapsed = elapsedRef.current + Math.floor((Date.now() - startTimeRef.current) / 1000);

                if (isTimerMode) {
                    const currentModeMinutes = mode === 'CUSTOM' ? customDuration : MODES[mode].minutes;
                    const newTimeLeft = Math.max(0, (currentModeMinutes * 60) - totalElapsed);
                    setTimeLeft(newTimeLeft);

                    if (newTimeLeft === 0) {
                        handleComplete();
                    }
                } else {
                    setUseSeconds(totalElapsed);
                }
            }, 100);
        } else {
            clearInterval(timerRef.current);
            if (startTimeRef.current) {
                elapsedRef.current += Math.floor((Date.now() - startTimeRef.current) / 1000);
                startTimeRef.current = null;
            }
        }
        return () => clearInterval(timerRef.current);
    }, [isActive, isTimerMode, mode, customDuration]);

    const handleComplete = () => {
        setIsActive(false);
        playAlertSound(); // Play sound

        // Show notification
        if (Notification.permission === 'granted') {
            new Notification("Timer Complete!", {
                body: `${MODES[mode]?.label || 'Custom'} timer finished.`
            });
        }

        if (mode === 'FOCUS' || mode === 'CUSTOM') {
            const hours = (mode === 'CUSTOM' ? customDuration : MODES.FOCUS.minutes) / 60;
            onTimerComplete(hours);
        }
        resetTimerState();
    };

    const resetTimerState = () => {
        const duration = mode === 'CUSTOM' ? customDuration : MODES[mode].minutes;
        setTimeLeft(duration * 60);
    };

    const toggleTimer = () => setIsActive(!isActive);

    const resetTimer = () => {
        setIsActive(false);
        startTimeRef.current = null;
        elapsedRef.current = 0;
        if (isTimerMode) {
            resetTimerState();
        } else {
            setUseSeconds(0);
        }
    };

    const switchMode = (newMode) => {
        setIsActive(false);
        startTimeRef.current = null;
        elapsedRef.current = 0;
        setMode(newMode);
        if (isTimerMode) {
            if (newMode === 'CUSTOM') {
                setTimeLeft(customDuration * 60);
            } else {
                setTimeLeft(MODES[newMode].minutes * 60);
            }
        }
    };

    const handleCustomDurationChange = (e) => {
        const val = parseInt(e.target.value);
        if (!isNaN(val) && val > 0) {
            setCustomDuration(val);
            if (mode === 'CUSTOM') {
                setTimeLeft(val * 60);
            }
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return { mins, secs };
    };

    const totalSeconds = isTimerMode ? ((mode === 'CUSTOM' ? customDuration : MODES[mode].minutes) * 60) : 3600;
    const currentSeconds = isTimerMode ? timeLeft : useSeconds;
    const progress = (currentSeconds / totalSeconds) * 100;

    // Render 60 ticks for the circular UI
    const renderTicks = () => {
        const ticks = [];
        const tickCount = 60;
        const radius = 85;
        const centerX = 100;
        const centerY = 100;

        for (let i = 0; i < tickCount; i++) {
            const angle = (i * 360) / tickCount - 90;
            const rad = (angle * Math.PI) / 180;
            const x1 = centerX + (radius - 12) * Math.cos(rad);
            const y1 = centerY + (radius - 12) * Math.sin(rad);
            const x2 = centerX + radius * Math.cos(rad);
            const y2 = centerY + radius * Math.sin(rad);

            // Progress logic
            const total = isTimerMode ? ((mode === 'CUSTOM' ? customDuration : MODES[mode].minutes) * 60) : 3600;
            const current = isTimerMode ? timeLeft : (useSeconds % 3600);

            const isActiveTick = isTimerMode
                ? (i / tickCount) < (current / total)
                : (i / tickCount) < (current / 3600);

            ticks.push(
                <line
                    key={i}
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={isActiveTick ? (MODES[mode]?.color || '#8b5cf6') : 'var(--bg-hover)'}
                    strokeWidth={isActiveTick ? "4" : "3"}
                    strokeLinecap="round"
                    style={{
                        opacity: isActiveTick ? 1 : 0.2,
                        transition: 'all 0.3s ease'
                    }}
                />
            );
        }
        return ticks;
    };

    return (
        <div className="shadow-hover" style={{

            padding: '24px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '28px',
            position: 'relative',
            height: '100%',
            flex: 1,
            transition: 'all var(--transition-main)'
        }}>


            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Zap size={16} color={MODES[mode]?.color || '#8b5cf6'} fill={MODES[mode]?.color || '#8b5cf6'} style={{ opacity: 0.8 }} />
                    <h3 style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        {isTimerMode ? 'Focus Session' : 'Stopwatch'}
                    </h3>
                </div>

                {/* Mode Toggles for Timer Mode only */}
                {isTimerMode && (
                    <div style={{ display: 'flex', gap: '4px', backgroundColor: 'rgba(0,0,0,0.2)', padding: '3px', borderRadius: '10px' }}>
                        {Object.keys(MODES).map((k) => (
                            <button
                                key={k}
                                onClick={() => switchMode(k)}
                                style={{
                                    padding: '4px 8px',
                                    borderRadius: '7px',
                                    fontSize: '0.6rem',
                                    fontWeight: '600',
                                    backgroundColor: mode === k ? 'var(--bg-hover)' : 'transparent',
                                    color: mode === k ? 'var(--text-main)' : 'var(--text-muted)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {MODES[k].label.split(' ')[0]}
                            </button>
                        ))}
                        <button
                            onClick={() => switchMode('CUSTOM')}
                            style={{
                                padding: '4px 8px',
                                borderRadius: '7px',
                                fontSize: '0.6rem',
                                fontWeight: '600',
                                backgroundColor: mode === 'CUSTOM' ? 'var(--bg-hover)' : 'transparent',
                                color: mode === 'CUSTOM' ? 'var(--text-main)' : 'var(--text-muted)',
                                transition: 'all 0.2s'
                            }}
                        >
                            Custom
                        </button>
                    </div>
                )}
            </div>

            {/* Circular UI */}
            <div style={{ position: 'relative', width: '100%', maxWidth: '220px', aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="100%" height="100%" viewBox="0 0 200 200" style={{ maxWidth: '100%', maxHeight: '100%' }}>
                    {renderTicks()}
                </svg>

                <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                        {mode === 'CUSTOM' && !isActive && isEditingDuration ? (
                            <input
                                type="number"
                                value={customDuration}
                                onChange={handleCustomDurationChange}
                                onBlur={() => setIsEditingDuration(false)}
                                autoFocus
                                style={{
                                    fontSize: '3.5rem',
                                    fontWeight: '300',
                                    color: 'var(--text-main)',
                                    lineHeight: 1,
                                    width: '120px',
                                    textAlign: 'center',
                                    background: 'transparent',
                                    border: 'none',
                                    borderBottom: '2px solid var(--text-main)',
                                    outline: 'none'
                                }}
                            />
                        ) : (
                            <span
                                onClick={() => mode === 'CUSTOM' && !isActive && setIsEditingDuration(true)}
                                style={{
                                    fontSize: '3.5rem',
                                    fontWeight: '300',
                                    color: 'var(--text-main)',
                                    lineHeight: 1,
                                    cursor: mode === 'CUSTOM' && !isActive ? 'pointer' : 'default',
                                    borderBottom: mode === 'CUSTOM' && !isActive ? '1px dashed var(--text-muted)' : 'none'
                                }}
                                title={mode === 'CUSTOM' ? "Click to edit duration" : ""}
                            >
                                {isTimerMode ? formatTime(timeLeft).mins : formatTime(useSeconds).mins}
                            </span>
                        )}
                        <span style={{ fontSize: '1.2rem', fontWeight: '300', color: 'var(--text-muted)', marginBottom: '8px' }}>
                            {isTimerMode && formatTime(timeLeft).secs > 0 ? `:${formatTime(timeLeft).secs.toString().padStart(2, '0')}` :
                                !isTimerMode && formatTime(useSeconds).secs > 0 ? `:${formatTime(useSeconds).secs.toString().padStart(2, '0')}` :
                                    'min'}
                        </span>
                    </div>
                    {mode === 'CUSTOM' && !isActive && !isEditingDuration && (
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', opacity: 0.7 }}>Click time to edit</span>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%' }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <button
                        onClick={toggleTimer}
                        style={{
                            width: '52px',
                            height: '52px',
                            borderRadius: '50%',
                            backgroundColor: isActive ? 'transparent' : (MODES[mode]?.color || '#8b5cf6'),
                            color: isActive ? 'var(--text-main)' : 'var(--bg-app)',
                            border: isActive ? `2px solid var(--border)` : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: isActive ? 'none' : `0 8px 20px ${(MODES[mode]?.color || '#8b5cf6')}44`
                        }}
                    >
                        {isActive ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" style={{ marginLeft: '4px' }} />}
                    </button>

                    <button
                        onClick={resetTimer}
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid var(--border)',
                            transition: 'all 0.2s'
                        }}
                    >
                        <RotateCcw size={18} />
                    </button>

                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                backgroundColor: 'rgba(255,255,255,0.05)',
                                color: 'var(--text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px solid var(--border)',
                                transition: 'all 0.2s'
                            }}
                        >
                            <MoreHorizontal size={18} />
                        </button>

                        {showMenu && (
                            <div style={{
                                position: 'absolute',
                                bottom: '50px',
                                right: '0',
                                backgroundColor: 'var(--bg-card)',
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                                padding: '8px',
                                zIndex: 100,
                                width: '160px',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                animation: 'fadeInSlideUp 0.3s ease'
                            }}>
                                <button
                                    onClick={() => { setIsTimerMode(!isTimerMode); setIsActive(false); setShowMenu(false); }}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        fontSize: '0.8rem',
                                        color: 'var(--text-main)',
                                        backgroundColor: 'transparent',
                                        textAlign: 'left'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    {isTimerMode ? <Clock size={14} /> : <TimerIcon size={14} />}
                                    {isTimerMode ? 'Use Stopwatch' : 'Use Timer'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '500', opacity: 0.6 }}>
                    {isActive ? (isTimerMode ? 'Focusing...' : 'Tracking...') : 'Paused'}
                </div>
            </div>
        </div>
    );
}

export default FocusTimer;

