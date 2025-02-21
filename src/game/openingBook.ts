// Opening book for common early game moves
// Each sequence is an array of moves that should be played in order
export const openingBook = {
  // Key format: "boardSize-playerID"
  "8-1": [
    // Player 1 (bottom) opening moves
    {
      turnStartBlocks: [
        { x: 2, y: 5, direction: 'up' },
        { x: 3, y: 5, direction: 'up' },
        { x: 4, y: 5, direction: 'up' },
        { x: 5, y: 5, direction: 'up' }
      ],
      ephemeralMoves: [
        // Move central pieces forward
        { type: 'step', blockIndex: 1, dx: 0, dy: -1 },
        { type: 'step', blockIndex: 2, dx: 0, dy: -1 }
      ]
    },
    // Second turn - develop flanks
    {
      turnStartBlocks: [
        { x: 2, y: 5, direction: 'up' },
        { x: 3, y: 4, direction: 'up' },
        { x: 4, y: 4, direction: 'up' },
        { x: 5, y: 5, direction: 'up' }
      ],
      ephemeralMoves: [
        { type: 'pivot', blockIndex: 0, direction: 'right' },
        { type: 'pivot', blockIndex: 3, direction: 'left' }
      ]
    }
  ],
  "8-2": [
    // Player 2 (top) opening moves
    {
      turnStartBlocks: [
        { x: 2, y: 2, direction: 'down' },
        { x: 3, y: 2, direction: 'down' },
        { x: 4, y: 2, direction: 'down' },
        { x: 5, y: 2, direction: 'down' }
      ],
      ephemeralMoves: [
        // Move central pieces forward
        { type: 'step', blockIndex: 1, dx: 0, dy: 1 },
        { type: 'step', blockIndex: 2, dx: 0, dy: 1 }
      ]
    },
    // Second turn - develop flanks
    {
      turnStartBlocks: [
        { x: 2, y: 2, direction: 'down' },
        { x: 3, y: 3, direction: 'down' },
        { x: 4, y: 3, direction: 'down' },
        { x: 5, y: 2, direction: 'down' }
      ],
      ephemeralMoves: [
        { type: 'pivot', blockIndex: 0, direction: 'right' },
        { type: 'pivot', blockIndex: 3, direction: 'left' }
      ]
    }
  ]
}; 