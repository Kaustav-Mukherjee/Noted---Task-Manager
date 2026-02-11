import { useState, useMemo, useEffect } from 'react';
import { Bell, Clock, Plus, MapPin, Calendar, ChevronDown, Check, Edit2, Users, FileText, Video } from 'lucide-react';
import { format, isSameDay, isAfter, isBefore, parseISO } from 'date-fns';
import { createCalendarEvent, buildCalendarEvent } from '../services/googleCalendarService';

function RemindersCard({ reminders, onAddReminder, onDeleteReminder, onUpdateReminder, googleToken }) {
    const [view, setView] = useState('today'); // 'today' | 'upcoming' | 'all'
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [completingId, setCompletingId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [newReminder, setNewReminder] = useState({
        title: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        time: '09:00',
        endTime: '',
        location: '',
        description: '',
        type: 'reminder', // 'reminder' | 'event' | 'meeting'
        attendees: '',
        addToGoogleCalendar: false
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
            endTime: rem.endTime || '',
            location: rem.location || '',
            description: rem.description || '',
            type: rem.type || 'reminder',
            attendees: rem.attendees || '',
            addToGoogleCalendar: false
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newReminder.title.trim()) return;

        setIsSubmitting(true);

        try {
            const reminderData = {
                title: newReminder.title,
                dueDate: `${newReminder.date}T${newReminder.time}`,
                endTime: newReminder.endTime,
                location: newReminder.location,
                description: newReminder.description,
                type: newReminder.type,
                attendees: newReminder.attendees,
                time: format(new Date(`${newReminder.date}T${newReminder.time}`), 'MMM d, h:mm a'),
                active: true
            };

            // Push to Google Calendar if checkbox is checked and we have a token
            if (newReminder.addToGoogleCalendar && googleToken) {
                try {
                    const calEvent = buildCalendarEvent({
                        title: newReminder.title,
                        date: newReminder.date,
                        startTime: newReminder.time,
                        endTime: newReminder.endTime,
                        location: newReminder.location,
                        description: newReminder.description,
                        attendees: newReminder.attendees ? newReminder.attendees.split(',').map(e => e.trim()) : [],
                        isMeeting: newReminder.type === 'meeting'
                    });

                    const conferenceParam = newReminder.type === 'meeting' ? '?conferenceDataVersion=1' : '';
                    const response = await fetch(
                        `https://www.googleapis.com/calendar/v3/calendars/primary/events${conferenceParam}`,
                        {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${googleToken}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(calEvent)
                        }
                    );

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.error?.message || 'Failed to create event');
                    }

                    const created = await response.json();
                    reminderData.googleCalendarEventId = created.id;
                    reminderData.googleMeetLink = created.hangoutLink || null;
                } catch (calError) {
                    console.error('Failed to add to Google Calendar:', calError);
                    // Still save the reminder locally even if Google Calendar fails
                    alert(`Reminder saved. Google Calendar sync failed: ${calError.message}`);
                }
            }

            if (editingId) {
                onUpdateReminder(editingId, reminderData);
                setEditingId(null);
            } else {
                onAddReminder(reminderData);
            }

            setNewReminder({
                title: '', date: format(new Date(), 'yyyy-MM-dd'), time: '09:00',
                endTime: '', location: '', description: '', type: 'reminder', attendees: '',
                addToGoogleCalendar: false
            });
            setShowAddForm(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    const typeConfig = {
        reminder: { icon: Bell, label: 'Reminder', color: 'var(--text-main)' },
        event: { icon: Calendar, label: 'Event', color: '#4285F4' },
        meeting: { icon: Video, label: 'Meeting', color: '#34A853' }
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
                            setNewReminder({
                                title: '', date: format(new Date(), 'yyyy-MM-dd'), time: '09:00',
                                endTime: '', location: '', description: '', type: 'reminder', attendees: '',
                                addToGoogleCalendar: false
                            });
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
                maxHeight: showAddForm ? '500px' : '0',
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
                    {/* Type Selector */}
                    <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-card)', padding: '3px', borderRadius: '8px' }}>
                        {Object.entries(typeConfig).map(([key, config]) => {
                            const Icon = config.icon;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setNewReminder({ ...newReminder, type: key })}
                                    style={{
                                        flex: 1,
                                        padding: '6px 4px',
                                        borderRadius: '6px',
                                        fontSize: '0.65rem',
                                        fontWeight: newReminder.type === key ? '600' : '400',
                                        backgroundColor: newReminder.type === key ? config.color : 'transparent',
                                        color: newReminder.type === key ? (key === 'reminder' ? 'var(--bg-app)' : 'white') : 'var(--text-muted)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '4px',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <Icon size={10} />
                                    {config.label}
                                </button>
                            );
                        })}
                    </div>

                    <input
                        type="text"
                        placeholder={newReminder.type === 'meeting' ? 'Meeting title...' : newReminder.type === 'event' ? 'Event title...' : 'Reminder title...'}
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

                    {/* End Time (for events and meetings) */}
                    {(newReminder.type === 'event' || newReminder.type === 'meeting') && (
                        <div style={{ position: 'relative' }}>
                            <Clock size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="time"
                                placeholder="End time"
                                value={newReminder.endTime}
                                onChange={(e) => setNewReminder({ ...newReminder, endTime: e.target.value })}
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
                            <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.6rem', color: 'var(--text-muted)' }}>End Time</span>
                        </div>
                    )}

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

                    {/* Description */}
                    <div style={{ position: 'relative' }}>
                        <FileText size={14} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
                        <textarea
                            placeholder="Description (optional)"
                            value={newReminder.description}
                            onChange={(e) => setNewReminder({ ...newReminder, description: e.target.value })}
                            rows={2}
                            style={{
                                width: '100%',
                                padding: '8px 8px 8px 32px',
                                borderRadius: '8px',
                                backgroundColor: 'var(--bg-card)',
                                fontSize: '0.75rem',
                                border: '1px solid var(--border)',
                                resize: 'none',
                                fontFamily: 'inherit'
                            }}
                        />
                    </div>

                    {/* Attendees (for meetings) */}
                    {newReminder.type === 'meeting' && (
                        <div style={{ position: 'relative' }}>
                            <Users size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                placeholder="Attendees (comma-separated emails)"
                                value={newReminder.attendees}
                                onChange={(e) => setNewReminder({ ...newReminder, attendees: e.target.value })}
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
                    )}

                    {/* Google Calendar Toggle */}
                    {googleToken && (
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            backgroundColor: newReminder.addToGoogleCalendar ? 'rgba(66, 133, 244, 0.1)' : 'var(--bg-card)',
                            border: newReminder.addToGoogleCalendar ? '1px solid rgba(66, 133, 244, 0.3)' : '1px solid var(--border)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            fontSize: '0.75rem'
                        }}>
                            <input
                                type="checkbox"
                                checked={newReminder.addToGoogleCalendar}
                                onChange={(e) => setNewReminder({ ...newReminder, addToGoogleCalendar: e.target.checked })}
                                style={{ accentColor: '#4285F4' }}
                            />
                            <Calendar size={14} color="#4285F4" />
                            <span style={{ color: newReminder.addToGoogleCalendar ? '#4285F4' : 'var(--text-muted)', fontWeight: newReminder.addToGoogleCalendar ? '600' : '400' }}>
                                Add to Google Calendar
                                {newReminder.type === 'meeting' && ' (with Google Meet)'}
                            </span>
                        </label>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        style={{
                            padding: '10px',
                            borderRadius: '8px',
                            backgroundColor: typeConfig[newReminder.type]?.color || 'var(--text-main)',
                            color: newReminder.type === 'reminder' ? 'var(--bg-app)' : 'white',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            opacity: isSubmitting ? 0.7 : 1,
                            cursor: isSubmitting ? 'not-allowed' : 'pointer'
                        }}
                    >
                        <Check size={16} /> {isSubmitting ? 'Saving...' : editingId ? 'Update' : `Add ${typeConfig[newReminder.type]?.label || 'Reminder'}`}
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
                    filteredReminders.map((rem, idx) => {
                        const config = typeConfig[rem.type] || typeConfig.reminder;
                        const TypeIcon = config.icon;
                        return (
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
                                    borderLeft: rem.completed ? '4px solid #22c55e' : `4px solid ${config.color}`,
                                    border: expandedId === rem.id ? '1px solid var(--border)' : '1px solid transparent'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        backgroundColor: rem.completed ? '#22c55e' : config.color,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.3s var(--ease-apple)'
                                    }}>
                                        {rem.completed
                                            ? <Check size={14} color="white" />
                                            : <TypeIcon size={14} color={rem.type === 'reminder' ? 'var(--bg-app)' : 'white'} />
                                        }
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: '500', transition: 'all 0.3s ease', textDecoration: rem.completed ? 'line-through' : 'none', color: rem.completed ? 'var(--text-muted)' : 'inherit' }}>{rem.title}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                <Clock size={10} /> {rem.time}
                                            </span>
                                            {rem.location && (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                    <MapPin size={10} /> {rem.location}
                                                </span>
                                            )}
                                            {rem.type && rem.type !== 'reminder' && (
                                                <span style={{
                                                    fontSize: '0.6rem',
                                                    padding: '1px 6px',
                                                    borderRadius: '4px',
                                                    backgroundColor: config.color,
                                                    color: rem.type === 'reminder' ? 'var(--bg-app)' : 'white',
                                                    fontWeight: '600'
                                                }}>
                                                    {config.label}
                                                </span>
                                            )}
                                            {rem.googleCalendarEventId && (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#4285F4' }}>
                                                    <Calendar size={10} /> Synced
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
                                    maxHeight: expandedId === rem.id ? '150px' : '0',
                                    opacity: expandedId === rem.id ? 1 : 0,
                                    overflow: 'hidden',
                                    transition: 'all 0.4s var(--ease-apple)',
                                    marginTop: expandedId === rem.id ? '10px' : '0',
                                    paddingTop: expandedId === rem.id ? '10px' : '0',
                                    borderTop: expandedId === rem.id ? '1px solid var(--border)' : 'none'
                                }}>
                                    {/* Description & Meet link */}
                                    {(rem.description || rem.googleMeetLink) && (
                                        <div style={{ marginBottom: '8px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                            {rem.description && <p style={{ margin: '0 0 4px 0' }}>{rem.description}</p>}
                                            {rem.googleMeetLink && (
                                                <a href={rem.googleMeetLink} target="_blank" rel="noopener noreferrer" style={{ color: '#4285F4', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Video size={10} /> Join Google Meet
                                                </a>
                                            )}
                                        </div>
                                    )}
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
                        );
                    })
                )}
            </div>
        </div>
    );
}

export default RemindersCard;
