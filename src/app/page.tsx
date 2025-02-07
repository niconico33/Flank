import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-6xl font-bold mb-6">
        Welcome to Flank
      </h1>
      <p className="text-xl mb-8 max-w-2xl">
        A strategic board game where positioning and tactics are key to victory. Challenge your opponent in this exciting battle of wits!
      </p>
      <Link 
        href="/play"
        className="px-8 py-4 bg-blue-600 text-white rounded-lg text-xl font-semibold hover:bg-blue-700 transition-colors"
      >
        Play Now
      </Link>
    </div>
  )
} 