import React, { useState, useEffect, useRef } from "react";
import { getActivePackages, getQuestionsForPackage, submitTryoutAnswers } from "../services/dbService";
import { TryoutPackage, Question, TryoutResult, BrandingSettings } from "../types";
import { 
  User, School, Key, FileText, CheckCircle2, XCircle, AlertTriangle, 
  ChevronLeft, ChevronRight, Clock, Maximize2, Minimize2, Save, Send,
  ThumbsUp, RefreshCw, Sparkles, LogOut, ArrowRight
} from "lucide-react";

interface ParticipantPortalProps {
  onNotify: (message: string, type: "success" | "error" | "info") => void;
  branding?: BrandingSettings | null;
}

type ExamState = "register" | "exam_active" | "results_card";

export function ParticipantPortal({ onNotify, branding }: ParticipantPortalProps) {
  const [examState, setExamState] = useState<ExamState>("register");
  
  // Registration and active packages
  const [activePackages, setActivePackages] = useState<TryoutPackage[]>([]);
  const [fullName, setFullName] = useState("");
  const [institution, setInstitution] = useState("");
  const [selectedPkgId, setSelectedPkgId] = useState("");
  const [packagePassword, setPackagePassword] = useState("");
  
  // Active exam parameters
  const [currentPackage, setCurrentPackage] = useState<TryoutPackage | null>(null);
  const [originalQuestionsOrdered, setOriginalQuestionsOrdered] = useState<Question[]>([]);
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({}); // questionId -> Choice
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Attempt status
  const [attemptNum, setAttemptNum] = useState<1 | 2>(1);
  const [existingResult, setExistingResult] = useState<TryoutResult | null>(null);
  const [firstAttemptTimeLeft, setFirstAttemptTimeLeft] = useState<number | null>(null);

  // Custom Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  const showConfirm = (title: string, message: string, onConfirm: () => void | Promise<void>) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm
    });
  };

  // Timer states
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load active packages on startup
  const fetchPackages = async () => {
    try {
      const list = await getActivePackages();
      setActivePackages(list);
      if (list.length > 0) {
        setSelectedPkgId(list[0].id);
      }
    } catch (err: any) {
      onNotify("Gagal mencari ujian aktif: " + err.message, "error");
    }
  };

  useEffect(() => {
    fetchPackages();
    // Load local storage session backup if they refresh but keep active states
    const savedSession = sessionStorage.getItem("tryout_backup");
    if (savedSession) {
      try {
        const backup = JSON.parse(savedSession);
        // check if they would like to restore?
        setFullName(backup.fullName || "");
        setInstitution(backup.institution || "");
      } catch (e) {}
    }
  }, []);

  // Timer Countdown Controller
  useEffect(() => {
    if (examState === "exam_active" && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [examState, timeLeft]);

  // Sync answers to session storage for recovery robustness
  useEffect(() => {
    if (examState === "exam_active") {
      const backupData = {
        fullName,
        institution,
        packageId: selectedPkgId,
        answers,
        markedForReview,
        currentQuestionIndex,
        timeLeft,
        attemptNum,
        existingResultId: existingResult?.id
      };
      sessionStorage.setItem("tryout_active_session", JSON.stringify(backupData));
    }
  }, [answers, markedForReview, currentQuestionIndex, timeLeft]);

  // Keyboard Navigation shortcut helper keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (examState !== "exam_active") return;
      if (e.key === "ArrowLeft" || e.key === "p") {
        handlePrevQuestion();
      } else if (e.key === "ArrowRight" || e.key === "n") {
        handleNextQuestion();
      } else if (["A", "B", "C", "D", "E", "a", "b", "c", "d", "e"].includes(e.key)) {
        const choice = e.key.toUpperCase();
        const currentQ = shuffledQuestions[currentQuestionIndex];
        if (currentQ) {
          // Check if option exists in this question
          if (currentQ.options[choice as keyof typeof currentQ.options]) {
            handleSelectAnswer(currentQ.id, choice);
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [examState, currentQuestionIndex, shuffledQuestions]);

  // Start exam validation
  const handleStartExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !fullName.trim()) {
      onNotify("Harap isi Nama Lengkap Anda yang sah.", "error");
      return;
    }
    if (!institution.trim()) {
      onNotify("Harap isi nama Sekolah, Instansi, atau Universitas Anda.", "error");
      return;
    }

    const pkg = activePackages.find((p) => p.id === selectedPkgId);
    if (!pkg) {
      onNotify("Harap pilih paket simulator ujian yang aktif.", "error");
      return;
    }

    if (pkg.password && pkg.password !== packagePassword) {
      onNotify("Kata sandi paket salah. Silakan coba lagi atau periksa pengaturan.", "error");
      return;
    }

    try {
      // Load questions
      const fetchedQuestions = await getQuestionsForPackage(pkg.id);
      if (fetchedQuestions.length === 0) {
        onNotify("Paket tryout ini tidak berisi soal. Hubungi administrator sistem.", "error");
        return;
      }

      setCurrentPackage(pkg);
      setOriginalQuestionsOrdered(fetchedQuestions);
      setFirstAttemptTimeLeft(null);
      
      // Shuffle questions list for exam security:
      const shuffled = [...fetchedQuestions].sort(() => Math.random() - 0.5);
      setShuffledQuestions(shuffled);
      
      // Clear answers context
      setAnswers({});
      setMarkedForReview({});
      setCurrentQuestionIndex(0);
      setAttemptNum(1);
      setExistingResult(null);

      // Start Timer
      setTimeLeft(pkg.duration * 60);
      setExamState("exam_active");
      onNotify(`Simulasi Ujian ${pkg.name} dimulai!`, "success");

      // Backup registration info
      sessionStorage.setItem("tryout_backup", JSON.stringify({ fullName, institution }));

    } catch (err: any) {
      onNotify("Gagal memulai sesi tryout: " + err.message, "error");
    }
  };

  // Start Second Attempt Logic: Shows only incorrect questions
  const handleStartSecondAttempt = () => {
    if (!existingResult || !currentPackage) return;

    // Load only questions that were flagged incorrect in first attempt
    const wrongQuestions = originalQuestionsOrdered.filter((q) => 
      existingResult.incorrectQuestions.includes(q.id)
    );

    if (wrongQuestions.length === 0) {
      onNotify("Tidak ditemukan soal yang salah untuk melakukan percobaan kedua.", "info");
      return;
    }

    // Set active states
    setShuffledQuestions(wrongQuestions);
    setAnswers({}); // start with fresh slate for wrong ones
    setMarkedForReview({});
    setCurrentQuestionIndex(0);
    setAttemptNum(2);

    // Carry over the remaining timer from attempt 1, or fallback to full duration if missing
    const carryOverTime = firstAttemptTimeLeft !== null ? firstAttemptTimeLeft : currentPackage.duration * 60;
    setTimeLeft(carryOverTime);
    setExamState("exam_active");
    
    onNotify("Percobaan kedua dimulai! Hanya mengerjakan soal yang salah sebelumnya.", "info");
  };

  const handleSelectAnswer = (questionId: string, choice: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: choice
    }));
  };

  const handleToggleMarkReview = (questionId: string) => {
    setMarkedForReview((prev) => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < shuffledQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  // Submit handoff
  const handleSubmitExam = () => {
    const answeredCount = Object.keys(answers).length;
    const unansweredCount = shuffledQuestions.length - answeredCount;
    
    let confirmTitle = "Kumpulkan Ujian?";
    let confirmMsg = "Apakah Anda yakin ingin menyelesaikan dan mengumpulkan jawaban ujian tryout Anda? Skor Anda akan langsung dihitung.";
    if (unansweredCount > 0) {
      confirmTitle = "Belum Semua Terjawab!";
      confirmMsg = `Anda memiliki ${unansweredCount} soal yang belum dijawab. Apakah Anda yakin tetap ingin mengumpulkan pekerjaan Anda saat ini?`;
    }

    showConfirm(
      confirmTitle,
      confirmMsg,
      async () => {
        await executeFinalCalculation();
      }
    );
  };

  const handleAutoSubmit = async () => {
    onNotify("Waktu habis! Mengirimkan jawaban secara otomatis...", "info");
    await executeFinalCalculation();
  };

  const executeFinalCalculation = async () => {
    if (!currentPackage) return;
    try {
      if (attemptNum === 1) {
        setFirstAttemptTimeLeft(timeLeft);
      }
      const res = await submitTryoutAnswers({
        participantName: fullName,
        institution,
        packageId: currentPackage.id,
        packageName: currentPackage.name,
        answers,
        questions: originalQuestionsOrdered, // always pass all package questions so we can consolidate first & second attempt results
        attemptNum,
        existingResultId: existingResult?.id, // sent for 2nd attempt recalculation updates
        durationSpent: Math.max(0, (currentPackage.duration * 60) - timeLeft)
      });

      setExistingResult(res);
      setExamState("results_card");
      onNotify("Simulasi Ujian Tryout berhasil dihitung!", "success");
      
      // Clear current session storage tracker
      sessionStorage.removeItem("tryout_active_session");

      // exit fullscreen if active
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);

    } catch (err: any) {
      onNotify("Gagal mengirimkan simulasi: " + err.message, "error");
    }
  };

  // Reset exam state completely
  const handleSignOutExam = () => {
    showConfirm(
      "Keluar dari Simulasi?",
      "Apakah Anda yakin ingin kembali ke halaman utama? Hasil nilai Anda saat ini akan tetap tersimpan dalam sistem database.",
      () => {
        setExamState("register");
        setFullName("");
        setInstitution("");
        setPackagePassword("");
        setCurrentPackage(null);
        setOriginalQuestionsOrdered([]);
        setShuffledQuestions([]);
        setAnswers({});
        setExistingResult(null);
        setAttemptNum(1);
        setFirstAttemptTimeLeft(null);
      }
    );
  };

  // Helper full screen toggle handles inside application iframe
  const toggleFullScreen = () => {
    try {
      const rootEl = document.documentElement;
      if (!isFullscreen) {
        if (rootEl.requestFullscreen) {
          rootEl.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => setIsFullscreen(true));
        } else {
          setIsFullscreen(true);
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => setIsFullscreen(false));
        } else {
          setIsFullscreen(false);
        }
      }
    } catch (e) {
      setIsFullscreen(!isFullscreen);
    }
  };

  // Format countdown clock
  const formatTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    
    const formattedMins = mins < 10 ? `0${mins}` : mins;
    const formattedSecs = secs < 10 ? `0${secs}` : secs;

    if (hrs > 0) {
      return `${hrs}:${formattedMins}:${formattedSecs}`;
    }
    return `${formattedMins}:${formattedSecs}`;
  };

  return (
    <div className={`mx-auto ${isFullscreen ? "fixed inset-0 z-50 bg-gray-50 p-6 dark:bg-slate-905 overflow-y-auto" : "max-w-7xl px-4 sm:px-6 lg:px-8 py-4 animate-fade-in"}`}>
      
      {/* ======================================= VIEW: REGISTRATION / HOME ======================================= */}
      {examState === "register" && (
        <div className="grid gap-8 lg:grid-cols-5.5 py-6">
          {/* Hero welcome graphics info on left */}
          <div className="lg:col-span-3 flex flex-col justify-center space-y-6">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
              <Sparkles className="h-4 w-4" />
              Akses Simulasi Ujian Langsung
            </div>
            
            <h2 className="text-3xl font-extrabold tracking-tight text-gray-950 sm:text-4xl dark:text-white">
              {branding?.title || "Simulasikan Ujian Tryout Anda Dengan Keyakinan Penuh."}
            </h2>
            
            <p className="text-gray-550 max-w-lg text-sm leading-relaxed dark:text-slate-400">
              {branding?.description || "Selamat datang di sistem simulasi ujian tryout profesional ICON Training Center! Masukkan detail identitas diri Anda, gunakan kata sandi paket dari instruktur, dan mulailah mengerjakan asesmen simulasi terstandar dengan hasil evaluasi instan."}
            </p>

            <div className="grid gap-4 sm:grid-cols-3 pt-4">
              <div className="rounded-xl border border-gray-150 p-4 bg-white/70 dark:border-slate-800 dark:bg-slate-900/60">
                <span className="text-[10px] font-bold tracking-widest text-blue-600 uppercase block dark:text-blue-400">Langkah 1</span>
                <span className="text-xs font-bold text-gray-900 block dark:text-white mt-1">Otentikasi Identitas</span>
                <span className="text-[11px] text-gray-450 dark:text-slate-500 block mt-0.5">Cukup masukkan nama lengkap & institusi Anda. Tidak membutuhkan registrasi pendaftaran akun.</span>
              </div>
              
              <div className="rounded-xl border border-gray-150 p-4 bg-white/70 dark:border-slate-800 dark:bg-slate-900/60">
                <span className="text-[10px] font-bold tracking-widest text-blue-600 uppercase block dark:text-blue-400">Langkah 2</span>
                <span className="text-xs font-bold text-gray-900 block dark:text-white mt-1">Simulasi Berwaktu</span>
                <span className="text-[11px] text-gray-450 dark:text-slate-500 block mt-0.5">Selesaikan pertanyaan pilihan ganda terstandar di bawah timer pengawasan aktif.</span>
              </div>

              <div className="rounded-xl border border-gray-150 p-4 bg-white/70 dark:border-slate-800 dark:bg-slate-900/60">
                <span className="text-[10px] font-bold tracking-widest text-blue-600 uppercase block dark:text-blue-400">Langkah 3</span>
                <span className="text-xs font-bold text-gray-900 block dark:text-white mt-1">Tingkatkan & Coba Lagi</span>
                <span className="text-[11px] text-gray-450 dark:text-slate-500 block mt-0.5">Penilaian performa instan dengan kesempatan mencoba kembali khusus soal-soal salah.</span>
              </div>
            </div>
          </div>

          {/* Form registration container on right */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-gray-150 bg-white p-6 shadow-sm dark:border-slate-850 dark:bg-slate-900">
              <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3 uppercase tracking-wider dark:text-white flex items-center gap-2">
                <FileText className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
                Registrasi Peserta Tryout
              </h3>

              <form onSubmit={handleStartExam} className="mt-5 space-y-4 text-xs">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-slate-300 mb-1">Nama Lengkap</label>
                  <div className="relative">
                    <User className="absolute top-2.5 left-3 h-4.5 w-4.5 text-gray-455" />
                    <input
                      type="text"
                      required
                      placeholder="Masukkan nama lengkap Anda"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-xs font-semibold text-gray-750 outline-none dark:border-slate-705 dark:bg-slate-850 dark:text-slate-300 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-slate-300 mb-1">Nama Institusi / Sekolah / Universitas</label>
                  <div className="relative">
                    <School className="absolute top-2.5 left-3 h-4.5 w-4.5 text-gray-455" />
                    <input
                      type="text"
                      required
                      placeholder="Contoh: SMA Negeri 1 Jakarta, Universitas Indonesia"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-xs font-semibold text-gray-750 outline-none dark:border-slate-705 dark:bg-slate-850 dark:text-slate-300 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-slate-300 mb-1">Paket Simulator Tersedia</label>
                  <select
                    value={selectedPkgId}
                    onChange={(e) => setSelectedPkgId(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-xs font-semibold text-gray-755 outline-none dark:border-slate-705 dark:bg-slate-850 dark:text-slate-300 focus:border-blue-500"
                  >
                    {activePackages.length === 0 ? (
                      <option value="">Tidak ada Tryout Aktif yang tersedia saat ini</option>
                    ) : (
                      activePackages.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Timer {p.duration} Menit)
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-slate-300 mb-1">Kata Sandi Paket Akses (PIN)</label>
                  <div className="relative">
                    <Key className="absolute top-2.5 left-3 h-4.5 w-4.5 text-gray-455" />
                    <input
                      type="password"
                      required
                      placeholder="Masukkan PIN keamanan akses"
                      value={packagePassword}
                      onChange={(e) => setPackagePassword(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-xs font-semibold text-gray-755 outline-none dark:border-slate-705 dark:bg-slate-850 dark:text-slate-300 focus:border-blue-500"
                    />
                  </div>
                  <span className="block text-[10px] text-gray-400 dark:text-slate-500 mt-1">PIN default untuk mencoba materi awal: `password123` atau `sciencepass`.</span>
                </div>

                <button
                  type="submit"
                  disabled={activePackages.length === 0}
                  className="w-full rounded-lg bg-blue-600 py-3 text-xs font-bold text-white shadow-md shadow-blue-500/15 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 transition"
                >
                  Otorisasi & Mulai Ujian Tryout
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ======================================= VIEW: ACTIVE EXAM IN PROGRESS ======================================= */}
      {examState === "exam_active" && currentPackage && (
        <div className="space-y-6">
          {/* Fixed/Sticky Top controls inside simulated environment */}
          <div className="rounded-2xl border border-gray-150 bg-white p-4 shadow-xs dark:border-slate-850 dark:bg-slate-900 flex flex-col md:flex-row items-center justify-between gap-4">
            
            <div className="flex items-center gap-3">
              <span className={`inline-flex rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                attemptNum === 1 
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" 
                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
              }`}>
                Percobaan {attemptNum} / 2
              </span>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">{currentPackage.name}</h3>
                <p className="text-[10px] text-gray-450 dark:text-slate-500">Kandidat: <span className="font-semibold text-gray-700 dark:text-slate-300">{fullName}</span> • {institution}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Count Down Indicator */}
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-100 px-4 py-2 text-slate-800 dark:bg-slate-850 dark:border-slate-800 dark:text-slate-200">
                <Clock className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400 animate-pulse" />
                <span className="font-mono text-sm font-bold tracking-tight">{formatTime(timeLeft)}</span>
              </div>

              {/* Fullscreen Toggle option */}
              <button
                onClick={toggleFullScreen}
                className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:text-gray-700 bg-white dark:border-slate-800 dark:bg-slate-850 dark:text-slate-400"
                title="Mode Layar Penuh"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>

              {/* Submit trigger */}
              <button
                onClick={handleSubmitExam}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/10 hover:bg-emerald-700 dark:bg-emerald-500"
              >
                <Send className="h-3.5 w-3.5" />
                Kumpulkan Ujian
              </button>
            </div>
          </div>          <div className="grid gap-6 lg:grid-cols-4">
            
            {/* Left columnar box: Question numbering grid list and indicators */}
            <div className="rounded-2xl border border-gray-150 bg-white p-5 shadow-xs lg:col-span-1 dark:border-slate-850 dark:bg-slate-900 space-y-4">
              <h4 className="text-xs font-bold text-gray-950 uppercase tracking-widest dark:text-white border-b border-gray-100 dark:border-slate-800 pb-2">Navigasi Soal</h4>
              
              <div className="grid grid-cols-4 gap-2">
                {shuffledQuestions.map((q, idx) => {
                   const isAnswered = answers[q.id] !== undefined;
                   const isReviewed = markedForReview[q.id] === true;
                   const isActive = idx === currentQuestionIndex;
 
                   let btnClass = "bg-gray-50 border-gray-200 text-gray-600 dark:bg-slate-800 dark:border-slate-750 dark:text-slate-400";
                   if (isActive) {
                     btnClass = "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/10 ring-2 ring-offset-2 ring-blue-500";
                   } else if (isReviewed) {
                     btnClass = "bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-400";
                   } else if (isAnswered) {
                     btnClass = "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-800 dark:text-indigo-400";
                   }
 
                   return (
                     <button
                       key={q.id}
                       onClick={() => setCurrentQuestionIndex(idx)}
                       className={`h-9 w-full rounded-lg border text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${btnClass}`}
                     >
                       {idx + 1}
                     </button>
                   );
                })}
              </div>
 
              {/* Legend checklist */}
              <div className="space-y-2.5 pt-3 border-t border-gray-100 dark:border-slate-800 text-[11px] font-semibold text-gray-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-xs bg-indigo-50 border border-indigo-200 block dark:bg-indigo-950/20 dark:border-indigo-800" />
                  <span>Soal Sudah Dijawab</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-xs bg-amber-50 border border-amber-300 block dark:bg-amber-950/20 dark:border-amber-800" />
                  <span>Ditandai Ragu-ragu</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-xs bg-gray-50 border border-gray-200 block dark:bg-slate-800 dark:border-slate-755" />
                  <span>Soal Belum Dijawab</span>
                </div>
              </div>
            </div>
 
            {/* Central Main Sheet: Reading the active question prompt */}
            <div className="rounded-2xl border border-gray-150 bg-white p-6 shadow-xs lg:col-span-3 dark:border-slate-850 dark:bg-slate-900 space-y-6">
              
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
                <span className="text-xs font-bold text-blue-600 block uppercase tracking-widest dark:text-blue-400">
                  Pertanyaan {currentQuestionIndex + 1} dari {shuffledQuestions.length}
                </span>
 
                <button
                  onClick={() => handleToggleMarkReview(shuffledQuestions[currentQuestionIndex].id)}
                  className={`flex items-center gap-1 text-[11px] font-bold rounded-lg px-2.5 py-1 ${
                    markedForReview[shuffledQuestions[currentQuestionIndex].id]
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Tandai Ragu-ragu
                </button>
              </div>
 
              {/* Question text */}
              <div className="min-h-[80px]">
                <p className="text-sm font-semibold text-gray-900 leading-relaxed dark:text-white">
                  {shuffledQuestions[currentQuestionIndex]?.text}
                </p>
              </div>
 
              {/* Options selection container */}
              <div className="space-y-2.5">
                {Object.entries(shuffledQuestions[currentQuestionIndex]?.options || {}).map(([key, val]) => {
                  if (!val) return null;
                  const questionId = shuffledQuestions[currentQuestionIndex].id;
                  const isSelected = answers[questionId] === key;
 
                  return (
                    <button
                      key={key}
                      onClick={() => handleSelectAnswer(questionId, key)}
                      className={`w-full text-left p-3.5 rounded-xl border flex items-center gap-3.5 transition-all text-xs cursor-pointer ${
                        isSelected
                          ? "bg-blue-50/70 border-blue-500/80 text-blue-900 shadow-sm ring-1 ring-blue-500/20 dark:bg-blue-950/20 dark:border-blue-400 dark:text-blue-200"
                          : "bg-white border-gray-150 hover:bg-gray-50 text-gray-700 dark:bg-slate-850 dark:border-slate-800 dark:text-slate-350 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className={`h-6 w-6 rounded-full flex shrink-0 items-center justify-center font-bold text-xs uppercase ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-550 dark:bg-slate-700 dark:text-slate-400"
                      }`}>
                        {key}
                      </span>
                      <span className="font-medium leading-relaxed">{val}</span>
                    </button>
                  );
                })}
              </div>
 
              {/* Navigation Back & Next controls */}
              <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-800 pt-4 mt-8">
                <button
                  disabled={currentQuestionIndex === 0}
                  onClick={handlePrevQuestion}
                  className="flex items-center gap-1 text-xs font-bold text-gray-600 hover:text-gray-900 disabled:opacity-40 select-none dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <ChevronLeft className="h-4.5 w-4.5" />
                  SEBELUMNYA
                </button>
 
                <button
                  disabled={currentQuestionIndex === shuffledQuestions.length - 1}
                  onClick={handleNextQuestion}
                  className="flex items-center gap-1 text-xs font-bold text-gray-650 hover:text-gray-900 disabled:opacity-40 select-none dark:text-slate-400 dark:hover:text-slate-200"
                >
                  SELANJUTNYA
                  <ChevronRight className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================= VIEW: TEST COMPLETED OUTCOMES ======================================= */}
      {examState === "results_card" && existingResult && currentPackage && (
        <div className="max-w-2xl mx-auto py-6 space-y-6">
          
          {/* Header congratulatory banner */}
          <div className={`rounded-3xl p-8 text-center border overflow-hidden relative shadow-md ${
            existingResult.status === "PASS"
              ? "bg-emerald-50/50 border-emerald-100 text-emerald-950 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-300"
              : "bg-red-50/50 border-red-100 text-red-950 dark:bg-red-950/20 dark:border-red-900/40 dark:text-red-300"
          }`}>
            
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl mx-auto mb-4 bg-white dark:bg-slate-800 shadow-md">
              {existingResult.status === "PASS" ? (
                <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400 animate-bounce" />
              ) : (
                <XCircle className="h-8 w-8 text-red-650 dark:text-red-400 animate-pulse" />
              )}
            </div>

            <span className="text-[10px] font-extrabold tracking-widest uppercase block mb-1">
              Simulasi Ujian Selesai
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight">
              {existingResult.status === "PASS" ? "SELAMAT! ANDA LULUS" : "SIMULASI SELESAI"}
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto mt-2 leading-relaxed">
              Berdasarkan batas nilai kelulusan minimal <span className="font-bold text-blue-600 dark:text-blue-400">{currentPackage.passingGrade}%</span>, berikut adalah ringkasan hasil simulasi Anda di bawah ini.
            </p>

            <div className="absolute right-6 top-6">
              <span className={`text-[11px] font-bold tracking-wider rounded-md px-2.5 py-1 shadow-xs dark:bg-slate-800 ${
                existingResult.status === "PASS" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
              }`}>
                {existingResult.status === "PASS" ? "LULUS" : "TIDAK LULUS"}
              </span>
            </div>
          </div>

          {/* Metric scores breakdown card */}
          <div className="rounded-2xl border border-gray-150 bg-white p-6 shadow-xs dark:border-slate-850 dark:bg-slate-900 space-y-5">
            <h3 className="text-xs font-extrabold text-gray-950 uppercase tracking-widest dark:text-white border-b border-gray-100 dark:border-slate-800 pb-2">Laporan Hasil Simulasi</h3>
            
            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div className="space-y-1 bg-slate-50 p-3 rounded-lg dark:bg-slate-850">
                <span className="text-gray-400 dark:text-slate-500 font-semibold block">Nama Peserta:</span>
                <span className="font-bold text-gray-800 dark:text-slate-200 block text-sm">{existingResult.participantName}</span>
                <span className="text-[11px] text-gray-500 block">{existingResult.institution}</span>
              </div>

              <div className="space-y-1 bg-slate-50 p-3 rounded-lg dark:bg-slate-850">
                <span className="text-gray-400 dark:text-slate-500 font-semibold block">Materi Tryout:</span>
                <span className="font-bold text-gray-800 dark:text-slate-200 block text-sm">{existingResult.packageName}</span>
                <span className="text-[11px] text-gray-500 block">Timer durasi: {currentPackage.duration} menit</span>
              </div>
            </div>

            <div className="grid gap-3 grid-cols-3 text-center border-t border-gray-100 dark:border-slate-800 pt-4">
              <div>
                <span className="text-[10px] font-semibold text-gray-450 uppercase block mb-1">Target Kelulusan</span>
                <span className="text-sm font-bold text-gray-700 dark:text-slate-350">{currentPackage.passingGrade}%</span>
              </div>
              <div className="border-l border-r border-gray-100 dark:border-slate-800">
                <span className="text-[10px] font-semibold text-gray-450 uppercase block mb-1">Jumlah Percobaan</span>
                <span className="text-sm font-bold text-gray-700 dark:text-slate-350">{existingResult.attemptCount} / 2</span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-gray-450 uppercase block mb-1">Skor Akhir</span>
                <span className="text-lg font-extrabold text-blue-600 dark:text-blue-400">{existingResult.finalScore} / 100</span>
              </div>
            </div>

            {/* If 2nd attempt was performed, show tabular progression: */}
            {existingResult.secondScore !== null && (
              <div className="p-3 bg-blue-50/50 border border-blue-100/60 rounded-xl dark:bg-slate-850 dark:border-slate-800 text-[11px] space-y-1 text-blue-800 dark:text-blue-300 font-medium">
                <p>📈 <span className="font-extrabold text-blue-900 dark:text-blue-200">Progres Percobaan:</span></p>
                <p>• Skor Percobaan 1: <span className="font-bold">{existingResult.firstScore} / 100</span> (Jawaban Benar: {existingResult.firstAttemptCorrect})</p>
                <p>• Skor Percobaan 2: <span className="font-bold">{existingResult.secondScore} / 100</span> (Soal salah yang berhasil diperbaiki: {existingResult.secondAttemptCorrect})</p>
              </div>
            )}
          </div>

          {/* ELEVATED AUTOMATED TRYOUT LOGIC: Rule 2 TRIGGER BUTTON (Second Attempt) */}
          {/* If first run was between 40 and 64, and attemptCount is 1, let's offer immediate retry of INCORRECT ONES */}
          {existingResult.finalScore >= 40 && existingResult.finalScore < 65 && existingResult.attemptCount === 1 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 shadow-xs dark:border-amber-900/40 dark:bg-amber-950/15 space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5.5 w-5.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider dark:text-amber-300">
                    Berhak Mengikuti Percobaan Kedua (Perbaikan)!
                  </h4>
                  <p className="text-xs text-amber-850 dark:text-amber-400 mt-1 leading-relaxed">
                    Berdasarkan panduan standar <span className="font-bold">Aturan 2</span> tryout, karena nilai awal Anda berada di antara <span className="font-bold">40% dan 64%</span>, Anda berhak mendapatkan tepat SATU kesempatan perbaikan yang berfokus <span className="font-bold">HANYA pada soal-soal yang salah sebelumnya</span> ({existingResult.incorrectQuestions.length} soal salah yang tersisa). Memperbaikinya akan meningkatkan skor akhir Anda!
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleStartSecondAttempt}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-3 text-xs font-bold text-white shadow-md shadow-amber-500/10 hover:bg-amber-700 transition"
                >
                  <RefreshCw className="h-4 w-4 animate-spin-slow" />
                  Kerjakan Perbaikan Soal Salah Sekarang
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-150 bg-slate-50 p-5 text-center dark:border-slate-800 dark:bg-slate-850/30">
              <p className="text-xs text-gray-450 dark:text-slate-500 font-medium">
                {existingResult.finalScore >= 65 
                  ? "✓ Selamat! Anda telah berhasil melampaui batas kelulusan yang ditentukan!" 
                  : "✗ Nilai Anda berada di bawah ambang batas minimal 40% - tidak diizinkan melakukan percobaan kedua berdasarkan Aturan 3."}
              </p>
            </div>
          )}

          {/* Action Footer switch and signouts */}
          <div className="flex justify-center gap-3">
            <button
              onClick={handleSignOutExam}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 bg-white dark:border-slate-800 dark:bg-slate-850 dark:text-slate-300 dark:hover:bg-slate-750 transition"
            >
              <LogOut className="h-4 w-4" />
              Selesai & Kembali ke Depan
            </button>
          </div>

        </div>
      )}

      {/* Custom Confirmation Dialog Modal Overlay */}
      {confirmModal && confirmModal.isOpen && (
        <div id="confirm-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-[2px]">
          <div className="w-full max-w-sm rounded-2xl border border-gray-250 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1 pt-1">
                <h3 className="text-xs font-extrabold text-gray-900 dark:text-white uppercase tracking-wider">
                  {confirmModal.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                  {confirmModal.message}
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                id="confirm-modal-cancel"
                onClick={() => setConfirmModal(null)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 bg-white dark:border-slate-800 dark:bg-slate-850 dark:text-slate-300 dark:hover:bg-slate-750 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                id="confirm-modal-submit"
                onClick={async () => {
                  const onConf = confirmModal.onConfirm;
                  setConfirmModal(null);
                  await onConf();
                }}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition cursor-pointer animate-pulse-slow"
              >
                Ya, Konfirmasi
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
