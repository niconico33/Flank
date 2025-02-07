"use client";

import React from 'react';
import { Client } from 'boardgame.io/react';
import { RandomBot } from 'boardgame.io/ai';
import { FlankGame } from '@/game/gameLogic';
import { enumerate } from '@/game/ai';
import GameBoard from './GameBoard';
import { BoardProps } from 'boardgame.io/react';

function GameBoardWrapper(props: BoardProps) {
  return (
    <GameBoard
      G={props.G}
      ctx={props.ctx}
      moves={props.moves as any}
      playerID={props.playerID || undefined}
      isActive={props.isActive}
    />
  );
}

export default function SinglePlayerGameClient() {
  const FlankSinglePlayer = Client({
    game: FlankGame,
    board: GameBoardWrapper,
    debug: true,
    numPlayers: 2,
    ai: {
      enumerate: enumerate,
      bots: {
        '1': RandomBot,
      },
    },
  });

  return (
    <div className="flex justify-center items-center p-4">
      <div className="w-full md:w-2/3 lg:w-1/2 border p-4 rounded shadow bg-white">
        <h2 className="text-xl font-bold mb-4 text-center">Single-Player vs Computer</h2>
        <FlankSinglePlayer playerID="0" />
      </div>
    </div>
  );
} 