import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Zap, MoreHorizontal, Settings, Clock, Timer as TimerIcon } from 'lucide-react';

const MODES = {
    FOCUS: { label: 'Focus', minutes: 25, color: '#3b82f6' },
    SHORT_BREAK: { label: 'Short Break', minutes: 5, color: '#22c55e' },
    LONG_BREAK: { label: 'Long Break', minutes: 15, color: '#3b82f6' }
};

function FocusTimer({ onTimerComplete }) {
    const [mode, setMode] = useState('FOCUS');
    const [isTimerMode, setIsTimerMode] = useState(true);
    const [timeLeft, setTimeLeft] = useState(MODES.FOCUS.minutes * 60);
    const [useSeconds, setUseSeconds] = useState(0); // For stopwatch
    const [isActive, setIsActive] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const timerRef = useRef(null);

    useEffect(() => {
        if (isActive) {
            timerRef.current = setInterval(() => {
                if (isTimerMode) {
                    setTimeLeft(prev => {
                        if (prev <= 1) {
                            handleComplete();
                            return 0;
                        }
                        return prev - 1;
                    });
                } else {
                    setUseSeconds(prev => prev + 1);
                }
            }, 1000);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [isActive, isTimerMode]);

    const handleComplete = () => {
        setIsActive(false);
        if (mode === 'FOCUS') {
            const hours = MODES.FOCUS.minutes / 60;
            onTimerComplete(hours);
        }
        setTimeLeft(MODES[mode].minutes * 60);
    };

    const toggleTimer = () => setIsActive(!isActive);

    const resetTimer = () => {
        setIsActive(false);
        if (isTimerMode) {
            setTimeLeft(MODES[mode].minutes * 60);
        } else {
            setUseSeconds(0);
        }
    };

    const switchMode = (newMode) => {
        setIsActive(false);
        setMode(newMode);
        if (isTimerMode) {
            setTimeLeft(MODES[newMode].minutes * 60);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        return mins;
    };

    const totalSeconds = isTimerMode ? MODES[mode].minutes * 60 : 3600; // 60 mins for stopwatch wrap
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

            // Progress logic: for timer, ticks disappear or dim. For stopwatch, they fill up.
            const isActiveTick = isTimerMode
                ? (i / tickCount) < (timeLeft / (MODES[mode].minutes * 60))
                : (i / tickCount) < ((useSeconds % 3600) / 3600);

            ticks.push(
                <line
                    key={i}
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={isActiveTick ? MODES[mode].color : 'var(--bg-hover)'}
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
        <div className="card-hover" style={{
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
                    <Zap size={16} color={MODES[mode].color} fill={MODES[mode].color} style={{ opacity: 0.8 }} />
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
                    </div>
                )}
            </div>

            {/* Circular UI */}
            <div style={{ position: 'relative', width: '220px', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="220" height="220" viewBox="0 0 200 200">
                    {renderTicks()}
                </svg>

                <div style={{ position: 'absolute', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontSize: '3.5rem', fontWeight: '300', color: 'var(--text-main)', lineHeight: 1 }}>
                        {isTimerMode ? Math.ceil(timeLeft / 60) : Math.floor(useSeconds / 60)}
                    </span>
                    <span style={{ fontSize: '1.2rem', fontWeight: '300', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        min
                    </span>
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
                            backgroundColor: isActive ? 'transparent' : MODES[mode].color,
                            color: isActive ? 'var(--text-main)' : 'var(--bg-app)',
                            border: isActive ? `2px solid var(--border)` : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: isActive ? 'none' : `0 8px 20px ${MODES[mode].color}44`
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

