import { useState } from 'react';
import { Trash2, Check, Circle, ChevronDown, ChevronRight } from 'lucide-react';

function TaskList({ tasks, onToggle, onDelete }) {
    const [showTodo, setShowTodo] = useState(true);
    const [showCompleted, setShowCompleted] = useState(true);

    const todoTasks = tasks.filter(t => !t.completed);
    const completedTasks = tasks.filter(t => t.completed);

    const HeaderStyle = {
        fontSize: '0.75rem',
        fontWeight: '600',
        color: 'var(--text-muted)',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        marginBottom: 'var(--spacing-md)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
        userSelect: 'none',
        width: '100%',
        padding: '4px 8px',
        marginLeft: '-8px',
        borderRadius: 'var(--radius)',
        transition: 'background-color 0.2s, color 0.2s'
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
            {/* To Do Section */}
            <section>
                <div
                    onClick={() => setShowTodo(!showTodo)}
                    style={HeaderStyle}
                    onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                        e.currentTarget.style.color = 'var(--text-main)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--text-muted)';
                    }}
                >
                    <div style={{
                        transform: showTodo ? 'rotate(0deg)' : 'rotate(-90deg)',
                        transition: 'transform 0.2s ease',
                        display: 'flex',
                        alignItems: 'center'
                    }}>
                        <ChevronDown size={14} />
                    </div>
                    <span>To Do — {todoTasks.length}</span>
                </div>

                {showTodo && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                        {todoTasks.map(task => (
                            <TaskItem key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} />
                        ))}
                        {todoTasks.length === 0 && (
                            <div style={{
                                color: 'var(--text-muted)',
                                fontStyle: 'italic',
                                padding: '16px',
                                textAlign: 'center',
                                backgroundColor: 'var(--bg-card)',
                                borderRadius: 'var(--radius)'
                            }}>
                                All caught up! 🎉
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* Completed Section */}
            {completedTasks.length > 0 && (
                <section>
                    <div
                        onClick={() => setShowCompleted(!showCompleted)}
                        style={HeaderStyle}
                        onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                            e.currentTarget.style.color = 'var(--text-main)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = 'var(--text-muted)';
                        }}
                    >
                        <div style={{
                            transform: showCompleted ? 'rotate(0deg)' : 'rotate(-90deg)',
                            transition: 'transform 0.2s ease',
                            display: 'flex',
                            alignItems: 'center'
                        }}>
                            <ChevronDown size={14} />
                        </div>
                        <span>Completed — {completedTasks.length}</span>
                    </div>

                    {showCompleted && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                            {completedTasks.map(task => (
                                <TaskItem key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} />
                            ))}
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}

function TaskItem({ task, onToggle, onDelete }) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                display: 'flex',
                alignItems: 'center',
                padding: '16px 20px',
                backgroundColor: 'var(--bg-card)',
                borderRadius: 'var(--radius)',
                transition: 'transform 0.2s ease, background-color 0.2s ease',
                cursor: 'pointer',
                transform: isHovered ? 'scale(1.01)' : 'scale(1)',
            }}
        >
            <button
                onClick={() => onToggle(task.id)}
                style={{
                    marginRight: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: task.completed ? 'var(--text-main)' : 'var(--text-muted)',
                    transition: 'color 0.2s'
                }}
            >
                {task.completed ? (
                    <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--text-main)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Check size={14} color="var(--bg-app)" strokeWidth={3} />
                    </div>
                ) : (
                    <Circle size={24} strokeWidth={1.5} />
                )}
            </button>

            <span style={{
                flex: 1,
                fontSize: '1rem',
                color: task.completed ? 'var(--text-muted)' : 'var(--text-main)',
                textDecoration: task.completed ? 'line-through' : 'none',
                transition: 'color 0.2s'
            }}>
                {task.text}
            </span>

            {isHovered && (
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                    style={{
                        color: '#ef4444',
                        padding: '4px',
                        opacity: 0.8,
                        transition: 'opacity 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                    onMouseOut={(e) => e.currentTarget.style.opacity = '0.8'}
                >
                    <Trash2 size={18} />
                </button>
            )}
        </div>
    );
}

export default TaskList;

