import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipForward, Volume2, Music, ListMusic, X, ChevronDown } from 'lucide-react';

const TRACKS = [
    { title: 'Zen Garden', artist: 'Peaceful Ambient', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    { title: 'Deep Focus', artist: 'Minimal Lofi', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
    { title: 'Cloud Gazing', artist: 'Soft Piano', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
    { title: 'Rainy Night', artist: 'Cozy Lofi', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3' },
    { title: 'Morning Coffee', artist: 'Chill Beats', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' },
    { title: 'Starlit Study', artist: 'Space Ambient', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3' },
    { title: 'Forest Stream', artist: 'Nature Sounds', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3' },
    { title: 'Library Silence', artist: 'Atmospheric', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3' },
    { title: 'Sunset Breeze', artist: 'Melodic Lofi', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3' },
    { title: 'Ethereal Flow', artist: 'Zen Wave', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3' }
];

function FocusMusic() {
    const [currentTrackIdx, setCurrentTrackIdx] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(0.5);
    const [showLibrary, setShowLibrary] = useState(false);
    const audioRef = useRef(new Audio(TRACKS[0].url));

    useEffect(() => {
        const audio = audioRef.current;
        audio.volume = volume;

        const playPromise = isPlaying ? audio.play() : audio.pause();
        if (playPromise !== undefined && isPlaying) {
            playPromise.catch(() => setIsPlaying(false));
        }

        return () => {
            audio.pause();
        };
    }, [isPlaying, currentTrackIdx, volume]);

    const togglePlay = () => setIsPlaying(!isPlaying);

    const handleSelectTrack = (idx) => {
        audioRef.current.pause();
        setCurrentTrackIdx(idx);
        audioRef.current = new Audio(TRACKS[idx].url);
        if (isPlaying) audioRef.current.play();
        setShowLibrary(false);
    };

    const handleNext = () => {
        const nextIdx = (currentTrackIdx + 1) % TRACKS.length;
        handleSelectTrack(nextIdx);
    };

    return (
        <div style={{ padding: '16px', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid var(--border)', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '14px',
                    backgroundColor: 'var(--bg-hover)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--border)',
                    overflow: 'hidden',
                    position: 'relative'
                }}>
                    {isPlaying ? (
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '16px' }}>
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} style={{
                                    width: '3px',
                                    backgroundColor: 'var(--text-main)',
                                    borderRadius: '1px',
                                    animation: `visualizer ${0.5 + Math.random()}s ease-in-out infinite alternate`
                                }}></div>
                            ))}
                        </div>
                    ) : (
                        <Music size={22} color="var(--text-muted)" />
                    )}
                </div>
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-main)' }}>
                        {TRACKS[currentTrackIdx].title}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '500' }}>{TRACKS[currentTrackIdx].artist}</div>
                </div>
                <button
                    onClick={() => setShowLibrary(!showLibrary)}
                    style={{
                        padding: '8px',
                        borderRadius: '10px',
                        backgroundColor: showLibrary ? 'var(--text-main)' : 'var(--bg-hover)',
                        color: showLibrary ? 'var(--bg-app)' : 'var(--text-main)',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    {showLibrary ? <X size={18} /> : <ListMusic size={18} />}
                </button>
            </div>

            {showLibrary && (
                <div style={{
                    position: 'absolute',
                    top: '70px',
                    left: '12px',
                    right: '12px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '14px',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    zIndex: 100,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                    padding: '8px',
                    scrollbarWidth: 'none'
                }}>
                    {TRACKS.map((track, i) => (
                        <div
                            key={i}
                            onClick={() => handleSelectTrack(i)}
                            style={{
                                padding: '10px 12px',
                                borderRadius: '8px',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                backgroundColor: currentTrackIdx === i ? 'var(--bg-hover)' : 'transparent',
                                color: currentTrackIdx === i ? 'var(--text-main)' : 'var(--text-muted)',
                                fontWeight: currentTrackIdx === i ? '700' : '400',
                                marginBottom: '2px'
                            }}
                            onMouseOver={(e) => { if (currentTrackIdx !== i) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)' }}
                            onMouseOut={(e) => { if (currentTrackIdx !== i) e.currentTarget.style.backgroundColor = 'transparent' }}
                        >
                            <span>{track.title}</span>
                            {currentTrackIdx === i && <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--text-main)' }}></div>}
                        </div>
                    ))}
                </div>
            )}

            <style>
                {`
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.05); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 1; }
                }
                `}
            </style>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                        onClick={togglePlay}
                        style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--text-main)',
                            color: 'var(--bg-app)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingLeft: '0',
                            transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                        }}
                        onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.92)'}
                        onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
                    </button>
                    <button onClick={handleNext} style={{ color: 'var(--text-main)', opacity: 0.9 }}>
                        <SkipForward size={24} fill="currentColor" />
                    </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, backgroundColor: 'var(--bg-hover)', padding: '10px 14px', borderRadius: '14px', border: '1px solid var(--border)' }}>
                    <Volume2 size={16} color="var(--text-muted)" />
                    <input
                        type="range"
                        min="0" max="1" step="0.1"
                        value={volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        style={{
                            flex: 1,
                            height: '4px',
                            cursor: 'pointer',
                            accentColor: 'var(--text-main)'
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

export default FocusMusic;
