import { useState } from 'react';
import { Plus } from 'lucide-react';

function TaskInput({ onAdd }) {
    const [text, setText] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        onAdd(text);
        setText('');
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="card-hover fade-in"
            style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'var(--bg-card)',
                padding: '16px 20px',
                borderRadius: 'var(--radius)',
                gap: '12px',
                border: '1px solid var(--border)',
                transition: 'all var(--transition-main)'
            }}
        >
            <Plus size={20} color="var(--text-muted)" />
            <input
                type="text"
                placeholder="Add a new task..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                style={{
                    flex: 1,
                    fontSize: '1rem',
                    background: 'transparent'
                }}
            />
            <button
                type="submit"
                style={{
                    color: text.trim() ? 'var(--text-main)' : 'var(--text-muted)',
                    fontWeight: '500',
                    transition: 'color 0.2s',
                    padding: '8px 16px',
                    backgroundColor: text.trim() ? 'var(--bg-hover)' : 'transparent',
                    borderRadius: '8px'
                }}
            >
                Add
            </button>
        </form>
    );
}

export default TaskInput;
