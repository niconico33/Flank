'use client';

import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function HowToPlayPage() {
  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">How to Play Flank</h1>

        {/* Overview Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">1. Overview</h2>
          <p className="mb-4">
          Objective: Eliminate opposing blocks with a flanking move. Be the last player with any blocks remaining.
          </p>
        </section>

        {/* Components Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">2. Components</h2>
          
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Board</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Standard 8×8 chessboard</li>
              <li>Any grid or grid game board can be used (tiles, Go, Stratego, etc.)</li>
            </ul>
          </div>

          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Blocks</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>Each Block is a cube</li>
              <li>4 blocks per color, 4 colors available</li>
              <li>Block faces:
                <ul className="list-circle pl-6 mt-2">
                  <li>One face has a dot (the "nose")</li>
                  <li>Three faces have a line (the "body")</li>
                  <li>Top face is color-coded by teams (Blue, Orange, Black, Green)</li>
                </ul>
              </li>
            </ul>
          </div>

          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Players</h3>
            <ul className="list-disc pl-6">
              <li>2–4 players</li>
              <li>1-8 blocks per player (4 blocks recommended)</li>
            </ul>
          </div>
        </section>

        {/* Setup Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">3. Setup</h2>
          
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Board Setup</h3>
            <ul className="list-disc pl-6">
              <li>Place the board</li>
              <li>Place your blocks anywhere in your half or quarter</li>
            </ul>
          </div>

          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Block Orientation</h3>
            <p>When placing blocks initially, choose an orientation for each block (which direction the nose/dot faces).</p>
          </div>
        </section>

        {/* Gameplay Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">4. Gameplay</h2>
          
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Turn Order</h3>
            <p>Best joke or youngest chooses who goes first and chooses clockwise/counterclockwise.</p>
          </div>

          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Actions per Turn</h3>
            <ul className="list-disc pl-6">
              <li>Up to 3 total moves per turn across any blocks</li>
              <li>You may choose not to move</li>
              <li>Distribute moves as desired (e.g., all 3 moves for one block, or 1 move each for three blocks)</li>
            </ul>
          </div>
        </section>

        {/* Movement Rules Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">5. Movement Rules</h2>
          
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Pivot</h3>
            <ul className="list-disc pl-6">
              <li>90-degree turn within the same square</li>
              <li>Rotate block so nose (dot) faces new direction</li>
              <li>One pivot = one move</li>
            </ul>
          </div>

          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Step</h3>
            <ul className="list-disc pl-6">
              <li>Move to an adjacent square (orthogonally, not diagonally)</li>
              <li>Can move forward, backward, or laterally regardless of orientation</li>
              <li>One step = one move</li>
            </ul>
          </div>
        </section>

        {/* Attacking Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">6. Attacking</h2>
          
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Conditions to Attack</h3>
            <ul className="list-disc pl-6">
              <li>Nose (dot) must align to strike opponent's body (line)</li>
              <li>Must move into the opponent's square</li>
              <li>Nose-on-nose or body-on-body contact results in the attacker's loss</li>
            </ul>
          </div>

          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Executing an Attack</h3>
            <ul className="list-disc pl-6">
              <li>Successfully attacking removes opponent's block</li>
              <li>You may continue moving/attacking if you have remaining moves</li>
            </ul>
          </div>
        </section>

        {/* Game End Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">7. Ending the Game</h2>
          
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Standard Victory</h3>
            <p>Last player with remaining blocks wins</p>
          </div>

          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Custom Victory Conditions</h3>
            <ul className="list-disc pl-6">
              <li>Capture the Flag (reach designated squares)</li>
              <li>Eliminate the Captain (chosen block with special significance)</li>
            </ul>
          </div>
        </section>

        {/* Variations Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">8. Optional Variations</h2>
          <ul className="list-disc pl-6">
            <li>Solo: 2-4 players, no teams, 1-4 blocks each</li>
            <li>Team Play: 2v2, 3v1, or 2v1</li>
            <li>Custom Boards: Design maps with obstacles or specific terrain</li>
          </ul>
        </section>

        {/* FAQ Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">9. Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Can a block move diagonally?</h3>
              <p>No. Steps are only orthogonal (forward, backward, left, right).</p>
            </div>
            <div>
              <h3 className="font-semibold">Can I pivot twice?</h3>
              <p>Yes, as long as you have moves remaining.</p>
            </div>
            <div>
              <h3 className="font-semibold">Does an attack require stepping?</h3>
              <p>Yes, you must move into the opponent's square for a valid attack.</p>
            </div>
            <div>
              <h3 className="font-semibold">Are there any limits to how many attacks can be made in one turn?</h3>
              <p>You may attack as long as you have moves left in your turn.</p>
            </div>
          </div>
        </section>

        {/* Final Notes Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Final Notes</h2>
          <p className="mb-4">
            Learn The Way in play. Flanking is an emergent property of competition. You can flank in all scales 
            and types of competition. Flank can be done as one piece or cooperatively. To cover and move, set a 
            base element and flank with another element.
          </p>
          <p>
            Flank strategically on the board, and Flank tactically to eliminate opponent blocks.
          </p>
        </section>
      </div>
      <Footer />
    </>
  );
} 