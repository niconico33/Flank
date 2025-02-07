import { MCTSBot } from 'boardgame.io/ai';
import { GameState, Block, FlankGame } from './gameLogic';

/**
 * Efficient deep clone for Block arrays.
 * Much faster than JSON.parse(JSON.stringify()).
 */
function cloneBlocks(blocks: Block[]): Block[] {
  return blocks.map(block => ({
    x: block.x,
    y: block.y,
    direction: block.direction
  }));
}

/**
 * Efficient deep clone for the blocks object in GameState.
 */
function cloneGameBlocks(blocks: { [playerID: string]: Block[] }): { [playerID: string]: Block[] } {
  const result: { [playerID: string]: Block[] } = {};
  for (const playerID in blocks) {
    result[playerID] = cloneBlocks(blocks[playerID]);
  }
  return result;
}

/**
 * Helper that applies a pivot in ephemeral blocks (just for enumerating AI moves).
 */
function ephemeralPivot(
  blocks: Block[],
  blockIndex: number,
  direction: 'left' | 'right'
): Block[] {
  const newBlocks = JSON.parse(JSON.stringify(blocks)) as Block[];
  const block = newBlocks[blockIndex];
  if (!block) return newBlocks;

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

  block.direction =
    direction === 'left' ? leftMap[block.direction] : rightMap[block.direction];
  return newBlocks;
}

/**
 * Helper to determine if a direction matches the approach vector.
 */
function isNose(
  direction: Block['direction'],
  dx: number,
  dy: number
) {
  switch (direction) {
    case 'up':
      return dy === -1;
    case 'down':
      return dy === 1;
    case 'left':
      return dx === -1;
    case 'right':
      return dx === 1;
    default:
      return false;
  }
}

/**
 * Returns occupant if any among official blocks (other players) plus ephemeral blocks (for the same player).
 */
function findBlockOwnerEphemeral(
  allBlocks: { [playerID: string]: Block[] },
  ephemeral: Block[],
  playerID: string,
  x: number,
  y: number
) {
  // Check ephemeral blocks for the player
  for (let i = 0; i < ephemeral.length; i++) {
    if (ephemeral[i].x === x && ephemeral[i].y === y) {
      // occupant is from the same player's ephemeral array
      return { pID: playerID, index: i, ephemeral: true };
    }
  }

  // Otherwise check official G for other players
  const otherPlayers = Object.keys(allBlocks).filter((p) => p !== playerID);
  for (const p of otherPlayers) {
    for (let i = 0; i < allBlocks[p].length; i++) {
      const b = allBlocks[p][i];
      if (b.x === x && b.y === y) {
        return { pID: p, index: i, ephemeral: false };
      }
    }
  }

  return null;
}

/**
 * Helper to apply a single ephemeral step (if valid).
 * This returns a new ephemeral blocks array if valid, or null if invalid.
 */
function ephemeralStep(
  G: GameState,
  ephemeral: Block[],
  playerID: string,
  blockIndex: number,
  dx: number,
  dy: number
): Block[] | null {
  const newBlocks = cloneBlocks(ephemeral);
  const block = newBlocks[blockIndex];
  if (!block) return null;

  const boardSize = G.boardSize;
  const newX = block.x + dx;
  const newY = block.y + dy;
  // check bounds
  if (newX < 0 || newX >= boardSize || newY < 0 || newY >= boardSize) {
    return null;
  }

  // Create a deep copy of the game state for simulation
  const simulatedG = {
    ...G,
    blocks: cloneGameBlocks(G.blocks)
  };

  // check occupant
  const occupant = findBlockOwnerEphemeral(simulatedG.blocks, newBlocks, playerID, newX, newY);
  if (occupant) {
    // occupant belongs to same player => invalid
    if (occupant.pID === playerID) {
      return null;
    }

    // check attack validity: nose-on-body only
    const attackerNose = isNose(block.direction, dx, dy);

    // find occupant's block direction
    let occupantDirection: Block['direction'] | null = null;
    if (occupant.ephemeral) {
      occupantDirection = newBlocks[occupant.index].direction;
    } else {
      occupantDirection = simulatedG.blocks[occupant.pID][occupant.index].direction;
    }

    const defenderNose = occupantDirection
      ? isNose(occupantDirection, -dx, -dy)
      : false;

    // must be nose-on-body, not nose-on-nose or body-on-body
    if (!attackerNose || defenderNose) {
      return null;
    }

    // valid attack: remove occupant, move attacker
    if (occupant.ephemeral) {
      newBlocks.splice(occupant.index, 1);
    } else {
      // For simulation, we'll mark the block as removed by moving it to an invalid position
      // This avoids modifying the original game state
      const removedBlock = simulatedG.blocks[occupant.pID][occupant.index];
      removedBlock.x = -999;
      removedBlock.y = -999;
    }

    block.x = newX;
    block.y = newY;
  } else {
    // empty square, just move
    block.x = newX;
    block.y = newY;
  }

  return newBlocks;
}

