import { NextResponse } from "next/server";
import { emitter } from "@/lib/emitter";

// Global variable to hold state in memory (warm lambda instances)
const globalForGame = global as unknown as { gameState: any };
if (!globalForGame.gameState) {
  globalForGame.gameState = {
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
}

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse | Response> {
  const url = new URL(req.url);
  const isPolling = url.searchParams.get("poll") === "true";

  if (isPolling) {
    return new Promise<NextResponse | Response>((resolve) => {
      // Vercel/Serverless has execution limits. 
      // We'll wait max 10 seconds before timing out to be safe.
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

      // Handle request cancellation
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
    globalForGame.gameState = { ...globalForGame.gameState, ...updates };

    // Notify any waiting long-pollers on the SAME instance
    emitter.emit("update", globalForGame.gameState);

    return NextResponse.json(globalForGame.gameState);
  } catch (err) {
    return NextResponse.json({ error: "Failed to update" }, { status: 400 });
  }
}
