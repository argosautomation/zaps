import HeroSplitTest from '@/components/HeroSplitTest'
import Features from '@/components/Features'
import Pricing from '@/components/Pricing'
import Footer from '@/components/Footer'
import Navbar from '@/components/Navbar'

export default function HomePage() {
  return (
    <main>
      <Navbar />
      <HeroSplitTest />
      <Features />
      <Pricing />
      <Footer />
    </main>
  )
}
