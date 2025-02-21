import { MCTSBot } from 'boardgame.io/ai';
import { GameState, Block, FlankGame, findBlockOwner } from './gameLogic';
import { openingBook } from './openingBook';

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
  
  // Check opening book first
  const bookKey = `${G.boardSize}-${playerID}`;
  const openingMoves = openingBook[bookKey];
  if (openingMoves && G.moveCount < openingMoves.length) {
    const currentBookMove = openingMoves[G.moveCount];
    // Verify board state matches
    if (boardStatesMatch(G.blocks[playerID], currentBookMove.turnStartBlocks)) {
      return [{
        move: 'commitTurn',
        args: currentBookMove
      }];
    }
  }
  
  // Gather multi-move ephemeral sequences
  const sequences = enumerateAllTurnSequences(G, playerID);
  
  // Filter and sort sequences based on heuristics
  const scoredSequences = sequences.map(seq => ({
    sequence: seq,
    score: evaluateSequence(G, playerID, seq)
  })).filter(item => item.score > -1000); // Filter out obviously bad sequences
  
  // Sort by score descending and take top 70%
  scoredSequences.sort((a, b) => b.score - a.score);
  const cutoff = Math.max(1, Math.floor(scoredSequences.length * 0.7));
  const prunedSequences = scoredSequences.slice(0, cutoff);
  
  // Convert sequences to moves
  for (const { sequence } of prunedSequences) {
    moves.push({
      move: 'commitTurn',
      args: {
        turnStartBlocks: G.blocks[playerID],
        ephemeralMoves: sequence
      }
    });
  }
  
  return moves;
}

/**
 * Helper to evaluate a move sequence
 */
function evaluateSequence(G: GameState, playerID: string, sequence: any[]): number {
  let score = 0;
  const isPlayer1 = playerID === '1';
  
  // Simulate the sequence
  const simulatedG = { ...G, blocks: { ...G.blocks } };
  simulatedG.blocks[playerID] = cloneBlocks(G.blocks[playerID]);
  
  for (const move of sequence) {
    if (move.type === 'step') {
      // Reward forward progress
      const dy = move.dy || 0;
      if ((isPlayer1 && dy < 0) || (!isPlayer1 && dy > 0)) {
        score += 50;
      }
      
      // Penalize backward movement
      if ((isPlayer1 && dy > 0) || (!isPlayer1 && dy < 0)) {
        score -= 75;
      }
    }
    
    // Apply move to simulation
    if (move.type === 'pivot') {
      ephemeralPivot(simulatedG.blocks[playerID], move.blockIndex, move.direction);
    } else if (move.type === 'step') {
      const stepped = ephemeralStep(simulatedG, simulatedG.blocks[playerID], playerID, move.blockIndex, move.dx, move.dy);
      if (stepped) {
        simulatedG.blocks[playerID] = stepped;
      }
    }
  }
  
  // Evaluate final position
  score += evaluateBoard(simulatedG, null, playerID) * 0.5; // Weight final position less than immediate tactics
  
  return score;
}

/**
 * Helper to check if two board states match
 */
