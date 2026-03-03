"use client";
import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import {
  Play,
  Pause,
  RotateCcw,
  Eye,
  X,
  CheckCircle2,
  LockKeyhole,
  Info,
  BookOpen,
  Shuffle,
} from "lucide-react";

import { GAME_DATA, VERTICAL_WORD } from "@/lib/game-data";
import { supabase, GAME_CHANNEL } from "@/lib/supabase";

export default function GameBoard() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [authForm, setAuthForm] = useState({ username: "", password: "" });
  const [authError, setAuthError] = useState("");

  const [activeRow, setActiveRow] = useState<number | null>(null);
  const [revealedRows, setRevealedRows] = useState<number[]>([]);
  const [verticalRevealed, setVerticalRevealed] = useState(false);
  const [rowOrder, setRowOrder] = useState<number[]>(
    Array.from({ length: 15 }, (_, i) => i + 1),
  );

  const [timeLeft, setTimeLeft] = useState(20);
  const [timerActive, setTimerActive] = useState(false);
  const [timerEndsAt, setTimerEndsAt] = useState<number | null>(null);
  const [teamAnswer, setTeamAnswer] = useState("");
  const [teamAnswerStatus, setTeamAnswerStatus] = useState<
    "idle" | "correct" | "incorrect"
  >("idle");
  const [userDismissedRow, setUserDismissedRow] = useState<number | null>(null);

  // Sync to server
  const updateServer = async (updates: any) => {
    if (!isAdmin) return;
    const now = Date.now();

    try {
      await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...updates, version: now }),
      });
    } catch {}
  };

  // Real-time synchronization via Supabase Broadcast
  useEffect(() => {
    let lastSeenVersion = 0;

    const syncState = (data: any) => {
      if (data && data.version > lastSeenVersion) {
        lastSeenVersion = data.version;
        if (!isAdmin) {
          if (data.revealedRows !== undefined)
            setRevealedRows(data.revealedRows);
          if (data.verticalRevealed !== undefined)
            setVerticalRevealed(data.verticalRevealed);
          if (data.rowOrder !== undefined) setRowOrder(data.rowOrder);

          if (data.activeRow !== undefined) {
            setActiveRow((prev) => {
              if (data.activeRow !== prev) setUserDismissedRow(null);
              return data.activeRow;
            });
          }
          if (data.timerActive !== undefined) setTimerActive(data.timerActive);
          if (data.timerEndsAt !== undefined) setTimerEndsAt(data.timerEndsAt);
          if (data.timeLeft !== undefined && !data.timerActive)
            setTimeLeft(data.timeLeft);
          if (data.teamAnswer !== undefined) setTeamAnswer(data.teamAnswer);
          if (data.teamAnswerStatus !== undefined)
            setTeamAnswerStatus(data.teamAnswerStatus);
        } else {
          if (data.rowOrder !== undefined) setRowOrder(data.rowOrder);
        }
      }
    };

    fetch("/api/game")
      .then((res) => res.json())
      .then(syncState)
      .catch(() => {});

    const channel = supabase.channel(GAME_CHANNEL);

    channel
      .on("broadcast", { event: "game-update" }, ({ payload }) => {
        if (payload) syncState(payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  useEffect(() => {
    const token = sessionStorage.getItem("game_admin_auth");
    if (token && token !== "true") {
      fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ping", token }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setIsAdmin(true);
          } else {
            sessionStorage.removeItem("game_admin_auth");
            setIsAdmin(false);
          }
        })
        .catch(() => {});
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          username: authForm.username,
          password: authForm.password,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setIsAdmin(true);
        setShowAuthModal(false);
        sessionStorage.setItem("game_admin_auth", data.token);
        setAuthError("");
      } else {
        setAuthError(data.error);
      }
    } catch {
      setAuthError("Lỗi kết nối máy chủ");
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    sessionStorage.removeItem("game_admin_auth");
  };

  const handleResetGame = (shuffle: boolean = false) => {
    if (!isAdmin) return;
    if (
      confirm(
        shuffle
          ? "Làm mới và XÁO TRỘN lại hàng ngang?"
          : "Bạn có chắc chắn muốn làm mới toàn bộ trò chơi?",
      )
    ) {
      const newOrder = shuffle
        ? [...Array.from({ length: 15 }, (_, i) => i + 1)].sort(
            () => Math.random() - 0.5,
          )
        : rowOrder;

      setActiveRow(null);
      setRevealedRows([]);
      setVerticalRevealed(false);
      setTimerActive(false);
      setTimerEndsAt(null);
      setTimeLeft(20);
      setTeamAnswer("");
      setTeamAnswerStatus("idle");
      setRowOrder(newOrder);

      updateServer({
        activeRow: null,
        revealedRows: [],
        verticalRevealed: false,
        timerActive: false,
        timerEndsAt: null,
        timeLeft: 20,
        teamAnswer: "",
        teamAnswerStatus: "idle",
        rowOrder: newOrder,
      });
    }
  };

  useEffect(() => {
    let int: NodeJS.Timeout;
    if (timerActive && timerEndsAt) {
      int = setInterval(() => {
        const remaining = Math.max(
          0,
          Math.ceil((timerEndsAt - Date.now()) / 1000),
        );
        setTimeLeft(remaining);
        if (remaining === 0) {
          setTimerActive(false);
          if (isAdmin) updateServer({ timerActive: false, timeLeft: 0 });
        }
      }, 100);
    }
    return () => clearInterval(int);
  }, [timerActive, timerEndsAt, isAdmin]);

  const handleRowClick = (id: number) => {
    if (!isAdmin) return;
    const isRound1 = revealedRows.length < 8;
    const duration = isRound1 ? 20 : 15;
    const endsAt = Date.now() + duration * 1000;
    setActiveRow(id);
    setTimeLeft(duration);
    setTimerActive(true);
    setTimerEndsAt(endsAt);
    setTeamAnswer("");
    setTeamAnswerStatus("idle");
    updateServer({
      activeRow: id,
      timerActive: true,
      timerEndsAt: endsAt,
      timeLeft: duration,
      teamAnswer: "",
      teamAnswerStatus: "idle",
    });
  };

  const revealAnswer = (id: number) => {
    if (!isAdmin) return;
    const newRevealed = Array.from(new Set([...revealedRows, id]));
    setRevealedRows(newRevealed);
    setTimerActive(false);
    setActiveRow(null);
    updateServer({
      revealedRows: newRevealed,
      timerActive: false,
      timeLeft,
      activeRow: null,
    });
  };

  const toggleVertical = () => {
    if (!isAdmin) return;
    const newVal = !verticalRevealed;
    setVerticalRevealed(newVal);
    updateServer({ verticalRevealed: newVal });
  };

  const TARGET_COL = 10;
  const TOTAL_COLS = 22;

  const sortedGameData = useMemo(() => {
    return rowOrder
      .map((id) => GAME_DATA.find((d) => d.id === id)!)
      .filter(Boolean);
  }, [rowOrder]);

  const activeQuestion = GAME_DATA.find((q) => q.id === activeRow);

  return (
    <div className="h-screen w-screen bg-[#FDFBF7] text-[#1E293B] flex flex-col items-center justify-center font-sans overflow-hidden selection:bg-[#E8DCC0] relative">
      {/* Subtle Background Pattern */}
      <div
        className="absolute inset-0 z-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(#475569 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Admin Toggle / Status */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
        <Button
          className="bg-white border border-slate-200 shadow-sm text-slate-500 font-bold text-[10px] md:text-xs hover:bg-slate-50"
          size="sm"
          startContent={<BookOpen size={14} />}
          variant="flat"
          onPress={() => setShowRulesModal(true)}
        >
          Luật chơi
        </Button>
        <Button
          className="bg-white border border-slate-200 shadow-sm text-slate-500 font-bold text-[10px] md:text-xs hover:bg-slate-50"
          size="sm"
          startContent={<Info size={14} />}
          variant="flat"
          onPress={() => setShowGuideModal(true)}
        >
          Hướng dẫn
        </Button>
        {!isAdmin && (
          <Button
            className="bg-white border border-blue-200 shadow-sm text-blue-500 font-bold text-[10px] md:text-xs hover:bg-blue-50"
            size="sm"
            startContent={<RotateCcw size={14} />}
            variant="flat"
            onPress={() => window.location.reload()}
          >
            Đồng bộ hoá
          </Button>
        )}
        {isAdmin ? (
          <>
            <Button
              className="bg-white border border-orange-200 shadow-sm text-orange-500 font-bold text-[10px] md:text-xs hover:bg-orange-50"
              size="sm"
              startContent={<Shuffle size={14} />}
              variant="flat"
              onPress={() => handleResetGame(true)}
            >
              Xáo trộn & Reset
            </Button>
            <Button
              className="bg-white border border-red-200 shadow-sm text-red-500 font-bold text-[10px] md:text-xs hover:bg-red-50"
              size="sm"
              startContent={<RotateCcw size={14} />}
              variant="flat"
              onPress={() => handleResetGame(false)}
            >
              Làm mới
            </Button>
            <Button
              className="font-bold text-[10px] md:text-xs"
              color="danger"
              size="sm"
              variant="flat"
              onPress={handleLogout}
            >
              Thoát Admin
            </Button>
          </>
        ) : (
          <Button
            className="bg-white border border-slate-200 shadow-sm text-slate-500 font-bold text-[10px] md:text-xs hover:bg-slate-50"
            size="sm"
            startContent={<LockKeyhole size={14} />}
            variant="flat"
            onPress={() => setShowAuthModal(true)}
          >
            Đăng Nhập Quản Trò
          </Button>
        )}
      </div>

      {/* Main Content Container */}
      <div className="flex flex-col items-center w-full h-full max-h-screen px-4 py-4 md:py-8 z-10">
        {/* Header */}
        <div className="flex flex-col items-center text-center shrink-0 mb-4 md:mb-6">
          <div className="flex items-center gap-3 mb-1">
            <span className="bg-indigo-100 text-indigo-800 text-[10px] md:text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest border border-indigo-200 shadow-sm">
              Trò chơi ô chữ
            </span>
          </div>
          <div className="flex items-center gap-3 mb-2 mt-1">
            <div className="h-[2px] w-8 bg-[#64748B]" />
            <h2 className="text-[#475569] text-[10px] md:text-xs tracking-[0.4em] font-bold uppercase">
              Từ Khóa Hàng Dọc (Đã xáo trộn)
            </h2>
            <div className="h-[2px] w-8 bg-[#64748B]" />
          </div>

          <button
            className={`group relative focus:outline-none ${isAdmin ? "cursor-pointer" : "cursor-default"}`}
            onClick={() => {
              if (isAdmin) toggleVertical();
            }}
          >
            <h1
              className={`text-2xl md:text-4xl lg:text-[2.5rem] font-serif font-black tracking-[0.2em] uppercase flex items-center justify-center leading-none transition-all duration-500
              ${isAdmin && !verticalRevealed ? "hover:scale-[1.02]" : ""}
            `}
            >
              {verticalRevealed ? (
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#D97706] via-[#F59E0B] to-[#D97706] drop-shadow-[0_2px_4px_rgba(245,158,11,0.3)]">
                  {VERTICAL_WORD.split("").join(" ")}
                </span>
              ) : (
                <span
                  className={`flex gap-2 md:gap-4 ${isAdmin ? "text-[#94A3B8] group-hover:text-[#64748B]" : "text-[#94A3B8]"}`}
                >
                  {Array.from({ length: 15 }).map((_, i) => (
                    <span key={i} className="border-b-4 border-[#CBD5E1] px-1">
                      ?
                    </span>
                  ))}
                </span>
              )}
            </h1>
          </button>
        </div>

        {/* Grid */}
        <div className="flex-1 flex flex-col justify-center items-center gap-1 w-full max-w-5xl min-h-0">
          {sortedGameData.map((row) => {
            const startIndex = TARGET_COL - row.targetIndex;
            const isRevealed = revealedRows.includes(row.id);
            const isActive = activeRow === row.id;

            return (
              <motion.div
                key={row.id}
                layout
                className={`flex gap-1 md:gap-[6px] items-center justify-center relative p-1 rounded-xl transition-all duration-300 group ${
                  isActive
                    ? "bg-[#EFF6FF] shadow-[0_10px_20px_-10px_rgba(37,99,235,0.2)] scale-[1.02] z-20 border border-[#BFDBFE]"
                    : `border border-transparent z-10 ${isAdmin ? "hover:bg-white/80 cursor-pointer" : "cursor-default"}`
                }`}
                onClick={() => handleRowClick(row.id)}
              >
                {/* Cells */}
                {Array.from({ length: TOTAL_COLS }).map((_, col) => {
                  const cellIndexInWord = col - startIndex;
                  const isTargetCol = col === TARGET_COL;
                  const isCellInWord =
                    cellIndexInWord >= 0 && cellIndexInWord < row.answer.length;
                  const isCharRevealed =
                    isRevealed || (verticalRevealed && isTargetCol);
                  const char = isCharRevealed
                    ? row.answer[cellIndexInWord]
                    : "";

                  const tileClass =
                    "w-6 h-6 sm:w-7 sm:h-7 md:w-9 md:h-9 lg:w-[2.3rem] lg:h-[2.3rem]";

                  if (!isCellInWord)
                    return (
                      <div key={col} className={`${tileClass} flex-shrink-0`} />
                    );

                  return (
                    <div
                      key={col}
                      className={`relative ${tileClass} flex-shrink-0`}
                      style={{ perspective: "800px" }}
                    >
                      <motion.div
                        animate={{ rotateY: isCharRevealed ? 0 : 180 }}
                        className="w-full h-full relative"
                        initial={false}
                        style={{ transformStyle: "preserve-3d" }}
                        transition={{
                          duration: 0.6,
                          type: "spring",
                          bounce: 0.3,
                        }}
                      >
                        {/* Front (Revealed) */}
                        <div
                          className={`absolute inset-0 w-full h-full flex items-center justify-center font-bold text-sm md:text-lg rounded md:rounded-lg backface-hidden shadow-sm border
                            ${
                              isTargetCol
                                ? "bg-[#FEF08A] text-[#991B1B] border-[#F59E0B]"
                                : "bg-white text-[#0F172A] border-[#CBD5E1]"
                            }
                          `}
                          style={{ backfaceVisibility: "hidden" }}
                        >
                          {char}
                        </div>

                        {/* Back (Hidden) */}
                        <div
                          className={`absolute inset-0 w-full h-full rounded md:rounded-lg backface-hidden transition-colors duration-300 border
                            ${
                              isTargetCol
                                ? "bg-[#FEF9C3] border-[#FDE047]"
                                : `bg-[#F1F5F9] border-[#CBD5E1] ${isAdmin ? "group-hover:bg-[#E2E8F0]" : ""}`
                            }
                            ${isActive && !isTargetCol ? "ring-2 ring-[#60A5FA] ring-offset-1 ring-offset-[#FDFBF7]" : ""}
                          `}
                          style={{
                            backfaceVisibility: "hidden",
                            transform: "rotateY(180deg)",
                          }}
                        >
                          <div className="absolute inset-0 rounded md:rounded-lg shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)]" />
                        </div>
                      </motion.div>
                    </div>
                  );
                })}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Overlay Question Card */}
      <AnimatePresence>
        {activeQuestion && userDismissedRow !== activeQuestion.id && (
          <>
            <motion.div
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-40 bg-[#0F172A]/40 backdrop-blur-sm"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              onClick={() => {
                if (isAdmin) {
                  setActiveRow(null);
                  setTimerActive(false);
                  updateServer({ activeRow: null, timerActive: false });
                } else {
                  setUserDismissedRow(activeQuestion.id);
                }
              }}
            />

            <motion.div
              key="question-card"
              animate={{ y: 0, opacity: 1, scale: 1 }}
              className="absolute z-50 w-[95%] max-w-4xl"
              exit={{ y: 20, opacity: 0, scale: 0.95 }}
              initial={{ y: 20, opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              <div className="bg-white/95 backdrop-blur-2xl rounded-[1.5rem] md:rounded-[2rem] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.2),0_0_0_1px_rgba(0,0,0,0.05)] flex flex-col md:flex-row overflow-hidden border border-[#E2E8F0]">
                {/* Left: Question Content */}
                <div className="flex-1 p-6 md:p-10 flex flex-col justify-center relative min-h-[200px]">
                  <span className="absolute top-4 left-4 md:top-6 md:left-6 text-5xl md:text-6xl text-[#F1F5F9] font-serif leading-none select-none">
                    &quot;
                  </span>

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4 md:mb-6">
                      <h3 className="text-xs md:text-sm font-bold text-[#F59E0B] uppercase tracking-[0.2em] flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                        Câu hỏi {activeQuestion.id.toString().padStart(2, "0")}
                      </h3>

                      {revealedRows.includes(activeQuestion.id) && (
                        <span className="flex items-center gap-1.5 bg-[#DCFCE7] text-[#166534] text-[10px] md:text-xs font-bold px-2 py-1 md:px-3 rounded-full border border-[#BBF7D0]">
                          <CheckCircle2 size={12} /> Đã hiển thị
                        </span>
                      )}
                    </div>

                    <p className="text-xl md:text-2xl lg:text-3xl font-bold leading-relaxed text-[#1E293B]">
                      {activeQuestion.question}
                    </p>

                    {isAdmin ? (
                      <div className="mt-6 flex flex-col gap-2">
                        <div className="flex gap-2 items-center">
                          <Input
                            classNames={{
                              inputWrapper: "bg-white border border-[#CBD5E1]",
                            }}
                            placeholder="Nhập câu trả lời của đội..."
                            size="md"
                            value={teamAnswer}
                            onChange={(e) => setTeamAnswer(e.target.value)}
                          />
                          <Button
                            className="font-bold shrink-0"
                            color="primary"
                            onPress={() => {
                              const normalizedTeamAnswer = teamAnswer
                                .replace(/\s+/g, "")
                                .toLowerCase();
                              const normalizedCorrectAnswer =
                                activeQuestion.answer
                                  .replace(/\s+/g, "")
                                  .toLowerCase();
                              const isCorrect =
                                normalizedTeamAnswer ===
                                normalizedCorrectAnswer;
                              const status = isCorrect
                                ? "correct"
                                : "incorrect";
                              setTeamAnswerStatus(status);
                              updateServer({
                                teamAnswer,
                                teamAnswerStatus: status,
                              });
                              if (isCorrect) {
                                setTimeout(
                                  () => revealAnswer(activeQuestion.id),
                                  1500,
                                );
                              }
                            }}
                          >
                            Kiểm tra
                          </Button>
                        </div>
                        {teamAnswerStatus !== "idle" && (
                          <p
                            className={`text-sm font-bold ${teamAnswerStatus === "correct" ? "text-green-600" : "text-red-500"}`}
                          >
                            {teamAnswerStatus === "correct"
                              ? "Chính xác!"
                              : "Chưa chính xác!"}
                          </p>
                        )}
                      </div>
                    ) : teamAnswerStatus !== "idle" ? (
                      <div
                        className={`mt-6 p-4 border rounded-xl ${teamAnswerStatus === "correct" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
                      >
                        <p
                          className={`text-xs font-bold uppercase tracking-wider mb-1 ${teamAnswerStatus === "correct" ? "text-green-600" : "text-red-500"}`}
                        >
                          {teamAnswerStatus === "correct"
                            ? "Kết quả: CHÍNH XÁC"
                            : "Kết quả: SAI"}
                        </p>
                        <p
                          className={`text-xl font-bold ${teamAnswerStatus === "correct" ? "text-green-700" : "text-red-600"}`}
                        >
                          {teamAnswer.toUpperCase()}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Right: Controls & Timer */}
                <div className="bg-[#F8FAFC] p-6 md:p-10 border-t md:border-t-0 md:border-l border-[#E2E8F0] flex flex-col items-center justify-center md:min-w-[260px]">
                  <div className="relative w-24 h-24 md:w-32 md:h-32 mb-6 flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                      <circle
                        className="stroke-[#E2E8F0]"
                        cx="50%"
                        cy="50%"
                        fill="none"
                        r="46%"
                        strokeWidth="4"
                      />
                      <motion.circle
                        animate={{
                          strokeDashoffset:
                            100 -
                            (timeLeft / (activeQuestion.id <= 8 ? 20 : 15)) *
                              100,
                        }}
                        className={`${timeLeft <= 5 ? "stroke-[#EF4444]" : "stroke-[#F59E0B]"}`}
                        cx="50%"
                        cy="50%"
                        fill="none"
                        initial={{
                          strokeDasharray: "100 100",
                          strokeDashoffset: 0,
                        }}
                        pathLength="100"
                        r="46%"
                        strokeLinecap="round"
                        strokeWidth="4"
                        transition={{ duration: 1, ease: "linear" }}
                      />
                    </svg>
                    <div
                      className={`text-3xl md:text-4xl font-serif font-black tabular-nums ${timeLeft <= 5 && timerActive ? "text-[#EF4444] animate-pulse" : "text-[#0F172A]"}`}
                    >
                      {timeLeft}
                    </div>
                    <div className="absolute bottom-3 md:bottom-5 text-[9px] md:text-[10px] uppercase tracking-widest text-[#64748B] font-bold">
                      Giây
                    </div>
                  </div>

                  {isAdmin ? (
                    <div className="flex flex-col gap-2 md:gap-3 w-full max-w-[200px]">
                      <Button
                        className="w-full h-10 md:h-12 text-white font-bold text-xs md:text-sm tracking-wide rounded-xl shadow-md transition-all"
                        color="primary"
                        startContent={<Eye size={16} />}
                        onPress={() => revealAnswer(activeQuestion.id)}
                      >
                        HIỂN THỊ ĐÁP ÁN
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          className="flex-1 h-10 md:h-12 bg-white border border-[#CBD5E1] text-[#334155] font-bold text-xs md:text-sm rounded-xl hover:bg-[#F1F5F9] transition-all shadow-sm"
                          variant="flat"
                          onPress={() => {
                            if (timerActive) {
                              setTimerActive(false);
                              updateServer({ timerActive: false, timeLeft });
                            } else {
                              let duration =
                                timeLeft || (activeQuestion.id <= 8 ? 20 : 15);
                              const endsAt = Date.now() + duration * 1000;
                              setTimerActive(true);
                              setTimerEndsAt(endsAt);
                              updateServer({
                                timerActive: true,
                                timerEndsAt: endsAt,
                                timeLeft: duration,
                              });
                            }
                          }}
                        >
                          {timerActive ? (
                            <Pause size={16} />
                          ) : (
                            <Play size={16} />
                          )}
                          <span className="ml-1 md:ml-2">
                            {timerActive ? "Dừng" : "Tiếp"}
                          </span>
                        </Button>
                        <Button
                          isIconOnly
                          className="w-10 h-10 md:w-12 md:h-12 bg-white border border-[#CBD5E1] text-[#64748B] rounded-xl hover:bg-[#FEE2E2] hover:text-[#EF4444] hover:border-[#FCA5A5] transition-all shadow-sm"
                          variant="flat"
                          onPress={() => {
                            setActiveRow(null);
                            setTimerActive(false);
                            updateServer({
                              activeRow: null,
                              timerActive: false,
                            });
                          }}
                        >
                          <X size={18} strokeWidth={3} />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[#64748B] text-[10px] font-bold uppercase tracking-[0.2em] mt-4">
                      Quản trò đang điều khiển
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <>
            <motion.div
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-[60] bg-[#0F172A]/50 backdrop-blur-md"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              onClick={() => setShowAuthModal(false)}
            />
            <motion.div
              animate={{ y: 0, opacity: 1, scale: 1 }}
              className="absolute z-[70] w-[90%] max-w-md bg-white rounded-2xl shadow-2xl p-8 border border-[#E2E8F0]"
              exit={{ y: 20, opacity: 0, scale: 0.95 }}
              initial={{ y: 20, opacity: 0, scale: 0.95 }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-[#1E293B] flex items-center gap-2">
                  <LockKeyhole className="text-[#F59E0B]" /> Đăng Nhập Quản Trò
                </h2>
                <button
                  className="text-[#94A3B8] hover:text-[#EF4444] transition-colors"
                  onClick={() => setShowAuthModal(false)}
                >
                  <X size={20} />
                </button>
              </div>
              <form className="flex flex-col gap-4" onSubmit={handleLogin}>
                <Input
                  classNames={{
                    inputWrapper: "bg-[#F1F5F9] border-[#CBD5E1] shadow-inner",
                  }}
                  label="Tài Khoản"
                  labelPlacement="outside"
                  placeholder="..."
                  size="lg"
                  value={authForm.username}
                  onChange={(e) =>
                    setAuthForm({ ...authForm, username: e.target.value })
                  }
                />
                <Input
                  classNames={{
                    inputWrapper: "bg-[#F1F5F9] border-[#CBD5E1] shadow-inner",
                  }}
                  label="Mật Khẩu"
                  labelPlacement="outside"
                  placeholder="..."
                  size="lg"
                  type="password"
                  value={authForm.password}
                  onChange={(e) =>
                    setAuthForm({ ...authForm, password: e.target.value })
                  }
                />
                {authError && (
                  <p className="text-[#EF4444] text-sm font-medium text-center">
                    {authError}
                  </p>
                )}
                <Button
                  className="w-full mt-4 font-bold text-white shadow-md rounded-xl"
                  color="primary"
                  size="lg"
                  type="submit"
                >
                  Xác Nhận
                </Button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Rules Modal */}
      <AnimatePresence>
        {showRulesModal && (
          <>
            <motion.div
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-[60] bg-[#0F172A]/50 backdrop-blur-md"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              onClick={() => setShowRulesModal(false)}
            />
            <motion.div
              animate={{ y: 0, opacity: 1, scale: 1 }}
              className="absolute z-[70] w-[90%] max-w-3xl bg-white rounded-2xl shadow-2xl p-6 md:p-8 border border-[#E2E8F0] max-h-[85vh] overflow-y-auto"
              exit={{ y: 20, opacity: 0, scale: 0.95 }}
              initial={{ y: 20, opacity: 0, scale: 0.95 }}
            >
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <h2 className="text-xl md:text-2xl font-black text-[#1E293B] flex items-center gap-2">
                  <BookOpen className="text-[#10B981]" /> Luật Chơi
                </h2>
                <button
                  className="text-[#94A3B8] hover:text-[#EF4444] transition-colors bg-slate-50 hover:bg-red-50 p-2 rounded-full"
                  onClick={() => setShowRulesModal(false)}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-6 text-slate-700 text-sm md:text-base leading-relaxed">
                <div>
                  <h3 className="font-bold text-[#10B981] mb-2 text-lg">
                    Cơ Cấu Tổ Chức
                  </h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      Lớp sẽ được chia thành <strong>8 nhóm</strong> thi đấu với
                      nhau.
                    </li>
                    <li>
                      Trò chơi được chia làm <strong>2 vòng</strong> chính thức.
                    </li>
                    <li>
                      Nhóm có tổng điểm cao nhất khi kết thúc trò chơi sẽ là đội
                      chiến thắng.
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-bold text-[#3B82F6] mb-2 text-lg">
                    Vòng 1: 8 câu hỏi đầu tiên
                  </h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      Mỗi nhóm được quyền <strong>tự chọn câu hỏi</strong> (bất
                      kỳ câu nào), và sẽ có <strong>20 giây</strong> để suy nghĩ
                      và trả lời.
                    </li>
                    <li>
                      Trả lời đúng:{" "}
                      <strong className="text-green-600">+10 điểm</strong>.
                    </li>
                    <li>
                      Nếu nhóm được chỉ định không trả lời được, các nhóm khác
                      có quyền <strong>giành quyền trả lời</strong>.
                    </li>
                    <li>
                      Nhóm giành quyền nhưng trả lời sai hoặc không đưa ra được
                      đáp án: <strong className="text-red-600">-5 điểm</strong>.
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-bold text-[#F59E0B] mb-2 text-lg">
                    Vòng 2: 7 câu hỏi còn lại
                  </h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      Thời gian suy nghĩ giảm xuống còn <strong>15 giây</strong>
                      .
                    </li>
                    <li>
                      Trả lời đúng:{" "}
                      <strong className="text-green-600">+20 điểm</strong>.
                    </li>
                    <li>
                      Nếu không trả lời được:{" "}
                      <strong className="text-red-600">-10 điểm</strong> và
                      nhường cơ hội cho nhóm khác.
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-bold text-amber-700 mb-2 text-lg">
                    Từ khoá đặc biệt (Hàng dọc)
                  </h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      Từ khoá sẽ được đảo lộn các chữ cái với nhau, người chơi
                      phải ghép các chứ lại thành từ có nghĩa và đúng với đáp án
                      của chương trình.
                    </li>
                    <li>
                      Thời gian suy nghĩ là <strong>15 giây</strong>.
                    </li>
                    <li>
                      Trả lời đúng:{" "}
                      <strong className="text-green-600">+36 điểm</strong>.
                    </li>
                    <li>
                      Nếu không trả lời được:{" "}
                      <strong className="text-red-600">-18 điểm</strong> và
                      nhường cơ hội cho nhóm khác.
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Guide Modal */}
      <AnimatePresence>
        {showGuideModal && (
          <>
            <motion.div
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-[60] bg-[#0F172A]/50 backdrop-blur-md"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              onClick={() => setShowGuideModal(false)}
            />
            <motion.div
              animate={{ y: 0, opacity: 1, scale: 1 }}
              className="absolute z-[70] w-[90%] max-w-3xl bg-white rounded-2xl shadow-2xl p-6 md:p-8 border border-[#E2E8F0] max-h-[85vh] overflow-y-auto"
              exit={{ y: 20, opacity: 0, scale: 0.95 }}
              initial={{ y: 20, opacity: 0, scale: 0.95 }}
            >
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <h2 className="text-xl md:text-2xl font-black text-[#1E293B] flex items-center gap-2">
                  <Info className="text-[#3B82F6]" /> Hướng Dẫn Sử Dụng
                </h2>
                <button
                  className="text-[#94A3B8] hover:text-[#EF4444] transition-colors bg-slate-50 hover:bg-red-50 p-2 rounded-full"
                  onClick={() => setShowGuideModal(false)}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-6 text-slate-700 text-sm md:text-base leading-relaxed">
                <div>
                  <h3 className="font-bold text-[#2563EB] mb-2 text-lg">
                    1. Dành cho Người Chơi (Khán giả)
                  </h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      Giao diện chính sẽ hiển thị lưới ô chữ gồm 15 hàng ngang
                      và 1 hàng dọc.
                    </li>
                    <li>
                      Người chơi không thể tự tương tác với ô chữ. Màn hình của
                      bạn sẽ <strong>tự động đồng bộ hóa</strong> với mọi thao
                      tác của Quản trò theo thời gian thực.
                    </li>
                    <li>
                      Khi Quản trò chọn một câu hỏi, câu hỏi và đồng hồ đếm
                      ngược sẽ tự động xuất hiện trên màn hình của bạn.
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-bold text-[#F59E0B] mb-2 text-lg">
                    2. Dành cho Quản Trò (Admin)
                  </h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      Nhấn nút <strong>Đăng Nhập Quản Trò</strong> ở góc phải
                      trên cùng.
                    </li>
                    <li>
                      <strong>Mở Câu Hỏi:</strong> Nhấp vào bất kỳ hàng ngang
                      nào để hiện câu hỏi. Đồng hồ 20s sẽ tự động chạy.
                    </li>
                    <li>
                      <strong>Điều Khiển Thời Gian:</strong> Bạn có thể{" "}
                      <span className="font-semibold">Dừng</span>,{" "}
                      <span className="font-semibold">Tiếp Tục</span>, hoặc{" "}
                      <span className="font-semibold">Làm Mới</span> (chạy lại
                      20s) bằng các nút trên bảng câu hỏi.
                    </li>
                    <li>
                      <strong>Mở Đáp Án:</strong> Khi hết giờ hoặc khi người
                      chơi trả lời đúng, nhấn nút{" "}
                      <span className="text-white bg-green-600 px-2 py-0.5 rounded text-xs">
                        HIỂN THỊ ĐÁP ÁN
                      </span>{" "}
                      để mở các ô chữ của hàng đó.
                    </li>
                    <li>
                      <strong>Từ Khóa Hàng Dọc:</strong> Nhấn trực tiếp vào dòng
                      chữ{" "}
                      <span className="font-serif italic">
                        &quot;? ? ? ? ? ? ? ? ? ? ? ? ? ? ?&quot;
                      </span>{" "}
                      ở trên cùng màn hình để mở từ khóa hàng dọc bất cứ lúc
                      nào.
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
