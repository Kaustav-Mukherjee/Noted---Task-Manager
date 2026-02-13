import { useState, useEffect, useMemo } from 'react';
import { X, Plus, Edit2, Trash2, Target, TrendingUp, Calendar, CheckCircle2, Circle, MoreHorizontal, Palette } from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { 
    subscribeHabits, 
    subscribeHabitCompletions, 
    addHabit, 
    updateHabit, 
    deleteHabit, 
    toggleHabitCompletion 
} from '../services/firestoreService';

const HABIT_COLORS = [
    '#3b82f6', // blue
    '#22c55e', // green
    '#f59e0b', // yellow
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316', // orange
];

const FREQUENCY_OPTIONS = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'weekdays', label: 'Weekdays' },
    { value: 'weekends', label: 'Weekends' },
];

function HabitTracker({ isOpen, onClose }) {
    const { user } = useAuth();
    const [habits, setHabits] = useState([]);
    const [completions, setCompletions] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingHabit, setEditingHabit] = useState(null);
    const [selectedView, setSelectedView] = useState('list'); // 'list', 'stats'
    const [selectedHabitForStats, setSelectedHabitForStats] = useState(null);

    // Form states
    const [habitName, setHabitName] = useState('');
    const [habitDescription, setHabitDescription] = useState('');
    const [habitColor, setHabitColor] = useState(HABIT_COLORS[0]);
    const [habitFrequency, setHabitFrequency] = useState('daily');
    const [habitTarget, setHabitTarget] = useState(1);

    // Subscribe to habits and completions
    useEffect(() => {
        if (!user) return;
        
        const unsubHabits = subscribeHabits(user.uid, setHabits);
        const unsubCompletions = subscribeHabitCompletions(user.uid, setCompletions);
        
        return () => {
            unsubHabits();
            unsubCompletions();
        };
    }, [user]);

    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    // Get last 7 days for the week view
    const last7Days = useMemo(() => {
        return eachDayOfInterval({
            start: subDays(today, 6),
            end: today
        });
    }, [today]);

    // Check if a habit is completed for a specific date
    const isHabitCompleted = (habitId, dateStr) => {
        return completions.some(c => c.habitId === habitId && c.date === dateStr);
    };

    // Toggle habit completion
    const handleToggleCompletion = async (habitId, dateStr) => {
        if (!user) return;
        const isCompleted = isHabitCompleted(habitId, dateStr);
        await toggleHabitCompletion(user.uid, habitId, dateStr, !isCompleted);
    };

    // Calculate streak for a habit
    const calculateStreak = (habitId) => {
        let streak = 0;
        const sortedCompletions = completions
            .filter(c => c.habitId === habitId)
            .map(c => c.date)
            .sort((a, b) => new Date(b) - new Date(a));
        
        if (sortedCompletions.length === 0) return 0;
        
        // Check if completed today or yesterday to maintain streak
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');
        
        if (!sortedCompletions.includes(todayStr) && !sortedCompletions.includes(yesterdayStr)) {
            return 0;
        }
        
        let checkDate = new Date();
        for (let i = 0; i < sortedCompletions.length; i++) {
            const dateStr = format(checkDate, 'yyyy-MM-dd');
            if (sortedCompletions.includes(dateStr)) {
                streak++;
                checkDate = subDays(checkDate, 1);
            } else {
                break;
            }
        }
        return streak;
    };

    // Calculate completion rate for last 30 days
    const calculateCompletionRate = (habitId) => {
        const last30Days = eachDayOfInterval({
            start: subDays(new Date(), 29),
            end: new Date()
        });
        
        const completedDays = last30Days.filter(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            return isHabitCompleted(habitId, dateStr);
        }).length;
        
        return Math.round((completedDays / 30) * 100);
    };

    // Handle add/edit habit
    const handleSaveHabit = async (e) => {
        e.preventDefault();
        if (!user || !habitName.trim()) return;

        const habitData = {
            name: habitName.trim(),
            description: habitDescription.trim(),
            color: habitColor,
            frequency: habitFrequency,
            target: parseInt(habitTarget) || 1
        };

        if (editingHabit) {
            await updateHabit(user.uid, editingHabit.id, habitData);
        } else {
            await addHabit(user.uid, habitData);
        }

        resetForm();
        setShowAddModal(false);
        setEditingHabit(null);
    };

    // Handle delete habit
    const handleDeleteHabit = async (habitId) => {
        if (!user || !window.confirm('Are you sure you want to delete this habit?')) return;
        await deleteHabit(user.uid, habitId);
    };

    // Reset form
    const resetForm = () => {
        setHabitName('');
        setHabitDescription('');
        setHabitColor(HABIT_COLORS[0]);
        setHabitFrequency('daily');
        setHabitTarget(1);
    };

    // Open edit modal
    const openEditModal = (habit) => {
        setEditingHabit(habit);
        setHabitName(habit.name);
        setHabitDescription(habit.description || '');
        setHabitColor(habit.color || HABIT_COLORS[0]);
        setHabitFrequency(habit.frequency || 'daily');
        setHabitTarget(habit.target || 1);
        setShowAddModal(true);
    };

    // Stats data preparation
    const getStatsData = (habitId) => {
        const last30Days = eachDayOfInterval({
            start: subDays(new Date(), 29),
            end: new Date()
        });

        const completionData = last30Days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            return {
                date: format(day, 'MMM d'),
                completed: isHabitCompleted(habitId, dateStr) ? 1 : 0
            };
        });

        const completedCount = completionData.filter(d => d.completed === 1).length;
        const missedCount = completionData.length - completedCount;

        const pieData = [
            { name: 'Completed', value: completedCount, color: '#22c55e' },
            { name: 'Missed', value: missedCount, color: '#ef4444' }
        ];

        return { completionData, pieData, completedCount, missedCount };
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
            zIndex: 9999,
            padding: '20px'
        }}>
            <div style={{
                backgroundColor: 'var(--bg-card)',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '900px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                border: '1px solid var(--border)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '24px 24px 16px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Target size={24} color="var(--text-main)" />
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>Habit Tracker</h2>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                                {habits.length} habits tracked
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            display: 'flex',
                            gap: '2px',
                            backgroundColor: 'var(--bg-input)',
                            padding: '3px',
                            borderRadius: '8px'
                        }}>
                            <button
                                onClick={() => setSelectedView('list')}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: selectedView === 'list' ? '600' : '400',
                                    backgroundColor: selectedView === 'list' ? 'var(--bg-hover)' : 'transparent',
                                    color: selectedView === 'list' ? 'var(--text-main)' : 'var(--text-muted)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Calendar size={14} style={{ marginRight: '4px', display: 'inline' }} />
                                List
                            </button>
                            <button
                                onClick={() => setSelectedView('stats')}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: selectedView === 'stats' ? '600' : '400',
                                    backgroundColor: selectedView === 'stats' ? 'var(--bg-hover)' : 'transparent',
                                    color: selectedView === 'stats' ? 'var(--text-main)' : 'var(--text-muted)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <TrendingUp size={14} style={{ marginRight: '4px', display: 'inline' }} />
                                Stats
                            </button>
                        </div>
                        <button
                            onClick={() => setShowAddModal(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 14px',
                                backgroundColor: 'var(--text-main)',
                                color: 'var(--bg-app)',
                                border: 'none',
                                borderRadius: '10px',
                                fontWeight: '600',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Plus size={16} />
                            New Habit
                        </button>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '8px',
                                backgroundColor: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                borderRadius: '8px'
                            }}
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div style={{
                    padding: '24px',
                    overflowY: 'auto',
                    flex: 1
                }}>
                    {habits.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '60px 20px',
                            color: 'var(--text-muted)'
                        }}>
                            <Target size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '8px' }}>No habits yet</h3>
                            <p style={{ fontSize: '0.85rem', marginBottom: '20px' }}>Create your first habit to start tracking</p>
                            <button
                                onClick={() => setShowAddModal(true)}
                                style={{
                                    padding: '12px 24px',
                                    backgroundColor: 'var(--text-main)',
                                    color: 'var(--bg-app)',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                Create Habit
                            </button>
                        </div>
                    ) : selectedView === 'list' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {habits.map(habit => {
                                const streak = calculateStreak(habit.id);
                                const completionRate = calculateCompletionRate(habit.id);
                                
                                return (
                                    <div
                                        key={habit.id}
                                        style={{
                                            backgroundColor: 'var(--bg-input)',
                                            borderRadius: '16px',
                                            padding: '20px',
                                            border: '1px solid var(--border)',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {/* Habit Header */}
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-start',
                                            marginBottom: '16px'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    borderRadius: '10px',
                                                    backgroundColor: `${habit.color}20`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    border: `2px solid ${habit.color}`
                                                }}>
                                                    <CheckCircle2 size={20} color={habit.color} />
                                                </div>
                                                <div>
                                                    <h3 style={{
                                                        fontSize: '1rem',
                                                        fontWeight: '700',
                                                        margin: 0,
                                                        color: 'var(--text-main)'
                                                    }}>
                                                        {habit.name}
                                                    </h3>
                                                    {habit.description && (
                                                        <p style={{
                                                            fontSize: '0.75rem',
                                                            color: 'var(--text-muted)',
                                                            margin: '2px 0 0 0'
                                                        }}>
                                                            {habit.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    padding: '4px 10px',
                                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                                    borderRadius: '20px'
                                                }}>
                                                    <TrendingUp size={12} color="#ef4444" />
                                                    <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#ef4444' }}>
                                                        {streak} day streak
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => openEditModal(habit)}
                                                    style={{
                                                        padding: '6px',
                                                        backgroundColor: 'transparent',
                                                        border: 'none',
                                                        color: 'var(--text-muted)',
                                                        cursor: 'pointer',
                                                        borderRadius: '6px'
                                                    }}
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteHabit(habit.id)}
                                                    style={{
                                                        padding: '6px',
                                                        backgroundColor: 'transparent',
                                                        border: 'none',
                                                        color: '#ef4444',
                                                        cursor: 'pointer',
                                                        borderRadius: '6px'
                                                    }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Weekly Progress */}
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            backgroundColor: 'var(--bg-card)',
                                            borderRadius: '12px',
                                            padding: '12px 16px'
                                        }}>
                                            {last7Days.map((day, index) => {
                                                const dateStr = format(day, 'yyyy-MM-dd');
                                                const isCompleted = isHabitCompleted(habit.id, dateStr);
                                                const isToday = isSameDay(day, new Date());
                                                const dayLabel = format(day, 'EEE')[0];

                                                return (
                                                    <button
                                                        key={index}
                                                        onClick={() => handleToggleCompletion(habit.id, dateStr)}
                                                        style={{
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            backgroundColor: 'transparent',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            padding: '4px'
                                                        }}
                                                    >
                                                        <span style={{
                                                            fontSize: '0.65rem',
                                                            color: isToday ? 'var(--text-main)' : 'var(--text-muted)',
                                                            fontWeight: isToday ? '600' : '400'
                                                        }}>
                                                            {dayLabel}
                                                        </span>
                                                        <div style={{
                                                            width: '28px',
                                                            height: '28px',
                                                            borderRadius: '8px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            backgroundColor: isCompleted ? habit.color : 'var(--bg-input)',
                                                            border: `2px solid ${isCompleted ? habit.color : 'var(--border)'}`,
                                                            transition: 'all 0.2s'
                                                        }}>
                                                            {isCompleted && (
                                                                <CheckCircle2 size={16} color="white" />
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Stats Summary */}
                                        <div style={{
                                            display: 'flex',
                                            gap: '16px',
                                            marginTop: '12px',
                                            paddingTop: '12px',
                                            borderTop: '1px solid var(--border)'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>30-day rate:</span>
                                                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-main)' }}>
                                                    {completionRate}%
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Frequency:</span>
                                                <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-main)', textTransform: 'capitalize' }}>
                                                    {habit.frequency || 'daily'}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setSelectedHabitForStats(habit);
                                                    setSelectedView('stats');
                                                }}
                                                style={{
                                                    marginLeft: 'auto',
                                                    fontSize: '0.7rem',
                                                    color: habit.color,
                                                    backgroundColor: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    fontWeight: '600'
                                                }}
                                            >
                                                View Stats →
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        // Stats View
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {selectedHabitForStats ? (
                                <>
                                    <button
                                        onClick={() => setSelectedHabitForStats(null)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            fontSize: '0.8rem',
                                            color: 'var(--text-muted)',
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            marginBottom: '-16px'
                                        }}
                                    >
                                        ← Back to all habits
                                    </button>
                                    
                                    {(() => {
                                        const { completionData, pieData, completedCount, missedCount } = getStatsData(selectedHabitForStats.id);
                                        
                                        return (
                                            <>
                                                {/* Habit Info */}
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                    padding: '16px',
                                                    backgroundColor: 'var(--bg-input)',
                                                    borderRadius: '12px'
                                                }}>
                                                    <div style={{
                                                        width: '50px',
                                                        height: '50px',
                                                        borderRadius: '12px',
                                                        backgroundColor: `${selectedHabitForStats.color}20`,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        border: `2px solid ${selectedHabitForStats.color}`
                                                    }}>
                                                        <Target size={24} color={selectedHabitForStats.color} />
                                                    </div>
                                                    <div>
                                                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>
                                                            {selectedHabitForStats.name}
                                                        </h3>
                                                        <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                            {calculateStreak(selectedHabitForStats.id)} day streak • {calculateCompletionRate(selectedHabitForStats.id)}% completion rate
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Charts Grid */}
                                                <div style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: '1fr 1fr',
                                                    gap: '20px'
                                                }}>
                                                    {/* Pie Chart */}
                                                    <div style={{
                                                        backgroundColor: 'var(--bg-input)',
                                                        borderRadius: '16px',
                                                        padding: '20px'
                                                    }}>
                                                        <h4 style={{
                                                            fontSize: '0.9rem',
                                                            fontWeight: '600',
                                                            marginBottom: '16px',
                                                            textAlign: 'center'
                                                        }}>
                                                            Last 30 Days
                                                        </h4>
                                                        <div style={{ height: '200px' }}>
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <PieChart>
                                                                    <Pie
                                                                        data={pieData}
                                                                        cx="50%"
                                                                        cy="50%"
                                                                        innerRadius={50}
                                                                        outerRadius={80}
                                                                        paddingAngle={5}
                                                                        dataKey="value"
                                                                    >
                                                                        {pieData.map((entry, index) => (
                                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                                        ))}
                                                                    </Pie>
                                                                    <Tooltip
                                                                        contentStyle={{
                                                                            backgroundColor: 'var(--bg-card)',
                                                                            border: '1px solid var(--border)',
                                                                            borderRadius: '8px',
                                                                            fontSize: '0.8rem'
                                                                        }}
                                                                    />
                                                                </PieChart>
                                                            </ResponsiveContainer>
                                                        </div>
                                                        <div style={{
                                                            display: 'flex',
                                                            justifyContent: 'center',
                                                            gap: '20px',
                                                            marginTop: '12px'
                                                        }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <div style={{
                                                                    width: '10px',
                                                                    height: '10px',
                                                                    borderRadius: '50%',
                                                                    backgroundColor: '#22c55e'
                                                                }} />
                                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                    {completedCount} Completed
                                                                </span>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <div style={{
                                                                    width: '10px',
                                                                    height: '10px',
                                                                    borderRadius: '50%',
                                                                    backgroundColor: '#ef4444'
                                                                }} />
                                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                    {missedCount} Missed
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Summary Stats */}
                                                    <div style={{
                                                        backgroundColor: 'var(--bg-input)',
                                                        borderRadius: '16px',
                                                        padding: '20px',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '16px'
                                                    }}>
                                                        <h4 style={{
                                                            fontSize: '0.9rem',
                                                            fontWeight: '600',
                                                            textAlign: 'center'
                                                        }}>
                                                            Statistics
                                                        </h4>
                                                        
                                                        <div style={{
                                                            display: 'grid',
                                                            gridTemplateColumns: '1fr 1fr',
                                                            gap: '12px',
                                                            flex: 1
                                                        }}>
                                                            <div style={{
                                                                backgroundColor: 'var(--bg-card)',
                                                                borderRadius: '12px',
                                                                padding: '16px',
                                                                textAlign: 'center'
                                                            }}>
                                                                <div style={{
                                                                    fontSize: '1.75rem',
                                                                    fontWeight: '700',
                                                                    color: selectedHabitForStats.color
                                                                }}>
                                                                    {calculateStreak(selectedHabitForStats.id)}
                                                                </div>
                                                                <div style={{
                                                                    fontSize: '0.7rem',
                                                                    color: 'var(--text-muted)',
                                                                    marginTop: '4px'
                                                                }}>
                                                                    Current Streak
                                                                </div>
                                                            </div>
                                                            
                                                            <div style={{
                                                                backgroundColor: 'var(--bg-card)',
                                                                borderRadius: '12px',
                                                                padding: '16px',
                                                                textAlign: 'center'
                                                            }}>
                                                                <div style={{
                                                                    fontSize: '1.75rem',
                                                                    fontWeight: '700',
                                                                    color: '#22c55e'
                                                                }}>
                                                                    {calculateCompletionRate(selectedHabitForStats.id)}%
                                                                </div>
                                                                <div style={{
                                                                    fontSize: '0.7rem',
                                                                    color: 'var(--text-muted)',
                                                                    marginTop: '4px'
                                                                }}>
                                                                    Success Rate
                                                                </div>
                                                            </div>
                                                            
                                                            <div style={{
                                                                backgroundColor: 'var(--bg-card)',
                                                                borderRadius: '12px',
                                                                padding: '16px',
                                                                textAlign: 'center'
                                                            }}>
                                                                <div style={{
                                                                    fontSize: '1.75rem',
                                                                    fontWeight: '700',
                                                                    color: 'var(--text-main)'
                                                                }}>
                                                                    {completedCount}
                                                                </div>
                                                                <div style={{
                                                                    fontSize: '0.7rem',
                                                                    color: 'var(--text-muted)',
                                                                    marginTop: '4px'
                                                                }}>
                                                                    Days Completed
                                                                </div>
                                                            </div>
                                                            
                                                            <div style={{
                                                                backgroundColor: 'var(--bg-card)',
                                                                borderRadius: '12px',
                                                                padding: '16px',
                                                                textAlign: 'center'
                                                            }}>
                                                                <div style={{
                                                                    fontSize: '1.75rem',
                                                                    fontWeight: '700',
                                                                    color: 'var(--text-muted)'
                                                                }}>
                                                                    {completions.filter(c => c.habitId === selectedHabitForStats.id).length}
                                                                </div>
                                                                <div style={{
                                                                    fontSize: '0.7rem',
                                                                    color: 'var(--text-muted)',
                                                                    marginTop: '4px'
                                                                }}>
                                                                    Total Completions
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Line Chart */}
                                                <div style={{
                                                    backgroundColor: 'var(--bg-input)',
                                                    borderRadius: '16px',
                                                    padding: '20px'
                                                }}>
                                                    <h4 style={{
                                                        fontSize: '0.9rem',
                                                        fontWeight: '600',
                                                        marginBottom: '16px'
                                                    }}>
                                                        30-Day Trend
                                                    </h4>
                                                    <div style={{ height: '200px' }}>
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <LineChart data={completionData}>
                                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                                                <XAxis 
                                                                    dataKey="date" 
                                                                    stroke="var(--text-muted)"
                                                                    fontSize={10}
                                                                    tickLine={false}
                                                                    axisLine={false}
                                                                    interval={4}
                                                                />
                                                                <YAxis 
                                                                    stroke="var(--text-muted)"
                                                                    fontSize={10}
                                                                    tickLine={false}
                                                                    axisLine={false}
                                                                    domain={[0, 1]}
                                                                    ticks={[0, 1]}
                                                                    tickFormatter={(value) => value === 1 ? 'Done' : 'Miss'}
                                                                />
                                                                <Tooltip
                                                                    contentStyle={{
                                                                        backgroundColor: 'var(--bg-card)',
                                                                        border: '1px solid var(--border)',
                                                                        borderRadius: '8px',
                                                                        fontSize: '0.8rem'
                                                                    }}
                                                                />
                                                                <Line
                                                                    type="stepAfter"
                                                                    dataKey="completed"
                                                                    stroke={selectedHabitForStats.color}
                                                                    strokeWidth={2}
                                                                    dot={{ fill: selectedHabitForStats.color, r: 3 }}
                                                                    activeDot={{ r: 5 }}
                                                                />
                                                            </LineChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </>
                            ) : (
                                // Overview of all habits
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>All Habits Overview</h3>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                        gap: '16px'
                                    }}>
                                        {habits.map(habit => {
                                            const rate = calculateCompletionRate(habit.id);
                                            const streak = calculateStreak(habit.id);
                                            
                                            return (
                                                <button
                                                    key={habit.id}
                                                    onClick={() => setSelectedHabitForStats(habit)}
                                                    style={{
                                                        backgroundColor: 'var(--bg-input)',
                                                        borderRadius: '12px',
                                                        padding: '16px',
                                                        border: '1px solid var(--border)',
                                                        cursor: 'pointer',
                                                        textAlign: 'left',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '10px',
                                                        marginBottom: '12px'
                                                    }}>
                                                        <div style={{
                                                            width: '36px',
                                                            height: '36px',
                                                            borderRadius: '8px',
                                                            backgroundColor: `${habit.color}20`,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}>
                                                            <CheckCircle2 size={18} color={habit.color} />
                                                        </div>
                                                        <span style={{
                                                            fontSize: '0.85rem',
                                                            fontWeight: '600',
                                                            color: 'var(--text-main)'
                                                        }}>
                                                            {habit.name}
                                                        </span>
                                                    </div>
                                                    <div style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        fontSize: '0.75rem'
                                                    }}>
                                                        <span style={{ color: 'var(--text-muted)' }}>
                                                            {rate}% success
                                                        </span>
                                                        <span style={{ color: '#ef4444', fontWeight: '600' }}>
                                                            {streak}🔥
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Add/Edit Habit Modal */}
            {showAddModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10000,
                    padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '20px',
                        width: '100%',
                        maxWidth: '450px',
                        padding: '24px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '20px'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>
                                {editingHabit ? 'Edit Habit' : 'Create New Habit'}
                            </h3>
                            <button
                                onClick={() => {
                                    setShowAddModal(false);
                                    setEditingHabit(null);
                                    resetForm();
                                }}
                                style={{
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer'
                                }}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveHabit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.8rem',
                                    fontWeight: '600',
                                    marginBottom: '6px',
                                    color: 'var(--text-muted)'
                                }}>
                                    Habit Name *
                                </label>
                                <input
                                    type="text"
                                    value={habitName}
                                    onChange={(e) => setHabitName(e.target.value)}
                                    placeholder="e.g., Drink 8 glasses of water"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        backgroundColor: 'var(--bg-input)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '10px',
                                        color: 'var(--text-main)',
                                        fontSize: '0.9rem',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.8rem',
                                    fontWeight: '600',
                                    marginBottom: '6px',
                                    color: 'var(--text-muted)'
                                }}>
                                    Description (optional)
                                </label>
                                <input
                                    type="text"
                                    value={habitDescription}
                                    onChange={(e) => setHabitDescription(e.target.value)}
                                    placeholder="e.g., Stay hydrated throughout the day"
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        backgroundColor: 'var(--bg-input)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '10px',
                                        color: 'var(--text-main)',
                                        fontSize: '0.9rem',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.8rem',
                                    fontWeight: '600',
                                    marginBottom: '10px',
                                    color: 'var(--text-muted)'
                                }}>
                                    Color
                                </label>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    {HABIT_COLORS.map(color => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setHabitColor(color)}
                                            style={{
                                                width: '36px',
                                                height: '36px',
                                                borderRadius: '10px',
                                                backgroundColor: color,
                                                border: habitColor === color ? '3px solid var(--text-main)' : '3px solid transparent',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                boxShadow: habitColor === color ? `0 0 0 2px ${color}40` : 'none'
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '0.8rem',
                                        fontWeight: '600',
                                        marginBottom: '6px',
                                        color: 'var(--text-muted)'
                                    }}>
                                        Frequency
                                    </label>
                                    <select
                                        value={habitFrequency}
                                        onChange={(e) => setHabitFrequency(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '12px 16px',
                                            backgroundColor: 'var(--bg-input)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '10px',
                                            color: 'var(--text-main)',
                                            fontSize: '0.9rem',
                                            outline: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {FREQUENCY_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '0.8rem',
                                        fontWeight: '600',
                                        marginBottom: '6px',
                                        color: 'var(--text-muted)'
                                    }}>
                                        Daily Target
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="10"
                                        value={habitTarget}
                                        onChange={(e) => setHabitTarget(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '12px 16px',
                                            backgroundColor: 'var(--bg-input)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '10px',
                                            color: 'var(--text-main)',
                                            fontSize: '0.9rem',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setEditingHabit(null);
                                        resetForm();
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '14px',
                                        backgroundColor: 'var(--bg-input)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '10px',
                                        color: 'var(--text-main)',
                                        fontWeight: '600',
                                        fontSize: '0.9rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        flex: 1,
                                        padding: '14px',
                                        backgroundColor: 'var(--text-main)',
                                        border: 'none',
                                        borderRadius: '10px',
                                        color: 'var(--bg-app)',
                                        fontWeight: '600',
                                        fontSize: '0.9rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {editingHabit ? 'Save Changes' : 'Create Habit'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default HabitTracker;
