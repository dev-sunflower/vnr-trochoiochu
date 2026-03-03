import fs from "fs";
import path from "path";

import { NextResponse } from "next/server";

import { emitter } from "@/lib/emitter";

const DATA_FILE = path.join(process.cwd(), "data", "gameState.json");

const defaultState = {
  activeRow: null,
  revealedRows: [],
  verticalRevealed: false,
  timerEndsAt: null,
  timerActive: false,
  timeLeft: 20,
  teamAnswer: "",
  teamAnswerStatus: "idle",
  showRound2Transition: false,
};

function getState() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    }
  } catch {
    // ignore
  }

  return defaultState;
}

function saveState(state: any) {
  if (!fs.existsSync(path.dirname(DATA_FILE))) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
}

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const isPolling = url.searchParams.get("poll") === "true";

  if (isPolling) {
    return new Promise((resolve) => {
      // Send current state if something is immediately needed?
      // Actually long polling wait for changes. But if we want initial, client should do normal GET first, then poll.
      // Wait, client logic can just ask for long poll, but if we don't return immediately, it won't get initial state until an update.
      // So the frontend should: GET without poll first, then GET with poll.
      // Or we can just wait for update.
      const timeout = setTimeout(() => {
        emitter.off("update", listener);
        resolve(NextResponse.json({ timeout: true }));
      }, 30000);

      const listener = (newState: any) => {
        clearTimeout(timeout);
        emitter.off("update", listener);
        resolve(NextResponse.json(newState));
      };

      emitter.once("update", listener);

      req.signal.addEventListener("abort", () => {
        clearTimeout(timeout);
        emitter.off("update", listener);
        resolve(new NextResponse(null, { status: 204 }));
      });
    });
  }

  return NextResponse.json(getState());
}

export async function POST(req: Request) {
  const updates = await req.json();
  const currentState = getState();
  const newState = { ...currentState, ...updates };

  saveState(newState);

  // Notify listeners
  emitter.emit("update", newState);

  return NextResponse.json(newState);
}
