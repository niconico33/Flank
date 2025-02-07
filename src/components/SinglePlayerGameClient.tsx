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
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

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

  // Helper to get the current Redux store state from FlankSinglePlayer
  const getStoreState = useCallback(() => {
    const store = (FlankSinglePlayer as any)?.store;
    return store?.getState();
  }, [FlankSinglePlayer]);

  // Switch to next block for the user
  const toggleBlock = useCallback(() => {
    const state = getStoreState();
    if (!state) return;

    const { G, ctx } = state;
    if (ctx.currentPlayer !== '0') return;

    const userBlocks = G.blocks['0'];
    if (userBlocks && userBlocks.length > 0) {
      setSelectedIndex((prev) => (prev + 1) % userBlocks.length);
    }
  }, [getStoreState]);

  // Direct pivot move
  const pivotBlock = useCallback((direction: 'left' | 'right') => {
    const state = getStoreState();
    if (!state) return;

    const { ctx } = state;
    if (ctx.currentPlayer !== '0') return;

    (FlankSinglePlayer as any).moves.pivotBlock({ playerID: '0', blockIndex: selectedIndex, direction });
  }, [getStoreState, FlankSinglePlayer, selectedIndex]);

  // Direct step move
  const stepBlock = useCallback((dir: 'up' | 'down' | 'left' | 'right') => {
    const state = getStoreState();
    if (!state) return;

    const { ctx, G } = state;
    if (ctx.currentPlayer !== '0') return;

    const block = G.blocks['0'][selectedIndex];
    if (!block) return;

    let newX = block.x;
    let newY = block.y;

    if (dir === 'up') newY--;
    else if (dir === 'down') newY++;
    else if (dir === 'left') newX--;
    else if (dir === 'right') newX++;

    // Basic boundary check
    if (newX < 0 || newX >= G.boardSize || newY < 0 || newY >= G.boardSize) {
      return;
    }

    (FlankSinglePlayer as any).moves.stepBlock({ playerID: '0', blockIndex: selectedIndex, targetX: newX, targetY: newY });
  }, [getStoreState, FlankSinglePlayer, selectedIndex]);

  // End turn
  const endUserTurn = useCallback(() => {
    const state = getStoreState();
    if (!state) return;
    const { ctx } = state;
    if (ctx.currentPlayer === '0') {
      (FlankSinglePlayer as any).moves.endTurn();
    }
  }, [getStoreState, FlankSinglePlayer]);

  // Single keyboard listener for the user's turn
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If game not started, only ENTER starts
      if (!isGameStarted) {
        if (e.key === 'Enter') {
          e.preventDefault();
          setIsGameStarted(true);
        }
        return;
      }

      // Check if user's turn
      const state = getStoreState();
      if (!state || state.ctx.currentPlayer !== '0') return;

      // Prevent scrolling on arrow keys and other game controls
      if (
        [
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          's',
          'f',
          't',
          'Enter',
          'w',
          'a',
          'd'
        ].includes(e.key)
      ) {
        e.preventDefault();
      }

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          stepBlock('up');
          break;
        case 'ArrowDown':
        case 's':
          stepBlock('down');
          break;
        case 'ArrowLeft':
        case 'a':
          stepBlock('left');
          break;
        case 'ArrowRight':
        case 'd':
          stepBlock('right');
          break;
        case 'f':
          pivotBlock('right');
          break;
        case 't':
          toggleBlock();
          break;
        case 'Enter':
          endUserTurn();
          break;
        case 'S':
          // If uppercase 'S', pivot left
          if (e.shiftKey || !e.shiftKey) {
            pivotBlock('left');
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isGameStarted,
    getStoreState,
    stepBlock,
    pivotBlock,
    toggleBlock,
    endUserTurn,
  ]);

  return (
    <div className="flex flex-col justify-center items-center p-4">
      <h2 className="text-xl font-bold mb-4 text-center">User vs FlankBoss</h2>
      <div className="w-full md:w-5/6 lg:w-3/4 xl:w-2/3 border p-4 rounded shadow bg-white">
        <FlankSinglePlayer playerID="0" />
      </div>
    </div>
  );
} 