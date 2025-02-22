"use client";

import React, { useState, useEffect } from 'react';
import { Client } from 'boardgame.io/react';
import { Local } from 'boardgame.io/multiplayer';
import { FlankGame } from '../game/gameLogic';
import type { BoardProps } from 'boardgame.io/react';
import GameBoard from './GameBoard';
import { FlankBot } from '../game/ai';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';

interface GameBoardWrapperProps extends Omit<BoardProps, 'moves'> {
  isGameStarted: boolean;
  setIsGameStarted: (started: boolean) => void;
  moves: any;
  gameId: string;
  moveIndex: number;
  setMoveIndex: (index: number) => void;
}

function GameBoardWrapper(props: GameBoardWrapperProps) {
  const { G, ctx, moves, gameId, moveIndex, setMoveIndex } = props;
  const [lastLoggedTurn, setLastLoggedTurn] = useState(0);

  // Track completed moves
  useEffect(() => {
    if (ctx.turn > lastLoggedTurn) {
      // Get the player who just made the move (opposite of current player)
      const currentPlayer = ctx.currentPlayer === '1' ? '2' : '1';
      
      // Create move record
      const moveRecord = {
        game_id: gameId,
        move_index: moveIndex + 1,
        current_player: currentPlayer,
        board_state: G,
        action: { type: 'commitTurn', movesUsed: G.moveCount },
        resulting_state: G,
        winner: null
      };

      // Log move to Supabase
      supabase
        .from('GameMoves')
        .insert([moveRecord])
        .then(({ error }) => {
          if (error) {
            console.error('Error logging move:', error);
          } else {
            setLastLoggedTurn(ctx.turn);
            setMoveIndex(moveIndex + 1);
          }
        });
    }
  }, [ctx.turn, G, ctx.currentPlayer]);

  // Track game end
  useEffect(() => {
    if (ctx.gameover) {
      const winner = ctx.gameover.winner || (ctx.gameover.draw ? 'draw' : null);
      if (winner) {
        // Update all moves for this game with the winner
        supabase
          .from('GameMoves')
          .update({ winner })
          .eq('game_id', gameId)
          .then(({ error }) => {
            if (error) console.error('Error updating winner:', error);
          });
      }
    }
  }, [ctx.gameover, gameId]);

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
  const [gameId] = useState(() => uuidv4());
  const [moveIndex, setMoveIndex] = useState(0);

  // Create the single-player client for user (Player 1) vs AI (Player 2)
  const FlankSinglePlayer = Client({
    game: FlankGame,
    board: (props: BoardProps) => (
      <GameBoardWrapper
        {...(props as any)}
        isGameStarted={isGameStarted}
        setIsGameStarted={setIsGameStarted}
        gameId={gameId}
        moveIndex={moveIndex}
        setMoveIndex={setMoveIndex}
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
    window.location.reload(); // This will generate a new game ID
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
        <FlankSinglePlayer playerID="1" />
      </div>
    </div>
  );
} 