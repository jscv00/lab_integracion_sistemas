// @ts-nocheck
import { serve } from "bun";
import { ObjectId, Timestamp } from "mongodb";
import { pricesAAPLCollection } from "./utils/dbUtils.ts";

// Load Finnhub API key from environment
const API_KEY = Bun.env.FINNHUB_API_KEY;

if (!API_KEY) throw new Error("Missing FINNHUB_API_KEY in .env");

// Connect to MongoDB

// State for dynamic thresholds
let basePrice: number | null = null;
let upThreshold: number;
let downThreshold: number;
let thresholdsSet = false;

const clients = new Set<WebSocket>();

serve({
  port: Number(Bun.env.PORT),
  websocket: {
    open(ws) {
      clients.add(ws);
      console.log("Client connected", clients.size);
    },
    message(ws, message) {
      // No messages expected
    },
    close(ws) {
      clients.delete(ws);
      console.log("Client disconnected. Total:", clients.size);
    },
  },

  async fetch(req, server) {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }
    // Try to upgrade to WebSocket
    if (server.upgrade(req)) {
      return;
    }

    const url = new URL(req.url);

    if (url.pathname === "/save" && req.method === "POST") {
      const { price } = await req.json();
      if (!price) {
        return new Response("Price is required", { status: 400 });
      }
      const doc = { price, upThreshold, downThreshold, timestamp: new Date() };
      const result = await pricesAAPLCollection.insertOne(doc);
      return new Response(JSON.stringify({ insertedId: result.insertedId }), {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    if (url.pathname === "/saved" && req.method === "GET") {
      const savedPrices = await pricesAAPLCollection
        .find({}, { sort: { timestamp: -1 } })
        .project({ upThreshold: 0, downThreshold: 0 })
        .toArray();

      return new Response(JSON.stringify(savedPrices), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    if (url.pathname.startsWith("/saved/") && req.method === "DELETE") {
      const id = url.pathname.split("/")[2];

      const recordId = new ObjectId(id);

      const query = { _id: recordId };
      const result = await pricesAAPLCollection.deleteOne(query);

      return new Response(
        JSON.stringify({ deletedCount: result.deletedCount }),
        {
          status: 204,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Fallback for normal HTTP requests
    return new Response(null, { status: 200 });
  },
});

// Poll Finnhub API every 5 seconds for AAPL price
setInterval(async () => {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=AAPL&token=${API_KEY}`
    );
    const data = await res.json();
    const raw: number = data.c; // real price from API
    // Add small random jitter for demo (±0.10 USD)
    const noise = (Math.random() - 0.5) * 0.2;
    const latest: number = parseFloat((raw + noise).toFixed(2));
    // console.log(`[Server] demo price with jitter: ${latest}`);
    // console.log("[Server] fetched AAPL price:", latest);

    // Initialize thresholds on first tick
    if (!thresholdsSet) {
      basePrice = latest;
      upThreshold = basePrice * 1.01;
      downThreshold = basePrice * 0.99;
      thresholdsSet = true;
    }

    upThreshold = +(latest * 1.01).toFixed(2);
    downThreshold = +(latest * 0.99).toFixed(2);

    // Broadcast price update to all clients
    // Broadcast every tick with demo price
    for (const ws of clients) {
      ws.send(
        JSON.stringify({
          symbol: "AAPL",
          price: latest,
          upThreshold,
          downThreshold,
        })
      );
    }
  } catch (err) {
    console.error("Error fetching price:", err);
  }
}, 5000);

console.log("🚀 Bun WebSocket server listening on ws://localhost:3002");
