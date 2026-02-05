import { useState } from 'react';
import { Youtube, Play, X, Search, Link as LinkIcon } from 'lucide-react';

function YouTubeNowPlaying() {
    const [videoId, setVideoId] = useState('jfKfPfyJRdk'); // Default lofi girl
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
            padding: '16px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '12px',
            height: '100%'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#ff000022', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Youtube size={18} color="#ff0000" />
                    </div>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-main)' }}>Now Playing</h3>
                </div>
                <button
                    onClick={() => setShowInput(!showInput)}
                    style={{
                        padding: '6px',
                        borderRadius: '8px',
                        backgroundColor: showInput ? 'var(--text-main)' : 'var(--bg-hover)',
                        color: showInput ? 'var(--bg-app)' : 'var(--text-muted)',
                        transition: 'all 0.2s'
                    }}
                >
                    {showInput ? <X size={14} /> : <LinkIcon size={14} />}
                </button>
            </div>

            {showInput && (
                <form onSubmit={handleUpdateVideo} style={{ display: 'flex', gap: '8px' }}>
                    <input
                        type="text"
                        placeholder="Paste YouTube Link or ID..."
                        value={tempUrl}
                        onChange={(e) => setTempUrl(e.target.value)}
                        style={{
                            flex: 1,
                            backgroundColor: 'var(--bg-hover)',
                            border: '1px solid var(--border)',
                            borderRadius: '10px',
                            padding: '8px 12px',
                            fontSize: '0.75rem',
                            color: 'var(--text-main)',
                            outline: 'none'
                        }}
                    />
                    <button type="submit" style={{ padding: '8px 12px', backgroundColor: 'var(--text-main)', color: 'var(--bg-app)', borderRadius: '10px', fontSize: '0.75rem', fontWeight: '700' }}>
                        Set
                    </button>
                </form>
            )}

            <div style={{
                width: '100%',
                aspectRatio: '16/9',
                borderRadius: '12px',
                overflow: 'hidden',
                backgroundColor: '#000',
                border: '1px solid var(--border)',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
            }}>
                <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=0&controls=1&rel=0&modestbranding=1`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                ></iframe>
            </div>

            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', fontStyle: 'italic' }}>
                Note: Sign in to YouTube in the player to sync your account.
            </div>
        </div>
    );
}

export default YouTubeNowPlaying;