/**
 * Helper to determine if a move is likely to be productive.
 * Prunes obviously bad moves like:
 * - Moving away from opponent's side of the board
 * - Pivoting when already in a good attack position
 */
function isProductiveMove(
  block: Block,
  moveType: 'pivot' | 'step',
  playerID: string,
  dx?: number,
  dy?: number
): boolean {
  // For player 1 (bottom), good moves generally go up (negative y)
  // For player 2 (top), good moves generally go down (positive y)
  const isPlayer1 = playerID === '1';
  
  if (moveType === 'step' && dx !== undefined && dy !== undefined) {
    // Check if we're moving in the generally right direction
    if (isPlayer1) {
      // Player 1 should generally move up or horizontally, not down
      if (dy > 0) return false;
    } else {
      // Player 2 should generally move down or horizontally, not up
      if (dy < 0) return false;
    }

    // If we're facing the right direction and moving forward, that's good
    if ((block.direction === 'up' && dy < 0) ||
        (block.direction === 'down' && dy > 0) ||
        (block.direction === 'left' && dx < 0) ||
        (block.direction === 'right' && dx > 0)) {
      return true;
    }
  }

  if (moveType === 'pivot') {
    // Don't pivot if we're already facing the right direction
    if (isPlayer1 && block.direction === 'up') return false;
    if (!isPlayer1 && block.direction === 'down') return false;
  }

  return true;
}

/**
 * BFS approach: gather all possible ephemeral move sequences (up to 2 moves).
 * Each sequence is returned as an array of ephemeral-move objects that
 * can be fed to commitTurn(...) in the real game.
 */
function enumerateAllTurnSequences(G: GameState, playerID: string) {
  type EphemeralMove = {
    type: 'pivot' | 'step';
    blockIndex: number;
    direction?: 'left' | 'right';
    dx?: number;
    dy?: number;
  };

  const results: EphemeralMove[][] = [];

  // initial ephemeral blocks
  const initBlocks = cloneBlocks(G.blocks[playerID]);

  const queue: Array<{
    ephemeralMoves: EphemeralMove[];
    ephemeralBlocks: Block[];
  }> = [];

  // push the empty sequence (0 moves)
  queue.push({ ephemeralMoves: [], ephemeralBlocks: initBlocks });

  while (queue.length) {
    const { ephemeralMoves, ephemeralBlocks } = queue.shift()!;
    // store the current sequence as well
    results.push(ephemeralMoves);

    // If we already used 2 moves, skip generating further child states
    if (ephemeralMoves.length >= 2) continue;

    // Generate next possible ephemeral moves from this state
    // For each block, we can pivot left, pivot right, or step 4 directions.
    // We'll produce a new ephemeral state for each valid move.
    for (let bIndex = 0; bIndex < ephemeralBlocks.length; bIndex++) {
      const block = ephemeralBlocks[bIndex];

      // pivot left
      {
        const newBlocks = ephemeralPivot(ephemeralBlocks, bIndex, 'left');
        const newMove: EphemeralMove = {
          type: 'pivot',
          blockIndex: bIndex,
          direction: 'left',
        };
        const newSequence = [...ephemeralMoves, newMove];
        queue.push({
          ephemeralMoves: newSequence,
          ephemeralBlocks: newBlocks,
        });
      }

      // pivot right
      {
        const newBlocks = ephemeralPivot(ephemeralBlocks, bIndex, 'right');
        const newMove: EphemeralMove = {
          type: 'pivot',
          blockIndex: bIndex,
          direction: 'right',
        };
        const newSequence = [...ephemeralMoves, newMove];
        queue.push({
          ephemeralMoves: newSequence,
          ephemeralBlocks: newBlocks,
        });
      }

      // step 4 directions: up, down, left, right
      const directions = [
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 },
      ];
      for (const { dx, dy } of directions) {
        const stepped = ephemeralStep(G, ephemeralBlocks, playerID, bIndex, dx, dy);
        if (stepped) {
          const newMove: EphemeralMove = {
            type: 'step',
            blockIndex: bIndex,
            dx,
            dy,
          };
          const newSequence = [...ephemeralMoves, newMove];
          queue.push({
            ephemeralMoves: newSequence,
            ephemeralBlocks: stepped,
          });
        }
      }
    }
  }

  return results;
}

