import { useState, useMemo, useEffect, useRef } from 'react';
import { BarChart, Bar, AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from 'recharts';
import { StickyNote, BookOpen, Edit2, X, Trash2, Bell, ChevronRight, ChevronDown, Calendar as CalendarIcon, RefreshCw, Link, MapPin, FileText, Users, Video, Clock, Goal, Plus, Zap, AlertCircle, Settings } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, eachDayOfInterval, eachMonthOfInterval, isSameDay, isSameMonth, subDays, subMonths, addMonths, parseISO, isAfter, isBefore } from 'date-fns';
import RemindersCard from './RemindersCard';
import StickyNotesSection from './StickyNotesSection';
import QuotesSection from './QuotesSection';
import { useAuth } from '../contexts/AuthContext';
import { getCalendarEvents, buildCalendarEvent, isApiNotEnabledError, isAuthError } from '../services/googleCalendarService';

// Safe Date Utilities to prevent crashes
const parseSafeDate = (dateVal) => {
    if (!dateVal) return null;
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? null : d;
};

const safeFormat = (dateVal, formatStr) => {
    const d = parseSafeDate(dateVal);
    if (!d) return '';
    try {
        return format(d, formatStr);
    } catch (e) {
        return '';
    }
};

const safeIsSameDay = (d1, d2) => {
    const date1 = parseSafeDate(d1);
    const date2 = parseSafeDate(d2);
    if (!date1 || !date2) return false;
    return isSameDay(date1, date2);
};

