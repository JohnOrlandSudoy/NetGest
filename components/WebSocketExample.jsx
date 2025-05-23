'use client';

import { useEffect, useState } from "react";
import echo from "../lib/echo";

export default function WebSocketExample() {
    const [message, setMessage] = useState(null);

    useEffect(() => {
        if (!echo) return; // Ensure `echo` is available (client-side only)

        const channel = echo.channel("packets");

        channel.listen("PacketCaptured", (event) => {
            setMessage(event.message);
            console.log("WebSocket data received:", event.message);
        });

        return () => {
            channel.stopListening("PacketCaptured");
        };
    }, []);

    return (
        <div>
            <h1>WebSocket Example</h1>
            <p>Message from WebSocket: {message || "Waiting for data..."}</p>
        </div>
    );
}
