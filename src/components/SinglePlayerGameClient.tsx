"use client";

import React, { useState } from 'react';
import { Client } from 'boardgame.io/react';
import { Local } from 'boardgame.io/multiplayer';
import { FlankGame } from '../game/gameLogic';
import type { BoardProps } from 'boardgame.io/react';
import GameBoard from './GameBoard';
import { FlankBot } from '../game/ai';

interface GameBoardWrapperProps extends Omit<BoardProps, 'moves'> {
  isGameStarted: boolean;
  setIsGameStarted: (started: boolean) => void;
  moves: any;
}

function GameBoardWrapper(props: GameBoardWrapperProps) {
  return (
    <GameBoard
      G={props.G}
      ctx={props.ctx}
      moves={props.moves}
      playerID={props.playerID}
      isActive={props.isActive}
      isGameStarted={props.isGameStarted}
      setIsGameStarted={props.setIsGameStarted}
    />
  );
}

export default function SinglePlayerGameClient() {
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [key, setKey] = useState(0);

  // Create the single-player client for user (Player 1) vs AI (Player 2)
  const FlankSinglePlayer = Client({
    game: FlankGame,
    board: (props: BoardProps) => (
      <GameBoardWrapper
        {...(props as any)}
        isGameStarted={isGameStarted}
        setIsGameStarted={setIsGameStarted}
      />
    ),
    debug: false,
    numPlayers: 2,
    multiplayer: Local({
      bots: {
        '2': FlankBot,
      },
    }),
  });

  const handleResetGame = () => {
    setIsGameStarted(false);
    setKey(k => k + 1); // Force a remount of the game component
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center py-8 px-4 overflow-y-auto">
      {/* Reset Button */}
      <div className="mb-6 mt-2">
        <button
          onClick={handleResetGame}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Reset Game
        </button>
      </div>

      <h2 className="text-xl font-bold mb-6 text-center">Player 1 (You) vs. Player 2 (AI)</h2>
      <div className="w-full max-w-5xl mx-auto border p-6 rounded-lg shadow-lg bg-white mb-8">
        <FlankSinglePlayer key={key} playerID="1" />
      </div>
    </div>
  );
} 