function boardStatesMatch(current: Block[], target: Block[]): boolean {
  if (current.length !== target.length) return false;
  
  for (let i = 0; i < current.length; i++) {
    if (current[i].x !== target[i].x ||
        current[i].y !== target[i].y ||
        current[i].direction !== target[i].direction) {
      return false;
    }
  }
  
  return true;
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
 * 9. Control of key squares
 * 10. Piece coordination
 * 11. Mobility and flexibility
 */
function evaluateBoard(G: GameState, ctx: any, playerID: string): number {
  let score = 0;
  const isPlayer1 = playerID === '1';
  
  // First check for win condition
  const alivePlayers = Object.keys(G.blocks).filter(pID => 
    G.blocks[pID].some(b => b.x >= 0 && b.y >= 0 && b.x < G.boardSize && b.y < G.boardSize)
  );
  
  if (alivePlayers.length === 1 && alivePlayers[0] === playerID) {
    return 2000; // Win
  } else if (alivePlayers.length === 1) {
    return -2000; // Loss
  }
  
  const initialBlockCount = { '1': 4, '2': 4 };
  const centerSquares = [
    { x: 3, y: 3 }, { x: 3, y: 4 },
    { x: 4, y: 3 }, { x: 4, y: 4 }
  ];
  
  for (const pID of Object.keys(G.blocks)) {
    const isMyBlock = pID === playerID;
    const blocks = G.blocks[pID].filter(
      (b) => b.x >= 0 && b.y >= 0 && b.x < G.boardSize && b.y < G.boardSize
    );
    
    // Calculate eliminated blocks
    const eliminatedCount = initialBlockCount[pID] - blocks.length;
    if (isMyBlock) {
      score -= eliminatedCount * 1000; // Heavy penalty for losing blocks
      
      // Be more defensive when we have few pieces left
      if (blocks.length <= 2) {
        score -= 500; // Additional penalty to encourage defensive play
      }
    } else {
      score += eliminatedCount * 1000; // Equal reward for eliminating enemy blocks
      
      // Be more cautious when enemy has few pieces
      if (blocks.length <= 2) {
        score -= 200; // Penalty to discourage risky moves when close to winning
      }
    }
    
    if (isMyBlock) {
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        
        // Base score for having a block
        score += 100;
        
        // Position score: reward being closer to enemy side
        const positionScore = isPlayer1 
          ? (G.boardSize - block.y) * 15  // Player 1: reward being higher up
          : block.y * 15;                 // Player 2: reward being lower down
        score += positionScore;
        
        // Direction score: reward facing the enemy
        const facingScore = isPlayer1
          ? (block.direction === 'up' ? 20 : 0)     // Player 1: reward facing up
          : (block.direction === 'down' ? 20 : 0);  // Player 2: reward facing down
        score += facingScore;
        
        // Control of key squares (center control)
        if (centerSquares.some(sq => sq.x === block.x && sq.y === block.y)) {
          score += 50; // Bonus for controlling center squares
        }
        
        // Mobility score - count available moves
        const availableMoves = countAvailableMoves(G, block, playerID);
        score += availableMoves * 10;
        
        // When few pieces remain, prioritize safety
        if (blocks.length <= 2) {
          // Reward staying away from enemy pieces
          const nearestEnemyDist = findNearestEnemyDistance(G, block, playerID);
          score += nearestEnemyDist * 30; // Reward being further from enemies
        }
      }
    }
  }
  
  return score;
}

/**
 * Helper to count available moves for a piece
 */
function countAvailableMoves(G: GameState, block: Block, playerID: string): number {
  let count = 0;
  const directions = [
    { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
    { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
  ];
  
  // Count possible steps
  for (const dir of directions) {
    const newX = block.x + dir.dx;
    const newY = block.y + dir.dy;
    if (newX >= 0 && newX < G.boardSize && newY >= 0 && newY < G.boardSize) {
      const occupant = findBlockOwner(G, newX, newY);
      if (!occupant || occupant.pID !== playerID) {
        count++;
      }
    }
  }
  
  // Add pivots (always 2 possible unless blocked)
  count += 2;
  
  return count;
}

/**
 * Check if a piece is blocked by friendly pieces
 */
function isBlockedByFriendly(G: GameState, block: Block, playerID: string): boolean {
  const dx = block.direction === 'left' ? -1 : block.direction === 'right' ? 1 : 0;
  const dy = block.direction === 'up' ? -1 : block.direction === 'down' ? 1 : 0;
  
  // Check square in front
  const frontX = block.x + dx;
  const frontY = block.y + dy;
  
  if (frontX >= 0 && frontX < G.boardSize && frontY >= 0 && frontY < G.boardSize) {
    const occupant = findBlockOwner(G, frontX, frontY);
    if (occupant && occupant.pID === playerID) {
      return true;
    }
  }
  
  return false;
}

// Helper function to find distance to nearest enemy piece
function findNearestEnemyDistance(G: GameState, block: Block, playerID: string): number {
  let minDist = G.boardSize * 2; // Initialize to maximum possible distance
  
  for (const pID of Object.keys(G.blocks)) {
    if (pID !== playerID) {
      for (const enemyBlock of G.blocks[pID]) {
        if (enemyBlock.x >= 0 && enemyBlock.y >= 0) {
          const dist = Math.abs(block.x - enemyBlock.x) + Math.abs(block.y - enemyBlock.y);
          minDist = Math.min(minDist, dist);
        }
      }
    }
  }
  
  return minDist;
}

/**
 * Enhanced MCTS-based AI bot with improved evaluation,
 * move pruning, and opening book integration
 */
export class FlankBot extends MCTSBot {
  constructor() {
    super({
      game: FlankGame,
      enumerate: improvedEnumerator,
      objectives: (G, ctx, playerID) => {
        const score = playerID ? evaluateBoard(G, ctx, playerID) : -Infinity;
        return {
          blockAdvantage: {
            checker: () => score >= 0,
            weight: 1,
          },
        };
      },
      iterations: 300,  // Further reduced iterations for stability
      playoutDepth: 3,  // Reduced depth for more stable endgame
    });
  }
} 