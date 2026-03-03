import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { broadcastGameState } from "@/lib/supabase";

// Use /tmp for persistence across lambda cold starts (within same instance)
const STATE_FILE = path.join("/tmp", "game-state.json");

function readState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
    }
  } catch (err) {}
  return null;
}

function writeState(state: any) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state));
  } catch (err) {}
}

const globalForGame = global as unknown as { gameState: any };

if (!globalForGame.gameState) {
  const persisted = readState();
  const defaultRowOrder = Array.from({ length: 15 }, (_, i) => i + 1);
  const shuffledOrder = [...defaultRowOrder].sort(() => Math.random() - 0.5);

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
    rowOrder: shuffledOrder,
    verticalGuess: "",
    isVerticalGuessed: false,
    version: Date.now(),
  };
}

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const persisted = readState();
  if (persisted && persisted.version > (globalForGame.gameState.version || 0)) {
    globalForGame.gameState = persisted;
  }
  return NextResponse.json(globalForGame.gameState);
}

export async function POST(req: Request) {
  try {
    const updates = await req.json();
    
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

    // Broadcast to all clients via Supabase
    await broadcastGameState(nextState);

    return NextResponse.json(globalForGame.gameState);
  } catch (err) {
    return NextResponse.json({ error: "Failed to update" }, { status: 400 });
  }
}
