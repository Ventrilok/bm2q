import type { Server } from "@colyseus/core";
import { BM2QRoom } from "./rooms/bm2q-room";

// Single place where game rooms are registered, shared by the production
// entry point, the standalone game server and the tests.
export function registerRooms(gameServer: Server) {
  gameServer.define("bm2q", BM2QRoom);
}
