"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Client } from 'boardgame.io/react';
import { RandomBot } from 'boardgame.io/ai';
import { FlankGame, GameState, Block } from '@/game/gameLogic';
import GameBoard from './GameBoard';
import { BoardProps } from 'boardgame.io/react';

function GameBoardWrapper(props: BoardProps) {
  return (
    <GameBoard
      G={props.G}
      ctx={props.ctx}
      moves={props.moves}
      playerID={props.playerID}
      isActive={props.isActive}
    />
  );
}

export default function SinglePlayerGameClient() {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [moveCount, setMoveCount] = useState<number>(0);
  const [previewState, setPreviewState] = useState<GameState | null>(null);
  const [movesBuffer, setMovesBuffer] = useState<Array<{
    type: 'pivot' | 'step';
    direction?: 'left' | 'right' | 'up' | 'down';
  }>>([]);

  const FlankSinglePlayer = Client({
    game: FlankGame,
    board: GameBoardWrapper,
    debug: false,
    numPlayers: 2,
    ai: {
      enumerate: (G: GameState) => {
        const moves = [];
        const playerID = '1'; // AI is always player 1
        
        // For each block
        for (let i = 0; i < G.blocks[playerID].length; i++) {
          // Add pivot moves
          moves.push({ move: 'pivotBlock', args: [playerID, i, 'left'] });
          moves.push({ move: 'pivotBlock', args: [playerID, i, 'right'] });
          
          // Add step moves in each direction
          const block = G.blocks[playerID][i];
          const directions = [
            { dx: 0, dy: -1 }, // up
            { dx: 0, dy: 1 },  // down
            { dx: -1, dy: 0 }, // left
            { dx: 1, dy: 0 },  // right
          ];
          
          for (const dir of directions) {
            const newX = block.x + dir.dx;
            const newY = block.y + dir.dy;
            
            // Check bounds
            if (newX >= 0 && newX < G.boardSize && newY >= 0 && newY < G.boardSize) {
              moves.push({ move: 'stepBlock', args: [playerID, i, newX, newY] });
            }
          }
        }
        
        // Add end turn move
        moves.push({ move: 'endTurn', args: [] });
        
        return moves;
      },
      bots: {
        '1': RandomBot,
      },
    },
  });

  // Access the internal store's state
  const getStoreState = useCallback(() => {
    const store = (FlankSinglePlayer as any)?.store;
    return store?.getState();
  }, [FlankSinglePlayer]);

  // Re-initialize preview state when it's user's turn
  const refreshPreviewState = useCallback(() => {
    const state = getStoreState();
    if (!state) return;
    const { G, ctx } = state;
    if (ctx.currentPlayer === '0') {
      // Deep clone G for preview
      const cloned: GameState = JSON.parse(JSON.stringify(G));
      setPreviewState(cloned);
      setMoveCount(0);
      setMovesBuffer([]);
      setSelectedIndex(0);
    } else {
      setPreviewState(null);
    }
  }, [getStoreState]);

  // Helper pivot function for preview
  const pivotPreview = useCallback((dir: 'left' | 'right') => {
    if (!previewState || moveCount >= 3) return;

    const userBlocks = previewState.blocks['0'];
    if (!userBlocks || selectedIndex >= userBlocks.length) return;

    const block = userBlocks[selectedIndex];
    const pivotDirection = (current: Block['direction'], turn: 'left' | 'right') => {
      const leftMap: Record<Block['direction'], Block['direction']> = {
        up: 'left',
        left: 'down',
        down: 'right',
        right: 'up',
      };
      const rightMap: Record<Block['direction'], Block['direction']> = {
        up: 'right',
        right: 'down',
        down: 'left',
        left: 'up',
      };
      return turn === 'left' ? leftMap[current] : rightMap[current];
    };

    block.direction = pivotDirection(block.direction, dir);
    setPreviewState({ ...previewState });
    setMoveCount(prev => prev + 1);
    setMovesBuffer(prev => [...prev, { type: 'pivot', direction: dir }]);
  }, [previewState, selectedIndex, moveCount]);

  // Helper step function for preview
  const stepPreview = useCallback((dir: 'up' | 'down' | 'left' | 'right') => {
    if (!previewState || moveCount >= 3) return;

    const userBlocks = previewState.blocks['0'];
    if (!userBlocks || selectedIndex >= userBlocks.length) return;

    const block = userBlocks[selectedIndex];
    let newX = block.x;
    let newY = block.y;

    if (dir === 'up') newY--;
    if (dir === 'down') newY++;
    if (dir === 'left') newX--;
    if (dir === 'right') newX++;

    // Basic boundary check
    if (newX < 0 || newX >= previewState.boardSize || newY < 0 || newY >= previewState.boardSize) {
      return;
    }

    block.x = newX;
    block.y = newY;
    setPreviewState({ ...previewState });
    setMoveCount(prev => prev + 1);
    setMovesBuffer(prev => [...prev, { type: 'step', direction: dir }]);
  }, [previewState, selectedIndex, moveCount]);

  // Toggle selected block
  const toggleBlock = useCallback(() => {
    if (!previewState) return;
    const userBlocks = previewState.blocks['0'];
    if (!userBlocks) return;
    setSelectedIndex(prev => (prev + 1) % userBlocks.length);
  }, [previewState]);

  // Reset preview state
  const resetPreview = useCallback(() => {
    refreshPreviewState();
  }, [refreshPreviewState]);

  // Confirm moves
  const confirmMoves = useCallback(() => {
    const state = getStoreState();
    if (!state || state.ctx.currentPlayer !== '0') return;

    // Apply all buffered moves
    movesBuffer.forEach(move => {
      if (move.type === 'pivot') {
        (FlankSinglePlayer as any).moves.pivotBlock('0', selectedIndex, move.direction);
      } else if (move.type === 'step') {
        const block = state.G.blocks['0'][selectedIndex];
        let targetX = block.x;
        let targetY = block.y;

        if (move.direction === 'up') targetY--;
        if (move.direction === 'down') targetY++;
        if (move.direction === 'left') targetX--;
        if (move.direction === 'right') targetX++;

        (FlankSinglePlayer as any).moves.stepBlock('0', selectedIndex, targetX, targetY);
      }
    });

    // End turn
    (FlankSinglePlayer as any).moves.endTurn();
    
    // Reset local state
    setMovesBuffer([]);
    setMoveCount(0);
    setPreviewState(null);
  }, [FlankSinglePlayer, getStoreState, movesBuffer, selectedIndex]);

  // Set up keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = getStoreState();
      if (!state || state.ctx.currentPlayer !== '0') return;

      switch (e.key) {
        case 's':
          pivotPreview('left');
          break;
        case 'f':
          pivotPreview('right');
          break;
        case 't':
          toggleBlock();
          break;
        case 'e':
          resetPreview();
          break;
        case 'Enter':
          confirmMoves();
          break;
        case 'ArrowUp':
          stepPreview('up');
          break;
        case 'ArrowDown':
          stepPreview('down');
          break;
        case 'ArrowLeft':
          stepPreview('left');
          break;
        case 'ArrowRight':
          stepPreview('right');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [getStoreState, pivotPreview, stepPreview, toggleBlock, resetPreview, confirmMoves]);

  return (
    <div className="flex flex-col justify-center items-center p-4">
      <h2 className="text-xl font-bold mb-4 text-center">User vs FlankBoss</h2>
      <div className="w-full md:w-5/6 lg:w-3/4 xl:w-2/3 border p-4 rounded shadow bg-white">
        <FlankSinglePlayer playerID="0" />
      </div>
    </div>
  );
} 