import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { X, Plus, Edit2, Trash2, Target, TrendingUp, Calendar, CheckCircle2, ChevronLeft, Award, Activity } from 'lucide-react';
import { format, subDays, eachDayOfInterval, isSameDay } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { 
    subscribeHabits, 
    subscribeHabitCompletions, 
    addHabit, 
    updateHabit, 
    deleteHabit, 
    toggleHabitCompletion,
    addHabitCompletion,
    updateHabitCompletion
} from '../services/firestoreService';

const HABIT_COLORS = [
    '#007AFF', // iOS Blue
    '#34C759', // iOS Green
    '#FF9500', // iOS Orange
    '#FF3B30', // iOS Red
    '#AF52DE', // iOS Purple
    '#FF2D55', // iOS Pink
    '#5AC8FA', // iOS Teal
    '#FFCC00', // iOS Yellow
];

const FREQUENCY_OPTIONS = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'weekdays', label: 'Weekdays' },
    { value: 'weekends', label: 'Weekends' },
];

// Apple Spring Configurations
const springConfig = {
    type: "spring",
    stiffness: 400,
    damping: 30,
    mass: 1
};

const gentleSpring = {
    type: "spring",
    stiffness: 200,
    damping: 25,
    mass: 0.8
};

const bouncySpring = {
    type: "spring",
    stiffness: 500,
    damping: 25,
    mass: 1.2
};

// Animation Variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1
        }
    },
    exit: {
        opacity: 0,
        transition: { staggerChildren: 0.05, staggerDirection: -1 }
    }
};

const itemVariants = {
    hidden: { 
        opacity: 0, 
        y: 30,
        scale: 0.95,
        filter: "blur(10px)"
    },
    visible: { 
        opacity: 1, 
        y: 0,
        scale: 1,
        filter: "blur(0px)",
        transition: {
            type: "spring",
            stiffness: 350,
            damping: 25,
            mass: 0.8
        }
    },
    exit: { 
        opacity: 0, 
        y: -20,
        scale: 0.95,
        filter: "blur(5px)",
        transition: { duration: 0.2 }
    }
};

const cardVariants = {
    hidden: { 
        opacity: 0, 
        y: 40,
        rotateX: -10,
        transformPerspective: 1000
    },
    visible: { 
        opacity: 1, 
        y: 0,
        rotateX: 0,
        transition: {
            type: "spring",
            stiffness: 400,
            damping: 30
        }
    },
    hover: {
        y: -4,
        scale: 1.01,
        boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
        transition: {
            type: "spring",
            stiffness: 400,
            damping: 25
        }
    },
    tap: {
        scale: 0.98,
        transition: { duration: 0.1 }
    }
};

const buttonVariants = {
    initial: { scale: 1 },
    hover: { 
        scale: 1.05,
        transition: {
            type: "spring",
            stiffness: 400,
            damping: 15
        }
    },
    tap: { 
        scale: 0.95,
        transition: { duration: 0.1 }
    }
};

const checkVariants = {
    unchecked: { 
        scale: 1,
        backgroundColor: "var(--bg-input)",
        borderColor: "var(--border)"
    },
    checked: { 
        scale: [1, 1.2, 1],
        backgroundColor: "currentColor",
        borderColor: "currentColor",
        transition: {
            scale: {
                type: "spring",
                stiffness: 500,
                damping: 15
            },
            backgroundColor: { duration: 0.2 },
            borderColor: { duration: 0.2 }
        }
    }
};

const iconVariants = {
    initial: { scale: 0, rotate: -180 },
    animate: { 
        scale: 1, 
        rotate: 0,
        transition: {
            type: "spring",
            stiffness: 400,
            damping: 20,
            delay: 0.1
        }
    },
    exit: { 
        scale: 0, 
        rotate: 180,
        transition: { duration: 0.2 }
    }
};

const modalVariants = {
    hidden: { 
        opacity: 0,
        scale: 0.9,
        y: 50,
        filter: "blur(20px)"
    },
    visible: { 
        opacity: 1,
        scale: 1,
        y: 0,
        filter: "blur(0px)",
        transition: {
            type: "spring",
            stiffness: 350,
            damping: 30,
            mass: 0.8
        }
    },
    exit: { 
        opacity: 0,
        scale: 0.95,
        y: 30,
        filter: "blur(10px)",
        transition: { duration: 0.2 }
    }
};

const slideInVariants = {
    hidden: { x: -20, opacity: 0 },
    visible: { 
        x: 0, 
        opacity: 1,
        transition: {
            type: "spring",
            stiffness: 400,
            damping: 30
        }
    },
    exit: { 
        x: 20, 
        opacity: 0,
        transition: { duration: 0.2 }
    }
};

const numberVariants = {
    initial: { scale: 0.5, opacity: 0 },
    animate: { 
        scale: 1, 
        opacity: 1,
        transition: {
            type: "spring",
            stiffness: 500,
            damping: 20
        }
    }
};

// Lottie-style Check Animation Component
const AnimatedCheckmark = ({ isChecked, color }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <motion.path
            d="M5 12L10 17L20 7"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ 
                pathLength: isChecked ? 1 : 0, 
                opacity: isChecked ? 1 : 0 
            }}
            transition={{ 
                pathLength: { 
                    type: "spring", 
                    stiffness: 300, 
                    damping: 20,
                    duration: 0.4
                },
                opacity: { duration: 0.2 }
            }}
        />
    </svg>
);

// Animated Counter Component
const AnimatedCounter = ({ value, color = "var(--text-main)" }) => {
    const springValue = useSpring(0, { stiffness: 100, damping: 30 });
    const displayValue = useTransform(springValue, (latest) => Math.round(latest));
    const [display, setDisplay] = useState(0);

    useEffect(() => {
        springValue.set(value);
    }, [value, springValue]);

    useEffect(() => {
        const unsubscribe = displayValue.on("change", (latest) => {
            setDisplay(latest);
        });
        return unsubscribe;
    }, [displayValue]);

    return (
        <motion.span
            key={value}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            style={{ color, fontWeight: 800 }}
        >
            {display}
        </motion.span>
    );
};

