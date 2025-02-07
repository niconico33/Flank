import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-lg">@nicomelv on X</p>
        </div>
      </div>
      <Footer />
    </>
  )
} 