/**
 * We define a custom enumerator that returns a single "commitTurn(...)" move
 * for each possible 0-2-move sequence. The empty sequence effectively acts as a pass.
 */
function improvedEnumerator(G: GameState, ctx: any) {
  const moves: Array<{ move: string; args?: any }> = [];
  const playerID = ctx.currentPlayer;

  // If it's not the correct player's turn, no moves
  if (!playerID || playerID !== ctx.currentPlayer) {
    return moves;
  }

  // Gather multi-move ephemeral sequences
  const sequences = enumerateAllTurnSequences(G, playerID);
  for (const seq of sequences) {
    // We'll create a single "commitTurn" move that replays the ephemeral moves
    moves.push({
      move: 'commitTurn',
      args: {
        turnStartBlocks: G.blocks[playerID],
        ephemeralMoves: seq,
      },
    });
  }

  // Note: No need for explicit endTurn - the empty sequence (sequences[0]) acts as a pass
  return moves;
}

/**
 * Helper functions for tactical evaluation
 */
function isVertical(direction: Block['direction']): boolean {
  return direction === 'up' || direction === 'down';
}

function isHorizontal(direction: Block['direction']): boolean {
  return direction === 'left' || direction === 'right';
}

function findEnemyAt(G: GameState, playerID: string, x: number, y: number): Block | null {
  if (x < 0 || x >= G.boardSize || y < 0 || y >= G.boardSize) return null;
  
  for (const pID of Object.keys(G.blocks)) {
    if (pID !== playerID) {
      const enemyBlock = G.blocks[pID].find(
        b => b.x === x && b.y === y && b.x >= 0 && b.y >= 0
      );
      if (enemyBlock) return enemyBlock;
    }
  }
  return null;
}

function enemyNearby(G: GameState, playerID: string, x1: number, y1: number, x2: number, y2: number): boolean {
  // Check all squares adjacent to our L formation
  const adjacentSquares = [
    { x: x1 - 1, y: y1 }, { x: x1 + 1, y: y1 }, { x: x1, y: y1 - 1 }, { x: x1, y: y1 + 1 },
    { x: x2 - 1, y: y2 }, { x: x2 + 1, y: y2 }, { x: x2, y: y2 - 1 }, { x: x2, y: y2 + 1 }
  ];
  
  return adjacentSquares.some(pos => findEnemyAt(G, playerID, pos.x, pos.y) !== null);
}

/**
 * Enhanced evaluation that considers:
 * 1. Block advantage (base score)
 * 2. Position on board (closer to enemy is better)
 * 3. Attack positioning (facing enemy is better)
 * 4. Capturing opportunities (heavily rewarded)
 * 5. Winning position (massively rewarded)
 * 6. Heavy penalty for losing pieces
 * 7. High reward for eliminating enemy pieces
 * 8. Tactical positioning (flanks and L formations)
 */
