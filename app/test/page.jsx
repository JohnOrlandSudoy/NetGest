'use client';
import dynamic from "next/dynamic";

// const WebSocketExample = dynamic(() => import("../../components/WebSocketExample"), { ssr: false });
export default function TestPage() {
    return (
        <div>
            {/*<WebSocketExample />*/}
            <h2>hello</h2>
        </div>
    );
}

