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
            className="shadow-hover fade-in"
            style={{
                display: 'flex',
                alignItems: 'center',
                padding: '16px 20px',
                backgroundColor: 'var(--bg-card)',
                borderRadius: 'var(--radius)',
                transition: 'all var(--transition-main)',
                cursor: 'pointer',
                border: '1px solid var(--border)',
                position: 'relative'
            }}
        >
            <button
                onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
                style={{
                    marginRight: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: task.completed ? 'var(--text-main)' : 'var(--text-muted)',
                    transition: 'all var(--transition-main)',
                    transform: task.completed ? 'scale(1.1)' : 'scale(1)',
                    flexShrink: 0
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
                        justifyContent: 'center',
                        animation: 'fadeInSlideUp 0.3s var(--ease-apple-out)'
                    }}>
                        <Check size={14} color="var(--bg-app)" strokeWidth={3} />
                    </div>
                ) : (
                    <Circle size={24} strokeWidth={1.5} style={{ transition: 'all var(--transition-fast)' }} />
                )}
            </button>


            <span
                onClick={() => onToggle(task.id)}
                style={{
                    flex: 1,
                    fontSize: '0.95rem',
                    color: task.completed ? 'var(--text-muted)' : 'var(--text-main)',
                    textDecoration: task.completed ? 'line-through' : 'none',
                    opacity: task.completed ? 0.6 : 1,
                    transition: 'all 0.4s var(--ease-apple)',
                    transform: task.completed ? 'translateX(4px)' : 'translateX(0)',
                    userSelect: 'none'
                }}>
                {task.text}
            </span>


            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity: isHovered ? 1 : 0,
                transform: isHovered ? 'translateX(0)' : 'translateX(8px)',
                transition: 'all 0.3s var(--ease-apple)',
                pointerEvents: isHovered ? 'auto' : 'none',
                flexShrink: 0,
                marginLeft: '12px'
            }}>
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                    style={{
                        color: '#ef4444',
                        padding: '8px',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
}

export default TaskList;

