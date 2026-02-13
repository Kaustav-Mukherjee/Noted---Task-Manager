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
    sendInvitationEmails,
    getEmailConfigStatus,
    validateEmailJSTemplate
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
    const [emailConfigStatus, setEmailConfigStatus] = useState(null);
    const [emailTemplateWarning, setEmailTemplateWarning] = useState(null);

    useEffect(() => {
        if (!user || !isOpen) return;

        // Check email configuration
        const config = getEmailConfigStatus();
        setEmailConfigStatus(config);
        
        // Check template configuration
        if (config.configured) {
            const validation = validateEmailJSTemplate();
            setEmailTemplateWarning(validation);
        }

        const unsubscribe = subscribeToUserSharedDashboards(user.uid, (dashboards) => {
            setSharedDashboards(dashboards);
        });

        return () => unsubscribe();
    }, [user, isOpen]);

    const handleCreateDashboard = async () => {
        if (!user) {
            alert('Please sign in first');
            return;
        }
        
        if (!newDashboardTitle.trim()) {
            alert('Please enter a dashboard title');
            return;
        }
        
        setLoading(true);
        setEmailStatus(null);
        
        try {
            const emailList = allowedEmails
                .split(',')
                .map(email => email.trim())
                .filter(email => email.length > 0 && email.includes('@'));

            console.log('Creating dashboard with title:', newDashboardTitle);
            console.log('Email list:', emailList);

            const newDashboard = await createSharedDashboard(user.uid, {
                title: newDashboardTitle,
                permissions: newDashboardPermissions,
                allowedEmails: emailList
            });
            
            console.log('Dashboard created:', newDashboard);
            
            // Send invitation emails if email addresses are provided
            if (emailList.length > 0) {
                setEmailStatus('sending');
                console.log('Starting to send emails to:', emailList);
                
                try {
                    const emailResults = await sendInvitationEmails(
                        emailList,
                        newDashboard.shareLink,
                        newDashboardTitle,
                        user.email,
                        newDashboardPermissions
                    );
                    
                    console.log('Email sending results:', emailResults);
                    const successfulSends = emailResults.filter(r => r.success).length;
                    const failedSends = emailResults.filter(r => !r.success);
                    const fallbackSends = emailResults.filter(r => r.fallback && !r.success);
                    
                    if (failedSends.length > 0) {
                        console.error('Failed emails:', failedSends);
                        // Don't show alert for fallback scenarios
                        if (fallbackSends.length === 0) {
                            const failedEmails = failedSends.map(f => f.email).join(', ');
                            alert(`Failed to send emails to: ${failedEmails}\n\nLink is still created successfully! You can copy the link and share it manually.`);
                        }
                    }
                    
                    setEmailStatus({
                        sent: successfulSends,
                        total: emailList.length,
                        results: emailResults,
                        failed: failedSends,
                        fallback: fallbackSends
                    });
                } catch (emailError) {
                    console.error('Error sending emails:', emailError);
                    alert('Dashboard created but failed to send emails: ' + emailError.message);
                    setEmailStatus({
                        sent: 0,
                        total: emailList.length,
                        results: [],
                        failed: emailList.map(email => ({ email, error: emailError.message }))
                    });
                }
            }
            
            console.log('Showing success modal with link:', newDashboard.shareLink);
            setNewlyCreatedDashboard(newDashboard);
            setShowSuccessModal(true);
            
            // Force show alert to confirm
            setTimeout(() => {
                alert(`Share link created successfully!\n\nLink: ${newDashboard.shareLink}\n\nYou can now copy the link from the modal.`);
            }, 100);
            
            setIsCreating(false);
            setNewDashboardTitle('My Dashboard');
            setNewDashboardPermissions('view');
            setAllowedEmails('');
        } catch (error) {
            console.error('Error creating shared dashboard:', error);
            console.error('Error details:', {
                code: error.code,
                message: error.message,
                stack: error.stack
            });
            alert('Failed to create shared dashboard: ' + error.message + '\n\nPlease check the browser console for more details.');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyLink = async (shareLink, id) => {
        const result = await copyShareLink(shareLink);
        if (result.success) {
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } else {
            // Show error with manual copy instructions
            alert(result.error || 'Failed to copy link. Please select and copy the link manually.');
        }
    };

    const handleCopyNewLink = async () => {
        if (newlyCreatedDashboard) {
            const result = await copyShareLink(newlyCreatedDashboard.shareLink);
            if (result.success) {
                setCopiedId('new');
                setTimeout(() => setCopiedId(null), 2000);
            } else {
                alert(result.error || 'Failed to copy link. Please select and copy the link manually.');
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

                                                {/* Permission - View Only */}
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    fontSize: '0.8rem',
                                                    color: 'var(--text-muted)',
                                                    padding: '8px 12px',
                                                    backgroundColor: 'var(--bg-input)',
                                                    borderRadius: '6px'
                                                }}>
                                                    <Lock size={14} />
                                                    <span>View Only</span>
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

                            {/* Permission - Fixed to View Only */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '16px',
                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                border: '2px solid #3b82f6',
                                borderRadius: '12px'
                            }}>
                                <Lock size={24} color="#3b82f6" />
                                <div>
                                    <div style={{
                                        fontWeight: '600',
                                        color: '#3b82f6'
                                    }}>
                                        View Only
                                    </div>
                                    <div style={{
                                        fontSize: '0.75rem',
                                        color: 'var(--text-muted)'
                                    }}>
                                        Others can only view your dashboard
                                    </div>
                                </div>
                            </div>

                            {/* Email Configuration Warning */}
                            {emailConfigStatus && !emailConfigStatus.configured && (
                                <div style={{
                                    padding: '10px 12px',
                                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                    border: '1px solid rgba(245, 158, 11, 0.3)',
                                    borderRadius: '8px',
                                    fontSize: '0.8rem',
                                    color: '#f59e0b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <span>⚠️</span>
                                    <span>Email service not configured. You'll need to copy the link and share it manually, or use the mailto links that will be provided.</span>
                                </div>
                            )}

                            {/* EmailJS Template Configuration Warning */}
                            {emailTemplateWarning && emailTemplateWarning.warning && (
                                <div style={{
                                    padding: '10px 12px',
                                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                    borderRadius: '8px',
                                    fontSize: '0.75rem',
                                    color: '#3b82f6',
                                    marginTop: '10px'
                                }}>
                                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>📧 Important: Email Template Setup</div>
                                    <div style={{ marginBottom: '4px' }}>{emailTemplateWarning.warning}</div>
                                    <div style={{ fontSize: '0.7rem', opacity: 0.9 }}>{emailTemplateWarning.suggestion}</div>
                                </div>
                            )}

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
                                    placeholder="Enter email addresses separated by commas (invitation emails will be sent automatically when configured)"
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
                                    {emailConfigStatus?.configured 
                                        ? 'Invitation emails will be sent automatically. Leave empty to allow anyone with the link to access.'
                                        : 'Emails will not be sent automatically. You will need to copy the link and share it manually or use the provided mailto links.'}
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

            {/* Success Popover - Shows after creating link */}
            {showSuccessModal && newlyCreatedDashboard && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'var(--bg-card)',
                    padding: '24px',
                    borderRadius: '16px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    border: '1px solid var(--border)',
                    width: '90%',
                    maxWidth: '400px',
                    zIndex: 3000,
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px auto'
                    }}>
                        <Check size={28} color="#22c55e" />
                    </div>
                    
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '6px' }}>
                        Share Link Created!
                    </h3>
                    
                    <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.85rem' }}>
                        Your dashboard is ready to share
                    </p>

                    {/* Email Status */}
                    {emailStatus && (
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{
                                padding: '8px 12px',
                                backgroundColor: emailStatus.sent === emailStatus.total ? 'rgba(34, 197, 94, 0.1)' : emailStatus.failed?.length > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                border: `1px solid ${emailStatus.sent === emailStatus.total ? 'rgba(34, 197, 94, 0.3)' : emailStatus.failed?.length > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                                borderRadius: '8px',
                                marginBottom: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                fontSize: '0.8rem',
                                color: emailStatus.sent === emailStatus.total ? '#22c55e' : emailStatus.failed?.length > 0 ? '#ef4444' : '#3b82f6'
                            }}>
                                <Mail size={14} />
                                {emailStatus === 'sending' ? (
                                    <span>Sending emails...</span>
                                ) : emailStatus.failed?.length > 0 ? (
                                    <span>Emails failed: {emailStatus.failed.length}/{emailStatus.total}</span>
                                ) : (
                                    <span>Emails sent: {emailStatus.sent}/{emailStatus.total}</span>
                                )}
                            </div>
                            
                            {/* Show fallback mailto links */}
                            {emailStatus.fallback?.length > 0 && (
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px'
                                }}>
                                    {emailStatus.fallback.map((fallback, idx) => (
                                        <a
                                            key={idx}
                                            href={fallback.mailtoLink}
                                            style={{
                                                color: '#3b82f6',
                                                textDecoration: 'none',
                                                padding: '8px',
                                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                                borderRadius: '6px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                                fontSize: '0.8rem'
                                            }}
                                            onClick={(e) => {
                                                window.open(fallback.mailtoLink, '_blank');
                                                e.preventDefault();
                                            }}
                                        >
                                            <Mail size={14} />
                                            Email {fallback.email}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Share Link Display */}
                    <div style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: 'var(--bg-hover)',
                        borderRadius: '10px',
                        marginBottom: '16px'
                    }}>
                        <label style={{
                            display: 'block',
                            fontSize: '0.7rem',
                            color: 'var(--text-muted)',
                            marginBottom: '6px',
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
                                    padding: '10px',
                                    backgroundColor: 'var(--bg-input)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '6px',
                                    fontSize: '0.8rem',
                                    color: 'var(--text-main)'
                                }}
                            />
                            <button
                                onClick={handleCopyNewLink}
                                style={{
                                    padding: '10px 16px',
                                    backgroundColor: copiedId === 'new' ? '#22c55e' : 'var(--text-main)',
                                    color: 'white',
                                    borderRadius: '6px',
                                    fontWeight: '600',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    whiteSpace: 'nowrap',
                                    fontSize: '0.8rem'
                                }}
                            >
                                {copiedId === 'new' ? (
                                    <>
                                        <Check size={14} />
                                        Copied
                                    </>
                                ) : (
                                    <>
                                        <Copy size={14} />
                                        Copy
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                        <button
                            onClick={() => window.open(newlyCreatedDashboard.shareLink, '_blank')}
                            style={{
                                flex: 1,
                                padding: '12px',
                                backgroundColor: 'var(--bg-hover)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                color: 'var(--text-main)',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                fontSize: '0.85rem'
                            }}
                        >
                            <ExternalLink size={16} />
                            Open
                        </button>
                        <button
                            onClick={handleCloseSuccessModal}
                            style={{
                                flex: 1,
                                padding: '12px',
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
            
            {/* Overlay backdrop for popover */}
            {showSuccessModal && newlyCreatedDashboard && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    zIndex: 2999
                }} onClick={handleCloseSuccessModal} />
            )}
        </div>
    );
}
