import { MCTSBot } from 'boardgame.io/ai';
import { GameState, Block, FlankGame } from './gameLogic';

/**
 * Return all possible pivot / step moves + endTurn for the playerID
 * This is a single "atomic" move for MCTS to evaluate (1 pivot or 1 step).
 * MCTS will chain multiple moves in a simulated turn.
 */
function enumerateMoves(G: GameState, ctx: any, playerID: string) {
  const moves: Array<{ move: string; args?: any }> = [];

  // If it's not this player's turn, no moves.
  if (ctx.currentPlayer !== playerID) {
    return moves;
  }

  // For each block, we can:
  // 1) Pivot left
  // 2) Pivot right
  // 3) Step (up/down/left/right if valid)
  // 4) endTurn
  const blocks = G.blocks[playerID] || [];

  blocks.forEach((block, blockIndex) => {
    // pivot left
    moves.push({
      move: 'pivotBlock',
      args: { playerID, blockIndex, direction: 'left' },
    });

    // pivot right
    moves.push({
      move: 'pivotBlock',
      args: { playerID, blockIndex, direction: 'right' },
    });

    // step to up/down/left/right if within bounds
    const directions = [
      { dx: 0, dy: -1 },  // up
      { dx: 0, dy: 1 },   // down
      { dx: -1, dy: 0 },  // left
      { dx: 1, dy: 0 },   // right
    ];

    for (const { dx, dy } of directions) {
      const targetX = block.x + dx;
      const targetY = block.y + dy;
      // basic boundary checks
      if (
        targetX >= 0 &&
        targetX < G.boardSize &&
        targetY >= 0 &&
        targetY < G.boardSize
      ) {
        // steps are valid if empty or an enemy occupant that can be attacked
        // the stepBlock move itself checks validity further (nose vs. body).
        moves.push({
          move: 'stepBlock',
          args: { playerID, blockIndex, targetX, targetY },
        });
      }
    }
  });

  // Also always allow ending the turn
  moves.push({ move: 'endTurn' });

  return moves;
}

/**
 * A simple evaluation: number of blocks the AI has minus number of blocks other players have.
 * This function is used as part of a "checker" for MCTS objectives.
 */
function evaluateBoard(G: GameState, ctx: any) {
  const playerID = ctx.currentPlayer;
  let score = 0;
  for (const pID of Object.keys(G.blocks)) {
    if (pID === playerID) {
      score += G.blocks[pID].length;
    } else {
      score -= G.blocks[pID].length;
    }
  }
  return score > 0;  // Return true if we have more blocks than opponent
}

/**
 * MCTS-based AI bot using a custom enumerator and a heuristic that values block advantage.
 */
export class FlankBot extends MCTSBot {
  constructor() {
    super({
      game: FlankGame,
      enumerate: enumerateMoves,
      objectives: (G, ctx, playerID) => ({
        'blockAdvantage': {
          checker: evaluateBoard,
          weight: 1,
        },
      }),
      iterations: 2000,
    });
  }
} 