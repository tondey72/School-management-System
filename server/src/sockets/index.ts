import { Server } from "socket.io";

export function registerSocketHandlers(io: Server): void {
  io.on("connection", (socket) => {
    socket.on("join-school", (schoolId: string) => {
      socket.join(`school:${schoolId}`);
    });

    socket.on("disconnect", () => {
      // Keep explicit disconnect handler for operational tracing extensions.
    });
  });
}
