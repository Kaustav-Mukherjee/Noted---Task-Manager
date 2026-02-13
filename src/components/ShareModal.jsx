import { useState, useEffect } from 'react';
import { X, Link, Copy, Check, Users, Lock, Unlock, Trash2, Share2, Mail, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { 
    createSharedDashboard, 
    updateSharedDashboard, 
    deleteSharedDashboard,
    subscribeToUserSharedDashboards,
    copyShareLink,
    canAccessSharedDashboard,
    sendInvitationEmails
} from '../services/sharingService';

export default function ShareModal({ isOpen, onClose }) {
    const { user } = useAuth();
    const [sharedDashboards, setSharedDashboards] = useState([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newDashboardTitle, setNewDashboardTitle] = useState('My Dashboard');
    const [newDashboardPermissions, setNewDashboardPermissions] = useState('view');
    const [allowedEmails, setAllowedEmails] = useState('');
    const [copiedId, setCopiedId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [newlyCreatedDashboard, setNewlyCreatedDashboard] = useState(null);
    const [emailStatus, setEmailStatus] = useState(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    useEffect(() => {
        if (!user || !isOpen) return;

        const unsubscribe = subscribeToUserSharedDashboards(user.uid, (dashboards) => {
            setSharedDashboards(dashboards);
        });

        return () => unsubscribe();
    }, [user, isOpen]);

    const handleCreateDashboard = async () => {
        if (!user) return;
        setLoading(true);
        setEmailStatus(null);
        
        try {
            const emailList = allowedEmails
                .split(',')
                .map(email => email.trim())
                .filter(email => email.length > 0);

            const newDashboard = await createSharedDashboard(user.uid, {
                title: newDashboardTitle,
                permissions: newDashboardPermissions,
                allowedEmails: emailList
            });
            
            // Send invitation emails if email addresses are provided
            if (emailList.length > 0) {
                setEmailStatus('sending');
                const emailResults = await sendInvitationEmails(
                    emailList,
                    newDashboard.shareLink,
                    newDashboardTitle,
                    user.email,
                    newDashboardPermissions
                );
                
                const successfulSends = emailResults.filter(r => r.success).length;
                setEmailStatus({
                    sent: successfulSends,
                    total: emailList.length,
                    results: emailResults
                });
            }
            
            setNewlyCreatedDashboard(newDashboard);
            setShowSuccessModal(true);
            setIsCreating(false);
            setNewDashboardTitle('My Dashboard');
            setNewDashboardPermissions('view');
            setAllowedEmails('');
        } catch (error) {
            console.error('Error creating shared dashboard:', error);
            alert('Failed to create shared dashboard: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCopyLink = async (shareLink, id) => {
        const success = await copyShareLink(shareLink);
        if (success) {
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        }
    };

    const handleCopyNewLink = async () => {
        if (newlyCreatedDashboard) {
            const success = await copyShareLink(newlyCreatedDashboard.shareLink);
            if (success) {
                setCopiedId('new');
                setTimeout(() => setCopiedId(null), 2000);
            }
        }
    };

    const handleCloseSuccessModal = () => {
        setShowSuccessModal(false);
        setNewlyCreatedDashboard(null);
        setEmailStatus(null);
    };

    const handleDeleteDashboard = async (dashboardId) => {
        if (!confirm('Are you sure you want to delete this shared dashboard?')) return;
        
        try {
            await deleteSharedDashboard(dashboardId);
        } catch (error) {
            console.error('Error deleting dashboard:', error);
            alert('Failed to delete dashboard');
        }
    };

    const handleUpdatePermissions = async (dashboardId, newPermissions) => {
        try {
            await updateSharedDashboard(dashboardId, { permissions: newPermissions });
        } catch (error) {
            console.error('Error updating permissions:', error);
            alert('Failed to update permissions');
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
        }}>
            <div style={{
                backgroundColor: 'var(--bg-card)',
                borderRadius: '20px',
                width: '100%',
                maxWidth: '500px',
                maxHeight: '80vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Share2 size={20} color="var(--text-main)" />
                        <h2 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Share Dashboard</h2>
                    </div>
                    <button 
                        onClick={onClose}
                        style={{ 
                            padding: '8px', 
                            borderRadius: '8px',
                            color: 'var(--text-muted)',
                            transition: 'all 0.2s'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ 
                    padding: '24px', 
                    overflowY: 'auto',
                    flex: 1
                }}>
                    {!isCreating ? (
                        <>
                            {/* Create New Button */}
                            <button
                                onClick={() => setIsCreating(true)}
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    backgroundColor: 'var(--text-main)',
                                    color: 'var(--bg-app)',
                                    borderRadius: '12px',
                                    fontWeight: '700',
                                    marginBottom: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                }}
                            >
                                <Link size={18} />
                                Create New Share Link
                            </button>

                            {/* Existing Shared Dashboards */}
                            {sharedDashboards.length > 0 && (
                                <div>
                                    <h3 style={{ 
                                        fontSize: '0.9rem', 
                                        fontWeight: '600', 
                                        marginBottom: '16px',
                                        color: 'var(--text-muted)'
                                    }}>
                                        Your Shared Dashboards
                                    </h3>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {sharedDashboards.map((dashboard) => (
                                            <div
                                                key={dashboard.id}
                                                style={{
                                                    padding: '16px',
                                                    backgroundColor: 'var(--bg-hover)',
                                                    borderRadius: '12px',
                                                    border: '1px solid var(--border)'
                                                }}
                                            >
                                                <div style={{ 
                                                    display: 'flex', 
                                                    justifyContent: 'space-between',
                                                    alignItems: 'flex-start',
                                                    marginBottom: '12px'
                                                }}>
                                                    <div>
                                                        <h4 style={{ 
                                                            fontWeight: '600',
                                                            marginBottom: '4px'
                                                        }}>
                                                            {dashboard.title}
                                                        </h4>
                                                        <div style={{ 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            gap: '6px',
                                                            fontSize: '0.75rem',
                                                            color: 'var(--text-muted)'
                                                        }}>
                                                            {dashboard.permissions === 'edit' ? (
                                                                <>
                                                                    <Unlock size={12} />
                                                                    <span>Can Edit</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Lock size={12} />
                                                                    <span>View Only</span>
                                                                </>
                                                            )}
                                                            {dashboard.collaborators?.length > 0 && (
                                                                <>
                                                                    <span>•</span>
                                                                    <Users size={12} />
                                                                    <span>{dashboard.collaborators.length} collaborators</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteDashboard(dashboard.id)}
                                                        style={{
                                                            padding: '6px',
                                                            color: '#ef4444',
                                                            borderRadius: '6px'
                                                        }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>

                                                {/* Share Link */}
                                                <div style={{
                                                    display: 'flex',
                                                    gap: '8px',
                                                    marginBottom: '12px'
                                                }}>
                                                    <input
                                                        type="text"
                                                        value={dashboard.shareLink}
                                                        readOnly
                                                        style={{
                                                            flex: 1,
                                                            padding: '10px 12px',
                                                            backgroundColor: 'var(--bg-input)',
                                                            border: '1px solid var(--border)',
                                                            borderRadius: '8px',
                                                            fontSize: '0.8rem',
                                                            color: 'var(--text-muted)'
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => handleCopyLink(dashboard.shareLink, dashboard.id)}
                                                        style={{
                                                            padding: '10px 16px',
                                                            backgroundColor: copiedId === dashboard.id ? '#22c55e' : 'var(--bg-input)',
                                                            border: '1px solid var(--border)',
                                                            borderRadius: '8px',
                                                            color: copiedId === dashboard.id ? 'white' : 'var(--text-main)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            fontWeight: '600'
                                                        }}
                                                    >
                                                        {copiedId === dashboard.id ? (
                                                            <>
                                                                <Check size={16} />
                                                                Copied
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Copy size={16} />
                                                                Copy
                                                            </>
                                                        )}
                                                    </button>
                                                </div>

                                                {/* Permission Toggle */}
                                                <div style={{
                                                    display: 'flex',
                                                    gap: '8px',
                                                    fontSize: '0.8rem'
                                                }}>
                                                    <button
                                                        onClick={() => handleUpdatePermissions(dashboard.id, 'view')}
                                                        style={{
                                                            flex: 1,
                                                            padding: '8px',
                                                            backgroundColor: dashboard.permissions === 'view' ? 'var(--text-main)' : 'var(--bg-input)',
                                                            color: dashboard.permissions === 'view' ? 'var(--bg-app)' : 'var(--text-muted)',
                                                            borderRadius: '6px',
                                                            fontWeight: '600'
                                                        }}
                                                    >
                                                        View Only
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdatePermissions(dashboard.id, 'edit')}
                                                        style={{
                                                            flex: 1,
                                                            padding: '8px',
                                                            backgroundColor: dashboard.permissions === 'edit' ? 'var(--text-main)' : 'var(--bg-input)',
                                                            color: dashboard.permissions === 'edit' ? 'var(--bg-app)' : 'var(--text-muted)',
                                                            borderRadius: '6px',
                                                            fontWeight: '600'
                                                        }}
                                                    >
                                                        Can Edit
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {sharedDashboards.length === 0 && (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '40px 20px',
                                    color: 'var(--text-muted)'
                                }}>
                                    <Share2 size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                                    <p>No shared dashboards yet.</p>
                                    <p style={{ fontSize: '0.85rem', marginTop: '8px' }}>
                                        Create a share link to collaborate with your team.
                                    </p>
                                </div>
                            )}
                        </>
                    ) : (
                        /* Create New Dashboard Form */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <button
                                onClick={() => setIsCreating(false)}
                                style={{
                                    alignSelf: 'flex-start',
                                    fontSize: '0.85rem',
                                    color: 'var(--text-muted)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                ← Back to list
                            </button>

                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.85rem',
                                    fontWeight: '600',
                                    marginBottom: '8px',
                                    color: 'var(--text-muted)'
                                }}>
                                    Dashboard Title
                                </label>
                                <input
                                    type="text"
                                    value={newDashboardTitle}
                                    onChange={(e) => setNewDashboardTitle(e.target.value)}
                                    placeholder="Enter dashboard title"
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        backgroundColor: 'var(--bg-input)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '10px',
                                        fontSize: '1rem',
                                        color: 'var(--text-main)'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.85rem',
                                    fontWeight: '600',
                                    marginBottom: '8px',
                                    color: 'var(--text-muted)'
                                }}>
                                    Permissions
                                </label>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <label style={{
                                        flex: 1,
                                        padding: '16px',
                                        backgroundColor: newDashboardPermissions === 'view' ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-hover)',
                                        border: `2px solid ${newDashboardPermissions === 'view' ? '#3b82f6' : 'var(--border)'}`,
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <input
                                            type="radio"
                                            name="permissions"
                                            value="view"
                                            checked={newDashboardPermissions === 'view'}
                                            onChange={(e) => setNewDashboardPermissions(e.target.value)}
                                            style={{ display: 'none' }}
                                        />
                                        <Lock size={24} color={newDashboardPermissions === 'view' ? '#3b82f6' : 'var(--text-muted)'} />
                                        <span style={{
                                            fontWeight: '600',
                                            color: newDashboardPermissions === 'view' ? '#3b82f6' : 'var(--text-main)'
                                        }}>
                                            View Only
                                        </span>
                                        <span style={{
                                            fontSize: '0.75rem',
                                            color: 'var(--text-muted)',
                                            textAlign: 'center'
                                        }}>
                                            Others can only view your dashboard
                                        </span>
                                    </label>

                                    <label style={{
                                        flex: 1,
                                        padding: '16px',
                                        backgroundColor: newDashboardPermissions === 'edit' ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-hover)',
                                        border: `2px solid ${newDashboardPermissions === 'edit' ? '#3b82f6' : 'var(--border)'}`,
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <input
                                            type="radio"
                                            name="permissions"
                                            value="edit"
                                            checked={newDashboardPermissions === 'edit'}
                                            onChange={(e) => setNewDashboardPermissions(e.target.value)}
                                            style={{ display: 'none' }}
                                        />
                                        <Unlock size={24} color={newDashboardPermissions === 'edit' ? '#3b82f6' : 'var(--text-muted)'} />
                                        <span style={{
                                            fontWeight: '600',
                                            color: newDashboardPermissions === 'edit' ? '#3b82f6' : 'var(--text-main)'
                                        }}>
                                            Can Edit
                                        </span>
                                        <span style={{
                                            fontSize: '0.75rem',
                                            color: 'var(--text-muted)',
                                            textAlign: 'center'
                                        }}>
                                            Others can add and edit tasks
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.85rem',
                                    fontWeight: '600',
                                    marginBottom: '8px',
                                    color: 'var(--text-muted)'
                                }}>
                                    Restrict Access (Optional)
                                </label>
                                <textarea
                                    value={allowedEmails}
                                    onChange={(e) => setAllowedEmails(e.target.value)}
                                    placeholder="Enter email addresses separated by commas (invitation emails will be sent automatically)"
                                    rows={3}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        backgroundColor: 'var(--bg-input)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '10px',
                                        fontSize: '0.9rem',
                                        color: 'var(--text-main)',
                                        resize: 'vertical'
                                    }}
                                />
                                <p style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--text-muted)',
                                    marginTop: '6px'
                                }}>
                                    Invitation emails will be sent automatically. Leave empty to allow anyone with the link to access.
                                </p>
                            </div>

                            <button
                                onClick={handleCreateDashboard}
                                disabled={loading || !newDashboardTitle.trim()}
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    backgroundColor: loading || !newDashboardTitle.trim() ? 'var(--text-muted)' : 'var(--text-main)',
                                    color: 'var(--bg-app)',
                                    borderRadius: '12px',
                                    fontWeight: '700',
                                    marginTop: '12px',
                                    opacity: loading || !newDashboardTitle.trim() ? 0.5 : 1
                                }}
                            >
                                {loading ? 'Creating...' : 'Create Share Link'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Success Modal - Shows after creating link */}
            {showSuccessModal && newlyCreatedDashboard && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: '20px',
                    padding: '32px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    zIndex: 10
                }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '20px'
                    }}>
                        <Check size={32} color="#22c55e" />
                    </div>
                    
                    <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '8px' }}>
                        Share Link Created!
                    </h3>
                    
                    <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.9rem' }}>
                        Your dashboard is ready to share
                    </p>

                    {/* Email Status */}
                    {emailStatus && (
                        <div style={{
                            padding: '12px 16px',
                            backgroundColor: emailStatus.sent === emailStatus.total ? 'rgba(34, 197, 94, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                            border: `1px solid ${emailStatus.sent === emailStatus.total ? 'rgba(34, 197, 94, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                            borderRadius: '10px',
                            marginBottom: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.85rem',
                            color: emailStatus.sent === emailStatus.total ? '#22c55e' : '#3b82f6'
                        }}>
                            <Mail size={16} />
                            {emailStatus === 'sending' ? (
                                <span>Sending emails...</span>
                            ) : (
                                <span>Emails sent: {emailStatus.sent}/{emailStatus.total}</span>
                            )}
                        </div>
                    )}

                    {/* Share Link Display */}
                    <div style={{
                        width: '100%',
                        padding: '16px',
                        backgroundColor: 'var(--bg-hover)',
                        borderRadius: '12px',
                        marginBottom: '20px'
                    }}>
                        <label style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            marginBottom: '8px',
                            textAlign: 'left'
                        }}>
                            Share Link
                        </label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="text"
                                value={newlyCreatedDashboard.shareLink}
                                readOnly
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    backgroundColor: 'var(--bg-input)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
                                    color: 'var(--text-main)'
                                }}
                            />
                            <button
                                onClick={handleCopyNewLink}
                                style={{
                                    padding: '12px 20px',
                                    backgroundColor: copiedId === 'new' ? '#22c55e' : 'var(--text-main)',
                                    color: 'white',
                                    borderRadius: '8px',
                                    fontWeight: '600',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {copiedId === 'new' ? (
                                    <>
                                        <Check size={16} />
                                        Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy size={16} />
                                        Copy Link
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                        <button
                            onClick={() => window.open(newlyCreatedDashboard.shareLink, '_blank')}
                            style={{
                                flex: 1,
                                padding: '14px',
                                backgroundColor: 'var(--bg-hover)',
                                border: '1px solid var(--border)',
                                borderRadius: '10px',
                                color: 'var(--text-main)',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                            }}
                        >
                            <ExternalLink size={16} />
                            Open Link
                        </button>
                        <button
                            onClick={handleCloseSuccessModal}
                            style={{
                                flex: 1,
                                padding: '14px',
                                backgroundColor: 'var(--text-main)',
                                color: 'var(--bg-app)',
                                borderRadius: '10px',
                                fontWeight: '700'
                            }}
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