function HabitTracker({ isOpen, onClose }) {
    const { user } = useAuth();
    const [habits, setHabits] = useState([]);
    const [completions, setCompletions] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingHabit, setEditingHabit] = useState(null);
    const [selectedView, setSelectedView] = useState('list');
    const [selectedHabitForStats, setSelectedHabitForStats] = useState(null);
    const [deletingHabitId, setDeletingHabitId] = useState(null);

    // Form states
    const [habitName, setHabitName] = useState('');
    const [habitDescription, setHabitDescription] = useState('');
    const [habitColor, setHabitColor] = useState(HABIT_COLORS[0]);
    const [habitFrequency, setHabitFrequency] = useState('daily');
    const [habitType, setHabitType] = useState('binary'); // 'binary' or 'quantitative'
    const [habitTarget, setHabitTarget] = useState(1);
    const [habitUnit, setHabitUnit] = useState('');

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

    // Get completion data for a habit on a specific date
    const getHabitCompletion = (habitId, dateStr) => {
        return completions.find(c => c.habitId === habitId && c.date === dateStr);
    };

    // Check if a habit is completed for a specific date
    const isHabitCompleted = (habitId, dateStr) => {
        const completion = getHabitCompletion(habitId, dateStr);
        return completion ? completion.completed : false;
    };

    // Get completion value for quantitative habits
    const getHabitValue = (habitId, dateStr) => {
        const completion = getHabitCompletion(habitId, dateStr);
        return completion ? (completion.value || 0) : 0;
    };

    // Toggle habit completion for binary habits
    const handleToggleCompletion = async (habitId, dateStr) => {
        if (!user) return;
        const habit = habits.find(h => h.id === habitId);
        if (!habit || habit.type === 'quantitative') return; // Only for binary habits
        
        const isCompleted = isHabitCompleted(habitId, dateStr);
        await toggleHabitCompletion(user.uid, habitId, dateStr, !isCompleted);
    };

    // Update quantitative habit value
    const handleUpdateQuantitativeValue = async (habitId, dateStr, value) => {
        if (!user) return;
        const habit = habits.find(h => h.id === habitId);
        if (!habit || habit.type !== 'quantitative') return;
        
        const numValue = parseInt(value) || 0;
        const completion = getHabitCompletion(habitId, dateStr);
        
        if (completion) {
            await updateHabitCompletion(user.uid, habitId, dateStr, numValue);
        } else {
            await addHabitCompletion(user.uid, habitId, dateStr, numValue);
        }
    };

    // Calculate streak for a habit
    const calculateStreak = (habitId) => {
        const habit = habits.find(h => h.id === habitId);
        if (!habit) return 0;

        let streak = 0;
        let checkDate = new Date();
        const targetValue = habit.target || 1;

        // For quantitative habits, check if value >= target
        // For binary habits, check if completed
        const isDayCompleted = (dateStr) => {
            if (habit.type === 'quantitative') {
                const value = getHabitValue(habitId, dateStr);
                return value >= targetValue;
            } else {
                return isHabitCompleted(habitId, dateStr);
            }
        };

        // Check today first
        const todayStr = format(checkDate, 'yyyy-MM-dd');
        if (!isDayCompleted(todayStr)) {
            // If today not completed, check yesterday
            checkDate = subDays(checkDate, 1);
            const yesterdayStr = format(checkDate, 'yyyy-MM-dd');
            if (!isDayCompleted(yesterdayStr)) {
                return 0;
            }
        }

        // Count streak
        while (true) {
            const dateStr = format(checkDate, 'yyyy-MM-dd');
            if (isDayCompleted(dateStr)) {
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
        const habit = habits.find(h => h.id === habitId);
        if (!habit) return 0;

        const last30Days = eachDayOfInterval({
            start: subDays(new Date(), 29),
            end: new Date()
        });
        
        const targetValue = habit.target || 1;
        
        const completedDays = last30Days.filter(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            if (habit.type === 'quantitative') {
                const value = getHabitValue(habitId, dateStr);
                return value >= targetValue;
            } else {
                return isHabitCompleted(habitId, dateStr);
            }
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
            type: habitType,
            target: parseInt(habitTarget) || 1,
            unit: habitUnit.trim() || (habitType === 'quantitative' ? 'times' : '')
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

    // Handle delete habit with animation
    const handleDeleteHabit = async (habitId) => {
        if (!user) return;
        setDeletingHabitId(habitId);
        setTimeout(async () => {
            await deleteHabit(user.uid, habitId);
            setDeletingHabitId(null);
        }, 300);
    };

    // Reset form
    const resetForm = () => {
        setHabitName('');
        setHabitDescription('');
        setHabitColor(HABIT_COLORS[0]);
        setHabitFrequency('daily');
        setHabitType('binary');
        setHabitTarget(1);
        setHabitUnit('');
    };

    // Open edit modal
    const openEditModal = (habit) => {
        setEditingHabit(habit);
        setHabitName(habit.name);
        setHabitDescription(habit.description || '');
        setHabitColor(habit.color || HABIT_COLORS[0]);
        setHabitFrequency(habit.frequency || 'daily');
        setHabitType(habit.type || 'binary');
        setHabitTarget(habit.target || 1);
        setHabitUnit(habit.unit || '');
        setShowAddModal(true);
    };

    // Stats data preparation
    const getStatsData = (habitId) => {
        const habit = habits.find(h => h.id === habitId);
        const last30Days = eachDayOfInterval({
            start: subDays(new Date(), 29),
            end: new Date()
        });

        const targetValue = habit?.target || 1;
        const isQuantitative = habit?.type === 'quantitative';

        const completionData = last30Days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            if (isQuantitative) {
                const value = getHabitValue(habitId, dateStr);
                return {
                    date: format(day, 'MMM d'),
                    value: value,
                    target: targetValue,
                    completed: value >= targetValue ? 1 : 0,
                    percentage: Math.min((value / targetValue) * 100, 100)
                };
            } else {
                return {
                    date: format(day, 'MMM d'),
                    completed: isHabitCompleted(habitId, dateStr) ? 1 : 0,
                    value: isHabitCompleted(habitId, dateStr) ? 1 : 0,
                    target: 1
                };
            }
        });

        const completedCount = completionData.filter(d => d.completed === 1).length;
        const missedCount = completionData.length - completedCount;
        const partialCount = isQuantitative 
            ? completionData.filter(d => d.value > 0 && d.value < targetValue).length 
            : 0;

        // For quantitative habits, show 3 categories; for binary, show 2
        const pieData = isQuantitative 
            ? [
                { name: 'Target Met', value: completedCount, color: '#34C759' },
                { name: 'Partial', value: partialCount, color: '#FF9500' },
                { name: 'Missed', value: completionData.filter(d => d.value === 0).length, color: '#FF3B30' }
              ].filter(d => d.value > 0) // Only show categories with values
            : [
                { name: 'Completed', value: completedCount, color: '#34C759' },
                { name: 'Missed', value: missedCount, color: '#FF3B30' }
            ];

        // Calculate average value for quantitative habits
        let averageValue = 0;
        if (isQuantitative) {
            const totalValue = completionData.reduce((sum, d) => sum + d.value, 0);
            averageValue = Math.round((totalValue / 30) * 10) / 10;
        }

        return { completionData, pieData, completedCount, missedCount, averageValue, isQuantitative, targetValue };
    };

    // Custom tooltip component
    const CustomPieTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0];
            return (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    style={{
                        backgroundColor: 'var(--bg-card)',
                        backdropFilter: 'blur(20px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                        border: '1px solid var(--border)',
                        borderRadius: '16px',
                        padding: '16px 20px',
                        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        color: 'var(--text-main)',
                        minWidth: '140px'
                    }}
                >
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px',
                        marginBottom: '8px'
                    }}>
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.1, type: "spring", stiffness: 500 }}
                            style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                backgroundColor: data.payload.color
                            }}
                        />
                        <span style={{ fontWeight: 600 }}>{data.name}</span>
                    </div>
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 }}
                        style={{ 
                            fontSize: '1.4rem', 
                            fontWeight: '800',
                            color: data.payload.color,
                            letterSpacing: '-0.02em'
                        }}
                    >
                        {data.value} days
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        style={{ 
                            fontSize: '0.8rem', 
                            color: 'var(--text-muted)',
                            marginTop: '4px'
                        }}
                    >
                        {Math.round((data.value / 30) * 100)}% of month
                    </motion.div>
                </motion.div>
            );
        }
        return null;
    };

    // Custom tooltip for line chart
    const CustomLineTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const isCompleted = payload[0].value === 1;
            return (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    style={{
                        backgroundColor: 'var(--bg-card)',
                        backdropFilter: 'blur(20px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                        border: '1px solid var(--border)',
                        borderRadius: '16px',
                        padding: '16px 20px',
                        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
                        fontSize: '0.9rem'
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                        style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--text-main)' }}
                    >
                        {label}
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1, type: "spring", stiffness: 400 }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontWeight: '700',
                            color: isCompleted ? '#34C759' : '#FF3B30',
                            fontSize: '1rem'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.15, type: "spring", stiffness: 500 }}
                            style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                backgroundColor: isCompleted ? '#34C759' : '#FF3B30'
                            }}
                        />
                        {isCompleted ? 'Completed ✓' : 'Missed ✗'}
                    </motion.div>
                </motion.div>
            );
        }
        return null;
    };

    if (!isOpen) return null;

    return (
        <>
            <style>{`
                @media (max-width: 768px) {
                    .habit-tracker-modal {
                        max-width: 100% !important;
                        max-height: 100vh !important;
                        border-radius: 0 !important;
                    }
                    .habit-tracker-header {
                        flex-direction: column !important;
                        gap: 16px !important;
                        padding: 20px !important;
                    }
                    .habit-tracker-header-actions {
                        width: 100% !important;
                        justify-content: space-between !important;
                    }
                    .habit-tracker-content {
                        padding: 16px !important;
                    }
                    .habit-card-header {
                        flex-direction: column !important;
                        gap: 16px !important;
                    }
                    .habit-card-actions {
                        width: 100% !important;
                        justify-content: flex-end !important;
                    }
                    .weekly-progress {
                        overflow-x: auto !important;
                        padding-bottom: 8px !important;
                    }
                    .stats-grid {
                        grid-template-columns: 1fr !important;
                    }
                    .overview-grid {
                        grid-template-columns: 1fr !important;
                    }
                }
                @media (max-width: 480px) {
                    .habit-tracker-header-actions {
                        flex-wrap: wrap !important;
                        gap: 8px !important;
                    }
                    .view-toggle {
                        order: 3 !important;
                        width: 100% !important;
                        margin-top: 8px !important;
                    }
                    .view-toggle > button {
                        flex: 1 !important;
                    }
                    .weekly-progress {
                        gap: 8px !important;
                    }
                    .day-button {
                        min-width: 44px !important;
                    }
                }
            `}</style>
            <AnimatePresence>
                <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: '20px'
                }}
            >
                <motion.div
                    variants={modalVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="habit-tracker-modal"
                    style={{
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '28px',
                        width: '100%',
                        maxWidth: '950px',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 50px 100px -20px rgba(0, 0, 0, 0.5), 0 30px 60px -30px rgba(0, 0, 0, 0.4)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        overflow: 'hidden'
                    }}
                >
                    {/* Header */}
                    <motion.div
                        className="habit-tracker-header"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, type: "spring", stiffness: 400 }}
                        style={{
                            padding: '28px 28px 20px',
                            borderBottom: '1px solid var(--border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)'
                        }}
                    >
                        <motion.div 
                            style={{ display: 'flex', alignItems: 'center', gap: '14px' }}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.15, type: "spring" }}
                        >
                            <motion.div
                                whileHover={{ rotate: 15, scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                transition={{ type: "spring", stiffness: 400 }}
                                style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '14px',
                                    background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 8px 24px rgba(0,122,255,0.4)'
                                }}
                            >
                                <Target size={24} color="white" />
                            </motion.div>
                            <div>
                                <motion.h2 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    style={{ fontSize: '1.35rem', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' }}
                                >
                                    Habit Tracker
                                </motion.h2>
                                <motion.p 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.25 }}
                                    style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}
                                >
                                    {habits.length} {habits.length === 1 ? 'habit' : 'habits'} tracked
                                </motion.p>
                            </div>
                        </motion.div>
                        
                        <motion.div 
                            className="habit-tracker-header-actions"
                            style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            {/* View Toggle */}
                            <motion.div
                                className="view-toggle"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.25 }}
                                style={{
                                    display: 'flex',
                                    gap: '4px',
                                    backgroundColor: 'var(--bg-input)',
                                    padding: '4px',
                                    borderRadius: '12px'
                                }}
                            >
                                {['list', 'stats'].map((view, index) => (
                                    <motion.button
                                        key={view}
                                        variants={buttonVariants}
                                        initial="initial"
                                        whileHover="hover"
                                        whileTap="tap"
                                        onClick={() => setSelectedView(view)}
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: '10px',
                                            fontSize: '0.8rem',
                                            fontWeight: selectedView === view ? '700' : '500',
                                            backgroundColor: selectedView === view ? 'var(--bg-card)' : 'transparent',
                                            color: selectedView === view ? 'var(--text-main)' : 'var(--text-muted)',
                                            border: 'none',
                                            cursor: 'pointer',
                                            boxShadow: selectedView === view ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {view === 'list' ? (
                                            <motion.span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Calendar size={14} />
                                                List
                                            </motion.span>
                                        ) : (
                                            <motion.span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <TrendingUp size={14} />
                                                Stats
                                            </motion.span>
                                        )}
                                    </motion.button>
                                ))}
                            </motion.div>
                            
                            {/* New Habit Button */}
                            <motion.button
                                variants={buttonVariants}
                                initial="initial"
                                whileHover="hover"
                                whileTap="tap"
                                onClick={() => setShowAddModal(true)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '10px 18px',
                                    background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontWeight: '700',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 8px 24px rgba(0,122,255,0.35)'
                                }}
                            >
                                <Plus size={18} />
                                New Habit
                            </motion.button>
                            
                            {/* Close Button */}
                            <motion.button
                                variants={buttonVariants}
                                initial="initial"
                                whileHover={{ scale: 1.1, rotate: 90 }}
                                whileTap="tap"
                                onClick={onClose}
                                style={{
                                    padding: '10px',
                                    backgroundColor: 'var(--bg-input)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}
                            >
                                <X size={22} />
                            </motion.button>
                        </motion.div>
                    </motion.div>

                    {/* Content */}
                    <motion.div
                        className="habit-tracker-content"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        style={{
                            padding: '28px',
                            overflowY: 'auto',
                            flex: 1
                        }}
                    >
                        <AnimatePresence mode="wait">
                            {habits.length === 0 ? (
                                <motion.div
                                    key="empty"
                                    variants={itemVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    style={{
                                        textAlign: 'center',
                                        padding: '80px 20px',
                                        color: 'var(--text-muted)'
                                    }}
                                >
                                    <motion.div
                                        initial={{ scale: 0, rotate: -180 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ 
                                            type: "spring",
                                            stiffness: 200,
                                            damping: 20,
                                            delay: 0.2
                                        }}
                                    >
                                        <Target size={64} style={{ marginBottom: '24px', opacity: 0.4 }} />
                                    </motion.div>
                                    <motion.h3 
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                        style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '12px' }}
                                    >
                                        No habits yet
                                    </motion.h3>
                                    <motion.p 
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.35 }}
                                        style={{ fontSize: '0.9rem', marginBottom: '28px' }}
                                    >
                                        Create your first habit to start tracking your progress
                                    </motion.p>
                                    <motion.button
                                        variants={buttonVariants}
                                        initial="initial"
                                        whileHover="hover"
                                        whileTap="tap"
                                        onClick={() => setShowAddModal(true)}
                                        style={{
                                            padding: '14px 28px',
                                            background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '14px',
                                            fontWeight: '700',
                                            fontSize: '0.95rem',
                                            cursor: 'pointer',
                                            boxShadow: '0 8px 24px rgba(0,122,255,0.35)'
                                        }}
                                    >
                                        Create Your First Habit
                                    </motion.button>
                                </motion.div>
                            ) : selectedView === 'list' ? (
                                <motion.div
                                    key="list"
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
                                >
                                    <AnimatePresence mode="popLayout">
                                        {habits.map((habit, index) => {
                                            const streak = calculateStreak(habit.id);
                                            const completionRate = calculateCompletionRate(habit.id);
                                            
                                            return (
                                                <motion.div
                                                    key={habit.id}
                                                    layout
                                                    variants={cardVariants}
                                                    initial="hidden"
                                                    animate="visible"
                                                    exit={{ 
                                                        opacity: 0, 
                                                        scale: 0.9, 
                                                        y: -20,
                                                        transition: { duration: 0.2 }
                                                    }}
                                                    whileHover="hover"
                                                    style={{
                                                        backgroundColor: 'var(--bg-input)',
                                                        borderRadius: '20px',
                                                        padding: '24px',
                                                        border: '1px solid var(--border)',
                                                        position: 'relative',
                                                        overflow: 'hidden'
                                                    }}
                                                >
                                                    {/* Animated Background Gradient */}
                                                    <motion.div
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 0.03 }}
                                                        style={{
                                                            position: 'absolute',
                                                            inset: 0,
                                                            background: `radial-gradient(circle at 30% 50%, ${habit.color}, transparent 70%)`,
                                                            pointerEvents: 'none'
                                                        }}
                                                    />
                                                    
                                                    {/* Habit Header */}
                                                    <div className="habit-card-header" style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'flex-start',
                                                        marginBottom: '20px',
                                                        position: 'relative'
                                                    }}>
                                                        <motion.div 
                                                            style={{ display: 'flex', alignItems: 'center', gap: '16px' }}
                                                            initial={{ opacity: 0, x: -20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: index * 0.05 }}
                                                        >
                                                            <motion.div
                                                                whileHover={{ scale: 1.1, rotate: 5 }}
                                                                whileTap={{ scale: 0.95 }}
                                                                style={{
                                                                    width: '52px',
                                                                    height: '52px',
                                                                    borderRadius: '16px',
                                                                    background: `linear-gradient(135deg, ${habit.color}20 0%, ${habit.color}40 100%)`,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    border: `2.5px solid ${habit.color}`,
                                                                    boxShadow: `0 8px 24px ${habit.color}30`
                                                                }}
                                                            >
                                                                <CheckCircle2 size={26} color={habit.color} />
                                                            </motion.div>
                                                            <div>
                                                                <motion.h3
                                                                    initial={{ opacity: 0 }}
                                                                    animate={{ opacity: 1 }}
                                                                    transition={{ delay: index * 0.05 + 0.1 }}
                                                                    style={{
                                                                        fontSize: '1.1rem',
                                                                        fontWeight: '800',
                                                                        margin: 0,
                                                                        color: 'var(--text-main)',
                                                                        letterSpacing: '-0.01em'
                                                                    }}
                                                                >
                                                                    {habit.name}
                                                                </motion.h3>
                                                                {habit.description && (
                                                                    <motion.p
                                                                        initial={{ opacity: 0 }}
                                                                        animate={{ opacity: 1 }}
                                                                        transition={{ delay: index * 0.05 + 0.15 }}
                                                                        style={{
                                                                            fontSize: '0.8rem',
                                                                            color: 'var(--text-muted)',
                                                                            margin: '4px 0 0 0'
                                                                        }}
                                                                    >
                                                                        {habit.description}
                                                                    </motion.p>
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                        
                                                        <motion.div
                                                            className="habit-card-actions"
                                                            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                                                            initial={{ opacity: 0, x: 20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: index * 0.05 + 0.1 }}
                                                        >
                                                            <motion.div
                                                                initial={{ scale: 0 }}
                                                                animate={{ scale: 1 }}
                                                                transition={{
                                                                    delay: index * 0.05 + 0.2,
                                                                    type: "spring",
                                                                    stiffness: 400
                                                                }}
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '6px',
                                                                    padding: '6px 14px',
                                                                    backgroundColor: `${habit.color}15`,
                                                                    borderRadius: '24px',
                                                                    border: `1.5px solid ${habit.color}30`
                                                                }}
                                                            >
                                                                <motion.div
                                                                    animate={{ 
                                                                        rotate: streak > 0 ? [0, -10, 10, 0] : 0,
                                                                        scale: streak > 0 ? [1, 1.2, 1] : 1
                                                                    }}
                                                                    transition={{ 
                                                                        duration: 0.5,
                                                                        repeat: streak > 0 ? Infinity : 0,
                                                                        repeatDelay: 3
                                                                    }}
                                                                >
                                                                    <TrendingUp size={14} color={habit.color} />
                                                                </motion.div>
                                                                <span style={{ fontSize: '0.8rem', fontWeight: '800', color: habit.color }}>
                                                                    {streak} day streak
                                                                </span>
                                                            </motion.div>
                                                            
                                                            <motion.button
                                                                variants={buttonVariants}
                                                                initial="initial"
                                                                whileHover="hover"
                                                                whileTap="tap"
                                                                onClick={() => openEditModal(habit)}
                                                                style={{
                                                                    padding: '8px',
                                                                    backgroundColor: 'var(--bg-card)',
                                                                    border: '1px solid var(--border)',
                                                                    color: 'var(--text-muted)',
                                                                    cursor: 'pointer',
                                                                    borderRadius: '10px'
                                                                }}
                                                            >
                                                                <Edit2 size={18} />
                                                            </motion.button>
                                                            
                                                            <motion.button
                                                                variants={buttonVariants}
                                                                initial="initial"
                                                                whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,59,48,0.1)' }}
                                                                whileTap="tap"
                                                                onClick={() => handleDeleteHabit(habit.id)}
                                                                style={{
                                                                    padding: '8px',
                                                                    backgroundColor: 'var(--bg-card)',
                                                                    border: '1px solid var(--border)',
                                                                    color: '#FF3B30',
                                                                    cursor: 'pointer',
                                                                    borderRadius: '10px'
                                                                }}
                                                            >
                                                                <Trash2 size={18} />
                                                            </motion.button>
                                                        </motion.div>
                                                    </div>

                                                    {/* Weekly Progress - Binary Habits */}
                                                    {(!habit.type || habit.type === 'binary') && (
                                                        <motion.div
                                                            className="weekly-progress"
                                                            initial={{ opacity: 0, y: 20 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: index * 0.05 + 0.2 }}
                                                            style={{
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                backgroundColor: 'var(--bg-card)',
                                                                borderRadius: '16px',
                                                                padding: '16px 20px',
                                                                gap: '12px'
                                                            }}
                                                        >
                                                            {last7Days.map((day, dayIndex) => {
                                                                const dateStr = format(day, 'yyyy-MM-dd');
                                                                const isCompleted = isHabitCompleted(habit.id, dateStr);
                                                                const isToday = isSameDay(day, new Date());
                                                                const dayLabel = format(day, 'EEE')[0];

                                                                return (
                                                                    <motion.button
                                                                        key={dayIndex}
                                                                        className="day-button"
                                                                        variants={buttonVariants}
                                                                        initial="initial"
                                                                        whileHover="hover"
                                                                        whileTap="tap"
                                                                        onClick={() => handleToggleCompletion(habit.id, dateStr)}
                                                                        style={{
                                                                            display: 'flex',
                                                                            flexDirection: 'column',
                                                                            alignItems: 'center',
                                                                            gap: '8px',
                                                                            backgroundColor: 'transparent',
                                                                            border: 'none',
                                                                            cursor: 'pointer',
                                                                            padding: '6px'
                                                                        }}
                                                                    >
                                                                        <motion.span
                                                                            animate={{ 
                                                                                color: isToday ? 'var(--text-main)' : 'var(--text-muted)',
                                                                                fontWeight: isToday ? '700' : '500'
                                                                            }}
                                                                            style={{ fontSize: '0.7rem' }}
                                                                        >
                                                                            {dayLabel}
                                                                        </motion.span>
                                                                        <motion.div
                                                                            variants={checkVariants}
                                                                            initial="unchecked"
                                                                            animate={isCompleted ? "checked" : "unchecked"}
                                                                            style={{
                                                                                width: '36px',
                                                                                height: '36px',
                                                                                borderRadius: '12px',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                border: `2.5px solid`,
                                                                                borderColor: isCompleted ? habit.color : 'var(--border)',
                                                                                backgroundColor: isCompleted ? habit.color : 'var(--bg-input)',
                                                                                color: habit.color
                                                                            }}
                                                                        >
                                                                            <AnimatePresence>
                                                                                {isCompleted && (
                                                                                    <motion.div
                                                                                        initial={{ scale: 0, opacity: 0 }}
                                                                                        animate={{ scale: 1, opacity: 1 }}
                                                                                        exit={{ scale: 0, opacity: 0 }}
                                                                                        transition={{ type: "spring", stiffness: 500 }}
                                                                                    >
                                                                                        <AnimatedCheckmark isChecked={true} color={habit.color} />
                                                                                    </motion.div>
                                                                                )}
                                                                            </AnimatePresence>
                                                                        </motion.div>
                                                                    </motion.button>
                                                                );
                                                            })}
                                                        </motion.div>
                                                    )}

                                                    {/* Weekly Progress - Quantitative Habits */}
                                                    {habit.type === 'quantitative' && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 20 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: index * 0.05 + 0.2 }}
                                                            style={{
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: '12px',
                                                                backgroundColor: 'var(--bg-card)',
                                                                borderRadius: '16px',
                                                                padding: '16px 20px'
                                                            }}
                                                        >
                                                            <div style={{
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                fontSize: '0.75rem',
                                                                color: 'var(--text-muted)',
                                                                marginBottom: '4px'
                                                            }}>
                                                                <span>Target: {habit.target || 1} {habit.unit || 'times'}</span>
                                                                <span>Last 7 days</span>
                                                            </div>
                                                            <div style={{
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                gap: '8px'
                                                            }}>
                                                                {last7Days.map((day, dayIndex) => {
                                                                    const dateStr = format(day, 'yyyy-MM-dd');
                                                                    const currentValue = getHabitValue(habit.id, dateStr);
                                                                    const targetValue = habit.target || 1;
                                                                    const percentage = Math.min((currentValue / targetValue) * 100, 100);
                                                                    const isToday = isSameDay(day, new Date());
                                                                    const dayLabel = format(day, 'EEE')[0];

                                                                    return (
                                                                        <div
                                                                            key={dayIndex}
                                                                            style={{
                                                                                display: 'flex',
                                                                                flexDirection: 'column',
                                                                                alignItems: 'center',
                                                                                gap: '8px',
                                                                                flex: 1
                                                                            }}
                                                                        >
                                                                            <span style={{
                                                                                fontSize: '0.7rem',
                                                                                color: isToday ? 'var(--text-main)' : 'var(--text-muted)',
                                                                                fontWeight: isToday ? '700' : '500'
                                                                            }}>
                                                                                {dayLabel}
                                                                            </span>
                                                                            <motion.div 
                                                                                whileHover={{ scale: 1.05 }}
                                                                                whileTap={{ scale: 0.95 }}
                                                                                style={{
                                                                                    position: 'relative',
                                                                                    width: '44px',
                                                                                    height: '44px',
                                                                                    borderRadius: '12px',
                                                                                    backgroundColor: 'var(--bg-input)',
                                                                                    overflow: 'hidden',
                                                                                    border: `2px solid ${currentValue >= targetValue ? habit.color : 'var(--border)'}`,
                                                                                    cursor: 'pointer'
                                                                                }}
                                                                            >
                                                                                {/* Progress fill */}
                                                                                <motion.div
                                                                                    initial={{ height: 0 }}
                                                                                    animate={{ height: `${percentage}%` }}
                                                                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                                                    style={{
                                                                                        position: 'absolute',
                                                                                        bottom: 0,
                                                                                        left: 0,
                                                                                        right: 0,
                                                                                        backgroundColor: habit.color,
                                                                                        opacity: 0.3
                                                                                    }}
                                                                                />
                                                                                {/* Input field for all days */}
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    value={currentValue || ''}
                                                                                    onChange={(e) => handleUpdateQuantitativeValue(habit.id, dateStr, e.target.value)}
                                                                                    placeholder="0"
                                                                                    style={{
                                                                                        position: 'absolute',
                                                                                        inset: 0,
                                                                                        width: '100%',
                                                                                        height: '100%',
                                                                                        border: 'none',
                                                                                        background: 'transparent',
                                                                                        textAlign: 'center',
                                                                                        fontSize: '0.85rem',
                                                                                        fontWeight: '700',
                                                                                        color: currentValue >= targetValue ? habit.color : 'var(--text-main)',
                                                                                        outline: 'none',
                                                                                        padding: 0,
                                                                                        cursor: 'pointer'
                                                                                    }}
                                                                                />
                                                                            </motion.div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </motion.div>
                                                    )}

                                                    {/* Stats Summary */}
                                                    <motion.div
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ delay: index * 0.05 + 0.3 }}
                                                        style={{
                                                            display: 'flex',
                                                            gap: '20px',
                                                            marginTop: '16px',
                                                            paddingTop: '16px',
                                                            borderTop: '1px solid var(--border)',
                                                            alignItems: 'center'
                                                        }}
                                                    >
                                                        <motion.div 
                                                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                                            whileHover={{ x: 4 }}
                                                        >
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                                                                30-day rate:
                                                            </span>
                                                            <span style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--text-main)' }}>
                                                                <AnimatedCounter value={completionRate} />%
                                                            </span>
                                                        </motion.div>
                                                        <motion.div 
                                                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                                            whileHover={{ x: 4 }}
                                                        >
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                                                                Frequency:
                                                            </span>
                                                            <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-main)', textTransform: 'capitalize' }}>
                                                                {habit.frequency || 'daily'}
                                                            </span>
                                                        </motion.div>
                                                        <motion.button
                                                            variants={buttonVariants}
                                                            initial="initial"
                                                            whileHover="hover"
                                                            whileTap="tap"
                                                            onClick={() => {
                                                                setSelectedHabitForStats(habit);
                                                                setSelectedView('stats');
                                                            }}
                                                            style={{
                                                                marginLeft: 'auto',
                                                                fontSize: '0.8rem',
                                                                color: habit.color,
                                                                backgroundColor: `${habit.color}15`,
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                fontWeight: '700',
                                                                padding: '8px 16px',
                                                                borderRadius: '10px'
                                                            }}
                                                        >
                                                            View Stats →
                                                        </motion.button>
                                                    </motion.div>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </motion.div>
                            ) : (
                                <StatsView 
                                    habits={habits}
                                    selectedHabit={selectedHabitForStats}
                                    setSelectedHabit={setSelectedHabitForStats}
                                    setSelectedView={setSelectedView}
                                    calculateStreak={calculateStreak}
                                    calculateCompletionRate={calculateCompletionRate}
                                    getStatsData={getStatsData}
                                    completions={completions}
                                    isHabitCompleted={isHabitCompleted}
                                    CustomPieTooltip={CustomPieTooltip}
                                    CustomLineTooltip={CustomLineTooltip}
                                />
                            )}
                        </AnimatePresence>
                    </motion.div>
                </motion.div>

                {/* Add/Edit Habit Modal */}
                <AnimatePresence>
                    {showAddModal && (
                        <HabitModal
                            editingHabit={editingHabit}
                            habitName={habitName}
                            setHabitName={setHabitName}
                            habitDescription={habitDescription}
                            setHabitDescription={setHabitDescription}
                            habitColor={habitColor}
                            setHabitColor={setHabitColor}
                            habitFrequency={habitFrequency}
                            setHabitFrequency={setHabitFrequency}
                            habitType={habitType}
                            setHabitType={setHabitType}
                            habitTarget={habitTarget}
                            setHabitTarget={setHabitTarget}
                            habitUnit={habitUnit}
                            setHabitUnit={setHabitUnit}
                            onSave={handleSaveHabit}
                            onClose={() => {
                                setShowAddModal(false);
                                setEditingHabit(null);
                                resetForm();
                            }}
                        />
                    )}
                </AnimatePresence>
            </motion.div>
        </AnimatePresence>
        </>
    );
}

