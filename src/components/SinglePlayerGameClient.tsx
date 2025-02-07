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
      playerID={props.playerID || undefined}
      isActive={props.isActive}
      isGameStarted={props.isGameStarted}
      setIsGameStarted={props.setIsGameStarted}
    />
  );
}

export default function SinglePlayerGameClient() {
  const [isGameStarted, setIsGameStarted] = useState(false);

  // Create the single-player client for user (Player 1) vs AI (Player 2).
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
        '2': FlankBot, // Use our MCTS-based AI class
      },
    }),
  });

  const handleResetGame = () => {
    (FlankSinglePlayer as any).reset();
  };

  return (
    <div className="game-container flex flex-col justify-center items-center p-4">
      {/* Reset Button */}
      <div className="mb-4">
        <button
          onClick={handleResetGame}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Reset Game
        </button>
      </div>

      <h2 className="text-xl font-bold mb-4 text-center">Player 1 (You) vs. Player 2 (AI)</h2>
      <div className="w-full md:w-5/6 lg:w-3/4 xl:w-2/3 border p-4 rounded shadow bg-white">
        <FlankSinglePlayer playerID="1" />
      </div>
    </div>
  );
} 