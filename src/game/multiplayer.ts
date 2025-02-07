import { Server } from "boardgame.io/server";
import { FlankGame } from "./gameLogic";

const server = Server({ games: [FlankGame] });
server.run(8000); 