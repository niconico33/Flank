import GameClient from '@/components/GameClient';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function PlayPage() {
  return (
    <>
      <Navbar />
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-4">Play Flank</h1>
        <GameClient />
      </div>
      <Footer />
    </>
  );
} 