function Dashboard({
    tasks, reminders, onAddReminder, onDeleteReminder, onUpdateReminder,
    notes, folders, onAddNote, onUpdateNote, onDeleteNote,
    onAddFolder, onUpdateFolder, onDeleteFolder,
    studySessions, addStudySession, onDeleteStudySession,
    streak, goals, updateGoal,
    onAddTask, onDeleteTask, onToggleTask,
    goalCompleted = false
}) {
    const [timeRange, setTimeRange] = useState('Week');
    const [studyTimeRange, setStudyTimeRange] = useState('Week');
    const [studyHours, setStudyHours] = useState('');
    const [goalInput, setGoalInput] = useState('');
    const [showGoalModal, setShowGoalModal] = useState(false);

    const [showStudyModal, setShowStudyModal] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDateData, setSelectedDateData] = useState(null);
    const [showDateModal, setShowDateModal] = useState(false);
    const [showNavPopover, setShowNavPopover] = useState(false);
    const [isCalendarMinimized, setIsCalendarMinimized] = useState(false);
    const [showCalendarSettings, setShowCalendarSettings] = useState(false);

    // Google Calendar State
    const [googleEvents, setGoogleEvents] = useState([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const { signInWithGoogle, user, googleToken, setGoogleToken, clearGoogleToken, refreshGoogleToken, userPreferences, updatePreferences, isGoogleCalendarConnected, disconnectGoogleCalendar } = useAuth();
    const syncIntervalRef = useRef(null);

    // Event Creation State
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventTime, setNewEventTime] = useState('');
    const [newEventEndTime, setNewEventEndTime] = useState('');
    const [newEventLocation, setNewEventLocation] = useState('');
    const [newEventDescription, setNewEventDescription] = useState('');
    const [newEventAttendees, setNewEventAttendees] = useState('');
    const [newEventDate, setNewEventDate] = useState('');
    const [newEventType, setNewEventType] = useState('event');
    // Retroactive Data State
    const [retroTask, setRetroTask] = useState('');
    const [retroStudy, setRetroStudy] = useState('');
    const [isSubmittingRetro, setIsSubmittingRetro] = useState(false);

    // Update selectedDateData when tasks change and modal is open
    useEffect(() => {
        if (showDateModal && selectedDateData) {
            const dateTasks = tasks.filter(t => safeIsSameDay(t.date, selectedDateData.date));
            const dateReminders = reminders.filter(r => r.dueDate && safeIsSameDay(r.dueDate, selectedDateData.date));
            const dateGoogleEvents = googleEvents.filter(e => {
                const start = e.start?.dateTime || e.start?.date;
                return safeIsSameDay(start, selectedDateData.date);
            });

            setSelectedDateData(prev => ({
                ...prev,
                tasks: dateTasks,
                reminders: dateReminders,
                googleEvents: dateGoogleEvents
            }));
        }
    }, [tasks, reminders, googleEvents, showDateModal]);

    const today = new Date();

    const handleDateClick = (date) => {
        const clickedDate = parseSafeDate(date);
        if (!clickedDate) return;

        const dateTasks = tasks.filter(t => safeIsSameDay(t.date, clickedDate));
        const dateReminders = reminders.filter(r => r.dueDate && safeIsSameDay(r.dueDate, clickedDate));
        const dateGoogleEvents = googleEvents.filter(e => {
            const start = e.start?.dateTime || e.start?.date;
            return safeIsSameDay(start, clickedDate);
        });

        setSelectedDateData({ date: clickedDate, tasks: dateTasks, reminders: dateReminders, googleEvents: dateGoogleEvents });
        setShowDateModal(true);
    };

    const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const handlePrevYear = () => setCurrentMonth(subMonths(currentMonth, 12));
    const handleNextYear = () => setCurrentMonth(addMonths(currentMonth, 12));

    // Task Activity Graph Data
    const graphData = useMemo(() => {
        if (timeRange === 'Today') {
            const todayTasks = tasks.filter(t => isSameDay(new Date(t.date), today));
            return [{
                name: 'Today',
                total: todayTasks.length,
                completed: todayTasks.filter(t => t.completed).length,
                remaining: todayTasks.length - todayTasks.filter(t => t.completed).length
            }];
        } else if (timeRange === 'Week') {
            const last7Days = eachDayOfInterval({ start: subDays(today, 6), end: today });
            return last7Days.map(day => ({
                name: format(day, 'EEE'),
                total: tasks.filter(t => isSameDay(new Date(t.date), day)).length,
                completed: tasks.filter(t => isSameDay(new Date(t.date), day) && t.completed).length,
                remaining: tasks.filter(t => isSameDay(new Date(t.date), day)).length - tasks.filter(t => isSameDay(new Date(t.date), day) && t.completed).length
            }));
        } else if (timeRange === 'Month') {
            const start = startOfMonth(today);
            const end = endOfMonth(today);
            const days = eachDayOfInterval({ start, end });
            // Use fixed intervals for cleaner labels: 1st, 5th, 10th, 15th, 20th, 25th, last day
            const labelDays = [1, 5, 10, 15, 20, 25, days.length];
            return days.map((day, i) => {
                const dayNum = i + 1;
                return {
                    name: labelDays.includes(dayNum) ? format(day, 'd') : '',
                    total: tasks.filter(t => safeIsSameDay(t.date, day)).length,
                    completed: tasks.filter(t => safeIsSameDay(t.date, day) && t.completed).length,
                    remaining: tasks.filter(t => safeIsSameDay(t.date, day)).length - tasks.filter(t => safeIsSameDay(t.date, day) && t.completed).length,
                    showLabel: labelDays.includes(dayNum)
                };
            });
        } else {
            const start = startOfYear(today);
            const end = endOfYear(today);
            const months = eachMonthOfInterval({ start, end });
            return months.map(month => {
                const monthTasks = tasks.filter(t => {
                    const d = parseSafeDate(t.date);
                    if (!d) return false;
                    return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
                });
                return {
                    name: format(month, 'MMM'),
                    total: monthTasks.length,
                    completed: monthTasks.filter(t => t.completed).length,
                    remaining: monthTasks.length - monthTasks.filter(t => t.completed).length
                };
            });
        }
    }, [tasks, timeRange, today]);

    // Study Hours Graph with Time Ranges
    const studyGraphData = useMemo(() => {
        // Helper to normalize dates for comparison
        const normalizeDate = (dateVal) => {
            if (!dateVal) return null;
            const d = new Date(dateVal);
            return isNaN(d.getTime()) ? null : d;
        };

        if (studyTimeRange === 'Today') {
            const todaySessions = studySessions.filter(s => {
                const sessionDate = normalizeDate(s.date);
                return sessionDate && isSameDay(sessionDate, today);
            });
            const totalHours = todaySessions.reduce((acc, curr) => acc + curr.hours, 0);
            return [{ name: 'Today', hours: totalHours }];
        } else if (studyTimeRange === 'Week') {
            const last7Days = eachDayOfInterval({ start: subDays(today, 6), end: today });
            return last7Days.map(day => {
                const sessionsThisDay = studySessions.filter(s => {
                    const sessionDate = normalizeDate(s.date);
                    return sessionDate && isSameDay(sessionDate, day);
                });
                return {
                    name: format(day, 'EEE'),
                    hours: sessionsThisDay.reduce((acc, curr) => acc + curr.hours, 0)
                };
            });
        } else if (studyTimeRange === 'Month') {
            const start = startOfMonth(today);
            const end = endOfMonth(today);
            const days = eachDayOfInterval({ start, end });
            const labelDays = [1, 5, 10, 15, 20, 25, days.length];
            return days.map((day, i) => {
                const dayNum = i + 1;
                const sessionsThisDay = studySessions.filter(s => {
                    const sessionDate = normalizeDate(s.date);
                    return sessionDate && isSameDay(sessionDate, day);
                });
                return {
                    name: labelDays.includes(dayNum) ? format(day, 'd') : '',
                    hours: sessionsThisDay.reduce((acc, curr) => acc + curr.hours, 0),
                    showLabel: labelDays.includes(dayNum)
                };
            });
        } else {
            const last12Months = eachMonthOfInterval({ start: subMonths(today, 11), end: today });
            return last12Months.map(month => {
                const monthSessions = studySessions.filter(s => {
                    const sessionDate = normalizeDate(s.date);
                    if (!sessionDate) return false;
                    return sessionDate.getMonth() === month.getMonth() && sessionDate.getFullYear() === month.getFullYear();
                });
                return {
                    name: format(month, 'MMM'),
                    hours: monthSessions.reduce((acc, curr) => acc + curr.hours, 0)
                };
            });
        }
    }, [studySessions, studyTimeRange, today]);

    const dailyGoalHours = goals?.dailyStudyGoal?.hours || 4; // Default 4 hours if not set

    const todayStudyHours = useMemo(() => {
        return studySessions
            .filter(s => safeIsSameDay(s.date, today))
            .reduce((acc, curr) => acc + curr.hours, 0);
    }, [studySessions, today]);

    const goalProgress = Math.min(100, (todayStudyHours / dailyGoalHours) * 100);

    // Fetch Google Calendar Events
    const fetchGoogleEvents = async (token) => {
        if (!token) return;
        setIsSyncing(true);
        try {
            const start = startOfMonth(subMonths(currentMonth, 1));
            const end = endOfMonth(addMonths(currentMonth, 1));
            const events = await getCalendarEvents(token, start, end);
            setGoogleEvents(events);
        } catch (error) {
            console.error("Failed to sync calendar", error);
            if (isAuthError(error)) {
                clearGoogleToken();
            } else if (isApiNotEnabledError(error)) {
                alert('Google Calendar API is not enabled for this project. Please enable it at:\nhttps://console.developers.google.com/apis/api/calendar-json.googleapis.com/overview?project=932826658010');
            }
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSyncClick = async () => {
        if (googleToken) {
            fetchGoogleEvents(googleToken);
        } else {
            const result = await signInWithGoogle();
            if (result.token) {
                fetchGoogleEvents(result.token);
            }
        }
    };

    // Auto-sync on mount and when month/token changes
    useEffect(() => {
        if (googleToken) {
            fetchGoogleEvents(googleToken);
        }
    }, [currentMonth, googleToken]);

    // Auto-sync every 5 minutes
    useEffect(() => {
        if (googleToken) {
            syncIntervalRef.current = setInterval(() => {
                fetchGoogleEvents(googleToken);
            }, 5 * 60 * 1000);
        }
        return () => {
            if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
        };
    }, [googleToken]);


    // Calendar logic based on current month
    const monthStart = startOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(endOfMonth(currentMonth));
    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const completedCount = tasks.filter(t => t.completed).length;
    const completionRate = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

    const handleAddStudy = (e) => {
        e.preventDefault();
        const hours = parseFloat(studyHours);
        if (isNaN(hours) || hours <= 0) return;
        addStudySession(hours);
        setStudyHours('');
    };

    const handleUpdateGoal = (e) => {
        e.preventDefault();
        const hours = parseFloat(goalInput);
        if (isNaN(hours) || hours <= 0) return;
        updateGoal('dailyStudyGoal', hours);
        setShowGoalModal(false);
        setGoalInput('');
    };


    const handleCreateGoogleEvent = async (e) => {
        e.preventDefault();
        if (!newEventTitle || !googleToken) return;

        setIsCreatingEvent(true);
        try {
            // Use the date from state instead of selectedDateData to allow overrides
            const dateStr = newEventDate || format(selectedDateData.date, 'yyyy-MM-dd');
            const isMeeting = newEventType === 'meeting';
            const attendeesList = newEventAttendees ? newEventAttendees.split(',').map(e => e.trim()) : [];

            const event = buildCalendarEvent({
                title: newEventTitle,
                date: dateStr,
                startTime: newEventTime || null,
                endTime: newEventEndTime || null,
                location: newEventLocation,
                description: newEventDescription,
                attendees: attendeesList,
                isMeeting
            });

            const conferenceParam = isMeeting ? '?conferenceDataVersion=1' : '';
            const response = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/primary/events${conferenceParam}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${googleToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(event)
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const err = new Error(errorData.error?.message || 'Failed to create event');
                err.status = response.status;
                err.code = errorData.error?.code;
                throw err;
            }

            const created = await response.json();
            await fetchGoogleEvents(googleToken);
            setNewEventTitle('');
            setNewEventTime('');
            setNewEventEndTime('');
            setNewEventLocation('');
            setNewEventDescription('');
            setNewEventAttendees('');
            setNewEventDate('');
            setNewEventType('event');
            setShowDateModal(false);

            let msg = 'Event added to Google Calendar!';
            if (created.hangoutLink) msg += `\nGoogle Meet: ${created.hangoutLink}`;
            alert(msg);
        } catch (error) {
            console.error('Failed to create event:', error);
            if (isAuthError(error)) {
                clearGoogleToken();
                alert('Your Google Calendar session has expired. Please click "Sync Calendar" to re-authenticate.');
            } else if (isApiNotEnabledError(error)) {
                alert('Google Calendar API is not enabled. Please enable it in the Google Cloud Console.');
            } else {
                alert(`Failed to create event: ${error.message || 'Unknown error'}`);
            }
        } finally {
            setIsCreatingEvent(false);
        }
    };

    const handleAddRetroTask = async (e) => {
        e.preventDefault();
        if (!retroTask.trim()) return;
        setIsSubmittingRetro(true);
        try {
            if (onAddTask) {
                const dateStr = selectedDateData.date.toISOString();
                await onAddTask(retroTask, dateStr);
                
                // Refresh selectedDateData to show the newly added task
                const dateTasks = tasks.filter(t => safeIsSameDay(t.date, selectedDateData.date));
                setSelectedDateData(prev => ({
                    ...prev,
                    tasks: dateTasks
                }));
            }
        } catch (error) {
            console.error("Failed to add retroactive task", error);
        } finally {
            setIsSubmittingRetro(false);
            setRetroTask('');
        }
    };

    const handleAddRetroStudy = async (e) => {
        e.preventDefault();
        const hours = parseFloat(retroStudy);
        if (isNaN(hours) || hours <= 0) return;
        setIsSubmittingRetro(true);
        try {
            await addStudySession(hours, selectedDateData.date.toISOString());
        } catch (error) {
            console.error("Failed to add retroactive study session", error);
        } finally {
            setIsSubmittingRetro(false);
            setRetroStudy('');
        }
    };

    // Time Range Toggle Component
    const TimeRangeToggle = ({ value, onChange }) => (
        <div style={{ display: 'flex', gap: '2px', backgroundColor: 'var(--bg-input)', padding: '3px', borderRadius: '8px' }}>
            {['Today', 'Week', 'Month', 'Year'].map(range => (
                <button
                    key={range}
                    onClick={() => onChange(range)}
                    style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '0.6rem',
                        fontWeight: value === range ? '600' : '400',
                        backgroundColor: value === range ? 'var(--bg-hover)' : 'transparent',
                        color: value === range ? 'var(--text-main)' : 'var(--text-muted)',
                        transition: 'all 0.3s ease'
                    }}
                >
                    {range}
                </button>
            ))}
        </div>
    );

    return (
        <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', height: '100%', overflowY: 'auto', paddingRight: '4px' }}>

            {/* Top Row: Streak & Quotes */}
            <div className="dashboard-stats-grid">
                <div className="fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', gap: '20px', border: '1px solid var(--border)', transition: 'all var(--transition-main)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '14px', backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.5 3.5 6.5 1.5 2 2 4.5 2 7a6 6 0 1 1-12 0c0-3 1.5-5.5 3-7 .5 2 1 3 1 5z" /></svg>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ fontSize: '1.4rem', fontWeight: '850', color: 'var(--text-main)', lineHeight: '1' }}>{streak}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.05em' }}>Day Streak</div>
                        </div>
                    </div>

                    {/* Dynamic Milestone Badges */}
                    <div style={{
                        display: 'flex',
                        gap: '8px',
                        borderTop: '1px solid var(--border)',
                        paddingTop: '16px',
                        flexWrap: 'nowrap',
                        overflowX: 'auto',
                        paddingBottom: '4px',
                        msOverflowStyle: 'none',
                        scrollbarWidth: 'none'
                    }}>
                        {(() => {
                            const coreMilestones = [
                                { days: 1, label: '1D' },
                                { days: 7, label: '7D' },
                                { days: 14, label: '14D' }
                            ];

                            // Generate monthly milestones
                            const monthsCount = Math.max(1, Math.floor(streak / 30) + 1);
                            const monthlyMilestones = Array.from({ length: monthsCount }, (_, i) => ({
                                days: (i + 1) * 30,
                                label: `${i + 1}M`
                            }));

                            const allMilestones = [...coreMilestones, ...monthlyMilestones];

                            return allMilestones.map(({ days, label }) => (
                                <div
                                    key={days}
                                    style={{
                                        minWidth: '38px',
                                        padding: '6px 8px',
                                        borderRadius: '8px',
                                        fontSize: '0.65rem',
                                        fontWeight: '800',
                                        textAlign: 'center',
                                        backgroundColor: streak >= days ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-hover)',
                                        color: streak >= days ? '#ef4444' : 'var(--text-muted)',
                                        border: streak >= days ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border)',
                                        opacity: streak >= days ? 1 : 0.6,
                                        transition: 'all 0.3s var(--ease-apple)'
                                    }}
                                >
                                    {label}
                                </div>
                            ));
                        })()}
                    </div>
                </div>

                <div className="fade-in" style={{ height: '100%', transition: 'all var(--transition-main)' }}>
                    <QuotesSection />
                </div>

            </div>

            {/* Task Activity Card */}
            <div className="fade-in" style={{ padding: '16px', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', transition: 'all var(--transition-main)' }}>


                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: '600' }}>Task Activity</h3>
                    </div>
                    <TimeRangeToggle value={timeRange} onChange={setTimeRange} />
                </div>

                <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-main)' }}></span>Done
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-muted)' }}></span>Total
                    </span>
                </div>

                <div style={{ height: '110px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={graphData} barGap={4}>
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '0.8rem', padding: '10px' }}
                                itemStyle={{ color: 'var(--text-main)', fontWeight: '700', textTransform: 'capitalize' }}
                                cursor={false}
                            />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                interval={0}
                                height={25}
                                tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 500 }}
                                dy={5}
                            />
                            <Bar dataKey="completed" stackId="a" fill="var(--text-main)" radius={[4, 4, 4, 4]} barSize={12} />
                            <Bar dataKey="remaining" stackId="a" fill="var(--text-muted)" opacity={0.2} radius={[4, 4, 4, 4]} barSize={12} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                    <div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{completedCount}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tasks completed</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{completionRate}%</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Completion rate</div>
                    </div>
                </div>
            </div>

            {/* Study Hours Card with Time Range Toggle */}
            <div className="fade-in" style={{ 
                padding: '16px', 
                backgroundColor: 'var(--bg-card)', 
                borderRadius: 'var(--radius)', 
                border: goalCompleted ? '1px solid transparent' : '1px solid var(--border)', 
                transition: 'all var(--transition-main)',
                position: 'relative'
            }}>
                {/* Subtle Edge Glow Effect for Goal Completion - contained within card with rounded corners */}
                {goalCompleted && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 'var(--radius)',
                        overflow: 'hidden',
                        pointerEvents: 'none',
                        zIndex: 1
                    }}>
                        {/* Top edge gradient */}
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 8,
                            right: 8,
                            height: '30px',
                            background: 'linear-gradient(180deg, rgba(255,0,128,0.2) 0%, transparent 100%)',
                            filter: 'blur(6px)',
                            animation: 'glowFadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards',
                            borderRadius: '15px 15px 0 0'
                        }} />
                        {/* Bottom edge gradient */}
                        <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 8,
                            right: 8,
                            height: '30px',
                            background: 'linear-gradient(0deg, rgba(64,224,208,0.2) 0%, transparent 100%)',
                            filter: 'blur(6px)',
                            animation: 'glowFadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.1s forwards',
                            borderRadius: '0 0 15px 15px'
                        }} />
                        {/* Left edge gradient */}
                        <div style={{
                            position: 'absolute',
                            top: 8,
                            left: 0,
                            bottom: 8,
                            width: '30px',
                            background: 'linear-gradient(90deg, rgba(255,140,0,0.15) 0%, transparent 100%)',
                            filter: 'blur(6px)',
                            animation: 'glowFadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.2s forwards',
                            borderRadius: '15px 0 0 15px'
                        }} />
                        {/* Right edge gradient */}
                        <div style={{
                            position: 'absolute',
                            top: 8,
                            right: 0,
                            bottom: 8,
                            width: '30px',
                            background: 'linear-gradient(270deg, rgba(123,44,191,0.15) 0%, transparent 100%)',
                            filter: 'blur(6px)',
                            animation: 'glowFadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.3s forwards',
                            borderRadius: '0 15px 15px 0'
                        }} />
                        {/* Animated border lines */}
                        <div style={{
                            position: 'absolute',
                            top: 2,
                            left: 16,
                            right: 16,
                            height: '1px',
                            background: 'linear-gradient(90deg, transparent, rgba(255,0,128,0.5), rgba(255,140,0,0.5), transparent)',
                            backgroundSize: '200% 100%',
                            animation: 'shimmer 2s ease-in-out infinite',
                            opacity: 0,
                            borderRadius: '1px'
                        }} className="border-animate" />
                        <div style={{
                            position: 'absolute',
                            bottom: 2,
                            left: 16,
                            right: 16,
                            height: '1px',
                            background: 'linear-gradient(90deg, transparent, rgba(64,224,208,0.5), rgba(123,44,191,0.5), transparent)',
                            backgroundSize: '200% 100%',
                            animation: 'shimmer 2s ease-in-out infinite reverse',
                            opacity: 0,
                            borderRadius: '1px'
                        }} className="border-animate" />
                        <style>{`
                            @keyframes glowFadeIn {
                                0% { opacity: 0; }
                                100% { opacity: 1; }
                            }
                            @keyframes shimmer {
                                0% { background-position: -200% 0; opacity: 0.4; }
                                50% { opacity: 0.7; }
                                100% { background-position: 200% 0; opacity: 0.4; }
                            }
                            .border-animate {
                                animation: borderFadeIn 0.5s ease forwards, shimmer 2s ease-in-out infinite !important;
                            }
                            @keyframes borderFadeIn {
                                0% { opacity: 0; }
                                100% { opacity: 0.6; }
                            }
                        `}</style>
                    </div>
                )}


                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BookOpen size={16} />
                        <h3 style={{ fontSize: '0.9rem', fontWeight: '600' }}>Study Hours</h3>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <form onSubmit={handleAddStudy} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <input
                                type="number"
                                step="0.5"
                                placeholder="Hrs"
                                value={studyHours}
                                onChange={(e) => setStudyHours(e.target.value)}
                                style={{
                                    width: '50px',
                                    background: 'var(--bg-hover)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--text-main)',
                                    padding: '6px 8px',
                                    borderRadius: '8px',
                                    fontSize: '0.75rem',
                                    outline: 'none'
                                }}
                            />
                            <button type="submit" style={{
                                background: 'var(--text-main)',
                                color: 'var(--bg-app)',
                                width: '28px',
                                height: '28px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                fontWeight: 'bold'
                            }}>+</button>
                        </form>
                        <button
                            onClick={() => setShowStudyModal(true)}
                            style={{
                                background: 'var(--bg-hover)',
                                border: '1px solid var(--border)',
                                width: '28px',
                                height: '28px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '8px',
                                color: 'var(--text-main)'
                            }}
                        >
                            <Edit2 size={14} />
                        </button>
                    </div>
                </div>

                {/* Daily Goal Progress Bar */}
                <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Goal size={14} color="var(--text-muted)" />
                            <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)' }}>Daily Goal</span>
                        </div>
                        <span
                            onClick={() => {
                                setGoalInput(dailyGoalHours.toString());
                                setShowGoalModal(true);
                            }}
                            style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-main)', cursor: 'pointer' }}
                        >
                            {todayStudyHours.toFixed(1)} / {dailyGoalHours}h
                        </span>
                    </div>
                    <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-hover)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                            width: `${goalProgress}%`,
                            height: '100%',
                            backgroundColor: 'var(--text-main)',
                            borderRadius: '3px',
                            transition: 'width 0.8s var(--ease-apple)'
                        }}></div>
                    </div>

                </div>

                {/* Goal Setting Modal */}
                {showGoalModal && (
                    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                        <div style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '20px', width: '90%', maxWidth: '350px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h4 style={{ fontWeight: '700' }}>Set Daily Goal</h4>
                                <button onClick={() => setShowGoalModal(false)}><X size={20} /></button>
                            </div>
                            <form onSubmit={handleUpdateGoal} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hours per day</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        autoFocus
                                        value={goalInput}
                                        onChange={(e) => setGoalInput(e.target.value)}
                                        style={{
                                            background: 'var(--bg-hover)',
                                            border: '1px solid var(--border)',
                                            color: 'var(--text-main)',
                                            padding: '12px',
                                            borderRadius: '12px',
                                            fontSize: '1rem',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                                <button type="submit" style={{ background: 'var(--text-main)', color: 'var(--bg-app)', padding: '12px', borderRadius: '12px', fontWeight: '700' }}>
                                    Save Goal
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                <div style={{ marginBottom: '10px' }}>

                    <TimeRangeToggle value={studyTimeRange} onChange={setStudyTimeRange} />
                </div>

                <div style={{ height: '85px', width: '100%', position: 'relative', zIndex: 10 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={studyGraphData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                            <Tooltip
                                contentStyle={{ 
                                    backgroundColor: 'var(--bg-app)', 
                                    border: '1px solid var(--border)', 
                                    borderRadius: '8px', 
                                    fontSize: '0.75rem',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                                }}
                                cursor={{ stroke: 'var(--text-muted)', strokeWidth: 1, strokeDasharray: '4 4' }}
                                position={{ y: -40 }}
                                wrapperStyle={{ zIndex: 1000, outline: 'none' }}
                            />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                interval={0}
                                height={25}
                                tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 500 }}
                                dy={5}
                            />
                            <Area type="monotone" dataKey="hours" stroke="#888888" fill="#333333" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

            </div>

            {/* Calendar Card - Interactive & Minimizable */}
            <div style={{ padding: '16px', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius)', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: isCalendarMinimized ? '0' : '12px', alignItems: 'center', transition: 'margin-bottom 0.3s ease' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button onClick={handlePrevYear} style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                            <ChevronDown size={14} style={{ transform: 'rotate(90deg)' }} />
                        </button>
                        <button onClick={handlePrevMonth} style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                            <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} />
                        </button>

                        <div
                            onClick={() => setShowNavPopover(!showNavPopover)}
                            style={{
                                padding: '6px 16px',
                                borderRadius: '10px',
                                backgroundColor: 'var(--bg-hover)',
                                border: showNavPopover ? '1px solid var(--text-main)' : '1px solid var(--border)',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: '700',
                                minWidth: '140px',
                                textAlign: 'center',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.2s'
                            }}
                        >
                            {format(currentMonth, 'MMMM yyyy')}
                            <ChevronDown size={14} style={{ transform: showNavPopover ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', opacity: 0.7 }} />
                        </div>

                        <button onClick={handleNextMonth} style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                            <ChevronRight size={14} />
                        </button>
                        <button onClick={handleNextYear} style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                            <ChevronDown size={14} style={{ transform: 'rotate(-90deg)' }} />
                        </button>
                    </div>

                    <button
                        onClick={handleSyncClick}
                        disabled={isSyncing}
                        style={{ padding: '4px', borderRadius: '6px', color: isSyncing ? 'var(--text-main)' : 'var(--text-muted)', marginRight: '4px' }}
                        title={googleToken ? "Refresh Calendar" : "Sync Google Calendar"}
                    >
                        {isSyncing ? <RefreshCw size={16} className="spin" /> : googleToken ? <RefreshCw size={16} /> : <Link size={16} />}
                    </button>
                    <button
                        onClick={() => setShowCalendarSettings(true)}
                        style={{ padding: '4px', borderRadius: '6px', color: isGoogleCalendarConnected ? '#4285F4' : 'var(--text-muted)' }}
                        title="Calendar Settings"
                    >
                        <Settings size={16} />
                    </button>
                    <button
                        onClick={() => setIsCalendarMinimized(!isCalendarMinimized)}
                        style={{ padding: '4px', borderRadius: '6px', color: 'var(--text-muted)', transition: 'transform 0.3s ease' }}
                    >
                        <ChevronDown
                            size={18}
                            style={{
                                transform: isCalendarMinimized ? 'rotate(0deg)' : 'rotate(180deg)',
                                transition: 'transform 0.3s ease'
                            }}
                        />
                    </button>
                </div>
                <style>{`
                    .spin { animation: spin 1s linear infinite; }
                    @keyframes spin { 100% { transform: rotate(360deg); } }
                `}</style>

                {/* Navigation Popover */}
                {showNavPopover && (
                    <div style={{
                        position: 'absolute',
                        top: '50px',
                        left: '16px',
                        right: '16px',
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        padding: '16px',
                        zIndex: 100,
                        boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                            {Array.from({ length: 12 }).map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        const newDate = new Date(currentMonth);
                                        newDate.setMonth(i);
                                        setCurrentMonth(newDate);
                                        setShowNavPopover(false);
                                    }}
                                    style={{
                                        padding: '6px',
                                        borderRadius: '6px',
                                        fontSize: '0.75rem',
                                        backgroundColor: currentMonth.getMonth() === i ? 'var(--text-main)' : 'var(--bg-input)',
                                        color: currentMonth.getMonth() === i ? 'var(--bg-app)' : 'var(--text-main)',
                                        fontWeight: currentMonth.getMonth() === i ? '700' : '400'
                                    }}
                                >
                                    {format(new Date(2000, i, 1), 'MMM')}
                                </button>
                            ))}
                        </div>
                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 12))} style={{ padding: '4px' }}><ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} /></button>
                            <span style={{ fontSize: '0.9rem', fontWeight: '800' }}>{format(currentMonth, 'yyyy')}</span>
                            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 12))} style={{ padding: '4px' }}><ChevronRight size={16} /></button>
                        </div>
                    </div>
                )}

                {/* Calendar Settings Modal */}
                {showCalendarSettings && (
                    <div style={{
                        position: 'absolute',
                        top: '50px',
                        right: '16px',
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        padding: '16px',
                        zIndex: 100,
                        boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                        width: '280px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: '700' }}>Calendar Settings</h4>
                            <button onClick={() => setShowCalendarSettings(false)} style={{ padding: '4px' }}>
                                <X size={16} />
                            </button>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {/* Connection Status */}
                            <div style={{ 
                                padding: '10px', 
                                borderRadius: '8px', 
                                backgroundColor: isGoogleCalendarConnected ? 'rgba(52, 168, 83, 0.1)' : 'var(--bg-input)',
                                border: `1px solid ${isGoogleCalendarConnected ? 'rgba(52, 168, 83, 0.3)' : 'var(--border)'}`,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}>
                                <div style={{ 
                                    width: '8px', 
                                    height: '8px', 
                                    borderRadius: '50%', 
                                    backgroundColor: isGoogleCalendarConnected ? '#34A853' : '#9CA3AF'
                                }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: '600' }}>
                                        {isGoogleCalendarConnected ? 'Connected to Google Calendar' : 'Not Connected'}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                        {isGoogleCalendarConnected ? 'Your calendar is syncing' : 'Sign in to sync with Google Calendar'}
                                    </div>
                                </div>
                            </div>

                            {/* Auto-sync Toggle */}
                            {isGoogleCalendarConnected && (
                                <>
                                    <label style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        backgroundColor: userPreferences?.autoSyncGoogleCalendar !== false ? 'rgba(66, 133, 244, 0.1)' : 'var(--bg-input)',
                                        border: `1px solid ${userPreferences?.autoSyncGoogleCalendar !== false ? 'rgba(66, 133, 244, 0.3)' : 'var(--border)'}`,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={userPreferences?.autoSyncGoogleCalendar !== false}
                                            onChange={(e) => updatePreferences({ autoSyncGoogleCalendar: e.target.checked })}
                                            style={{ accentColor: '#4285F4' }}
                                        />
                                        <div>
                                            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: userPreferences?.autoSyncGoogleCalendar !== false ? '#4285F4' : 'var(--text-main)' }}>
                                                Auto-sync Reminders
                                            </div>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                                Automatically add events to Google Calendar
                                            </div>
                                        </div>
                                    </label>

                                    <label style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        backgroundColor: userPreferences?.syncCalendarToApp !== false ? 'rgba(66, 133, 244, 0.1)' : 'var(--bg-input)',
                                        border: `1px solid ${userPreferences?.syncCalendarToApp !== false ? 'rgba(66, 133, 244, 0.3)' : 'var(--border)'}`,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={userPreferences?.syncCalendarToApp !== false}
                                            onChange={(e) => updatePreferences({ syncCalendarToApp: e.target.checked })}
                                            style={{ accentColor: '#4285F4' }}
                                        />
                                        <div>
                                            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: userPreferences?.syncCalendarToApp !== false ? '#4285F4' : 'var(--text-main)' }}>
                                                Import Google Events
                                            </div>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                                Show Google Calendar events in app
                                            </div>
                                        </div>
                                    </label>
                                </>
                            )}

                            {/* Connect/Disconnect Button */}
                            {isGoogleCalendarConnected ? (
                                <button
                                    onClick={() => {
                                        disconnectGoogleCalendar();
                                        setShowCalendarSettings(false);
                                    }}
                                    style={{
                                        padding: '10px',
                                        borderRadius: '8px',
                                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                        color: '#ef4444',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        transition: 'all 0.2s ease',
                                        cursor: 'pointer'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                                >
                                    Disconnect Google Calendar
                                </button>
                            ) : (
                                <button
                                    onClick={async () => {
                                        const result = await signInWithGoogle();
                                        if (result.token) {
                                            fetchGoogleEvents(result.token);
                                        }
                                        setShowCalendarSettings(false);
                                    }}
                                    style={{
                                        padding: '10px',
                                        borderRadius: '8px',
                                        backgroundColor: '#4285F4',
                                        color: 'white',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        border: 'none',
                                        transition: 'all 0.2s ease',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Connect Google Calendar
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <div
                    className="calendar-content-wrapper"
                    style={{
                        maxHeight: isCalendarMinimized ? '0' : '500px',
                        opacity: isCalendarMinimized ? '0' : '1',
                        overflow: 'hidden',
                        transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
                        transform: isCalendarMinimized ? 'translateY(-10px)' : 'translateY(0)',
                    }}
                >
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center', paddingTop: isCalendarMinimized ? '0' : '0' }}>
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                            <div key={i} style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '600', padding: '4px 0', marginBottom: '4px' }}>{d}</div>
                        ))}
                        {calendarDays.map((day, idx) => {
                            const isToday = isSameDay(day, today);
                            const isCurrentMonth = isSameMonth(day, currentMonth);
                            const hasActivity = tasks.some(t => {
                                if (!t.date) return false;
                                const d = new Date(t.date);
                                return !isNaN(d.getTime()) && isSameDay(d, day);
                            }) || reminders.some(r => {
                                if (!r.dueDate) return false;
                                const d = new Date(r.dueDate);
                                return !isNaN(d.getTime()) && isSameDay(d, day);
                            });

                            return (
                                <div
                                    key={idx}
                                    onClick={() => handleDateClick(day)}
                                    style={{
                                        fontSize: '0.75rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: !isCurrentMonth ? 'var(--bg-hover)' : isToday ? 'var(--bg-app)' : 'var(--text-muted)',
                                        backgroundColor: isToday ? 'var(--text-main)' : 'transparent',
                                        borderRadius: '50%',
                                        fontWeight: isToday ? '700' : '400',
                                        width: '100%',
                                        aspectRatio: '1',
                                        cursor: 'pointer',
                                        position: 'relative'
                                    }}
                                >
                                    {format(day, 'd')}
                                    {hasActivity && !isToday && (
                                        <div style={{ position: 'absolute', bottom: '2px', width: '3px', height: '3px', borderRadius: '50%', backgroundColor: 'var(--text-main)' }}></div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Date Detail Modal */}
            {showDateModal && selectedDateData && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                    <div style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '20px', width: '90%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h4 style={{ fontWeight: '700' }}>{safeFormat(selectedDateData.date, 'MMMM d, yyyy')}</h4>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Retroactive Management & Events</p>
                            </div>
                            <button onClick={() => setShowDateModal(false)}><X size={20} /></button>
                        </div>

                        <div style={{ maxHeight: '450px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingRight: '4px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* Records Section */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {/* Tasks Section */}
                                    <div>
                                        <h5 style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '8px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Bell size={12} color="#f59e0b" /> Tasks
                                        </h5>
                                        {selectedDateData.tasks.length === 0 ? (
                                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px', backgroundColor: 'var(--bg-input)', borderRadius: '8px' }}>No tasks for this day</p>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {selectedDateData.tasks.map(t => (
                                                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '8px', backgroundColor: 'var(--bg-input)', borderRadius: '8px', fontSize: '0.8rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={t.completed}
                                                                onChange={() => onToggleTask && onToggleTask(t.id)}
                                                                style={{ cursor: 'pointer' }}
                                                            />
                                                            <span style={{ flex: 1, textDecoration: t.completed ? 'line-through' : 'none', color: t.completed ? 'var(--text-muted)' : 'var(--text-main)' }}>{t.text}</span>
                                                        </div>
                                                        <button onClick={() => onDeleteTask(t.id)} style={{ color: '#ef4444', padding: '4px' }}><Trash2 size={12} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Study Sessions Section */}
                                    <div>
                                        <h5 style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '8px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <BookOpen size={12} color="#3b82f6" /> Study Sessions
                                        </h5>
                                        {studySessions.filter(s => safeIsSameDay(s.date, selectedDateData.date)).length === 0 ? (
                                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px', backgroundColor: 'var(--bg-input)', borderRadius: '8px' }}>No sessions recorded</p>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {studySessions.filter(s => safeIsSameDay(s.date, selectedDateData.date)).map(s => (
                                                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '8px', backgroundColor: 'var(--bg-input)', borderRadius: '8px', fontSize: '0.8rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <Clock size={12} color="#3b82f6" />
                                                            <span>{s.hours} hours</span>
                                                        </div>
                                                        <button onClick={() => onDeleteStudySession && onDeleteStudySession(s.id)} style={{ color: '#ef4444', padding: '4px' }}><Trash2 size={12} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>


                                    {/* Add Retroactive Data Form */}
                                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '8px' }}>
                                        <h5 style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '12px' }}>Add Historical Data</h5>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <form onSubmit={(e) => { e.preventDefault(); handleAddRetroTask(e); }} style={{ display: 'flex', gap: '8px' }}>
                                                <input
                                                    type="text"
                                                    placeholder="Task description..."
                                                    value={retroTask}
                                                    onChange={(e) => setRetroTask(e.target.value)}
                                                    style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.75rem', outline: 'none' }}
                                                />
                                                <button
                                                    type="submit"
                                                    disabled={isSubmittingRetro}
                                                    style={{ padding: '8px 12px', borderRadius: '8px', backgroundColor: 'var(--text-main)', color: 'var(--bg-app)', fontWeight: '600', fontSize: '0.75rem', opacity: isSubmittingRetro ? 0.7 : 1 }}
                                                >
                                                    {isSubmittingRetro ? 'Adding...' : 'Add Task'}
                                                </button>
                                            </form>

                                            <form onSubmit={(e) => { e.preventDefault(); handleAddRetroStudy(e); }} style={{ display: 'flex', gap: '8px' }}>
                                                <input
                                                    type="number"
                                                    placeholder="Study hours..."
                                                    value={retroStudy}
                                                    onChange={(e) => setRetroStudy(e.target.value)}
                                                    step="0.1"
                                                    style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.75rem', outline: 'none' }}
                                                />
                                                <button
                                                    type="submit"
                                                    disabled={isSubmittingRetro}
                                                    style={{ padding: '8px 12px', borderRadius: '8px', backgroundColor: '#3b82f6', color: 'white', fontWeight: '600', fontSize: '0.75rem', opacity: isSubmittingRetro ? 0.7 : 1 }}
                                                >
                                                    {isSubmittingRetro ? 'Adding...' : 'Add Hours'}
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            )
            }

            <RemindersCard
                reminders={reminders}
                onAddReminder={onAddReminder}
                onDeleteReminder={onDeleteReminder}
                onUpdateReminder={onUpdateReminder}
                googleToken={googleToken}
                googleEvents={userPreferences?.syncCalendarToApp !== false ? googleEvents : []}
                onGoogleEventsChange={setGoogleEvents}
                userPreferences={userPreferences}
            />

            <div style={{ padding: '16px', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius)' }}>
                <StickyNotesSection
                    notes={notes}
                    folders={folders}
                    onAddNote={onAddNote}
                    onUpdateNote={onUpdateNote}
                    onDeleteNote={onDeleteNote}
                    onAddFolder={onAddFolder}
                    onUpdateFolder={onUpdateFolder}
                    onDeleteFolder={onDeleteFolder}
                />
            </div>

            <div style={{
                padding: '16px',
                textAlign: 'center',
                opacity: 0.3,
                fontSize: '0.6rem',
                color: 'var(--text-muted)'
            }}>
                Noted v1.0.1
            </div>
        </div>

        {/* Study Management Modal - Rendered outside main container to avoid overflow clipping */}
        {showStudyModal && (
            <div style={{ 
                position: 'fixed', 
                inset: 0, 
                backgroundColor: 'rgba(0,0,0,0.6)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                zIndex: 9999 
            }}>
                <div style={{ 
                    backgroundColor: 'var(--bg-card)', 
                    padding: '24px', 
                    borderRadius: '20px', 
                    width: '90%', 
                    maxWidth: '400px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '16px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ fontWeight: '700' }}>Manage Study Sessions</h4>
                        <button 
                            onClick={() => setShowStudyModal(false)}
                            style={{ padding: '4px', borderRadius: '6px', cursor: 'pointer' }}
                        >
                            <X size={20} />
                        </button>
                    </div>
                    <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {studySessions.map(session => (
                            <div key={session.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: 'var(--bg-input)', borderRadius: '10px' }}>
                                <div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: '600' }}>{session.hours} Hours</div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{format(new Date(session.date), 'MMM d, p')}</div>
                                </div>
                                <button onClick={() => onDeleteStudySession(session.id)} style={{ color: '#ef4444', padding: '4px', cursor: 'pointer' }}>
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                        {studySessions.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No sessions found.</div>
                        )}
                    </div>
                    <button
                        onClick={() => { if (window.confirm('Reset all sessions?')) studySessions.forEach(s => onDeleteStudySession(s.id)) }}
                        style={{ padding: '12px', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}
                    >
                        Reset All Data
                    </button>
                </div>
            </div>
        )}
        </>
    );
}

export default Dashboard;
