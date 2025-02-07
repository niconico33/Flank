"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Client } from 'boardgame.io/react';
import { RandomBot } from 'boardgame.io/ai';
import { FlankGame } from '../game/gameLogic';
import type { GameState } from '../game/gameLogic';
import GameBoard from './GameBoard';
import { BoardProps } from 'boardgame.io/react';

interface GameBoardWrapperProps extends Omit<BoardProps, 'moves'> {
  isGameStarted: boolean;
  setIsGameStarted: (started: boolean) => void;
  moves: {
    pivotBlock: (args: { playerID: string; blockIndex: number; direction: 'left' | 'right' }) => void;
    stepBlock: (args: { playerID: string; blockIndex: number; targetX: number; targetY: number }) => void;
    endTurn: () => void;
  };
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

  // Create the single-player client with an AI for player 1
  const FlankSinglePlayer = Client<GameState>({
    game: FlankGame,
    board: (props: BoardProps) => (
      <GameBoardWrapper {...props as any} isGameStarted={isGameStarted} setIsGameStarted={setIsGameStarted} />
    ),
    debug: false,
    numPlayers: 2,
    // Let the AI control player 1
    ai: {
      bots: {
        '1': RandomBot,
      },
    },
  });

  return (
    <div className="flex flex-col justify-center items-center p-4">
      <h2 className="text-xl font-bold mb-4 text-center">User vs FlankBoss</h2>
      <div className="w-full md:w-5/6 lg:w-3/4 xl:w-2/3 border p-4 rounded shadow bg-white">
        <FlankSinglePlayer playerID="0" />
      </div>
    </div>
  );
} 