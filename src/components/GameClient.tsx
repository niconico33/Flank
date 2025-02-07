"use client";

import React from 'react';
import { Client } from 'boardgame.io/react';
import { Local } from 'boardgame.io/multiplayer';
import { FlankGame } from '../game/gameLogic';
import GameBoard from './GameBoard';
import { BoardProps } from 'boardgame.io/react';

// Wrapper to make GameBoard compatible with boardgame.io's BoardProps
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

export default function GameClient() {
  const FlankClient = Client({
    game: FlankGame,
    board: GameBoardWrapper,
    debug: false, // Toggle to true for boardgame.io debug panel
    multiplayer: Local(),
    numPlayers: 2,
  });

  return (
    <div className="flex flex-col md:flex-row justify-center items-start gap-8 p-4">
      <div className="w-full md:w-1/2">
        <h2 className="text-xl font-bold mb-4 text-center">Player 1</h2>
        <FlankClient playerID="0" />
      </div>
      <div className="w-full md:w-1/2">
        <h2 className="text-xl font-bold mb-4 text-center">Player 2</h2>
        <FlankClient playerID="1" />
      </div>
    </div>
  );
} 