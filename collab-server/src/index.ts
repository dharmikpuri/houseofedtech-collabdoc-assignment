import { Server } from "@hocuspocus/server";

const port = Number(process.env.PORT ?? 1234);

// In-memory and unauthenticated: local dev only. Auth + persistence land in the next phase.
const server = new Server({
  port,
  async onListen() {
    console.log(`Collab server ready on ws://localhost:${port}`);
  },
  async onConnect({ documentName }) {
    console.log(`connect   ${documentName}`);
  },
  async onDisconnect({ documentName }) {
    console.log(`disconnect ${documentName}`);
  },
});

server.listen();
