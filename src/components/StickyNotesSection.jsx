import { useState, useMemo } from 'react';
import { StickyNote, Folder, Plus, X, MoreVertical, Edit2, Trash2, FolderPlus, ChevronRight, ChevronDown } from 'lucide-react';

const COLORS = [
    { name: 'Yellow', bg: '#fef08a', text: '#713f12' },
    { name: 'Blue', bg: '#bfdbfe', text: '#1e3a8a' },
    { name: 'Green', bg: '#bbf7d0', text: '#14532d' },
    { name: 'Pink', bg: '#fbcfe8', text: '#831843' },
    { name: 'Purple', bg: '#ddd6fe', text: '#4c1d95' }
];

function StickyNotesSection({
    notes, folders, onAddNote, onUpdateNote, onDeleteNote,
    onAddFolder, onUpdateFolder, onDeleteFolder
}) {
    const [isAdding, setIsAdding] = useState(false);
    const [activeFolderId, setActiveFolderId] = useState(null);
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [editingFolderId, setEditingFolderId] = useState(null);
    const [tempNote, setTempNote] = useState({ title: '', content: '', color: COLORS[0].bg });
    const [tempFolderName, setTempFolderName] = useState('');

    const currentNotes = useMemo(() => {
        if (activeFolderId) {
            return notes.filter(n => n.folderId === activeFolderId);
        }
        return notes.filter(n => !n.folderId);
    }, [notes, activeFolderId]);

    const activeFolder = useMemo(() =>
        folders.find(f => f.id === activeFolderId),
        [folders, activeFolderId]);

    const handleCreateNote = () => {
        if (!tempNote.content.trim()) return;
        onAddNote({ ...tempNote, folderId: activeFolderId || null });
        setTempNote({ title: '', content: '', color: COLORS[0].bg });
        setIsAdding(false);
    };

    const handleUpdateNote = (id) => {
        onUpdateNote(id, tempNote);
        setEditingNoteId(null);
    };

    const handleCreateFolder = () => {
        if (!tempFolderName.trim()) return;
        onAddFolder({ name: tempFolderName });
        setTempFolderName('');
        setEditingFolderId(null);
    };

    return (
        <div style={{ padding: '4px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <style>
                {`
                .folder-card:hover .folder-actions { opacity: 1 !important; }
                
                @keyframes modalPopIn {
                    from { opacity: 0; transform: scale(0.95) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                .modal-content {
                    animation: modalPopIn 0.3s var(--ease-apple) forwards;
                }
                
                @keyframes notePopIn {
                    from { opacity: 0; transform: scale(0.8) rotate(-2deg); }
                    to { opacity: 1; transform: scale(1) rotate(0); }
                }
                .note-item {
                    animation: notePopIn 0.4s var(--ease-apple-out) forwards;
                }
                
                @keyframes noteDelete {
                    to { opacity: 0; transform: scale(0.5); }
                }
                .note-deleting {
                    animation: noteDelete 0.3s var(--ease-apple) forwards;
                    pointer-events: none;
                }
                
                .overlay-fade {
                    animation: fadeIn 0.3s ease forwards;
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                `}
            </style>
            {/* Header & Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: activeFolderId ? 'pointer' : 'default', transition: 'all 0.2s ease' }} onClick={() => setActiveFolderId(null)}>
                    <StickyNote size={16} />
                    <h3 style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                        {activeFolderId ? activeFolder?.name : 'Sticky Notes'}
                    </h3>
                    {activeFolderId && <ChevronRight size={14} style={{ opacity: 0.5 }} />}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                        onClick={() => setEditingFolderId('new')}
                        style={{
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '8px',
                            backgroundColor: 'var(--bg-hover)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-main)',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                    >
                        <FolderPlus size={18} />
                    </button>
                    <button
                        onClick={() => setIsAdding(true)}
                        style={{
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '8px',
                            backgroundColor: 'var(--text-main)',
                            color: 'var(--bg-app)',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                    >
                        <Plus size={20} />
                    </button>
                </div>
            </div>

            {/* Folder List (Home View) */}
            {!activeFolderId && folders.length > 0 && (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    {folders.map(folder => (
                        <div
                            key={folder.id}
                            onClick={() => setActiveFolderId(folder.id)}
                            className="folder-card"
                            style={{
                                padding: '10px 14px',
                                backgroundColor: 'var(--bg-card)',
                                borderRadius: '12px',
                                border: '1px solid var(--border)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.3s var(--ease-apple)'
                            }}
                        >
                            <Folder size={18} color="#fbbf24" fill="#fbbf2422" />
                            <span style={{ fontSize: '0.8rem', fontWeight: '500' }}>{folder.name}</span>
                            <div style={{ display: 'flex', gap: '4px', opacity: 0, transition: 'opacity 0.2s' }} className="folder-actions">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setEditingFolderId(folder.id); setTempFolderName(folder.name); }}
                                    style={{ padding: '2px', color: 'var(--text-muted)' }}
                                >
                                    <Edit2 size={12} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); if (window.confirm('Delete folder?')) onDeleteFolder(folder.id); }}
                                    style={{ padding: '2px', color: '#ef4444' }}
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Note Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
                {currentNotes.map((note, idx) => (
                    <div
                        key={note.id}
                        className="note-item shadow-hover"
                        style={{
                            padding: '12px',
                            backgroundColor: note.color || '#fef08a',
                            borderRadius: '16px',
                            color: COLORS.find(c => c.bg === note.color)?.text || '#713f12',
                            minHeight: '130px',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                            transition: 'all 0.4s var(--ease-apple)',
                            animationDelay: `${idx * 0.05}s`
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                                {note.title || 'Untitled'}
                            </div>
                            <div style={{ display: 'flex', gap: '6px', opacity: 0.6, transition: 'opacity 0.2s' }} className="note-actions-hover">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setTempNote(note); setEditingNoteId(note.id); }}
                                    style={{
                                        padding: '6px',
                                        borderRadius: '8px',
                                        backgroundColor: 'rgba(255,255,255,0.3)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'inherit',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.5)'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)'}
                                >
                                    <Edit2 size={12} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDeleteNote(note.id); }}
                                    style={{
                                        padding: '6px',
                                        borderRadius: '8px',
                                        backgroundColor: 'rgba(0,0,0,0.05)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#ef4444',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.1)'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                        <div style={{ fontSize: '0.85rem', lineHeight: '1.5', flex: 1, whiteSpace: 'pre-wrap', color: 'inherit', opacity: 0.9 }}>
                            {note.content}
                        </div>
                    </div>
                ))}
            </div>

            {/* Add/Edit Modal (Animated Overlay) */}
            {(isAdding || editingNoteId) && (
                <div
                    className="overlay-fade"
                    style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
                    onClick={() => { setIsAdding(false); setEditingNoteId(null); }}
                >
                    <div
                        className="modal-content"
                        style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '24px', width: '92%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', border: '1px solid var(--border)' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ fontWeight: '700', fontSize: '1.1rem' }}>{editingNoteId ? 'Edit Note' : 'New Sticky Note'}</h4>
                            <button
                                onClick={() => { setIsAdding(false); setEditingNoteId(null); }}
                                style={{ padding: '8px', borderRadius: '50%', backgroundColor: 'var(--bg-hover)' }}
                            ><X size={18} /></button>
                        </div>
                        <input
                            placeholder="Title..."
                            value={tempNote.title}
                            onChange={(e) => setTempNote({ ...tempNote, title: e.target.value })}
                            style={{ width: '100%', border: '1px solid var(--border)', padding: '12px', borderRadius: '12px', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.95rem' }}
                        />
                        <textarea
                            placeholder="Write something..."
                            value={tempNote.content}
                            onChange={(e) => setTempNote({ ...tempNote, content: e.target.value })}
                            style={{ width: '100%', height: '140px', border: '1px solid var(--border)', padding: '12px', borderRadius: '12px', background: 'var(--bg-input)', color: 'var(--text-main)', resize: 'none', fontSize: '0.95rem', lineHeight: '1.5' }}
                        />
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', padding: '4px' }}>
                            {COLORS.map(c => (
                                <button
                                    key={c.name}
                                    onClick={() => setTempNote({ ...tempNote, color: c.bg })}
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        backgroundColor: c.bg,
                                        border: tempNote.color === c.bg ? '3px solid var(--text-main)' : '2px solid transparent',
                                        transition: 'all 0.2s ease',
                                        transform: tempNote.color === c.bg ? 'scale(1.1)' : 'scale(1)'
                                    }}
                                />
                            ))}
                        </div>
                        <button
                            onClick={() => editingNoteId ? handleUpdateNote(editingNoteId) : handleCreateNote()}
                            style={{
                                padding: '14px',
                                backgroundColor: 'var(--text-main)',
                                color: 'var(--bg-app)',
                                borderRadius: '14px',
                                fontWeight: '700',
                                fontSize: '0.95rem',
                                transition: 'all 0.2s var(--ease-apple)',
                                marginTop: '8px'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            {editingNoteId ? 'Save Changes' : 'Add Note'}
                        </button>
                    </div>
                </div>
            )}

            {editingFolderId && (
                <div
                    className="overlay-fade"
                    style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
                    onClick={() => setEditingFolderId(null)}
                >
                    <div
                        className="modal-content"
                        style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '24px', width: '92%', maxWidth: '300px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', border: '1px solid var(--border)' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ fontWeight: '700' }}>{editingFolderId === 'new' ? 'New Folder' : 'Rename Folder'}</h4>
                            <button
                                onClick={() => setEditingFolderId(null)}
                                style={{ padding: '8px', borderRadius: '50%', backgroundColor: 'var(--bg-hover)' }}
                            ><X size={18} /></button>
                        </div>
                        <input
                            placeholder="Folder name..."
                            value={tempFolderName}
                            onChange={(e) => setTempFolderName(e.target.value)}
                            style={{ width: '100%', border: '1px solid var(--border)', padding: '12px', borderRadius: '12px', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.95rem' }}
                            autoFocus
                        />
                        <button
                            onClick={() => {
                                if (editingFolderId === 'new') handleCreateFolder();
                                else { onUpdateFolder(editingFolderId, { name: tempFolderName }); setEditingFolderId(null); }
                            }}
                            style={{ padding: '14px', backgroundColor: 'var(--text-main)', color: 'var(--bg-app)', borderRadius: '14px', fontWeight: '700', transition: 'all 0.2s var(--ease-apple)' }}
                        >
                            {editingFolderId === 'new' ? 'Create Folder' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default StickyNotesSection;
