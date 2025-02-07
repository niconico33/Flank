import { GameState } from './gameLogic';

interface MoveArgs {
  move: string;
  args?: any[];
}

export function enumerate(G: GameState, ctx: any, playerID: string): MoveArgs[] {
  // If it's not this player's turn, return empty.
  if (playerID !== ctx.currentPlayer) {
    return [];
  }

  const moves: MoveArgs[] = [];

  // Retrieve all blocks belonging to the current player
  const blocks = G.blocks[playerID];
  if (!blocks) return [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    // 1) Pivot left
    moves.push({
      move: 'pivotBlock',
      args: [{ playerID, blockIndex: i, directionChange: 'left' }]
    });

    // 2) Pivot right
    moves.push({
      move: 'pivotBlock',
      args: [{ playerID, blockIndex: i, directionChange: 'right' }]
    });

    // 3) Step up / down / left / right if valid
    // For a random approach, just attempt stepping in all 4 directions
    const possibleSteps = [
      { x: block.x, y: block.y - 1 }, // up
      { x: block.x, y: block.y + 1 }, // down
      { x: block.x - 1, y: block.y }, // left
      { x: block.x + 1, y: block.y }  // right
    ];

    for (const target of possibleSteps) {
      // Basic bounds check (8x8 board from 0..7)
      if (
        target.x >= 0 &&
        target.x < G.boardSize &&
        target.y >= 0 &&
        target.y < G.boardSize
      ) {
        moves.push({
          move: 'stepBlock',
          args: [{ playerID, blockIndex: i, targetX: target.x, targetY: target.y }]
        });
      }
    }
  }

  // Also add an option to end the turn
  moves.push({ move: 'endTurn' });

  return moves;
} 