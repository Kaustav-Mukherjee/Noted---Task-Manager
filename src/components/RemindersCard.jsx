import { useState, useMemo, useEffect } from 'react';
import { Bell, Clock, Plus, MapPin, Calendar, ChevronDown, Check, Edit2 } from 'lucide-react';
import { format, isSameDay, isAfter, isBefore, parseISO } from 'date-fns';

function RemindersCard({ reminders, onAddReminder, onDeleteReminder, onUpdateReminder }) {
    const [view, setView] = useState('today'); // 'today' | 'upcoming' | 'all'
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [completingId, setCompletingId] = useState(null);

    const [newReminder, setNewReminder] = useState({
        title: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        time: '09:00',
        location: ''
    });
    const [expandedId, setExpandedId] = useState(null);

    const today = new Date();

    // Filter reminders based on view
    const filteredReminders = useMemo(() => {
        return reminders.filter(rem => {
            if (rem.completed && completingId !== rem.id) return false;
            if (!rem.dueDate) return view === 'all';
            const dueDate = new Date(rem.dueDate);
            if (view === 'today') {
                return isSameDay(dueDate, today);
            } else if (view === 'upcoming') {
                return isAfter(dueDate, today);
            }
            return true;
        });
    }, [reminders, view, today, completingId]);

    const handleEdit = (rem) => {
        const [date, time] = rem.dueDate ? rem.dueDate.split('T') : [format(new Date(), 'yyyy-MM-dd'), '09:00'];
        setNewReminder({
            title: rem.title,
            date: date,
            time: time,
            location: rem.location || ''
        });
        setEditingId(rem.id);
        setShowAddForm(true);
        setExpandedId(null);
    };

    const handleComplete = (id) => {
        setCompletingId(id);
        // Wait for animation
        setTimeout(async () => {
            await onUpdateReminder(id, { completed: true, active: false });
            setCompletingId(null);
        }, 800);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!newReminder.title.trim()) return;

        const reminderData = {
            title: newReminder.title,
            dueDate: `${newReminder.date}T${newReminder.time}`,
            location: newReminder.location,
            time: format(new Date(`${newReminder.date}T${newReminder.time}`), 'MMM d, h:mm a'),
            active: true
        };

        if (editingId) {
            onUpdateReminder(editingId, reminderData);
            setEditingId(null);
        } else {
            onAddReminder(reminderData);
        }

        setNewReminder({ title: '', date: format(new Date(), 'yyyy-MM-dd'), time: '09:00', location: '' });
        setShowAddForm(false);
    };

    return (
        <div style={{
            padding: '16px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius)',
            transition: 'all 0.3s ease'
        }}>
            <style>
                {`
                @keyframes completeFadeOut {
                    0% { transform: scale(1); opacity: 1; background-color: var(--bg-input); }
                    30% { transform: scale(1.05); background-color: rgba(34, 197, 94, 0.2); }
                    100% { transform: scale(0.9); opacity: 0; margin-bottom: -60px; }
                }
                .reminder-completing {
                    animation: completeFadeOut 0.8s ease-in-out forwards !important;
                    pointer-events: none;
                }
                
                @keyframes slideFadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .view-transition {
                    animation: slideFadeIn 0.4s var(--ease-apple) forwards;
                }
                `}
            </style>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Bell size={16} />
                    <h3 style={{ fontSize: '0.9rem', fontWeight: '600' }}>Reminders</h3>
                </div>
                <button
                    onClick={() => {
                        if (showAddForm) {
                            setEditingId(null);
                            setNewReminder({ title: '', date: format(new Date(), 'yyyy-MM-dd'), time: '09:00', location: '' });
                        }
                        setShowAddForm(!showAddForm);
                    }}
                    style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: showAddForm ? 'var(--text-main)' : 'var(--bg-hover)',
                        color: showAddForm ? 'var(--bg-app)' : 'var(--text-main)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.3s var(--ease-apple)',
                        transform: showAddForm ? 'rotate(45deg)' : 'rotate(0deg)'
                    }}
                >
                    <Plus size={16} />
                </button>
            </div>

            {/* View Toggle */}
            <div style={{
                display: 'flex',
                gap: '4px',
                backgroundColor: 'var(--bg-input)',
                padding: '4px',
                borderRadius: '10px',
                marginBottom: '12px'
            }}>
                {[
                    { key: 'today', label: 'Today' },
                    { key: 'upcoming', label: 'Due Dates' },
                    { key: 'all', label: 'All' }
                ].map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => setView(key)}
                        style={{
                            flex: 1,
                            padding: '6px 8px',
                            borderRadius: '8px',
                            fontSize: '0.7rem',
                            fontWeight: view === key ? '600' : '400',
                            backgroundColor: view === key ? 'var(--bg-card)' : 'transparent',
                            color: view === key ? 'var(--text-main)' : 'var(--text-muted)',
                            transition: 'all 0.3s var(--ease-apple)',
                            boxShadow: view === key ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                        }}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Add/Edit Reminder Form */}
            <div style={{
                maxHeight: showAddForm ? '280px' : '0',
                opacity: showAddForm ? 1 : 0,
                overflow: 'hidden',
                transition: 'all 0.4s var(--ease-apple)',
                marginBottom: showAddForm ? '12px' : '0'
            }}>
                <form onSubmit={handleSubmit} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    padding: '12px',
                    backgroundColor: 'var(--bg-input)',
                    borderRadius: '12px',
                    transform: showAddForm ? 'scale(1)' : 'scale(0.95)',
                    transition: 'transform 0.4s var(--ease-apple)'
                }}>
                    <input
                        type="text"
                        placeholder="Reminder title..."
                        value={newReminder.title}
                        onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                        style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            backgroundColor: 'var(--bg-card)',
                            fontSize: '0.85rem',
                            border: '1px solid var(--border)'
                        }}
                    />

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <Calendar size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="date"
                                value={newReminder.date}
                                onChange={(e) => setNewReminder({ ...newReminder, date: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '8px 8px 8px 32px',
                                    borderRadius: '8px',
                                    backgroundColor: 'var(--bg-card)',
                                    fontSize: '0.75rem',
                                    border: '1px solid var(--border)',
                                    colorScheme: 'dark'
                                }}
                            />
                        </div>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <Clock size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="time"
                                value={newReminder.time}
                                onChange={(e) => setNewReminder({ ...newReminder, time: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '8px 8px 8px 32px',
                                    borderRadius: '8px',
                                    backgroundColor: 'var(--bg-card)',
                                    fontSize: '0.75rem',
                                    border: '1px solid var(--border)',
                                    colorScheme: 'dark'
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <MapPin size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Location (optional)"
                            value={newReminder.location}
                            onChange={(e) => setNewReminder({ ...newReminder, location: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '8px 8px 8px 32px',
                                borderRadius: '8px',
                                backgroundColor: 'var(--bg-card)',
                                fontSize: '0.75rem',
                                border: '1px solid var(--border)'
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        style={{
                            padding: '10px',
                            borderRadius: '8px',
                            backgroundColor: 'var(--text-main)',
                            color: 'var(--bg-app)',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                    >
                        <Check size={16} /> {editingId ? 'Update' : 'Add'} Reminder
                    </button>
                </form>
            </div>

            {/* Reminders List */}
            <div
                key={view}
                className="view-transition"
                style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
                {filteredReminders.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '20px',
                        color: 'var(--text-muted)',
                        fontSize: '0.8rem'
                    }}>
                        No reminders {view === 'today' ? 'for today' : view === 'upcoming' ? 'upcoming' : ''}
                    </div>
                ) : (
                    filteredReminders.map((rem, idx) => (
                        <div
                            key={rem.id || idx}
                            onClick={() => setExpandedId(expandedId === rem.id ? null : rem.id)}
                            className={completingId === rem.id ? 'reminder-completing' : ''}
                            style={{
                                padding: '12px',
                                backgroundColor: 'var(--bg-input)',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.4s var(--ease-apple)',
                                transform: expandedId === rem.id ? 'scale(1.02)' : 'scale(1)',
                                boxShadow: expandedId === rem.id ? '0 8px 24px rgba(0,0,0,0.15)' : 'none',
                                borderLeft: rem.completed ? '4px solid #22c55e' : 'none',
                                border: expandedId === rem.id ? '1px solid var(--border)' : '1px solid transparent'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    backgroundColor: rem.completed ? '#22c55e' : rem.active ? 'var(--text-main)' : 'var(--bg-hover)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.3s var(--ease-apple)'
                                }}>
                                    {rem.completed ? <Check size={14} color="white" /> : <Bell size={14} color={rem.active ? 'var(--bg-app)' : 'var(--text-muted)'} />}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: '500', transition: 'all 0.3s ease', textDecoration: rem.completed ? 'line-through' : 'none', color: rem.completed ? 'var(--text-muted)' : 'inherit' }}>{rem.title}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                            <Clock size={10} /> {rem.time}
                                        </span>
                                        {rem.location && (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                <MapPin size={10} /> {rem.location}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <ChevronDown
                                    size={16}
                                    style={{
                                        color: 'var(--text-muted)',
                                        transform: expandedId === rem.id ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.4s var(--ease-apple)'
                                    }}
                                />
                            </div>

                            {/* Expanded Details Popover */}
                            <div style={{
                                maxHeight: expandedId === rem.id ? '100px' : '0',
                                opacity: expandedId === rem.id ? 1 : 0,
                                overflow: 'hidden',
                                transition: 'all 0.4s var(--ease-apple)',
                                marginTop: expandedId === rem.id ? '10px' : '0',
                                paddingTop: expandedId === rem.id ? '10px' : '0',
                                borderTop: expandedId === rem.id ? '1px solid var(--border)' : 'none'
                            }}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleEdit(rem); }}
                                        style={{
                                            flex: 1,
                                            padding: '8px',
                                            borderRadius: '6px',
                                            backgroundColor: 'var(--bg-hover)',
                                            fontSize: '0.7rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '4px',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(1.2)'}
                                        onMouseOut={(e) => e.currentTarget.style.filter = 'brightness(1)'}
                                    >
                                        <Edit2 size={12} /> Edit
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDeleteReminder(rem.id); }}
                                        style={{
                                            flex: 1,
                                            padding: '8px',
                                            borderRadius: '6px',
                                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                            color: '#ef4444',
                                            fontSize: '0.7rem',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'}
                                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                                    >
                                        Delete
                                    </button>
                                    {!rem.completed && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleComplete(rem.id); }}
                                            style={{
                                                flex: 1,
                                                padding: '8px',
                                                borderRadius: '6px',
                                                backgroundColor: '#22c55e',
                                                color: 'white',
                                                fontSize: '0.7rem',
                                                transition: 'all 0.2s ease'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                                            onMouseOut={(e) => e.currentTarget.style.filter = 'brightness(1)'}
                                        >
                                            Complete
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default RemindersCard;

