import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import SinglePlayerGameClient from '@/components/SinglePlayerGameClient';

export default function PlayPage() {
  return (
    <>
      <Navbar />
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-4">Play Flank (User vs. FlankBoss)</h1>
        <SinglePlayerGameClient />
      </div>
      <Footer />
    </>
  );
} 