function evaluateBoard(G: GameState, ctx: any, playerID: string): number {
  let score = 0;
  const isPlayer1 = playerID === '1';
  
  // First check for win condition
  const alivePlayers = Object.keys(G.blocks).filter(pID => 
    G.blocks[pID].some(b => b.x >= 0 && b.y >= 0 && b.x < G.boardSize && b.y < G.boardSize)
  );
  
  if (alivePlayers.length === 1 && alivePlayers[0] === playerID) {
    // We've won! Massive reward
    return 2000;
  } else if (alivePlayers.length === 1) {
    // We've lost
    return -2000;
  }
  
  // Count blocks and evaluate their positions
  const initialBlockCount = { '1': 4, '2': 4 }; // Starting block count for each player
  
  for (const pID of Object.keys(G.blocks)) {
    const isMyBlock = pID === playerID;
    const blocks = G.blocks[pID].filter(
      (b) => b.x >= 0 && b.y >= 0 && b.x < G.boardSize && b.y < G.boardSize
    );
    
    // Calculate eliminated blocks
    const eliminatedCount = initialBlockCount[pID] - blocks.length;
    if (isMyBlock) {
      score -= eliminatedCount * 1000; // Heavy penalty for losing blocks
    } else {
      score += eliminatedCount * 1000; // Equal reward for eliminating enemy blocks
    }
    
    if (isMyBlock) {
      // Evaluate tactical formations between our pieces
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        
        // Base score for having a block
        score += 100;
        
        // Position score: reward being closer to enemy side
        const positionScore = isPlayer1 
          ? (G.boardSize - block.y) * 10  // Player 1: reward being higher up
          : block.y * 10;                 // Player 2: reward being lower down
        score += positionScore;
        
        // Direction score: reward facing the enemy
        const facingScore = isPlayer1
          ? (block.direction === 'up' ? 15 : 0)     // Player 1: reward facing up
          : (block.direction === 'down' ? 15 : 0);  // Player 2: reward facing down
        score += facingScore;
        
        // Check for potential captures
        const dx = block.direction === 'left' ? -1 : block.direction === 'right' ? 1 : 0;
        const dy = block.direction === 'up' ? -1 : block.direction === 'down' ? 1 : 0;
        const targetX = block.x + dx;
        const targetY = block.y + dy;
        
        // Direct attack opportunities
        if (targetX >= 0 && targetX < G.boardSize && targetY >= 0 && targetY < G.boardSize) {
          const enemyBlock = findEnemyAt(G, playerID, targetX, targetY);
          if (enemyBlock) {
            // Check if it's a valid capture (nose-on-body)
            const enemyFacing = isNose(enemyBlock.direction, -dx, -dy);
            if (!enemyFacing) {
              // Reward for being in position to capture
              score += 100;
            }
          }
        }
        
        // Check for flank attack opportunities
        const flankDirections = [
          { dx: -1, dy: 0 }, { dx: 1, dy: 0 },   // left/right
          { dx: 0, dy: -1 }, { dx: 0, dy: 1 }    // up/down
        ];
        
        for (const dir of flankDirections) {
          const sideX = block.x + dir.dx;
          const sideY = block.y + dir.dy;
          
          const enemyBlock = findEnemyAt(G, playerID, sideX, sideY);
          if (enemyBlock) {
            // Check if we can pivot to attack
            const canPivotToAttack = (
              (dir.dx !== 0 && (block.direction === 'up' || block.direction === 'down')) ||
              (dir.dy !== 0 && (block.direction === 'left' || block.direction === 'right'))
            );
            
            if (canPivotToAttack) {
              // Reward being in flank position
              score += 75;
            }
          }
        }
        
        // Check for L formations with other pieces
        for (let j = i + 1; j < blocks.length; j++) {
          const otherBlock = blocks[j];
          const dx = otherBlock.x - block.x;
          const dy = otherBlock.y - block.y;
          
          // If blocks are positioned in L shape
          if (Math.abs(dx) === 1 && Math.abs(dy) === 1) {
            // Check if both pieces are facing to form attack pattern
            const formingAttackPattern = (
              (isVertical(block.direction) && isHorizontal(otherBlock.direction)) ||
              (isHorizontal(block.direction) && isVertical(otherBlock.direction))
            );
            
            if (formingAttackPattern) {
              // Reward coordinated positioning
              score += 50;
              
              // Extra reward if enemy piece is nearby
              if (enemyNearby(G, playerID, block.x, block.y, otherBlock.x, otherBlock.y)) {
                score += 25;
              }
            }
          }
        }
      }
    } else {
      // Penalty for enemy blocks
      score -= blocks.length * 100;
    }
  }
  
  return score;
}

/**
 * MCTS-based AI bot that enumerates multi-move turn sequences instead of single moves.
 * This should produce more sophisticated multi-step tactics.
 */
export class FlankBot extends MCTSBot {
  constructor() {
    super({
      game: FlankGame,
      // Use our improved enumerator that returns the entire turn's sequence
      enumerate: improvedEnumerator,
      objectives: (G, ctx, playerID) => {
        // Always return an object with blockAdvantage, but use a checker that always
        // returns false if playerID is undefined
        const score = playerID ? evaluateBoard(G, ctx, playerID) : -Infinity;
        return {
          blockAdvantage: {
            checker: () => score >= 0,
            weight: 1,
          },
        };
      },
      // Reduced iterations for better performance while maintaining good play
      iterations: 2500,
    });
  }
} 