"use client";

import React, { useState } from 'react';
import { Client } from 'boardgame.io/react';
import { Local } from 'boardgame.io/multiplayer';
import { FlankGame } from '../game/gameLogic';
import GameBoard from './GameBoard';
import { BoardProps } from 'boardgame.io/react';

// Wrapper to make GameBoard compatible with boardgame.io's BoardProps
function GameBoardWrapper(props: BoardProps) {
  const [isGameStarted, setIsGameStarted] = useState(false);
  
  return (
    <GameBoard
      G={props.G}
      ctx={props.ctx}
      moves={props.moves as any}
      playerID={props.playerID || undefined}
      isActive={props.isActive}
      isGameStarted={isGameStarted}
      setIsGameStarted={setIsGameStarted}
    />
  );
}

export default function GameClient() {
  const FlankClient = Client({
    game: FlankGame,
    board: GameBoardWrapper,
    debug: false,
    multiplayer: Local(),
    numPlayers: 2,
  });

  const handleResetGame = () => {
    (FlankClient as any).reset();
  };

  return (
    <div className="flex flex-wrap justify-center items-start gap-8 p-4">
      {/* Reset Button */}
      <div className="basis-full mb-4">
        <button
          onClick={handleResetGame}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Reset Game
        </button>
      </div>

      <div className="w-full md:w-1/2">
        <h2 className="text-xl font-bold mb-4 text-center">Player A (AI)</h2>
        <FlankClient playerID="A" />
      </div>
      <div className="w-full md:w-1/2">
        <h2 className="text-xl font-bold mb-4 text-center bg-red-500 text-white p-2 rounded">Player B (You)</h2>
        <FlankClient playerID="B" />
      </div>
    </div>
  );
} 