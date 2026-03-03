import { NextResponse } from "next/server";
import { emitter } from "@/lib/emitter";
import fs from "fs";
import path from "path";

// Use /tmp for persistence across lambda cold starts (within same instance)
// Vercel /tmp is only available for the current execution, but it persists
// as long as the lambda is warm. For true persistence across instances,
// we should use a real DB, but for a quick fix without one, we rely on 
// a "Latest Wins" strategy and long-polling management.

const STATE_FILE = path.join("/tmp", "game-state.json");

function readState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("Error reading state file:", err);
  }
  return null;
}

function writeState(state: any) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state));
  } catch (err) {
    console.error("Error writing state file:", err);
  }
}

// Global variable as secondary cache/emitter source
const globalForGame = global as unknown as { gameState: any };

if (!globalForGame.gameState) {
  const persisted = readState();
  globalForGame.gameState = persisted || {
    activeRow: null,
    revealedRows: [],
    verticalRevealed: false,
    timerEndsAt: null,
    timerActive: false,
    timeLeft: 20,
    teamAnswer: "",
    teamAnswerStatus: "idle",
    showRound2Transition: false,
    version: Date.now(),
  };
}

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse | Response> {
  const url = new URL(req.url);
  const isPolling = url.searchParams.get("poll") === "true";

  // Check if file has newer state than memory (unlikely but possible)
  const persisted = readState();
  if (persisted && persisted.version > (globalForGame.gameState.version || 0)) {
    globalForGame.gameState = persisted;
  }

  if (isPolling) {
    return new Promise<NextResponse | Response>((resolve) => {
      const timeout = setTimeout(() => {
        emitter.off("update", listener);
        resolve(NextResponse.json({ timeout: true }));
      }, 10000);

      const listener = (newState: any) => {
        clearTimeout(timeout);
        emitter.off("update", listener);
        resolve(NextResponse.json(newState));
      };

      emitter.once("update", listener);

      req.signal.addEventListener("abort", () => {
        clearTimeout(timeout);
        emitter.off("update", listener);
        resolve(new Response(null, { status: 204 }));
      });
    });
  }

  return NextResponse.json(globalForGame.gameState);
}

export async function POST(req: Request) {
  try {
    const updates = await req.json();
    
    // Ensure we have the latest before merging
    const persisted = readState();
    if (persisted && persisted.version > (globalForGame.gameState.version || 0)) {
      globalForGame.gameState = persisted;
    }

    const nextState = { 
      ...globalForGame.gameState, 
      ...updates, 
      version: Date.now() 
    };
    
    globalForGame.gameState = nextState;
    writeState(nextState);

    // Notify any waiting long-pollers on the SAME instance
    emitter.emit("update", globalForGame.gameState);

    return NextResponse.json(globalForGame.gameState);
  } catch (err) {
    return NextResponse.json({ error: "Failed to update" }, { status: 400 });
  }
}
