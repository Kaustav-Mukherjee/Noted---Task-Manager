import { Moon, Sun, CheckSquare, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

function Header({ theme, toggleTheme, user, onSignInClick }) {
    const { logout } = useAuth();

    const today = new Date();
    const dateString = today.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });

    const handleLogout = async () => {
        await logout();
    };

    return (
        <div className="header-container">
            <div className="brand-section">
                <div className="card-hover" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px', cursor: 'pointer', transition: 'all var(--transition-main)' }}>
                    <CheckSquare size={32} strokeWidth={2.5} />
                    <h1 style={{ fontWeight: '700', letterSpacing: '-0.03em' }}>Noted</h1>
                </div>

                <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>{dateString}</p>
            </div>

            <div className="nav-actions">
                {user ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {user.photoURL && (
                            <img
                                src={user.photoURL}
                                alt="Profile"
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    border: '2px solid var(--border)'
                                }}
                            />
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: '500' }}>
                                {user.displayName || user.email?.split('@')[0]}
                            </span>
                            <button
                                onClick={handleLogout}
                                style={{
                                    fontSize: '0.7rem',
                                    color: 'var(--text-muted)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                <LogOut size={12} /> Sign Out
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={onSignInClick}
                        style={{
                            padding: '8px 20px',
                            borderRadius: '24px',
                            backgroundColor: 'var(--text-main)',
                            color: 'var(--bg-app)',
                            fontWeight: '600',
                            fontSize: '0.85rem',
                            transition: 'all var(--transition-main)'
                        }}

                    >
                        Sign In
                    </button>
                )}

                <button
                    onClick={toggleTheme}
                    style={{
                        padding: '8px',
                        color: 'var(--text-muted)',
                        borderRadius: '50%',
                        transition: 'all var(--transition-fast)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}

                >
                    {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                </button>
            </div>
        </div>
    );
}

export default Header;