// Stats View Component
function StatsView({ 
    habits, 
    selectedHabit, 
    setSelectedHabit, 
    setSelectedView,
    calculateStreak,
    calculateCompletionRate,
    getStatsData,
    completions,
    CustomPieTooltip,
    CustomLineTooltip
}) {
    if (selectedHabit) {
        const { completionData, pieData, completedCount, missedCount, averageValue, isQuantitative, targetValue } = getStatsData(selectedHabit.id);
        
        return (
            <motion.div
                key="stats-detail"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
            >
                <motion.button
                    variants={slideInVariants}
                    onClick={() => setSelectedHabit(null)}
                    whileHover={{ x: -5 }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '0.9rem',
                        color: 'var(--text-muted)',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '600',
                        width: 'fit-content'
                    }}
                >
                    <ChevronLeft size={18} />
                    Back to all habits
                </motion.button>
                
                {/* Habit Info */}
                <motion.div
                    variants={itemVariants}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '20px',
                        padding: '24px',
                        backgroundColor: 'var(--bg-input)',
                        borderRadius: '24px',
                        border: '1px solid var(--border)'
                    }}
                >
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '20px',
                            background: `linear-gradient(135deg, ${selectedHabit.color}20 0%, ${selectedHabit.color}40 100%)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: `3px solid ${selectedHabit.color}`,
                            boxShadow: `0 12px 32px ${selectedHabit.color}35`
                        }}
                    >
                        <Target size={32} color={selectedHabit.color} />
                    </motion.div>
                    <div>
                        <motion.h3
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            style={{ margin: 0, fontSize: '1.3rem', fontWeight: '800', letterSpacing: '-0.01em' }}
                        >
                            {selectedHabit.name}
                        </motion.h3>
                        <motion.p
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.15 }}
                            style={{ margin: '6px 0 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}
                        >
                            {isQuantitative ? (
                                <>
                                    <AnimatedCounter value={calculateStreak(selectedHabit.id)} color={selectedHabit.color} /> day streak • Target: {targetValue} {selectedHabit.unit || 'units'} • <AnimatedCounter value={averageValue} color="#FF9500" /> avg
                                </>
                            ) : (
                                <>
                                    <AnimatedCounter value={calculateStreak(selectedHabit.id)} color={selectedHabit.color} /> day streak • <AnimatedCounter value={calculateCompletionRate(selectedHabit.id)} color="#34C759" />% completion rate
                                </>
                            )}
                        </motion.p>
                    </div>
                </motion.div>

                {/* Charts Grid */}
                <div className="stats-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '24px'
                }}>
                    {/* Pie Chart */}
                    <motion.div
                        variants={itemVariants}
                        style={{
                            backgroundColor: 'var(--bg-input)',
                            borderRadius: '24px',
                            padding: '28px',
                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
                            border: '1px solid var(--border)'
                        }}
                    >
                        <h4 style={{
                            fontSize: '1rem',
                            fontWeight: '700',
                            marginBottom: '24px',
                            textAlign: 'center',
                            color: 'var(--text-main)',
                            letterSpacing: '-0.01em'
                        }}>
                            Last 30 Days
                        </h4>
                        <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                            style={{ height: '240px' }}
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={4}
                                        dataKey="value"
                                        animationBegin={0}
                                        animationDuration={1500}
                                        animationEasing="ease-out"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell 
                                                key={`cell-${index}`} 
                                                fill={entry.color}
                                                stroke="var(--bg-input)"
                                                strokeWidth={4}
                                                style={{
                                                    filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.2))',
                                                    cursor: 'pointer'
                                                }}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomPieTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            style={{
                                display: 'flex',
                                justifyContent: 'center',
                                gap: isQuantitative ? '12px' : '28px',
                                marginTop: '20px',
                                flexWrap: 'wrap'
                            }}
                        >
                            {isQuantitative ? [
                                { count: completedCount, label: 'Target Met', color: '#34C759' },
                                { count: completionData.filter(d => d.value > 0 && d.value < targetValue).length, label: 'Partial', color: '#FF9500' },
                                { count: completionData.filter(d => d.value === 0).length, label: 'Missed', color: '#FF3B30' }
                            ].map((item, index) => (
                                <motion.div
                                    key={item.label}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.5 + index * 0.1, type: "spring" }}
                                    whileHover={{ scale: 1.05 }}
                                    style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '8px',
                                        padding: '8px 14px',
                                        backgroundColor: `${item.color}12`,
                                        borderRadius: '10px',
                                        border: `2px solid ${item.color}25`
                                    }}
                                >
                                    <motion.div
                                        animate={{ 
                                            boxShadow: [
                                                `0 0 0 0 ${item.color}50`,
                                                `0 0 0 6px ${item.color}00`,
                                                `0 0 0 0 ${item.color}50`
                                            ]
                                        }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        style={{
                                            width: '10px',
                                            height: '10px',
                                            borderRadius: '50%',
                                            backgroundColor: item.color
                                        }}
                                    />
                                    <span style={{ fontSize: '0.85rem', color: item.color, fontWeight: '700' }}>
                                        {item.count} {item.label}
                                    </span>
                                </motion.div>
                            )) : [
                                { count: completedCount, label: 'Completed', color: '#34C759' },
                                { count: missedCount, label: 'Missed', color: '#FF3B30' }
                            ].map((item, index) => (
                                <motion.div
                                    key={item.label}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.5 + index * 0.1, type: "spring" }}
                                    whileHover={{ scale: 1.05 }}
                                    style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '10px',
                                        padding: '10px 18px',
                                        backgroundColor: `${item.color}12`,
                                        borderRadius: '12px',
                                        border: `2px solid ${item.color}25`
                                    }}
                                >
                                    <motion.div
                                        animate={{ 
                                            boxShadow: [
                                                `0 0 0 0 ${item.color}50`,
                                                `0 0 0 8px ${item.color}00`,
                                                `0 0 0 0 ${item.color}50`
                                            ]
                                        }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        style={{
                                            width: '12px',
                                            height: '12px',
                                            borderRadius: '50%',
                                            backgroundColor: item.color
                                        }}
                                    />
                                    <span style={{ fontSize: '0.9rem', color: item.color, fontWeight: '700' }}>
                                        {item.count} {item.label}
                                    </span>
                                </motion.div>
                            ))}
                        </motion.div>
                    </motion.div>

                    {/* Summary Stats */}
                    <motion.div
                        variants={itemVariants}
                        style={{
                            backgroundColor: 'var(--bg-input)',
                            borderRadius: '24px',
                            padding: '28px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '20px',
                            border: '1px solid var(--border)'
                        }}
                    >
                        <h4 style={{
                            fontSize: '1rem',
                            fontWeight: '700',
                            textAlign: 'center',
                            color: 'var(--text-main)',
                            letterSpacing: '-0.01em'
                        }}>
                            Statistics
                        </h4>
                        
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '16px',
                            flex: 1
                        }}>
                            {(isQuantitative ? [
                                { 
                                    value: calculateStreak(selectedHabit.id), 
                                    label: 'Current Streak', 
                                    color: selectedHabit.color,
                                    icon: <Activity size={20} />
                                },
                                { 
                                    value: `${calculateCompletionRate(selectedHabit.id)}%`, 
                                    label: 'Target Met', 
                                    color: '#34C759',
                                    icon: <Award size={20} />
                                },
                                { 
                                    value: averageValue, 
                                    label: `Avg ${selectedHabit.unit || 'Value'}`, 
                                    color: '#FF9500',
                                    icon: <Target size={20} />
                                },
                                { 
                                    value: completionData.reduce((sum, d) => sum + d.value, 0), 
                                    label: `Total ${selectedHabit.unit || 'Units'}`, 
                                    color: '#5856D6',
                                    icon: <TrendingUp size={20} />
                                }
                            ] : [
                                { 
                                    value: calculateStreak(selectedHabit.id), 
                                    label: 'Current Streak', 
                                    color: selectedHabit.color,
                                    icon: <Activity size={20} />
                                },
                                { 
                                    value: `${calculateCompletionRate(selectedHabit.id)}%`, 
                                    label: 'Success Rate', 
                                    color: '#34C759',
                                    icon: <Award size={20} />
                                },
                                { 
                                    value: completedCount, 
                                    label: 'Days Completed', 
                                    color: 'var(--text-main)',
                                    icon: <CheckCircle2 size={20} />
                                },
                                { 
                                    value: completions.filter(c => c.habitId === selectedHabit.id).length, 
                                    label: 'Total Completions', 
                                    color: 'var(--text-muted)',
                                    icon: <Target size={20} />
                                }
                            ]).map((stat, index) => (
                                <motion.div
                                    key={stat.label}
                                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ delay: 0.3 + index * 0.1, type: "spring" }}
                                    whileHover={{ 
                                        scale: 1.03,
                                        boxShadow: `0 12px 32px ${stat.color}20`
                                    }}
                                    style={{
                                        backgroundColor: 'var(--bg-card)',
                                        borderRadius: '20px',
                                        padding: '24px',
                                        textAlign: 'center',
                                        boxShadow: '0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
                                        border: '1px solid var(--border)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.4 + index * 0.1, type: "spring", stiffness: 400 }}
                                        style={{ color: stat.color }}
                                    >
                                        {stat.icon}
                                    </motion.div>
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.5 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.5 + index * 0.1, type: "spring" }}
                                        style={{
                                            fontSize: '2.2rem',
                                            fontWeight: '800',
                                            color: stat.color,
                                            letterSpacing: '-0.03em'
                                        }}
                                    >
                                        {stat.value}
                                    </motion.div>
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.6 + index * 0.1 }}
                                        style={{
                                            fontSize: '0.75rem',
                                            color: 'var(--text-muted)',
                                            fontWeight: '600',
                                            letterSpacing: '0.03em',
                                            textTransform: 'uppercase'
                                        }}
                                    >
                                        {stat.label}
                                    </motion.div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* Line Chart */}
                <motion.div
                    variants={itemVariants}
                    style={{
                        backgroundColor: 'var(--bg-input)',
                        borderRadius: '24px',
                        padding: '28px',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
                        border: '1px solid var(--border)'
                    }}
                >
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '24px'
                    }}>
                        <h4 style={{
                            fontSize: '1rem',
                            fontWeight: '700',
                            color: 'var(--text-main)',
                            letterSpacing: '-0.01em',
                            margin: 0
                        }}>
                            30-Day Trend
                        </h4>
                        {isQuantitative && (
                            <div style={{
                                fontSize: '0.85rem',
                                color: 'var(--text-muted)',
                                fontWeight: '600'
                            }}>
                                Target: {targetValue} {selectedHabit.unit || 'units'}
                            </div>
                        )}
                    </div>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3, type: "spring" }}
                        style={{ height: '260px' }}
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={completionData}>
                                <defs>
                                    <linearGradient id={`gradient-${selectedHabit.id}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={selectedHabit.color} stopOpacity={0.5}/>
                                        <stop offset="95%" stopColor={selectedHabit.color} stopOpacity={0.05}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid 
                                    strokeDasharray="4 4" 
                                    stroke="var(--border)" 
                                    vertical={false}
                                />
                                <XAxis 
                                    dataKey="date" 
                                    stroke="var(--text-muted)"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    interval={4}
                                    tick={{ fill: 'var(--text-muted)', fontWeight: 600 }}
                                    dy={12}
                                />
                                <YAxis 
                                    stroke="var(--text-muted)"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    domain={isQuantitative ? [0, 'auto'] : [0, 1]}
                                    ticks={isQuantitative ? undefined : [0, 1]}
                                    tickFormatter={isQuantitative ? undefined : (value) => value === 1 ? 'Done' : 'Miss'}
                                    tick={{ fill: 'var(--text-muted)', fontWeight: 600 }}
                                />
                                <Tooltip 
                                    content={isQuantitative ? ({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div style={{
                                                    backgroundColor: 'var(--bg-card)',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: '12px',
                                                    padding: '12px 16px',
                                                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
                                                }}>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                                                        {label}
                                                    </div>
                                                    <div style={{ fontSize: '1rem', fontWeight: 800, color: selectedHabit.color }}>
                                                        {data.value} / {targetValue} {selectedHabit.unit || 'units'}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                        {data.value >= targetValue ? '✓ Target met' : data.value > 0 ? 'Partial progress' : 'Missed'}
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    } : <CustomLineTooltip />} 
                                />
                                {isQuantitative && (
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke={selectedHabit.color}
                                        strokeWidth={3}
                                        fill={`url(#gradient-${selectedHabit.id})`}
                                        animationDuration={2000}
                                        animationEasing="ease-out"
                                        dot={{ r: 4, fill: selectedHabit.color, stroke: 'var(--bg-card)', strokeWidth: 2 }}
                                        activeDot={{ 
                                            r: 8, 
                                            fill: selectedHabit.color,
                                            stroke: 'var(--bg-card)',
                                            strokeWidth: 4
                                        }}
                                    />
                                )}
                                {!isQuantitative && (
                                    <Area
                                        type="monotone"
                                        dataKey="completed"
                                        stroke={selectedHabit.color}
                                        strokeWidth={4}
                                        fill={`url(#gradient-${selectedHabit.id})`}
                                        animationDuration={2000}
                                        animationEasing="ease-out"
                                        dot={false}
                                        activeDot={{ 
                                            r: 8, 
                                            fill: selectedHabit.color,
                                            stroke: 'var(--bg-card)',
                                            strokeWidth: 4
                                        }}
                                    />
                                )}
                            </AreaChart>
                        </ResponsiveContainer>
                    </motion.div>
                </motion.div>
            </motion.div>
        );
    }

    // Overview of all habits
    return (
        <motion.div
            key="stats-overview"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
        >
            <motion.h3
                variants={itemVariants}
                style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, letterSpacing: '-0.01em' }}
            >
                All Habits Overview
            </motion.h3>
            <motion.div
                className="overview-grid"
                variants={containerVariants}
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: '20px'
                }}
            >
                {habits.map((habit, index) => {
                    const rate = calculateCompletionRate(habit.id);
                    const streak = calculateStreak(habit.id);
                    
                    return (
                        <motion.button
                            key={habit.id}
                            variants={itemVariants}
                            whileHover={{ 
                                scale: 1.03,
                                y: -4,
                                boxShadow: `0 20px 40px ${habit.color}25`
                            }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedHabit(habit)}
                            style={{
                                backgroundColor: 'var(--bg-input)',
                                borderRadius: '20px',
                                padding: '24px',
                                border: `2px solid ${habit.color}30`,
                                cursor: 'pointer',
                                textAlign: 'left',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.05 }}
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: `radial-gradient(circle at 70% 30%, ${habit.color}, transparent 60%)`,
                                    pointerEvents: 'none'
                                }}
                            />
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '14px',
                                marginBottom: '16px',
                                position: 'relative'
                            }}>
                                <motion.div
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ delay: index * 0.05, type: "spring" }}
                                    style={{
                                        width: '44px',
                                        height: '44px',
                                        borderRadius: '14px',
                                        backgroundColor: `${habit.color}20`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: `2px solid ${habit.color}`
                                    }}
                                >
                                    <CheckCircle2 size={22} color={habit.color} />
                                </motion.div>
                                <motion.span
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 + 0.1 }}
                                    style={{
                                        fontSize: '0.95rem',
                                        fontWeight: '700',
                                        color: 'var(--text-main)',
                                        letterSpacing: '-0.01em'
                                    }}
                                >
                                    {habit.name}
                                </motion.span>
                            </div>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                position: 'relative'
                            }}>
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: index * 0.05 + 0.15 }}
                                    style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}
                                >
                                    {rate}% success
                                </motion.span>
                                <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: streak > 0 ? [1, 1.1, 1] : 1 }}
                                    transition={{ delay: index * 0.05 + 0.2, type: "spring" }}
                                    style={{ 
                                        fontSize: '0.9rem', 
                                        color: '#FF3B30', 
                                        fontWeight: '800',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    {streak}
                                    <motion.span
                                        animate={{ 
                                            rotate: streak > 0 ? [0, 10, -10, 0] : 0,
                                        }}
                                        transition={{ duration: 0.5, repeat: streak > 0 ? Infinity : 0, repeatDelay: 2 }}
                                    >
                                        🔥
                                    </motion.span>
                                </motion.span>
                            </div>
                        </motion.button>
                    );
                })}
            </motion.div>
        </motion.div>
    );
}

