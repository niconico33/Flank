"use client";

import { Ctx } from 'boardgame.io';
import { MoveFn } from 'boardgame.io/dist/types/src/types';
import React, { useState } from 'react';
import { EventsAPI } from 'boardgame.io/dist/types/src/plugins/events/events';

interface Block {
  x: number;
  y: number;
  direction: 'up' | 'down' | 'left' | 'right';
}

interface PlayerBlocks {
  [playerID: string]: Block[];
}

interface FlankGameState {
  boardSize: number;
  blocks: PlayerBlocks;
}

interface GameBoardProps {
  G: FlankGameState;
  ctx: Ctx;
  moves: {
    pivotBlock: MoveFn<any>;
    stepBlock: MoveFn<any>;
  };
  playerID?: string;
  isActive?: boolean;
}

export default function GameBoard({
  G,
  ctx,
  moves,
  playerID,
  isActive,
}: GameBoardProps) {
  const { boardSize, blocks } = G;
  const [selected, setSelected] = useState<{ blockIndex: number; playerID: string } | null>(null);

  const currentPlayerBlocks = blocks[playerID || '0'] || [];

  // Helper to determine if a cell has a block and who owns it:
  function findBlockOwner(x: number, y: number): { player: string; index: number } | null {
    for (const pID of Object.keys(blocks)) {
      for (let i = 0; i < blocks[pID].length; i++) {
        const b = blocks[pID][i];
        if (b.x === x && b.y === y) {
          return { player: pID, index: i };
        }
      }
    }
    return null;
  }

  const handleCellClick = (x: number, y: number) => {
    if (!isActive || !playerID) return;

    const occupant = findBlockOwner(x, y);

    // If there's a block in this cell belonging to you, select/deselect it
    if (occupant && occupant.player === playerID) {
      // If already selected the same block, deselect
      if (
        selected &&
        selected.blockIndex === occupant.index &&
        selected.playerID === occupant.player
      ) {
        setSelected(null);
      } else {
        setSelected({ blockIndex: occupant.index, playerID: occupant.player });
      }
    } else if (selected) {
      // Attempt to step onto that cell
      moves.stepBlock({
        playerID,
        blockIndex: selected.blockIndex,
        targetX: x,
        targetY: y
      } as any);
      setSelected(null);
    }
  };

  const pivot = (directionChange: 'left' | 'right') => {
    if (!isActive || !playerID || !selected) return;
    moves.pivotBlock({
      playerID,
      blockIndex: selected.blockIndex,
      directionChange
    } as any);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4">
        {selected ? (
          <div className="space-x-2">
            <button
              onClick={() => pivot('left')}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            >
              Pivot Left
            </button>
            <button
              onClick={() => pivot('right')}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            >
              Pivot Right
            </button>
          </div>
        ) : (
          <p>Select one of your blocks on the board to pivot or step.</p>
        )}
      </div>

      <div className="flex justify-center">
        <div className="grid grid-cols-8">
          {Array.from({ length: boardSize }).map((_, rowIdx) =>
            Array.from({ length: boardSize }).map((__, colIdx) => {
              const occupant = findBlockOwner(colIdx, rowIdx);
              let display = '';

              if (occupant) {
                const block = blocks[occupant.player][occupant.index];
                // Show direction + player color
                // For simplicity, color = occupant.player (0,1,2,3)
                // Symbol for direction
                let arrow = '↑';
                if (block.direction === 'down') arrow = '↓';
                if (block.direction === 'left') arrow = '←';
                if (block.direction === 'right') arrow = '→';

                display = `P${occupant.player}-${arrow}`;
              }

              const isSelected =
                selected &&
                occupant &&
                occupant.player === selected.playerID &&
                occupant.index === selected.blockIndex;

              return (
                <div
                  key={`${rowIdx}-${colIdx}`}
                  className={`w-16 h-16 border border-gray-300 flex items-center justify-center cursor-pointer ${
                    isSelected ? 'bg-yellow-200' : 'hover:bg-gray-100'
                  }`}
                  onClick={() => handleCellClick(colIdx, rowIdx)}
                >
                  {display}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
} 