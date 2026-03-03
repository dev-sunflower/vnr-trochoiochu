"use client";
import { useEffect, useState } from 'react';
import { GAME_DATA } from '@/lib/game-data';

export default function AdminPage() {
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
      const res = await fetch('/api/game');
      if (res.ok) setState(await res.json());
    };
    fetchState();
    const int = setInterval(fetchState, 1000);
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

  const updateState = async (updates: any) => {
    await fetch('/api/game', {
      method: 'POST',
      body: JSON.stringify(updates),
      headers: { 'Content-Type': 'application/json' }
    });
  };

  const selectRow = (id: number) => {
    updateState({ activeRow: id, timerStatus: 'idle', timerEndsAt: null });
  };

  const startTimer = () => {
    updateState({ timerStatus: 'running', timerEndsAt: Date.now() + 20000 });
  };

  const revealAnswer = (id: number) => {
    updateState({ 
      revealedRows: [...new Set([...state.revealedRows, id])],
      timerStatus: 'idle'
    });
  };

  const revealVertical = () => updateState({ verticalRevealed: true });
  const resetGame = () => updateState({ 
    activeRow: null, revealedRows: [], verticalRevealed: false, timerStatus: 'idle', timerEndsAt: null 
  });

  return (
    <div className="p-8 max-w-7xl mx-auto text-black bg-white min-h-screen">
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold">Admin Panel - Điều Khiển Trò Chơi Ô Chữ</h1>
        <div className="flex gap-4">
          <button onClick={revealVertical} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-bold transition">
            Hiện Từ Khoá Dọc
          </button>
          <button onClick={resetGame} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold transition">
            Reset Game
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3">
          <h2 className="text-xl font-bold mb-4">Danh sách câu hỏi</h2>
          <div className="flex flex-col gap-3">
            {GAME_DATA.map(q => {
              const isRevealed = state.revealedRows.includes(q.id);
              const isActive = state.activeRow === q.id;
              
              return (
                <div key={q.id} className={`p-4 border rounded-xl shadow-sm flex justify-between items-center transition
                  ${isActive ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-white hover:bg-gray-50'}
                `}>
                  <div className="flex-1 pr-4">
                    <div className="font-bold flex gap-2 text-lg mb-1">
                      <span className="min-w-[70px]">Câu {q.id}:</span>
                      <span className={isRevealed ? "text-green-600 tracking-widest" : "text-gray-400 tracking-widest"}>
                        {isRevealed ? q.answer : Array(q.answer.length).fill('_').join(' ')}
                      </span>
                    </div>
                    <div className="text-gray-700">{q.question}</div>
                  </div>
                  <div className="flex flex-col gap-2 min-w-[120px]">
                    <button 
                      onClick={() => selectRow(q.id)}
                      className={`px-4 py-2 rounded-lg font-semibold transition ${isActive ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                    >
                      {isActive ? 'Đang chọn' : 'Chọn câu'}
                    </button>
                    <button 
                      onClick={() => revealAnswer(q.id)}
                      className={`px-4 py-2 rounded-lg font-semibold transition ${isRevealed ? 'bg-green-100 text-green-700' : 'bg-green-600 text-white hover:bg-green-700'}`}
                      disabled={isRevealed}
                    >
                      {isRevealed ? 'Đã mở' : 'Mở Đáp Án'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-gray-50 p-6 rounded-2xl border shadow-lg sticky top-8">
            <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Bảng Điều Khiển Hiện Tại</h2>
            
            {state.activeRow ? (
              <div className="flex flex-col gap-6">
                <div className="text-center bg-white p-6 rounded-xl shadow-sm border">
                  <div className="text-lg font-bold text-blue-600 mb-3 uppercase tracking-wider">Đang chọn Câu {state.activeRow}</div>
                  <div className="text-xl mb-6 font-medium text-gray-800">{GAME_DATA.find(q => q.id === state.activeRow)?.question}</div>
                  
                  <div className="bg-gray-900 rounded-xl p-6 mb-4">
                    <div className={`text-5xl font-mono font-bold ${timeLeft <= 5 && state.timerStatus === 'running' ? 'text-red-500 animate-pulse' : 'text-yellow-400'}`}>
                      00:{timeLeft.toString().padStart(2, '0')}
                    </div>
                  </div>

                  {state.timerStatus === 'running' && timeLeft === 0 && (
                    <div className="text-red-600 font-bold text-xl mb-4 bg-red-100 py-2 rounded-lg">
                      Đã hết giờ! Vui lòng mở đáp án hoặc cho trả lời lại.
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={startTimer}
                    className="bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-xl font-bold text-lg shadow-md transition transform hover:-translate-y-1"
                  >
                    {state.timerStatus === 'running' ? 'Bắt đầu lại 20s' : 'Bắt đầu 20s'}
                  </button>
                  <button 
                    onClick={() => revealAnswer(state.activeRow!)}
                    className="bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold text-lg shadow-md transition transform hover:-translate-y-1"
                  >
                    Mở Đáp Án Của Câu Này
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-16 bg-white rounded-xl border border-dashed border-gray-300">
                <div className="text-4xl mb-4">👆</div>
                Vui lòng chọn một câu hỏi<br/>từ danh sách bên trái để bắt đầu.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}