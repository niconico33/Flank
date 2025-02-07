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
}

function getDefaultSetup(numPlayers: number) {
  const defaultState: GameState = {
    boardSize: 8,
    blocks: {
      '0': [], // Player 0's blocks (human)
      '1': [], // Player 1's blocks (AI)
    },
  }

  // Player 0's blocks at top side
  defaultState.blocks['0'].push({ x: 2, y: 0, direction: 'down' })
  defaultState.blocks['0'].push({ x: 3, y: 0, direction: 'down' })
  defaultState.blocks['0'].push({ x: 4, y: 0, direction: 'down' })
  defaultState.blocks['0'].push({ x: 5, y: 0, direction: 'down' })

  // Player 1's blocks at bottom side
  defaultState.blocks['1'].push({ x: 2, y: 7, direction: 'up' })
  defaultState.blocks['1'].push({ x: 3, y: 7, direction: 'up' })
  defaultState.blocks['1'].push({ x: 4, y: 7, direction: 'up' })
  defaultState.blocks['1'].push({ x: 5, y: 7, direction: 'up' })

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

// Determination of nose vs. body collision
// The "nose" is in the direction the block faces
// "Body" is any other side
// If we do a step onto an opponent's square, figure out if it's nose vs body or nose vs nose, etc.
function resolveCollision(
  G: GameState,
  attackerP: string,
  attackerIdx: number,
  defenderP: string,
  defenderIdx: number
) {
  const attacker = G.blocks[attackerP][attackerIdx]
  const defender = G.blocks[defenderP][defenderIdx]

  // If attacker steps onto the square, see how we approached the defender
  // We'll see if the step direction matches "attacker.direction"
  // Then see how that compares with defender.direction
  // Nose vs body is valid flank => remove defender
  // Nose vs nose or body vs body => remove attacker

  // For simplicity, let's interpret direction as:
  // - up => nose is from above, body is from left, right, down
  // - down => nose is from below, body is from left, right, up
  // - left => nose is from left, body is from up, down, right
  // - right => nose is from right, body is from up, down, left

  // Determine the "approach" direction from attacker relative to the defender
  const dx = attacker.x - defender.x
  const dy = attacker.y - defender.y

  // This means the attacker came from somewhere
  // (dx, dy) = (1, 0) => attacker is to the right of defender
  // (dx, dy) = (-1, 0) => attacker is to the left
  // (dx, dy) = (0, 1) => attacker is below
  // (dx, dy) = (0, -1) => attacker is above

  function isNose(direction: Block['direction'], approach: { dx: number; dy: number }) {
    if (direction === 'up' && approach.dy === 1) return true // attacker approached from below => nose is up
    if (direction === 'down' && approach.dy === -1) return true
    if (direction === 'left' && approach.dx === 1) return true
    if (direction === 'right' && approach.dx === -1) return true
    return false
  }

  const attackerNose = isNose(attacker.direction, { dx: -dx, dy: -dy })
  // attacker approached the square from the opposite direction of (dx, dy),
  // so we invert them for the "approach direction" from attacker's viewpoint

  const defenderNose = isNose(defender.direction, { dx, dy })

  // If attackerNose vs. defenderNose => nose-on-nose => attacker is removed
  if (attackerNose && defenderNose) {
    // remove the attacker
    G.blocks[attackerP].splice(attackerIdx, 1)
    return
  }

  // If attackerNose vs. NOT defenderNose => remove defender
  if (attackerNose && !defenderNose) {
    G.blocks[defenderP].splice(defenderIdx, 1)
    return
  }

  // Otherwise, it's body-on-body or body vs nose => attacker is removed
  G.blocks[attackerP].splice(attackerIdx, 1)
}

export const FlankGame: Game<GameState> = {
  name: 'flank',
  
  setup: ({ ctx }) => {
    return getDefaultSetup(ctx.numPlayers)
  },

  // Each turn: up to 3 moves
  turn: {
    moveLimit: 3,
    order: {
      first: () => 0,
      next: (context: FnContext<GameState>) => {
        const playerOrder = ['0', '1'];
        const currentIdx = playerOrder.indexOf(context.ctx.currentPlayer);
        return (currentIdx + 1) % playerOrder.length;
      }
    }
  },

  moves: {
    pivotBlock: (context, args: { playerID: string; blockIndex: number; direction: 'left' | 'right' }) => {
      const { G } = context;
      const { playerID, blockIndex, direction } = args;
      if (!playerID) return;
      
      const block = G.blocks[playerID][blockIndex];
      if (!block) return;
      block.direction = pivotDirection(block.direction, direction);
    },

    stepBlock: (context, args: { playerID: string; blockIndex: number; targetX: number; targetY: number }) => {
      const { G } = context;
      const { playerID, blockIndex, targetX, targetY } = args;
      if (!playerID) return;

      const block = G.blocks[playerID][blockIndex];
      if (!block) return;

      // Check adjacency (orthogonal only)
      const dist = Math.abs(block.x - targetX) + Math.abs(block.y - targetY);
      if (dist !== 1) {
        // Not an adjacent square, do nothing
        return;
      }

      // Attempt move
      const occupant = findBlockOwner(G, targetX, targetY);

      // Temporarily store old position
      const oldX = block.x;
      const oldY = block.y;

      block.x = targetX;
      block.y = targetY;

      if (occupant) {
        // There's an opponent block or your own block?
        if (occupant.pID === playerID) {
          // That means you're trying to move into your own block => invalid or no effect
          // Revert
          block.x = oldX;
          block.y = oldY;
          return;
        } else {
          // Attack scenario
          resolveCollision(G, playerID, blockIndex, occupant.pID, occupant.i);
        }
      }
    },

    endTurn: (context) => {
      const { events } = context;
      if (events?.endTurn) {
        events.endTurn();
      }
    },
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