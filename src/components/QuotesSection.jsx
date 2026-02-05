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
    const [fullQuote, setFullQuote] = useState(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    const [displayText, setDisplayText] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchQuote = async () => {
            try {
                const response = await fetch('https://script.google.com/macros/s/AKfycbzEVEpiI2vpWMiozQnn0UrUV3BziTZQcYxrhGzcPkbFsuIVtGN3IZ7oERvQx9l5jiI6/exec');
                const data = await response.json();

                let newQuote = "";
                if (typeof data === 'string') {
                    newQuote = data;
                } else if (data.quote) {
                    newQuote = data.quote;
                } else if (Array.isArray(data) && data.length > 0) {
                    newQuote = data[0].quote || data[0];
                }

                if (newQuote) setFullQuote(newQuote);
            } catch (error) {
                console.error('Failed to fetch quote:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchQuote();
    }, []);

    useEffect(() => {
        setDisplayText("");
        let i = 0;
        const typingInterval = setInterval(() => {
            if (i < fullQuote.length) {
                setDisplayText(fullQuote.substring(0, i + 1));
                i++;
            } else {
                clearInterval(typingInterval);
            }
        }, 40); // 40ms per character for a smooth but readable speed

        return () => clearInterval(typingInterval);
    }, [fullQuote]);

    return (
        <div style={{ padding: '16px', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', transition: 'all var(--transition-main)', minHeight: '80px' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>Daily Spark</div>
            <div style={{
                fontSize: '0.9rem',
                fontWeight: '500',
                fontStyle: 'italic',
                lineHeight: '1.4',
                color: 'var(--text-main)',
                opacity: loading && !displayText ? 0.5 : 1,
            }}>
                "{displayText}
                <span style={{
                    display: displayText.length < fullQuote.length ? 'inline-block' : 'none',
                    width: '2px',
                    height: '1em',
                    backgroundColor: 'var(--accent)',
                    marginLeft: '2px',
                    verticalAlign: 'middle',
                    animation: 'blink 1s step-end infinite'
                }} />"
            </div>
            <style>
                {`
                @keyframes blink {
                    from, to { opacity: 1; }
                    50% { opacity: 0; }
                }
                `}
            </style>
        </div>
    );
}

export default QuotesSection;
