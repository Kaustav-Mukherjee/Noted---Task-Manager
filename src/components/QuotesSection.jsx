import { useState, useMemo } from 'react';

const QUOTES = [
    "The secret of getting ahead is getting started.",
    "Your talent determines what you can do. Your motivation determines how much you are willing to do.",
    "Focus on being productive instead of busy.",
    "Productivity is being able to do things that you were never able to do before.",
    "The way to get started is to quit talking and begin doing.",
    "Done is better than perfect.",
    "Action is the foundational key to all success.",
    "Don't stop until you're proud.",
    "Small progress is still progress.",
    "Success is what happens after you have survived all of your mistakes."
];

function QuotesSection() {
    const quote = useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], []);

    return (
        <div style={{ padding: '16px', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>Daily Spark</div>
            <div style={{ fontSize: '0.9rem', fontWeight: '500', fontStyle: 'italic', lineHeight: '1.4', color: 'var(--text-main)' }}>
                "{quote}"
            </div>
        </div>
    );
}

export default QuotesSection;
