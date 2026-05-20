import { useEffect, useState } from "react";
import { io } from "socket.io-client";

export function useLiveNotifications(schoolId: string) {
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    const socket = io(undefined, { path: "/socket.io" });
    socket.emit("join-school", schoolId);

    socket.on("notification", (payload: { message: string }) => {
      setMessages((current) => [payload.message, ...current].slice(0, 10));
    });

    return () => {
      socket.disconnect();
    };
  }, [schoolId]);

  return messages;
}
