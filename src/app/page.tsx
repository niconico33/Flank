import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow flex flex-col items-center p-4 bg-gradient-to-b from-gray-50 to-gray-100 overflow-y-auto">
        <div className="max-w-4xl mx-auto w-full">
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold mb-6 text-gray-900">
              Flank
            </h1>
            <p className="text-xl mb-8 text-gray-700 max-w-2xl mx-auto">
            Objective: Eliminate opponents by flanking. Be the last player with any pieces remaining.

            </p>
            
            <Link 
              href="/play"
              className="inline-block px-8 py-4 bg-blue-600 text-white rounded-lg text-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Play Now
            </Link>
          </div>

          {/* Rules Section */}
          <div className="prose prose-lg max-w-none">
            <h2 className="text-3xl font-bold mb-6 text-center">How to Play</h2>

            <section className="mb-8">
              <h3 className="text-2xl font-bold mb-4">Basic Rules</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Turns:</strong> Each turn, you get up to 3 moves, but you may stay still.</li>
                <li><strong>Moves:</strong> Two types of moves:
                  <ul className="list-circle pl-6 mt-2">
                    <li><strong>Pivot:</strong> 90-degree turn in place (1 pivot = 1 move)</li>
                    <li><strong>Step:</strong> Move to adjacent square orthogonally (1 step = 1 move)</li>
                  </ul>
                </li>
                <li><strong>Attacking:</strong>
                  <ul className="list-circle pl-6 mt-2">
                    <li>Your arrow must face opponent's body when you move into opponent's square to attack </li>
                    <li>Unable to attack nose-on-nose or body-on-body. </li>
                  </ul>
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h3 className="text-2xl font-bold mb-4">Winning</h3>
              <p>
                Be the last player with blocks remaining on the board. See 'How to Play' for variations. 
              </p>
            </section>

            <section className="mb-8">
              <h3 className="text-2xl font-bold mb-4">Quick Tips</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Flank</li>
                <li>Cover and Move</li>
              </ul>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
} 