"use client";
import { useState } from "react";

export default function Controls() {
  const [selectedBlock, setSelectedBlock] = useState(null);

  const rotateBlock = () => {
    // TODO: Implement rotate logic
    console.log("Rotate block");
  };

  const moveBlock = () => {
    // TODO: Implement move logic
    console.log("Move block");
  };

  const attack = () => {
    // TODO: Implement attack logic
    console.log("Attack");
  };

  return (
    <div className="flex justify-center space-x-4 mb-6">
      <button onClick={rotateBlock} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
        Rotate
      </button>
      <button onClick={moveBlock} className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded">
        Move
      </button>
      <button onClick={attack} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded">
        Attack
      </button>
    </div>
  );
} 