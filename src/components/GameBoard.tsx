"use client";

import { Ctx } from 'boardgame.io';
import { MoveFn } from 'boardgame.io/dist/types/src/types';
import React, { useEffect, useState } from 'react';
import { EventsAPI } from 'boardgame.io/dist/types/src/plugins/events/events';
import { Block } from '../game/gameLogic';

interface PlayerBlocks {
  [playerID: string]: Block[];
}

interface FlankGameState {
  boardSize: number;
  blocks: PlayerBlocks;
  lastHighlightedPiece?: {
    playerID: string;
    blockIndex: number;
  };
}

interface GameBoardProps {
  G: FlankGameState;
  ctx: Ctx & { events?: { endTurn?: () => void } };
  moves: {
    pivotBlock: (args: { playerID: string; blockIndex: number; direction: 'left' | 'right' }) => void;
    stepBlock: (args: { playerID: string; blockIndex: number; targetX: number; targetY: number }) => void;
    commitTurn: (args: {
      turnStartBlocks: Block[];
      ephemeralMoves: Array<{
        type: 'pivot' | 'step';
        blockIndex: number;
        direction?: 'left' | 'right';
        dx?: number;
        dy?: number;
      }>;
    }) => void;
    highlightPiece: (args: { playerID: string; blockIndex: number }) => void;
  };
  playerID?: string;
  isActive?: boolean;
  isGameStarted: boolean;
  setIsGameStarted: (started: boolean) => void;
}

