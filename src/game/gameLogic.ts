import { Game, Ctx } from 'boardgame.io'
import { FnContext } from 'boardgame.io/dist/types/src/types'

export interface Block {
  x: number
  y: number
  direction: 'up' | 'down' | 'left' | 'right'
}

export interface GameState {
  boardSize: number
  blocks: {
    [playerID: string]: Block[]
  }
  moveCount: number  // Track moves used in current turn
  lastHighlightedPiece?: {
    playerID: string
    blockIndex: number
  }
}

function getDefaultSetup(numPlayers: number) {
  const defaultState: GameState = {
    boardSize: 8,
    blocks: {
      '1': [], // Player 1's blocks (human)
      '2': [], // Player 2's blocks (AI)
    },
    moveCount: 0,
    lastHighlightedPiece: undefined
  }

  // Player 1's blocks at bottom side
  defaultState.blocks['1'].push({ x: 2, y: 7, direction: 'up' })
  defaultState.blocks['1'].push({ x: 3, y: 7, direction: 'up' })
  defaultState.blocks['1'].push({ x: 4, y: 7, direction: 'up' })
  defaultState.blocks['1'].push({ x: 5, y: 7, direction: 'up' })

  // Player 2's blocks at top side
  defaultState.blocks['2'].push({ x: 2, y: 0, direction: 'down' })
  defaultState.blocks['2'].push({ x: 3, y: 0, direction: 'down' })
  defaultState.blocks['2'].push({ x: 4, y: 0, direction: 'down' })
  defaultState.blocks['2'].push({ x: 5, y: 0, direction: 'down' })

  return defaultState
}

// Helper to pivot direction 90 degrees
function pivotDirection(current: 'up' | 'down' | 'left' | 'right', turn: 'left' | 'right') {
  const leftMap: Record<Block['direction'], Block['direction']> = {
    up: 'left',
    left: 'down',
    down: 'right',
    right: 'up',
  }
  const rightMap: Record<Block['direction'], Block['direction']> = {
    up: 'right',
    right: 'down',
    down: 'left',
    left: 'up',
  }
  return turn === 'left' ? leftMap[current] : rightMap[current]
}

// Returns the occupant of a square if any
function findBlockOwner(G: GameState, x: number, y: number) {
  for (const pID in G.blocks) {
    for (let i = 0; i < G.blocks[pID].length; i++) {
      const b = G.blocks[pID][i]
      if (b.x === x && b.y === y) {
        return { pID, i }
      }
    }
  }
  return null
}

// Helper to determine if a direction matches the approach vector
function isNose(direction: Block['direction'], approach: { dx: number; dy: number }) {
  switch (direction) {
    case 'up':    return approach.dy === -1; // Moving up
    case 'down':  return approach.dy === 1;  // Moving down
    case 'left':  return approach.dx === -1; // Moving left
    case 'right': return approach.dx === 1;  // Moving right
    default:      return false;
  }
}

// Resolve collision to see who is removed.
// If attackerNose & defenderNose => remove attacker
// If attackerNose & !defenderNose => remove defender
// Otherwise => remove attacker
function resolveCollision(
  G: GameState,
  attackerP: string,
  attackerIdx: number,
  defenderP: string,
  defenderIdx: number,
  approachDX: number,
  approachDY: number
): { removedAttacker: boolean; removedDefender: boolean } {
  const attacker = G.blocks[attackerP][attackerIdx];
  const defender = G.blocks[defenderP][defenderIdx];

  // Determine if attacker approached with nose facing the defender
  const attackerNose = isNose(attacker.direction, { dx: approachDX, dy: approachDY });

  // Determine if defender's nose was facing the attacker
  const defenderNose = isNose(defender.direction, { dx: -approachDX, dy: -approachDY });

  // If attacker nose vs. defender nose => remove the attacker
  if (attackerNose && defenderNose) {
    G.blocks[attackerP].splice(attackerIdx, 1);
    return { removedAttacker: true, removedDefender: false };
  }

  // If attacker nose vs. defender body => remove defender
  if (attackerNose && !defenderNose) {
    G.blocks[defenderP].splice(defenderIdx, 1);
    return { removedAttacker: false, removedDefender: true };
  }

  // Otherwise (body vs. body, or body vs. nose) => remove attacker
  G.blocks[attackerP].splice(attackerIdx, 1);
  return { removedAttacker: true, removedDefender: false };
}

// Move functions
const pivotBlock = (context: any, args: { playerID: string; blockIndex: number; direction: 'left' | 'right' }) => {
  const { G, events } = context
  const { playerID, blockIndex, direction } = args
  if (!playerID) return
  
  const block = G.blocks[playerID][blockIndex]
  if (!block) return

  block.direction = pivotDirection(block.direction, direction)
  G.moveCount++

  // End turn if move limit reached
  if (G.moveCount >= 3 && events?.endTurn) {
    events.endTurn()
  }
}

