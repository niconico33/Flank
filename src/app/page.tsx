import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow flex flex-col items-center p-4 bg-gradient-to-b from-gray-50 to-gray-100">
        <div className="max-w-4xl mx-auto w-full">
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold mb-6 text-gray-900">
              Welcome to Flank
            </h1>
            <p className="text-xl mb-8 text-gray-700 max-w-2xl mx-auto">
              A strategic board game where positioning and tactics are key to victory. 
              Challenge your opponent in this exciting battle of wits!
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
              <h3 className="text-2xl font-bold mb-4">Overview</h3>
              <p>
                Flank is a strategic board game played on a grid of connected squares, such as a standard chessboard. 
                Supporting 2–4 players, each controlling 1–8 blocks (4 blocks recommended per player), the objective 
                is to eliminate opposing blocks with flanking moves and be the last player with blocks remaining.
              </p>
            </section>

            <section className="mb-8">
              <h3 className="text-2xl font-bold mb-4">Components</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Board:</strong> Standard 8×8 chessboard or any grid board</li>
                <li><strong>Blocks:</strong> Each player gets 4 blocks (cubes)
                  <ul className="list-circle pl-6 mt-2">
                    <li>One face has a dot (the "nose")</li>
                    <li>Three faces have a line (the "body")</li>
                    <li>Top face is color-coded by teams</li>
                  </ul>
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h3 className="text-2xl font-bold mb-4">Basic Rules</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Turns:</strong> Each turn, you get up to 3 moves</li>
                <li><strong>Moves:</strong> Two types of moves:
                  <ul className="list-circle pl-6 mt-2">
                    <li><strong>Pivot:</strong> 90-degree turn in place (costs 1 move)</li>
                    <li><strong>Step:</strong> Move to adjacent square orthogonally (costs 1 move)</li>
                  </ul>
                </li>
                <li><strong>Attacking:</strong>
                  <ul className="list-circle pl-6 mt-2">
                    <li>Your nose (dot) must face opponent's body (line)</li>
                    <li>Move into opponent's square to attack</li>
                    <li>Nose-on-nose or body-on-body contact loses the attack</li>
                  </ul>
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h3 className="text-2xl font-bold mb-4">Winning</h3>
              <p>
                Be the last player with blocks remaining on the board. You can also play with custom victory 
                conditions like Capture the Flag or Eliminate the Captain.
              </p>
            </section>

            <section className="mb-8">
              <h3 className="text-2xl font-bold mb-4">Quick Tips</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Position your blocks to protect their bodies</li>
                <li>Use multiple blocks to create defensive formations</li>
                <li>Look for opportunities to flank exposed opponents</li>
                <li>Plan your moves ahead - you get 3 per turn!</li>
              </ul>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
} 