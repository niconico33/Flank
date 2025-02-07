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
}

interface GameBoardProps {
  G: FlankGameState;
  ctx: Ctx & { events?: { endTurn?: () => void } };
  moves: {
    pivotBlock: (args: any) => void;
    stepBlock: (args: any) => void;
    endTurn: () => void;
    commitTurn: (args: { newBlocks: Block[] }) => void;
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
  // Board + Blocks from G (actual "official" state)
  const { boardSize, blocks } = G;

  // We track ephemeral blocks and ephemeral movesUsed for the *human player*
  // so that the user can "test" up to 3 moves, reset with 'e', or confirm with Enter.
  // The AI doesn't do ephemeral. It's normal moves from the server side.
  const [ephemeralBlocks, setEphemeralBlocks] = useState<Block[]>([]);
  const [movesUsed, setMovesUsed] = useState(0);
  const maxMovesPerTurn = 3;

  // We'll also store the original blocks for the player's turn to allow 'e' to revert.
  const [turnStartBlocks, setTurnStartBlocks] = useState<Block[]>([]);

  // Keep track if game is over
  const gameOver = !!ctx.gameover;

  // Identify if I'm "player 1" (the user) or not
  const isUser = playerID === '1';

  // On each new state from boardgame.io, if it's my turn and I'm the user,
  // refresh ephemeral blocks to match my official blocks, but only if the game isn't over.
  useEffect(() => {
    if (!gameOver && isUser && ctx.currentPlayer === playerID) {
      const myBlocks = blocks[playerID!] || [];
      setEphemeralBlocks(JSON.parse(JSON.stringify(myBlocks)));
      setTurnStartBlocks(JSON.parse(JSON.stringify(myBlocks)));
      setMovesUsed(0);
    }
  }, [blocks, ctx.currentPlayer, gameOver, isUser, playerID]);

  // If the user is not the current player or the game is over,
  // ephemeral blocks should simply reflect the official data.
  useEffect(() => {
    if (gameOver) {
      // Show final board
      return;
    }
    if (!isUser || ctx.currentPlayer !== playerID) {
      // We are not making ephemeral moves => display official
      // so user sees AI's final positions or other players' positions
      if (playerID && blocks[playerID]) {
        // Just do nothing for ephemeral. We won't modify ephemeral in that scenario.
        setEphemeralBlocks([]);
        setTurnStartBlocks([]);
        setMovesUsed(0);
      }
    }
  }, [gameOver, ctx.currentPlayer, isUser, playerID, blocks]);

  // On first mount, also set up "Press Enter to Start" logic
  useEffect(() => {
    const handlePress = (e: KeyboardEvent) => {
      if (!isGameStarted && !gameOver && e.key === 'Enter') {
        setIsGameStarted(true);
      }
    };
    window.addEventListener('keydown', handlePress);
    return () => window.removeEventListener('keydown', handlePress);
  }, [isGameStarted, setIsGameStarted, gameOver]);

  // *** KEY HANDLERS *** //
  // We only do ephemeral movement if isActive, isUser, game not over, game started, and it's our turn.
  const canEphemeralMove =
    isActive && isUser && !gameOver && isGameStarted && ctx.currentPlayer === playerID;

  // Helper function to pivot ephemeral block
  const ephemeralPivotBlock = (direction: 'left' | 'right') => {
    if (!canEphemeralMove) return;
    if (movesUsed >= maxMovesPerTurn) return;

    // If no ephemeral block is selected, pivot the first one by default
    if (selectedBlockIndex === null) return;

    const updated = JSON.parse(JSON.stringify(ephemeralBlocks)) as Block[];
    const block = updated[selectedBlockIndex];
    if (!block) return;

    // pivot
    block.direction = pivotDirection(block.direction, direction);
    setEphemeralBlocks(updated);
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

    // Move it orthogonally by dx, dy
    const newX = block.x + dx;
    const newY = block.y + dy;
    // board boundary check
    if (newX < 0 || newX >= boardSize || newY < 0 || newY >= boardSize) return;

    // We do not do "attacks" ephemeral. This is just a visual positioning guess for the user.
    // We'll allow the user to step into squares. If there's a *friendly* occupant, we won't allow it.
    // If there's an enemy occupant, we also won't allow it here in ephemeral mode. (User can see a potential move.)
    // For simplicity, let's forbid stepping onto ANY occupant in ephemeral mode.

    // Check occupant among ephemeral blocks of both players?
    // Actually let's check ephemeral blocks for the *user's own pieces*, but the AI's squares are from G.
    // We'll keep it simple: if ephemeral or official squares are occupied, block the step.
    if (findAnyOccupantInEphemeralOrOfficial(newX, newY)) {
      return;
    }

    block.x = newX;
    block.y = newY;

    setEphemeralBlocks(updated);
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
    // revert ephemeralBlocks to turnStartBlocks
    setEphemeralBlocks(JSON.parse(JSON.stringify(turnStartBlocks)));
    setMovesUsed(0);
  };

  // ephemeral commit => call commitTurn => endTurn
  const ephemeralCommit = () => {
    if (!canEphemeralMove) return;
    moves.commitTurn({ newBlocks: ephemeralBlocks });
  };

  // If game is over, pressing Enter should reload or reset the game
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If game not started, we allow Enter to start as well
      if (e.key === 'Enter' && gameOver) {
        // Reload page to start a new game or we could call a client reset
        window.location.reload();
      }

      // If not my turn or game not started or game is over, ignore controls
      if (!canEphemeralMove) return;

      switch (e.key) {
        // Movement
        case 'ArrowUp':
          e.preventDefault();
          ephemeralStepBlock(0, -1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          ephemeralStepBlock(0, 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          ephemeralStepBlock(-1, 0);
          break;
        case 'ArrowRight':
          e.preventDefault();
          ephemeralStepBlock(1, 0);
          break;

        // Pivot
        case 'f': // f => clockwise
          e.preventDefault();
          ephemeralPivotBlock('right');
          break;
        case 'd': // d => counterclockwise
          e.preventDefault();
          ephemeralPivotBlock('left');
          break;

        // Reset ephemeral
        case 'e':
          e.preventDefault();
          ephemeralReset();
          break;

        // Commit ephemeral and end turn
        case 'Enter':
          e.preventDefault();
          ephemeralCommit();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    canEphemeralMove,
    ephemeralStepBlock,
    ephemeralPivotBlock,
    ephemeralReset,
    ephemeralCommit,
    gameOver,
  ]);

  // *** Selecting pieces *** //
  // We'll let the user cycle which ephemeral block is selected or click on them
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(null);

  // If it becomes a new turn, default selected block to 0 if any exist
  useEffect(() => {
    if (canEphemeralMove) {
      setSelectedBlockIndex(ephemeralBlocks.length > 0 ? 0 : null);
    } else {
      setSelectedBlockIndex(null);
    }
  }, [canEphemeralMove, ephemeralBlocks]);

  const toggleNextPiece = () => {
    if (!canEphemeralMove) return;
    if (ephemeralBlocks.length === 0) return;
    if (selectedBlockIndex === null) {
      setSelectedBlockIndex(0);
    } else {
      setSelectedBlockIndex((selectedBlockIndex + 1) % ephemeralBlocks.length);
    }
  };

  // We'll let user click on squares that contain their ephemeral block to select that piece
  const handleCellClick = (x: number, y: number) => {
    if (!canEphemeralMove) return;
    // find ephemeral occupant
    for (let i = 0; i < ephemeralBlocks.length; i++) {
      const b = ephemeralBlocks[i];
      if (b.x === x && b.y === y) {
        setSelectedBlockIndex(i);
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
              Next
            </button>
          </div>
          <p className="text-sm text-gray-600">
            Click on your piece or press the Next button to change selection.
          </p>
        </div>

        {/* Movement Info */}
        <div className="mb-4">
          <h4 className="font-semibold mb-2">Movement Keys</h4>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
            <li>
              <strong>Arrow Keys:</strong> Move piece (step)
            </li>
            <li>
              <strong>d:</strong> Rotate counterclockwise
            </li>
            <li>
              <strong>f:</strong> Rotate clockwise
            </li>
            <li>
              <strong>e:</strong> Reset ephemeral moves
            </li>
            <li>
              <strong>Enter:</strong> Commit turn (or start game / restart if game over)
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