const stepBlock = (context: any, args: { playerID: string; blockIndex: number; targetX: number; targetY: number }) => {
  const { G, events } = context
  const { playerID, blockIndex, targetX, targetY } = args
  if (!playerID) return

  const block = G.blocks[playerID][blockIndex]
  if (!block) return

  // Check adjacency (orthogonal only)
  const dist = Math.abs(block.x - targetX) + Math.abs(block.y - targetY)
  if (dist !== 1) return

  // Record old position for approach vector
  const dx = targetX - block.x
  const dy = targetY - block.y

  // Check occupant first
  const occupant = findBlockOwner(G, targetX, targetY)
  if (occupant) {
    // Occupant belongs to same player => invalid move
    if (occupant.pID === playerID) {
      return
    }

    // Check attack validity
    const attackerNose = isNose(block.direction, { dx, dy })
    const defender = G.blocks[occupant.pID][occupant.i]
    const defenderNose = isNose(defender.direction, { dx: -dx, dy: -dy })

    // Only allow nose-on-body attacks
    // Prevent: nose-on-nose, body-on-body, body-on-nose
    if (!attackerNose || defenderNose) {
      return // Invalid attack, move is prevented
    }

    // Valid nose-on-body attack - remove defender and move attacker
    G.blocks[occupant.pID].splice(occupant.i, 1)
    block.x = targetX
    block.y = targetY
  } else {
    // No occupant, just move
    block.x = targetX
    block.y = targetY
  }

  G.moveCount++

  // End turn if move limit reached
  if (G.moveCount >= 3 && events?.endTurn) {
    events.endTurn()
  }
}

const commitTurn = (context: any, args: { 
  turnStartBlocks: Block[],
  ephemeralMoves: Array<{
    type: 'pivot' | 'step',
    blockIndex: number,
    direction?: 'left' | 'right',
    dx?: number,
    dy?: number
  }>
}) => {
  const { G, ctx, events } = context
  const player = ctx.currentPlayer
  if (!player) return

  // Reset player's blocks to their turn-start positions
  G.blocks[player] = JSON.parse(JSON.stringify(args.turnStartBlocks))
  G.moveCount = 0

  // Replay each ephemeral move
  for (const move of args.ephemeralMoves) {
    if (G.moveCount >= 3) break

    if (move.type === 'pivot') {
      pivotBlock(context, {
        playerID: player,
        blockIndex: move.blockIndex,
        direction: move.direction!
      })
    } else if (move.type === 'step') {
      const block = G.blocks[player][move.blockIndex]
      if (!block) continue
      const targetX = block.x + (move.dx || 0)
      const targetY = block.y + (move.dy || 0)
      stepBlock(context, {
        playerID: player,
        blockIndex: move.blockIndex,
        targetX,
        targetY
      })
    }
  }

  // Always end turn after commit
  if (events?.endTurn) {
    events.endTurn()
  }
}

const highlightPiece = (context: any, args: { playerID: string; blockIndex: number }) => {
  const { G } = context
  const { playerID, blockIndex } = args
  
  // Update the last highlighted piece
  G.lastHighlightedPiece = {
    playerID,
    blockIndex
  }
}

export const FlankGame: Game<GameState> = {
  name: 'flank',
  
  setup: ({ ctx }) => {
    return getDefaultSetup(ctx.numPlayers)
  },

  turn: {
    onBegin: (G) => {
      G.moveCount = 0  // Reset move count at start of turn
    },
    order: {
      playOrder: () => ['1','2'],
      first: () => 0,
      next: (context) => (context.ctx.playOrderPos + 1) % context.ctx.playOrder.length
    }
  },

  ai: {
    enumerate: (G: GameState, ctx: any) => {
      const moves: Array<{
        move: string;
        args?: any;
      }> = [];
      const playerID = ctx.currentPlayer;
      const blocks = G.blocks[playerID];

      // First, add all possible moves for each block
      blocks.forEach((block, blockIndex) => {
        // Add rotation moves
        moves.push({ move: 'pivotBlock', args: { playerID, blockIndex, direction: 'left' } });
        moves.push({ move: 'pivotBlock', args: { playerID, blockIndex, direction: 'right' } });

        // Add movement moves
        const directions = [
          { dx: 0, dy: -1 },  // up
          { dx: 0, dy: 1 },   // down
          { dx: -1, dy: 0 },  // left
          { dx: 1, dy: 0 },   // right
        ];

        directions.forEach(({ dx, dy }) => {
          const targetX = block.x + dx;
          const targetY = block.y + dy;
          // Check if move is within board bounds
          if (targetX >= 0 && targetX < G.boardSize && targetY >= 0 && targetY < G.boardSize) {
            // Check if target square is occupied by own piece
            const occupant = findBlockOwner(G, targetX, targetY);
            if (!occupant || occupant.pID !== playerID) {
              moves.push({
                move: 'stepBlock',
                args: { playerID, blockIndex, targetX, targetY }
              });
            }
          }
        });
      });

      // Always add end turn as a possible move
      moves.push({ move: 'endTurn' });

      return moves;
    }
  },

  moves: {
    pivotBlock,
    stepBlock,
    commitTurn,
    highlightPiece
  },

  endIf: ({ G }: { G: GameState }) => {
    // If only one player (or none) has blocks left
    let alivePlayers = Object.keys(G.blocks).filter((pID) => G.blocks[pID].length > 0)
    if (alivePlayers.length === 1) {
      return { winner: alivePlayers[0] }
    } else if (alivePlayers.length === 0) {
      return { draw: true }
    }
  }
} 