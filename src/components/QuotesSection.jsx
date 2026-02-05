import { useState, useEffect } from 'react';

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
    const [quote, setQuote] = useState(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchQuote = async () => {
            try {
                const response = await fetch('https://script.google.com/macros/s/AKfycbzEVEpiI2vpWMiozQnn0UrUV3BziTZQcYxrhGzcPkbFsuIVtGN3IZ7oERvQx9l5jiI6/exec');
                const data = await response.json();

                // Handle different possible API structures
                if (typeof data === 'string') {
                    setQuote(data);
                } else if (data.quote) {
                    setQuote(data.quote);
                } else if (Array.isArray(data) && data.length > 0) {
                    setQuote(data[0].quote || data[0]);
                }
            } catch (error) {
                console.error('Failed to fetch quote:', error);
                // Fallback already set in initial state
            } finally {
                setLoading(false);
            }
        };

        fetchQuote();
    }, []);

    return (
        <div style={{ padding: '16px', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', transition: 'all var(--transition-main)' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>Daily Spark</div>
            <div className="fade-in" style={{
                fontSize: '0.9rem',
                fontWeight: '500',
                fontStyle: 'italic',
                lineHeight: '1.4',
                color: 'var(--text-main)',
                opacity: loading ? 0.5 : 1,
                transition: 'opacity 0.5s ease'
            }}>
                "{quote}"
            </div>
        </div>
    );
}

export default QuotesSection;