export default function GameBoard({
  G,
  ctx,
  moves,
  playerID,
  isActive,
  isGameStarted,
  setIsGameStarted,
}: GameBoardProps) {
  const { boardSize, blocks } = G;
  const gameOver = !!ctx.gameover;
  const isUser = playerID === '1';

  // Track ephemeral blocks for display
  const [ephemeralBlocks, setEphemeralBlocks] = useState<Block[]>([]);
  // Track ephemeral moves to replay on server
  const [ephemeralMoves, setEphemeralMoves] = useState<Array<{
    type: 'pivot' | 'step',
    blockIndex: number,
    direction?: 'left' | 'right',
    dx?: number,
    dy?: number
  }>>([]);
  // Track moves used in current turn
  const [movesUsed, setMovesUsed] = useState(0);
  const maxMovesPerTurn = 3;

  // Remember blocks at start of turn
  const [turnStartBlocks, setTurnStartBlocks] = useState<Block[]>([]);

  // We only do ephemeral movement if isActive, isUser, game not over, game started, and it's our turn
  const canEphemeralMove =
    isActive && isUser && !gameOver && isGameStarted && ctx.currentPlayer === playerID;

  // Sync ephemeral blocks at start of turn
  useEffect(() => {
    if (!gameOver && isUser && ctx.currentPlayer === playerID) {
      const myBlocks = blocks[playerID!] || [];
      const clone = JSON.parse(JSON.stringify(myBlocks)) as Block[];
      setEphemeralBlocks(clone);
      setTurnStartBlocks(clone);
      setMovesUsed(0);
      setEphemeralMoves([]);
    } else if (gameOver || !isActive || !isUser || ctx.currentPlayer !== playerID) {
      setEphemeralBlocks([]);
      setTurnStartBlocks([]);
      setMovesUsed(0);
      setEphemeralMoves([]);
    }
  }, [blocks, ctx.currentPlayer, isUser, playerID, isActive, gameOver]);

  // Helper function to pivot ephemeral block
  const ephemeralPivotBlock = (direction: 'left' | 'right') => {
    if (!canEphemeralMove) return;
    if (movesUsed >= maxMovesPerTurn) return;
    if (selectedBlockIndex === null) return;

    const updated = JSON.parse(JSON.stringify(ephemeralBlocks)) as Block[];
    const block = updated[selectedBlockIndex];
    if (!block) return;

    // pivot
    block.direction = pivotDirection(block.direction, direction);
    
    // Record the move
    const newMoves = [...ephemeralMoves, {
      type: 'pivot' as const,
      blockIndex: selectedBlockIndex,
      direction
    }];

    setEphemeralBlocks(updated);
    setEphemeralMoves(newMoves);
    setMovesUsed(movesUsed + 1);
  };

  // pivot logic
  const pivotDirection = (
    current: 'up' | 'down' | 'left' | 'right',
    turn: 'left' | 'right'
  ) => {
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

  // ephemeral step
  const ephemeralStepBlock = (dx: number, dy: number) => {
    if (!canEphemeralMove) return;
    if (movesUsed >= maxMovesPerTurn) return;
    if (selectedBlockIndex === null) return;

    const updated = JSON.parse(JSON.stringify(ephemeralBlocks)) as Block[];
    const block = updated[selectedBlockIndex];
    if (!block) return;

    const newX = block.x + dx;
    const newY = block.y + dy;
    if (newX < 0 || newX >= boardSize || newY < 0 || newY >= boardSize) return;

    // Check for occupants - allow moving onto enemy squares but not our own pieces
    const occupant = findOccupant(newX, newY);
    if (occupant && occupant.pID === playerID) return; // Can't move onto our own pieces

    block.x = newX;
    block.y = newY;

    // Record the move
    const newMoves = [...ephemeralMoves, {
      type: 'step' as const,
      blockIndex: selectedBlockIndex,
      dx,
      dy
    }];

    setEphemeralBlocks(updated);
    setEphemeralMoves(newMoves);
    setMovesUsed(movesUsed + 1);
  };

  // Occupant check for ephemeral (my pieces) and official (everyone else).
  const findAnyOccupantInEphemeralOrOfficial = (x: number, y: number) => {
    // Check ephemeral blocks (my pieces)
    for (let i = 0; i < ephemeralBlocks.length; i++) {
      const b = ephemeralBlocks[i];
      if (b.x === x && b.y === y) {
        return true;
      }
    }
    // Check official blocks of other players
    const otherPlayers = Object.keys(blocks).filter((p) => p !== playerID);
    for (const p of otherPlayers) {
      for (const b of blocks[p]) {
        if (b.x === x && b.y === y) {
          return true;
        }
      }
    }
    return false;
  };

  // ephemeral reset
  const ephemeralReset = () => {
    if (!canEphemeralMove) return;
    setEphemeralBlocks(JSON.parse(JSON.stringify(turnStartBlocks)));
    setEphemeralMoves([]);
    setMovesUsed(0);
  };

  // ephemeral commit => call commitTurn => endTurn
  const ephemeralCommit = () => {
    if (!canEphemeralMove) return;
    moves.commitTurn({
      turnStartBlocks,
      ephemeralMoves
    });
  };

  // *** Selecting pieces *** //
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(null);

  // Only set initial piece selection when a new turn starts
  useEffect(() => {
    // Only run this when it becomes the player's turn
    if (canEphemeralMove) {
      // Use lastHighlightedPiece if available, otherwise default to first piece
      if (G.lastHighlightedPiece?.playerID === playerID) {
        setSelectedBlockIndex(G.lastHighlightedPiece.blockIndex);
      } else if (selectedBlockIndex === null) {
        setSelectedBlockIndex(ephemeralBlocks.length > 0 ? 0 : null);
      }
    } else if (!canEphemeralMove) {
      setSelectedBlockIndex(null);
    }
  }, [canEphemeralMove, G.lastHighlightedPiece]); // Add lastHighlightedPiece to dependencies

  // Toggle to next piece - can be triggered by 't' key or Next button
  const toggleNextPiece = () => {
    if (!canEphemeralMove) return;
    if (ephemeralBlocks.length === 0) return;
    const nextIndex = selectedBlockIndex === null ? 0 : (selectedBlockIndex + 1) % ephemeralBlocks.length;
    setSelectedBlockIndex(nextIndex);
    moves.highlightPiece({ playerID: playerID!, blockIndex: nextIndex });
  };

  // We'll let user click on squares that contain their ephemeral block to select that piece
  const handleCellClick = (x: number, y: number) => {
    if (!canEphemeralMove) return;
    // find ephemeral occupant
    for (let i = 0; i < ephemeralBlocks.length; i++) {
      const b = ephemeralBlocks[i];
      if (b.x === x && b.y === y) {
        setSelectedBlockIndex(i);
        moves.highlightPiece({ playerID: playerID!, blockIndex: i });
        return;
      }
    }
    // otherwise do nothing on click
  };

  // Helper to see who occupies a cell for display
  // For the user, if it's the current turn, show ephemeral occupant.
  // For other players or if not user, show official occupant.
  const findOccupant = (x: number, y: number) => {
    // If it's user turn, ephemeral blocks have priority for this player's occupant
    if (isUser && ctx.currentPlayer === playerID && !gameOver) {
      for (let i = 0; i < ephemeralBlocks.length; i++) {
        const b = ephemeralBlocks[i];
        if (b.x === x && b.y === y) {
          return { pID: playerID!, index: i, ephemeral: true, direction: b.direction };
        }
      }
    }
    // Otherwise or if no ephemeral occupant, check official G for occupant
    for (const pID of Object.keys(blocks)) {
      for (let i = 0; i < blocks[pID].length; i++) {
        const b = blocks[pID][i];
        if (b.x === x && b.y === y) {
          return { pID, index: i, ephemeral: false, direction: b.direction };
        }
      }
    }
    return null;
  };

  // For occupant color and label
  function getOccupantLabelAndColor(
    pID: string,
    direction: string,
    index: number,
    ephemeral: boolean
  ) {
    // We'll label them "P1-1, P1-2..." or "P2-1, P2-2..."
    const label = `P${pID}-${index + 1}`;
    let arrow = '↑';
    if (direction === 'down') arrow = '↓';
    if (direction === 'left') arrow = '←';
    if (direction === 'right') arrow = '→';

    const colorMap: Record<string, string> = {
      '1': ephemeral ? 'text-blue-600' : 'text-blue-400',
      '2': ephemeral ? 'text-red-600' : 'text-red-400',
    };

    const colorClass = colorMap[pID] || 'text-gray-500';
    return { display: `${label}${arrow}`, colorClass };
  }

  // *** KEYBOARD EVENTS *** //
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If game not started or game over or not player's turn, ignore
      if (!canEphemeralMove) {
        // But handle Enter for game start or to reset if gameOver
        if (e.key === 'Enter') {
          if (gameOver) {
            window.location.reload();
          } else if (!isGameStarted) {
            setIsGameStarted(true);
          }
        }
        return;
      }

      // Prevent default behavior for game control keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'd', 'f', 'e', 't', 'Enter'].includes(e.key)) {
        e.preventDefault();
      }

      switch (e.key) {
        // Movement
        case 'ArrowUp':
          ephemeralStepBlock(0, -1);
          break;
        case 'ArrowDown':
          ephemeralStepBlock(0, 1);
          break;
        case 'ArrowLeft':
          ephemeralStepBlock(-1, 0);
          break;
        case 'ArrowRight':
          ephemeralStepBlock(1, 0);
          break;

        // Rotation
        case 'f': // clockwise
          ephemeralPivotBlock('right');
          break;
        case 'd': // counterclockwise
          ephemeralPivotBlock('left');
          break;

        // Piece Selection
        case 't': // toggle through pieces
          toggleNextPiece();
          break;

        // Turn Management
        case 'e': // reset ephemeral moves
          ephemeralReset();
          break;
        case 'Enter': // commit turn
          ephemeralCommit();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    canEphemeralMove,
    gameOver,
    isGameStarted,
    setIsGameStarted,
    ephemeralStepBlock,
    ephemeralPivotBlock,
    ephemeralReset,
    ephemeralCommit,
    toggleNextPiece,
  ]);

  // *** RENDERING *** //
  return (
    <div className="flex items-start justify-center space-x-8">
      {/* Game Board */}
      <div className="relative">
        <div
          className={`grid grid-cols-8 transition-all duration-300 ${
            !isGameStarted && !gameOver ? 'opacity-80' : ''
          }`}
        >
          {Array.from({ length: boardSize }).map((_, rowIdx) => (
            <div key={`row-${rowIdx}`} className="contents">
              {Array.from({ length: boardSize }).map((__, colIdx) => {
                const occupant = findOccupant(colIdx, rowIdx);
                let display = '';
                let colorClass = '';

                if (occupant) {
                  const { pID, index, ephemeral, direction } = occupant;
                  const result = getOccupantLabelAndColor(pID, direction, index, ephemeral);
                  display = result.display;
                  colorClass = result.colorClass;
                }

                const isLightSquare = (rowIdx + colIdx) % 2 === 0;
                const bgColor = isLightSquare ? 'bg-amber-200' : 'bg-amber-800';

                const isSelected =
                  occupant &&
                  occupant.pID === playerID &&
                  occupant.ephemeral === true &&
                  selectedBlockIndex !== null &&
                  occupant.index === selectedBlockIndex;

                return (
                  <div
                    key={`${rowIdx}-${colIdx}`}
                    className={`w-16 h-16 border border-amber-900 flex items-center justify-center ${bgColor} ${
                      isSelected
                        ? 'ring-4 ring-yellow-400 bg-yellow-200'
                        : occupant
                        ? 'hover:ring-2 hover:ring-yellow-400'
                        : ''
                    }`}
                    onClick={() => handleCellClick(colIdx, rowIdx)}
                  >
                    <span className={`text-sm font-bold ${colorClass}`}>{display}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Start Game Overlay */}
        {!isGameStarted && !gameOver && (
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

        {/* Game Over Overlay */}
        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white p-6 rounded-lg shadow-xl text-center">
              {(() => {
                if (ctx.gameover?.draw) return <h3 className="text-2xl font-bold">Draw!</h3>;
                if (ctx.gameover?.winner) {
                  // We are Player 1. If winner is '1', we say "Winner!"
                  // If winner is '2', we say "Loser"
                  return ctx.gameover.winner === '1' ? (
                    <h3 className="text-2xl font-bold text-green-700">Winner!</h3>
                  ) : (
                    <h3 className="text-2xl font-bold text-red-700">Loser!</h3>
                  );
                }
                return null;
              })()}
              <p className="text-gray-700 mt-2">Press Enter to play again.</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls Panel */}
      <div className="bg-white p-6 rounded-lg shadow-md w-72">
        <h3 className="text-lg font-bold mb-4">Game Controls</h3>

        {/* Selected Piece */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="font-semibold mb-2 text-gray-700">Selected Piece</h4>
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-md font-bold ${
                selectedBlockIndex !== null ? 'text-blue-700' : 'text-gray-400'
              }`}
            >
              {selectedBlockIndex !== null
                ? `Piece #${selectedBlockIndex + 1}`
                : 'None'}
            </span>
            <button
              onClick={toggleNextPiece}
              className={`px-3 py-1 rounded ${
                canEphemeralMove
                  ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                  : 'bg-gray-200 text-gray-500'
              } transition-colors`}
              disabled={!canEphemeralMove}
            >
              Next (T)
            </button>
          </div>
          <p className="text-sm text-gray-600">
            Click on your piece, press the Next button, or press "t" to cycle through pieces.
          </p>
        </div>

        {/* Movement Info */}
        <div className="mb-4">
          <h4 className="font-semibold mb-2">Movement Keys</h4>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
            <li>
              <strong>Arrow Keys:</strong> Move piece
            </li>
            <li>
              <strong>d:</strong> Rotate counterclockwise
            </li>
            <li>
              <strong>f:</strong> Rotate clockwise
            </li>
            <li>
              <strong>t:</strong> Select next piece
            </li>
            <li>
              <strong>e:</strong> Reset moves
            </li>
            <li>
              <strong>Enter:</strong> Commit turn
            </li>
          </ul>
        </div>

        {/* Move Usage */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="font-semibold mb-2 text-gray-700">Moves Used</h4>
          <p>
            {movesUsed} / {maxMovesPerTurn}
          </p>
        </div>

        {/* Turn Info */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-700 mb-2">Your Turn?</h4>
          {isActive && isUser && !gameOver ? (
            <p className="text-green-700">Yes — up to 3 ephemeral moves!</p>
          ) : (
            <p className="text-gray-700">
              {gameOver ? 'Game Over' : 'Waiting for opponent'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
} 