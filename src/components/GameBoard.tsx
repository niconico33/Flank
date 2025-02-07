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
  isGameStarted: boolean;
  setIsGameStarted: (started: boolean) => void;
}

export default function GameBoard({ G, ctx, moves, playerID, isActive, isGameStarted, setIsGameStarted }: GameBoardProps) {
  const { boardSize, blocks } = G;
  const [selected, setSelected] = useState<{ blockIndex: number; playerID: string } | null>(null);
  const [isHighlighted, setIsHighlighted] = useState(false);

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
      <div className="relative">
        <div className={`grid grid-cols-8 transition-all duration-300 ${isHighlighted ? 'brightness-110 scale-[1.02]' : ''} ${!isGameStarted ? 'opacity-80' : ''}`}>
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

        {/* Start Game Overlay */}
        {!isGameStarted && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
            <div className="bg-white p-6 rounded-lg shadow-lg text-center transform transition-all hover:scale-105">
              <h3 className="text-2xl font-bold mb-2">Ready to Play?</h3>
              <p className="text-gray-600 mb-4">Press Enter to Start!</p>
              <div className="w-24 h-24 mx-auto bg-green-500 rounded-full flex items-center justify-center text-white text-3xl font-bold animate-pulse">
                Go!
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls Panel */}
      <div className="bg-white p-6 rounded-lg shadow-md w-72">
        <h3 className="text-lg font-bold mb-4">Game Controls</h3>
        <div className={`space-y-6 ${!isGameStarted ? 'opacity-75' : ''}`}>
          <div>
            <h4 className="font-semibold mb-3 text-gray-700">Movement Controls</h4>
            <div className="grid grid-cols-3 gap-2 place-items-center mb-2">
              <div></div>
              <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center border border-gray-300">
                <span className="font-mono">↑</span>
              </div>
              <div></div>
              <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center border border-gray-300">
                <span className="font-mono">←</span>
              </div>
              <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center border border-gray-300">
                <span className="font-mono">↓</span>
              </div>
              <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center border border-gray-300">
                <span className="font-mono">→</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 text-center">Move Selected Piece</p>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-gray-700">Rotation Controls</h4>
            <div className="flex justify-center space-x-4">
              <div className="text-center">
                <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center border border-gray-300 mb-1">
                  <span className="font-mono">S</span>
                </div>
                <p className="text-sm text-gray-600">Rotate Left</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center border border-gray-300 mb-1">
                  <span className="font-mono">F</span>
                </div>
                <p className="text-sm text-gray-600">Rotate Right</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-gray-700">Action Controls</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-16 h-10 bg-gray-100 rounded flex items-center justify-center border border-gray-300">
                  <span className="font-mono">T</span>
                </div>
                <p className="text-sm text-gray-600">Switch Selected Piece</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-16 h-10 bg-gray-100 rounded flex items-center justify-center border border-gray-300">
                  <span className="font-mono">E</span>
                </div>
                <p className="text-sm text-gray-600">Reset Current Move</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-16 h-10 bg-gray-100 rounded flex items-center justify-center border border-gray-300">
                  <span className="font-mono">Enter</span>
                </div>
                <p className="text-sm text-gray-600">Confirm Move</p>
              </div>
            </div>
          </div>

          {!isGameStarted && (
            <div className="mt-4 p-3 bg-green-50 rounded border border-green-200">
              <p className="text-sm font-medium text-green-700 text-center">Press Enter to Start!</p>
            </div>
          )}

          {isGameStarted && selected && (
            <div className="mt-4 p-3 bg-amber-100 rounded">
              <p className="text-sm font-medium">Currently Selected: Piece {selected.blockIndex + 1}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 