// Habit Modal Component
function HabitModal({
    editingHabit,
    habitName,
    setHabitName,
    habitDescription,
    setHabitDescription,
    habitColor,
    setHabitColor,
    habitFrequency,
    setHabitFrequency,
    habitType,
    setHabitType,
    habitTarget,
    setHabitTarget,
    habitUnit,
    setHabitUnit,
    onSave,
    onClose
}) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
                padding: '20px'
            }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 50, filter: "blur(20px)" }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.9, y: 30, filter: "blur(10px)" }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                style={{
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: '28px',
                    width: '100%',
                    maxWidth: '480px',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 50px 100px -20px rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    overflow: 'hidden'
                }}
            >
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '28px 28px 20px 28px',
                    borderBottom: '1px solid var(--border)',
                    flexShrink: 0
                }}>
                    <motion.h3
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        style={{ margin: 0, fontSize: '1.3rem', fontWeight: '800', letterSpacing: '-0.02em' }}
                    >
                        {editingHabit ? 'Edit Habit' : 'Create New Habit'}
                    </motion.h3>
                    <motion.button
                        initial={{ opacity: 0, rotate: -90 }}
                        animate={{ opacity: 1, rotate: 0 }}
                        transition={{ delay: 0.15, type: "spring" }}
                        whileHover={{ rotate: 90, scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onClose}
                        style={{
                            backgroundColor: 'var(--bg-input)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            borderRadius: '12px',
                            padding: '10px'
                        }}
                    >
                        <X size={24} />
                    </motion.button>
                </div>

                <form onSubmit={onSave} style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    flex: 1,
                    overflow: 'hidden'
                }}>
                    <div style={{
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '18px',
                        padding: '20px 28px',
                        overflowY: 'auto',
                        flex: 1
                    }}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                    >
                        <label style={{
                            display: 'block',
                            fontSize: '0.85rem',
                            fontWeight: '700',
                            marginBottom: '10px',
                            color: 'var(--text-muted)',
                            letterSpacing: '0.02em'
                        }}>
                            Habit Name *
                        </label>
                        <motion.input
                            whileFocus={{ scale: 1.01 }}
                            type="text"
                            value={habitName}
                            onChange={(e) => setHabitName(e.target.value)}
                            placeholder="e.g., Drink 8 glasses of water"
                            required
                            style={{
                                width: '100%',
                                padding: '16px 20px',
                                backgroundColor: 'var(--bg-input)',
                                border: '2px solid var(--border)',
                                borderRadius: '16px',
                                color: 'var(--text-main)',
                                fontSize: '1rem',
                                fontWeight: '500',
                                outline: 'none',
                                boxSizing: 'border-box',
                                transition: 'all 0.2s'
                            }}
                        />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.18 }}
                    >
                        <label style={{
                            display: 'block',
                            fontSize: '0.85rem',
                            fontWeight: '700',
                            marginBottom: '10px',
                            color: 'var(--text-muted)',
                            letterSpacing: '0.02em'
                        }}>
                            Habit Type
                        </label>
                        <div style={{ 
                            display: 'flex', 
                            gap: '8px',
                            padding: '4px',
                            backgroundColor: 'var(--bg-input)',
                            borderRadius: '12px',
                            border: '2px solid var(--border)'
                        }}>
                            <motion.button
                                type="button"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setHabitType('binary')}
                                style={{
                                    flex: 1,
                                    padding: '10px 12px',
                                    backgroundColor: habitType === 'binary' ? habitColor : 'transparent',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: habitType === 'binary' ? 'white' : 'var(--text-muted)',
                                    fontWeight: '600',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}
                            >
                                <CheckCircle2 size={16} />
                                <span>Binary</span>
                            </motion.button>
                            <motion.button
                                type="button"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setHabitType('quantitative')}
                                style={{
                                    flex: 1,
                                    padding: '10px 12px',
                                    backgroundColor: habitType === 'quantitative' ? habitColor : 'transparent',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: habitType === 'quantitative' ? 'white' : 'var(--text-muted)',
                                    fontWeight: '600',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}
                            >
                                <Target size={16} />
                                <span>Numeric</span>
                            </motion.button>
                        </div>
                        <div style={{ 
                            fontSize: '0.75rem', 
                            color: 'var(--text-muted)', 
                            marginTop: '6px',
                            paddingLeft: '4px'
                        }}>
                            {habitType === 'binary' ? 'Simple done/not done tracking' : 'Track a numeric value like glasses, minutes, pages'}
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <label style={{
                            display: 'block',
                            fontSize: '0.85rem',
                            fontWeight: '700',
                            marginBottom: '10px',
                            color: 'var(--text-muted)',
                            letterSpacing: '0.02em'
                        }}>
                            Description (optional)
                        </label>
                        <motion.input
                            whileFocus={{ scale: 1.01 }}
                            type="text"
                            value={habitDescription}
                            onChange={(e) => setHabitDescription(e.target.value)}
                            placeholder="e.g., Stay hydrated throughout the day"
                            style={{
                                width: '100%',
                                padding: '16px 20px',
                                backgroundColor: 'var(--bg-input)',
                                border: '2px solid var(--border)',
                                borderRadius: '16px',
                                color: 'var(--text-main)',
                                fontSize: '1rem',
                                fontWeight: '500',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                    >
                        <label style={{
                            display: 'block',
                            fontSize: '0.85rem',
                            fontWeight: '700',
                            marginBottom: '14px',
                            color: 'var(--text-muted)',
                            letterSpacing: '0.02em'
                        }}>
                            Color
                        </label>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            {HABIT_COLORS.map((color, index) => (
                                <motion.button
                                    key={color}
                                    type="button"
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.3 + index * 0.03, type: "spring" }}
                                    whileHover={{ scale: 1.2, rotate: 10 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setHabitColor(color)}
                                    style={{
                                        width: '44px',
                                        height: '44px',
                                        borderRadius: '14px',
                                        backgroundColor: color,
                                        border: habitColor === color ? '4px solid var(--text-main)' : '4px solid transparent',
                                        cursor: 'pointer',
                                        boxShadow: habitColor === color ? `0 8px 24px ${color}60` : 'none'
                                    }}
                                />
                            ))}
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}
                    >
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '0.85rem',
                                fontWeight: '700',
                                marginBottom: '10px',
                                color: 'var(--text-muted)',
                                letterSpacing: '0.02em'
                            }}>
                                Frequency
                            </label>
                            <motion.select
                                whileFocus={{ scale: 1.02 }}
                                value={habitFrequency}
                                onChange={(e) => setHabitFrequency(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '16px 20px',
                                    backgroundColor: 'var(--bg-input)',
                                    border: '2px solid var(--border)',
                                    borderRadius: '16px',
                                    color: 'var(--text-main)',
                                    fontSize: '1rem',
                                    fontWeight: '500',
                                    outline: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                {FREQUENCY_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </motion.select>
                        </div>

                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '0.85rem',
                                fontWeight: '700',
                                marginBottom: '10px',
                                color: 'var(--text-muted)',
                                letterSpacing: '0.02em'
                            }}>
                                {habitType === 'quantitative' ? 'Target Value' : 'Daily Target'}
                            </label>
                            <motion.input
                                whileFocus={{ scale: 1.02 }}
                                type="number"
                                min="1"
                                max={habitType === 'quantitative' ? '999' : '10'}
                                value={habitTarget}
                                onChange={(e) => setHabitTarget(e.target.value)}
                                placeholder={habitType === 'quantitative' ? 'e.g., 8' : '1'}
                                style={{
                                    width: '100%',
                                    padding: '16px 20px',
                                    backgroundColor: 'var(--bg-input)',
                                    border: '2px solid var(--border)',
                                    borderRadius: '16px',
                                    color: 'var(--text-main)',
                                    fontSize: '1rem',
                                    fontWeight: '500',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>
                    </motion.div>

                    {habitType === 'quantitative' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.38 }}
                        >
                            <label style={{
                                display: 'block',
                                fontSize: '0.85rem',
                                fontWeight: '700',
                                marginBottom: '10px',
                                color: 'var(--text-muted)',
                                letterSpacing: '0.02em'
                            }}>
                                Unit (e.g., glasses, minutes, pages)
                            </label>
                            <motion.input
                                whileFocus={{ scale: 1.02 }}
                                type="text"
                                value={habitUnit}
                                onChange={(e) => setHabitUnit(e.target.value)}
                                placeholder="e.g., glasses, minutes, km"
                                style={{
                                    width: '100%',
                                    padding: '16px 20px',
                                    backgroundColor: 'var(--bg-input)',
                                    border: '2px solid var(--border)',
                                    borderRadius: '16px',
                                    color: 'var(--text-main)',
                                    fontSize: '1rem',
                                    fontWeight: '500',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </motion.div>
                    )}

                    </div>

                    <div style={{
                        display: 'flex', 
                        gap: '12px', 
                        padding: '20px 28px',
                        borderTop: '1px solid var(--border)',
                        backgroundColor: 'var(--bg-card)',
                        flexShrink: 0
                    }}>
                        <motion.button
                            type="button"
                            variants={buttonVariants}
                            initial="initial"
                            whileHover="hover"
                            whileTap="tap"
                            onClick={onClose}
                            style={{
                                flex: 1,
                                padding: '14px 18px',
                                backgroundColor: 'var(--bg-input)',
                                border: '2px solid var(--border)',
                                borderRadius: '14px',
                                color: 'var(--text-main)',
                                fontWeight: '700',
                                fontSize: '0.95rem',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </motion.button>
                        <motion.button
                            type="submit"
                            variants={buttonVariants}
                            initial="initial"
                            whileHover="hover"
                            whileTap="tap"
                            style={{
                                flex: 1,
                                padding: '14px 18px',
                                background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)',
                                border: 'none',
                                borderRadius: '14px',
                                color: 'white',
                                fontWeight: '700',
                                fontSize: '0.95rem',
                                cursor: 'pointer',
                                boxShadow: '0 8px 24px rgba(0,122,255,0.4)'
                            }}
                        >
                            {editingHabit ? 'Save Changes' : 'Create Habit'}
                        </motion.button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

export default HabitTracker;
