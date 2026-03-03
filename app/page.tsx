"use client";
import { useEffect, useState } from 'react';
import { GAME_DATA } from '@/lib/game-data';

export default function GameBoard() {
  const [state, setState] = useState({
    activeRow: null as number | null,
    revealedRows: [] as number[],
    verticalRevealed: false,
    timerEndsAt: null as number | null,
    timerStatus: 'idle',
  });
  const [timeLeft, setTimeLeft] = useState(20);

  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch('/api/game');
        if (res.ok) setState(await res.json());
      } catch (e) {}
    };
    fetchState();
    const int = setInterval(fetchState, 500);
    return () => clearInterval(int);
  }, []);

  useEffect(() => {
    if (state.timerStatus === 'running' && state.timerEndsAt) {
      const int = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((state.timerEndsAt! - Date.now()) / 1000));
        setTimeLeft(remaining);
      }, 100);
      return () => clearInterval(int);
    } else {
      setTimeLeft(20);
    }
  }, [state.timerStatus, state.timerEndsAt]);

  const TARGET_COL = 10;
  const TOTAL_COLS = 22;

  const activeQuestion = GAME_DATA.find(q => q.id === state.activeRow);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#3a0000] to-[#1a0000] text-white flex flex-col items-center py-10 font-sans overflow-x-hidden">
      <div className="border-2 border-yellow-500 rounded-lg p-6 w-full max-w-5xl mb-8 flex flex-col items-center shadow-[0_0_15px_rgba(234,179,8,0.5)] bg-[#5a0000]">
        <h2 className="text-yellow-400 text-sm tracking-widest font-bold mb-2">TỪ KHÓA HÀNG DỌC - 15 CHỮ CÁI</h2>
        <h1 className="text-4xl font-extrabold text-yellow-500 tracking-[0.3em] uppercase min-h-[40px]">
          {state.verticalRevealed ? "CẢI CÁCH RUỘNG ĐẤT" : ""}
        </h1>
      </div>

      <div className="flex flex-col gap-[6px] w-full max-w-5xl px-4 relative">
        {GAME_DATA.map((row) => {
          const startIndex = TARGET_COL - row.targetIndex;
          const isRevealed = state.revealedRows.includes(row.id);
          const isActive = state.activeRow === row.id;

          return (
            <div key={row.id} className="flex gap-[6px] items-center justify-center relative">
              <div className="w-8 text-right font-bold text-yellow-500 absolute left-0 md:left-20">{row.id}</div>
              {Array.from({ length: TOTAL_COLS }).map((_, col) => {
                const cellIndexInWord = col - startIndex;
                const isTargetCol = col === TARGET_COL;
                const isCellInWord = cellIndexInWord >= 0 && cellIndexInWord < row.answer.length;
                const isCharRevealed = isRevealed || (state.verticalRevealed && isTargetCol);

                if (!isCellInWord) return <div key={col} className="w-10 h-10 md:w-12 md:h-12 flex-shrink-0"></div>;

                return (
                  <div 
                    key={col} 
                    className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center font-bold text-xl md:text-2xl shadow-sm rounded-sm transition-all duration-300
                      ${isTargetCol ? 'bg-yellow-500 text-[#3a0000] border-2 border-yellow-700' : 'bg-white text-black border border-gray-300'}
                      ${isActive ? 'ring-4 ring-blue-500 scale-110 z-10 shadow-blue-500/50' : ''}
                    `}
                  >
                    {isCharRevealed ? row.answer[cellIndexInWord] : ''}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {activeQuestion && (
        <div className="mt-10 bg-blue-900 border-2 border-blue-400 p-6 rounded-xl w-full max-w-3xl text-center shadow-[0_0_20px_rgba(59,130,246,0.5)]">
          <h3 className="text-2xl font-bold mb-4 text-blue-100">Câu hỏi {activeQuestion.id}:</h3>
          <p className="text-2xl font-medium leading-relaxed">{activeQuestion.question}</p>
          
          <div className="mt-6 flex justify-center items-center gap-4">
            <div className={`text-6xl font-mono font-bold ${timeLeft <= 5 && state.timerStatus === 'running' ? 'text-red-500 animate-pulse' : 'text-yellow-400'}`}>
              00:{timeLeft.toString().padStart(2, '0')}
            </div>
            {state.timerStatus === 'running' && timeLeft === 0 && (
              <div className="text-red-500 font-bold text-3xl animate-bounce ml-4">HẾT GIỜ!</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}