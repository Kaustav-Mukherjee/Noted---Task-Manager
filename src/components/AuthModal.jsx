import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { X, Mail, Lock, User } from 'lucide-react';

function AuthModal({ isOpen, onClose }) {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();

    if (!isOpen) return null;

    const handleEmailAuth = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = isSignUp
            ? await signUpWithEmail(email, password)
            : await signInWithEmail(email, password);

        if (result.error) {
            setError(result.error);
        } else {
            onClose();
        }
        setLoading(false);
    };

    const handleGoogleAuth = async () => {
        setError('');
        setLoading(true);
        const result = await signInWithGoogle();
        if (result.error) {
            setError(result.error);
        } else {
            onClose();
        }
        setLoading(false);
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                backgroundColor: 'var(--bg-card)',
                borderRadius: '20px',
                padding: '32px',
                width: '100%',
                maxWidth: '400px',
                position: 'relative'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        padding: '8px',
                        color: 'var(--text-muted)'
                    }}
                >
                    <X size={20} />
                </button>

                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '8px', textAlign: 'center' }}>
                    {isSignUp ? 'Create Account' : 'Welcome Back'}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', marginBottom: '24px' }}>
                    {isSignUp ? 'Sign up to save your tasks' : 'Sign in to access your tasks'}
                </p>

                {error && (
                    <div style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#ef4444',
                        padding: '12px',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        fontSize: '0.85rem'
                    }}>
                        {error}
                    </div>
                )}

                {/* Google Sign In Button */}
                <button
                    onClick={handleGoogleAuth}
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        fontSize: '0.95rem',
                        fontWeight: '500',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.7 : 1,
                        transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = 'var(--bg-hover)'}
                    onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '20px 0' }}>
                    <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }}></div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>or</span>
                    <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }}></div>
                </div>

                {/* Email/Password Form */}
                <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ position: 'relative' }}>
                        <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '12px 12px 12px 42px',
                                borderRadius: '10px',
                                backgroundColor: 'var(--bg-input)',
                                fontSize: '0.95rem'
                            }}
                        />
                    </div>

                    <div style={{ position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            style={{
                                width: '100%',
                                padding: '12px 12px 12px 42px',
                                borderRadius: '10px',
                                backgroundColor: 'var(--bg-input)',
                                fontSize: '0.95rem'
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '10px',
                            backgroundColor: 'var(--text-main)',
                            color: 'var(--bg-app)',
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1,
                            marginTop: '4px'
                        }}
                    >
                        {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                    <button
                        onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
                        style={{ color: 'var(--text-main)', fontWeight: '500' }}
                    >
                        {isSignUp ? 'Sign In' : 'Sign Up'}
                    </button>
                </p>
            </div>
        </div>
    );
}

export default AuthModal;
