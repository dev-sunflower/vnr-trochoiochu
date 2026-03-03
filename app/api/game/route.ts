import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'gameState.json');

const defaultState = {
  activeRow: null,
  revealedRows: [],
  verticalRevealed: false,
  timerEndsAt: null,
  timerStatus: 'idle',
};

function getState() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) {
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

export async function GET() {
  return NextResponse.json(getState());
}

export async function POST(req: Request) {
  const updates = await req.json();
  const currentState = getState();
  const newState = { ...currentState, ...updates };
  saveState(newState);
  return NextResponse.json(newState);
}