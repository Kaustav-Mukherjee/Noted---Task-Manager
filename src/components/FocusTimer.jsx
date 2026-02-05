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
            padding: '16px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            position: 'relative',
            overflow: 'hidden',
            height: '100%',
            flex: 1
        }}>
            <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Zap size={18} color={MODES[mode].color} fill={MODES[mode].color} />
                </div>
                <h3 style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)' }}>Focus Session</h3>
            </div>

            <div style={{ display: 'flex', gap: '6px', zIndex: 1, backgroundColor: 'var(--bg-hover)', padding: '4px', borderRadius: '14px' }}>
                {Object.keys(MODES).map((k) => (
                    <button
                        key={k}
                        onClick={() => switchMode(k)}
                        style={{
                            padding: '6px 10px',
                            borderRadius: '10px',
                            fontSize: '0.65rem',
                            fontWeight: '750',
                            backgroundColor: mode === k ? MODES[k].color : 'transparent',
                            color: mode === k ? 'var(--bg-app)' : 'var(--text-muted)',
                            transition: 'all var(--transition-main)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em'
                        }}
                    >
                        {MODES[k].label}
                    </button>
                ))}
            </div>

            <div style={{ position: 'relative', width: '140px', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="140" height="140" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
                    <circle
                        cx="80" cy="80" r="74"
                        fill="none"
                        stroke="var(--bg-hover)"
                        strokeWidth="10"
                    />
                    <circle
                        cx="80" cy="80" r="74"
                        fill="none"
                        stroke={MODES[mode].color}
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 74}
                        strokeDashoffset={2 * Math.PI * 74 * (1 - progress / 100)}
                        style={{ transition: 'stroke-dashoffset 1s linear' }}
                    />
                </svg>
                <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: '2.2rem', fontWeight: '800', letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
                        {formatTime(timeLeft)}
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', zIndex: 1 }}>
                <button
                    onClick={toggleTimer}
                    style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '16px',
                        backgroundColor: 'var(--text-main)',
                        color: 'var(--bg-app)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                    }}
                >
                    {isActive ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" style={{ marginLeft: '2px' }} />}
                </button>
                <button
                    onClick={resetTimer}
                    style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '16px',
                        backgroundColor: 'var(--bg-hover)',
                        color: 'var(--text-main)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid var(--border)',
                        transition: 'all 0.2s'
                    }}
                >
                    <RotateCcw size={18} />
                </button>
            </div>

            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontStyle: 'italic', height: '14px' }}>
                {mode === 'FOCUS' && timeLeft > 0 ? 'Stay focused on your task.' : '\u00A0'}
            </div>

        </div>
    );
}

export default FocusTimer;
