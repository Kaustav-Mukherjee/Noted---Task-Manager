import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Coffee, Target, Zap } from 'lucide-react';

const MODES = {
    FOCUS: { label: 'Focus', minutes: 25, color: 'var(--text-main)' },
    SHORT_BREAK: { label: 'Short Break', minutes: 5, color: '#22c55e' },
    LONG_BREAK: { label: 'Long Break', minutes: 15, color: '#3b82f6' }
};

function FocusTimer({ onTimerComplete }) {
    const [mode, setMode] = useState('FOCUS');
    const [timeLeft, setTimeLeft] = useState(MODES.FOCUS.minutes * 60);
    const [isActive, setIsActive] = useState(false);
    const timerRef = useRef(null);

    useEffect(() => {
        if (isActive && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            handleComplete();
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [isActive, timeLeft]);

    const handleComplete = () => {
        setIsActive(false);
        if (mode === 'FOCUS') {
            const hours = MODES.FOCUS.minutes / 60;
            onTimerComplete(hours);
            // Alert or sound could go here
        }
        // Switch to break? Or let user decide. 
        // For now, just stop and reset to current mode's time.
        setTimeLeft(MODES[mode].minutes * 60);
    };

    const toggleTimer = () => setIsActive(!isActive);

    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(MODES[mode].minutes * 60);
    };

    const switchMode = (newMode) => {
        setIsActive(false);
        setMode(newMode);
        setTimeLeft(MODES[newMode].minutes * 60);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = (timeLeft / (MODES[mode].minutes * 60)) * 100;

    return (
        <div style={{
            padding: '24px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '24px',
            position: 'relative',
            overflow: 'hidden',
            height: '100%',
            flex: 1,
            transition: 'all var(--transition-main)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%', alignItems: 'center', gap: '8px' }}>
                <Zap size={16} color={MODES[mode].color} fill={MODES[mode].color} style={{ opacity: 0.8 }} />
                <h3 style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Focus</h3>
            </div>

            <div style={{ display: 'flex', gap: '4px', zIndex: 1, backgroundColor: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '12px' }}>
                {Object.keys(MODES).map((k) => (
                    <button
                        key={k}
                        onClick={() => switchMode(k)}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '0.65rem',
                            fontWeight: '600',
                            backgroundColor: mode === k ? 'var(--text-main)' : 'transparent',
                            color: mode === k ? 'var(--bg-app)' : 'var(--text-muted)',
                            transition: 'all var(--transition-main)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}
                    >
                        {MODES[k].label}
                    </button>
                ))}
            </div>

            <div style={{ position: 'relative', width: '160px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="160" height="160" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
                    <circle
                        cx="80" cy="80" r="70"
                        fill="none"
                        stroke="var(--bg-hover)"
                        strokeWidth="4"
                        opacity="0.3"
                    />
                    <circle
                        cx="80" cy="80" r="70"
                        fill="none"
                        stroke={MODES[mode].color}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 70}
                        strokeDashoffset={2 * Math.PI * 70 * (1 - progress / 100)}
                        style={{ transition: 'stroke-dashoffset 0.4s var(--ease-apple)' }}
                    />
                </svg>
                <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: '700', letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
                        {formatTime(timeLeft)}
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', zIndex: 1, alignItems: 'center' }}>
                <button
                    onClick={toggleTimer}
                    style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--text-main)',
                        color: 'var(--bg-app)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all var(--transition-main)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
                    }}
                >
                    {isActive ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" style={{ marginLeft: '4px' }} />}
                </button>
                <button
                    onClick={resetTimer}
                    style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--bg-hover)',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid var(--border)',
                        transition: 'all var(--transition-fast)'
                    }}
                >
                    <RotateCcw size={18} />
                </button>
            </div>

            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', opacity: 0.6, letterSpacing: '0.02em' }}>
                {mode === 'FOCUS' && timeLeft > 0 ? 'Stay focused on your task' : '\u00A0'}
            </div>

        </div>
    );
}

export default FocusTimer;
