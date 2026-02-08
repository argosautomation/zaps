export default function Footer() {
    return (
        <footer className="relative border-t border-white/10 py-12 px-6 pb-24">
            <div className="max-w-6xl mx-auto">
                <div className="text-center space-y-4">
                    <p className="text-gray-400">
                        Questions? Email{' '}
                        <a href="mailto:support@zaps.ai" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                            support@zaps.ai
                        </a>
                    </p>
                    <p className="text-gray-500 text-sm">© 2026 Zaps.ai. All rights reserved.</p>
                </div>
            </div>
        </footer>
    )
}
