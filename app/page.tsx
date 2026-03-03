"use client";
import { useEffect, useState } from "react";
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
} from "lucide-react";

import { GAME_DATA } from "@/lib/game-data";

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

  const [timeLeft, setTimeLeft] = useState(20);
  const [timerActive, setTimerActive] = useState(false);

  // Check auth state on mount
  useEffect(() => {
    const savedAuth = sessionStorage.getItem("game_admin_auth");

    if (savedAuth === "true") {
      setIsAdmin(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (authForm.username === "admin" && authForm.password === "vnr202nhom3") {
      setIsAdmin(true);
      setShowAuthModal(false);
      sessionStorage.setItem("game_admin_auth", "true");
      setAuthError("");
    } else {
      setAuthError("Sai tài khoản hoặc mật khẩu");
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    sessionStorage.removeItem("game_admin_auth");
  };

  useEffect(() => {
    let int: NodeJS.Timeout;

    if (timerActive && timeLeft > 0) {
      int = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setTimerActive(false);
    }

    return () => clearInterval(int);
  }, [timerActive, timeLeft]);

  const handleRowClick = (id: number) => {
    if (!isAdmin) return;
    setActiveRow(id);
    setTimeLeft(id <= 8 ? 20 : 15);
    setTimerActive(true);
  };

  const revealAnswer = (id: number) => {
    if (!isAdmin) return;
    setRevealedRows((prev) => Array.from(new Set([...prev, id])));
    setTimerActive(false);
  };

  const toggleVertical = () => {
    if (!isAdmin) return;
    setVerticalRevealed(!verticalRevealed);
  };

  const TARGET_COL = 10;
  const TOTAL_COLS = 22;

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
        {isAdmin ? (
          <Button
            className="font-bold text-[10px] md:text-xs"
            color="danger"
            size="sm"
            variant="flat"
            onPress={handleLogout}
          >
            Thoát Admin
          </Button>
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
        {/* Header - Compact */}
        <div className="flex flex-col items-center text-center shrink-0 mb-4 md:mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-[2px] w-8 bg-[#64748B]" />
            <h2 className="text-[#475569] text-[10px] md:text-xs tracking-[0.4em] font-bold uppercase">
              Từ Khóa Hàng Dọc • 15 Chữ Cái
            </h2>
            <div className="h-[2px] w-8 bg-[#64748B]" />
          </div>

          <button
            className={`group relative focus:outline-none ${isAdmin ? "cursor-pointer" : "cursor-default"}`}
            onClick={toggleVertical}
          >
            {isAdmin && (
              <>
                <div className="absolute -left-6 md:-left-8 top-1/2 -translate-y-1/2 w-3 h-3 border-t-2 border-l-2 border-[#F59E0B] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute -right-6 md:-right-8 top-1/2 -translate-y-1/2 w-3 h-3 border-b-2 border-r-2 border-[#F59E0B] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </>
            )}

            <h1
              className={`text-2xl md:text-4xl lg:text-[2.5rem] font-serif font-black tracking-[0.2em] uppercase flex items-center justify-center leading-none
              ${isAdmin ? "transition-transform duration-500 group-hover:scale-[1.02]" : ""}
            `}
            >
              {verticalRevealed ? (
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#D97706] via-[#F59E0B] to-[#D97706] drop-shadow-[0_2px_4px_rgba(245,158,11,0.3)]">
                  CẢI CÁCH RUỘNG ĐẤT
                </span>
              ) : (
                <span
                  className={`text-[#94A3B8] transition-colors duration-300 ${isAdmin ? "group-hover:text-[#64748B]" : ""}`}
                >
                  ? ? ? ? ? ? ? ? ? ? ? ? ? ? ?
                </span>
              )}
            </h1>
          </button>
        </div>

        {/* Grid - Highly Compact & Scalable */}
        <div className="flex-1 flex flex-col justify-center items-center gap-1 w-full max-w-5xl min-h-0 overflow-hidden">
          {GAME_DATA.map((row) => {
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
                {/* Row Number */}
                <div className="w-6 md:w-10 text-right absolute left-0 md:left-[-1rem] flex items-center justify-end">
                  <span
                    className={`font-serif font-bold text-sm md:text-lg italic transition-all duration-300 ${
                      isActive
                        ? "text-[#2563EB]"
                        : `text-[#94A3B8] ${isAdmin ? "group-hover:text-[#64748B]" : ""}`
                    }`}
                  >
                    {row.id.toString().padStart(2, "0")}
                  </span>
                </div>

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
        {activeQuestion && (
          <>
            {/* Backdrop blur overlay */}
            <motion.div
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-40 bg-[#0F172A]/40 backdrop-blur-sm"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              onClick={() => {
                if (isAdmin) setActiveRow(null);
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
                  </div>
                </div>

                {/* Right: Controls & Timer */}
                <div className="bg-[#F8FAFC] p-6 md:p-10 border-t md:border-t-0 md:border-l border-[#E2E8F0] flex flex-col items-center justify-center md:min-w-[260px]">
                  {/* Timer Circle */}
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

                  {/* Actions (Only for Admin) */}
                  {isAdmin ? (
                    <div className="flex flex-col gap-2 md:gap-3 w-full max-w-[200px]">
                      {!revealedRows.includes(activeQuestion.id) && (
                        <Button
                          className="w-full h-10 md:h-12 text-white font-bold text-xs md:text-sm tracking-wide rounded-xl shadow-md transition-all"
                          color="primary"
                          startContent={<Eye size={16} />}
                          onPress={() => revealAnswer(activeQuestion.id)}
                        >
                          Hiển Thị Đáp Án
                        </Button>
                      )}

                      <div className="flex gap-2">
                        <Button
                          className="flex-1 h-10 md:h-12 bg-white border border-[#CBD5E1] text-[#334155] font-bold text-xs md:text-sm rounded-xl hover:bg-[#F1F5F9] transition-all shadow-sm"
                          variant="flat"
                          onPress={() => {
                            if (timerActive) {
                              setTimerActive(false);
                            } else {
                              if (timeLeft === 0)
                                setTimeLeft(activeQuestion.id <= 8 ? 20 : 15);
                              setTimerActive(true);
                            }
                          }}
                        >
                          {timerActive ? (
                            <Pause size={16} />
                          ) : timeLeft === 0 ? (
                            <RotateCcw size={16} />
                          ) : (
                            <Play size={16} />
                          )}
                          <span className="ml-1 md:ml-2">
                            {timerActive
                              ? "Dừng"
                              : timeLeft === 0
                                ? "Làm Mới"
                                : "Tiếp"}
                          </span>
                        </Button>

                        <Button
                          isIconOnly
                          className="w-10 h-10 md:w-12 md:h-12 bg-white border border-[#CBD5E1] text-[#64748B] rounded-xl hover:bg-[#FEE2E2] hover:text-[#EF4444] hover:border-[#FCA5A5] transition-all shadow-sm"
                          variant="flat"
                          onPress={() => setActiveRow(null)}
                        >
                          <X size={18} strokeWidth={3} />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center w-full">
                      <p className="text-[#64748B] text-xs font-medium uppercase tracking-widest mt-4">
                        Quản trò đang điều khiển
                      </p>
                    </div>
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
                <div>
                  <label
                    className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2"
                    htmlFor="username"
                  >
                    Tài Khoản
                  </label>
                  <Input
                    classNames={{
                      inputWrapper:
                        "bg-[#F1F5F9] border-[#CBD5E1] shadow-inner",
                    }}
                    id="username"
                    placeholder="Nhập tài khoản..."
                    size="lg"
                    type="text"
                    value={authForm.username}
                    onChange={(e) =>
                      setAuthForm({ ...authForm, username: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label
                    className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2"
                    htmlFor="password"
                  >
                    Mật Khẩu
                  </label>
                  <Input
                    classNames={{
                      inputWrapper:
                        "bg-[#F1F5F9] border-[#CBD5E1] shadow-inner",
                    }}
                    id="password"
                    placeholder="Nhập mật khẩu..."
                    size="lg"
                    type="password"
                    value={authForm.password}
                    onChange={(e) =>
                      setAuthForm({ ...authForm, password: e.target.value })
                    }
                  />
                </div>

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
                      Người chơi không thể tự tương tác với ô chữ. Tất cả thao
                      tác sẽ do Quản trò điều khiển.
                    </li>
                    <li>
                      Khi Quản trò chọn một câu hỏi, câu hỏi và đồng hồ đếm
                      ngược 20 giây sẽ xuất hiện giữa màn hình.
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

                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-4">
                  <p className="text-blue-800 text-sm">
                    <strong>Mẹo:</strong> Hệ thống có lưu lại trạng thái đăng
                    nhập. Nếu lỡ tải lại trang, bạn vẫn giữ nguyên quyền Quản
                    trò mà không cần đăng nhập lại.
                  </p>
                </div>
              </div>
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
                    Vòng 1: Câu 1 đến Câu 8
                  </h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      Mỗi nhóm sẽ có <strong>20 giây</strong> để suy nghĩ và trả
                      lời.
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
                    Vòng 2: Câu 9 đến Câu 15
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
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
