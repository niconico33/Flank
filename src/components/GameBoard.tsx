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

export default function GameBoard({ G, ctx, moves, playerID, isActive }: GameBoardProps) {
  const { boardSize, blocks } = G;
  const [selected, setSelected] = useState<{ blockIndex: number; playerID: string } | null>(null);

  const currentPlayerBlocks = blocks[playerID || '0'] || [];

  // Helper to find the occupant of a cell
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

  // For occupant color and label
  function getOccupantLabelAndColor(pID: string, direction: string) {
    let label = pID === '0' ? 'U' : 'B'; // U for User, B for FlankBoss
    let arrow = '↑';
    if (direction === 'down') arrow = '↓';
    if (direction === 'left') arrow = '←';
    if (direction === 'right') arrow = '→';

    const colorClass = pID === '0' ? 'text-orange-500' : 'text-blue-500';
    return { display: `${label}${arrow}`, colorClass };
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
        targetY: y,
      } as any);
      setSelected(null);
    }
  };

  return (
    <div className="flex items-start justify-center space-x-8">
      {/* Game Board */}
      <div className="grid grid-cols-8">
        {Array.from({ length: boardSize }).map((_, rowIdx) => (
          <div key={`row-${rowIdx}`} className="contents">
            {Array.from({ length: boardSize }).map((__, colIdx) => {
              const occupant = findBlockOwner(colIdx, rowIdx);
              let display = '';
              let colorClass = '';

              if (occupant) {
                const block = blocks[occupant.player][occupant.index];
                const result = getOccupantLabelAndColor(occupant.player, block.direction);
                display = result.display;
                colorClass = result.colorClass;
              }

              // Checkerboard pattern with tan/dark-brown colors
              const isLightSquare = (rowIdx + colIdx) % 2 === 0;
              const bgColor = isLightSquare ? 'bg-amber-200' : 'bg-amber-800';

              const isSelected =
                selected &&
                occupant &&
                occupant.player === selected.playerID &&
                occupant.index === selected.blockIndex;

              return (
                <div
                  key={`${rowIdx}-${colIdx}`}
                  className={`w-16 h-16 border border-amber-900 flex items-center justify-center ${bgColor} ${colorClass} ${
                    isSelected ? 'bg-yellow-200' : 'hover:bg-gray-100'
                  }`}
                  onClick={() => handleCellClick(colIdx, rowIdx)}
                >
                  <span className={`text-2xl font-bold ${colorClass}`}>
                    {display}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Controls Panel */}
      <div className="bg-white p-6 rounded-lg shadow-md w-64">
        <h3 className="text-lg font-bold mb-4">Controls</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Movement</h4>
            <p className="text-sm">Use arrow keys (↑↓←→) to move selected piece</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Rotation</h4>
            <p className="text-sm">[s] Pivot Left</p>
            <p className="text-sm">[f] Pivot Right</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Other</h4>
            <p className="text-sm">[t] Toggle Selected Piece</p>
            <p className="text-sm">[e] Reset Move</p>
            <p className="text-sm">[Enter] Confirm Move</p>
          </div>
          {selected && (
            <div className="mt-4 p-3 bg-amber-100 rounded">
              <p className="text-sm font-medium">Selected Piece: {selected.blockIndex + 1}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 