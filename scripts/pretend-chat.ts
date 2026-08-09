const username = process.argv[2];
const side = process.argv[3] ?? "left";

if (!username) {
  console.error("Usage: bun run scripts/pretend-chat.ts <username> [left|right]");
  process.exit(1);
}

if (side !== "left" && side !== "right") {
  console.error('Invalid side: must be "left" or "right", got "%s"', side);
  process.exit(1);
}

const url = "ws://localhost:8987/ws";
const ws = new WebSocket(url);

ws.onopen = () => {
  console.log("Connected to %s", url);
  console.log("Sending show:true for %s on %s", username, side);
  ws.send(JSON.stringify({ side, username, show: true }));

  setTimeout(() => {
    console.log("Sending show:false");
    ws.send(JSON.stringify({ side, username, show: false }));
    ws.close();
    process.exit(0);
  }, 3000);
};

ws.onerror = () => {
  console.error("WebSocket error. Is the streamer app running on localhost:8987?");
  process.exit(1);
};
