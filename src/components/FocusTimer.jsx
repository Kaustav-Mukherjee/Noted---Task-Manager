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
            padding: '20px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            position: 'relative',
            overflow: 'hidden'
        }}>
            <div style={{ display: 'flex', gap: '8px', zIndex: 1 }}>
                {Object.keys(MODES).map((k) => (
                    <button
                        key={k}
                        onClick={() => switchMode(k)}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '12px',
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            backgroundColor: mode === k ? MODES[k].color : 'var(--bg-hover)',
                            color: mode === k ? 'var(--bg-app)' : 'var(--text-muted)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}
                    >
                        {MODES[k].label}
                    </button>
                ))}
            </div>

            <div style={{ position: 'relative', width: '160px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="160" height="160" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.1))' }}>
                    <circle
                        cx="80" cy="80" r="74"
                        fill="none"
                        stroke="var(--bg-hover)"
                        strokeWidth="8"
                    />
                    <circle
                        cx="80" cy="80" r="74"
                        fill="none"
                        stroke={MODES[mode].color}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 74}
                        strokeDashoffset={2 * Math.PI * 74 * (1 - progress / 100)}
                        style={{ transition: 'stroke-dashoffset 1s linear' }}
                    />
                </svg>
                <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
                        {formatTime(timeLeft)}
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', zIndex: 1 }}>
                <button
                    onClick={toggleTimer}
                    style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '18px',
                        backgroundColor: 'var(--text-main)',
                        color: 'var(--bg-app)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.3)'
                    }}
                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.92)'}
                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    {isActive ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" style={{ marginLeft: '4px' }} />}
                </button>
                <button
                    onClick={resetTimer}
                    style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '18px',
                        backgroundColor: 'var(--bg-hover)',
                        color: 'var(--text-main)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid var(--border)',
                        transition: 'all 0.2s'
                    }}
                >
                    <RotateCcw size={22} />
                </button>
            </div>

            {mode === 'FOCUS' && timeLeft > 0 && (
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Zap size={12} /> Stay focused!
                </div>
            )}
        </div>
    );
}

export default FocusTimer;
