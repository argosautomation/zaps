export default function Features() {
    const features = [
        {
            icon: '⚡',
            title: 'Automatic Data Protection',
            description: 'Instantly detects and removes emails, phone numbers, API keys, credit cards, and other sensitive info before sending to any AI.',
            gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' // Amber to Orange
        },
        {
            icon: '🔒',
            title: 'Nothing Stored, Nothing Leaked',
            description: 'Your sensitive data is never saved or logged. Everything is masked in transit with automatic 10-minute expiration.',
            gradient: 'linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)' // Blue to Cyan
        },
        {
            icon: '🚀',
            title: 'Sub-100ms Overhead',
            description: 'Lightning-fast proxy with minimal latency. Your users won\'t notice the difference.',
            gradient: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)' // Purple to Pink
        },
        {
            icon: '🔌',
            title: 'Works With Any LLM',
            description: 'OpenAI, Anthropic, Google Gemini, DeepSeek, and any other OpenAI-compatible API. Just change your endpoint.',
            gradient: 'linear-gradient(135deg, #10B981 0%, #14B8A6 100%)' // Green to Teal
        },
        {
            icon: '📊',
            title: 'Compliance Dashboard',
            description: 'See exactly what data was protected, track API usage, and generate compliance reports for audits (GDPR, HIPAA, SOC 2).',
            gradient: 'linear-gradient(135deg, #6366F1 0%, #3B82F6 100%)' // Indigo to Blue
        },
        {
            icon: '🧪',
            title: 'Try Before You Buy',
            description: 'Live sandbox lets you test protection with real examples. See exactly how your data is protected before going live.',
            gradient: 'linear-gradient(135deg, #EF4444 0%, #F43F5E 100%)' // Red to Rose
        }
    ]

    return (
        <section id="features" style={{
            padding: '100px 24px',
            position: 'relative'
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

                {/* Section Header */}
                <div style={{ textAlign: 'center', marginBottom: '80px' }}>
                    <h2 style={{ fontSize: 'clamp(32px, 5vw, 48px)', marginBottom: '24px' }}>
                        How <span className="gradient-text">Zaps.ai</span> Protects Your Data
                    </h2>
                    <p style={{ fontSize: 'clamp(18px, 3vw, 20px)', color: '#94A3B8', maxWidth: '800px', margin: '0 auto' }}>
                        Industry-leading protection for sensitive data in AI applications. Keep using your favorite LLMs without the privacy risks.
                    </p>
                </div>

                {/* Features Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                    gap: '32px'
                }}>
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="glass-card"
                            style={{ padding: '32px' }}
                        >
                            {/* Icon */}
                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '16px',
                                background: feature.gradient,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '32px',
                                marginBottom: '24px'
                            }}>
                                {feature.icon}
                            </div>

                            <h3 style={{ fontSize: '24px', marginBottom: '16px', color: '#fff' }}>
                                {feature.title}
                            </h3>

                            <p style={{ color: '#94A3B8', fontSize: '16px', lineHeight: '1.6' }}>
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
