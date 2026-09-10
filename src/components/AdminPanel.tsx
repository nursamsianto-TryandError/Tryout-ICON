import React, { useState, useEffect } from "react";
import { 
  getAllPackages, savePackage, deletePackage, 
  getQuestionsForPackage, saveQuestion, deleteQuestion, 
  getAllResults, deleteResult, deleteMultipleResults, saveBrandingSettings, DEFAULT_BRANDING,
  updateAdminCredentials, getAdminAccount
} from "../services/dbService";
import { TryoutPackage, Question, TryoutResult, BrandingSettings } from "../types";
import { 
  LayoutDashboard, FolderKanban, HelpCircle, FileSpreadsheet, 
  Plus, Edit2, Trash2, CheckCircle2, XCircle, Search, 
  Download, Calendar, Award, GraduationCap, Clock, Filter, 
  Check, AlertCircle, RefreshCw, Settings, Sparkles, Trophy, BookOpen, ShieldCheck, BrainCircuit, Zap,
  KeyRound, Lock, Eye, EyeOff, User, Shield
} from "lucide-react";
import { jsPDF } from "jspdf";

interface AdminPanelProps {
  onNotify: (message: string, type: "success" | "error" | "info") => void;
  branding?: BrandingSettings | null;
  onBrandingUpdate?: (settings: BrandingSettings) => void;
  currentAdminUsername?: string;
  onAdminUsernameChange?: (newUsername: string) => void;
}

type TabType = "dashboard" | "packages" | "questions" | "results" | "settings";

export function AdminPanel({ onNotify, branding, onBrandingUpdate, currentAdminUsername = "admin", onAdminUsernameChange }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [packages, setPackages] = useState<TryoutPackage[]>([]);
  const [results, setResults] = useState<TryoutResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedResultIds, setSelectedResultIds] = useState<string[]>([]);

  const formatDurationSeconds = (seconds?: number) => {
    if (seconds === undefined || seconds === null) return "-";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s} dtk`;
    return `${m} mnt ${s} dtk`;
  };

  // Packages management states
  const [pkgModalOpen, setPkgModalOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<TryoutPackage | null>(null);
  const [pkgForm, setPkgForm] = useState<Omit<TryoutPackage, "createdAt">>({
    id: "",
    name: "",
    description: "",
    password: "",
    duration: 15,
    passingGrade: 65,
    isActive: true,
    secondAttemptThreshold: 45,
  });

  // Questions management states
  const [selectedPkgIdForQuestions, setSelectedPkgIdForQuestions] = useState<string>("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [quesModalOpen, setQuesModalOpen] = useState(false);
  const [editingQues, setEditingQues] = useState<Question | null>(null);
  const [quesForm, setQuesForm] = useState<Omit<Question, "id">>({
    packageId: "",
    text: "",
    imageUrl: "",
    options: { A: "", B: "", C: "", D: "", E: "" },
    correctAnswer: "A",
    scoreWeight: 10,
    explanation: ""
  });

  // Branding settings states
  const [bForm, setBForm] = useState<BrandingSettings>({
    title: "",
    description: "",
    logoTextPrefix: "",
    logoTextSuffix: "",
    logoSubtext: "",
    logoType: "icon",
    logoIconName: "BookOpen",
    logoUrl: ""
  });

  // Custom confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Admin credentials management state
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [credLoading, setCredLoading] = useState(false);
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [credForm, setCredForm] = useState({
    currentUsername: currentAdminUsername || "admin",
    currentPin: "",
    newUsername: currentAdminUsername || "admin",
    newPin: "",
    confirmNewPin: ""
  });

  useEffect(() => {
    if (currentAdminUsername) {
      setCredForm((prev) => ({
        ...prev,
        currentUsername: currentAdminUsername,
        newUsername: prev.newUsername || currentAdminUsername
      }));
    }
  }, [currentAdminUsername]);

  useEffect(() => {
    getAdminAccount(currentAdminUsername).then((acc) => {
      if (acc?.username) {
        onAdminUsernameChange?.(acc.username);
        setCredForm((prev) => ({
          ...prev,
          currentUsername: acc.username,
          newUsername: prev.newUsername || acc.username
        }));
      }
    });
  }, []);

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credForm.currentPin.trim()) {
      onNotify("Harap masukkan password/PIN saat ini untuk otorisasi.", "error");
      return;
    }
    if (!credForm.newUsername.trim() || credForm.newUsername.trim().length < 3) {
      onNotify("Username baru minimal 3 karakter.", "error");
      return;
    }
    if (!credForm.newPin.trim() || credForm.newPin.trim().length < 4) {
      onNotify("Password / PIN baru minimal 4 karakter.", "error");
      return;
    }
    if (credForm.newPin.trim() !== credForm.confirmNewPin.trim()) {
      onNotify("Konfirmasi password baru tidak cocok. Harap periksa kembali.", "error");
      return;
    }

    setCredLoading(true);
    try {
      const res = await updateAdminCredentials(
        credForm.currentUsername || currentAdminUsername || "admin",
        credForm.currentPin.trim(),
        credForm.newUsername.trim(),
        credForm.newPin.trim()
      );
      onNotify(`Kredensial admin berhasil diperbarui! Username admin sekarang: "${res.newUsername}".`, "success");
      onAdminUsernameChange?.(res.newUsername);
      setCredForm({
        currentUsername: res.newUsername,
        currentPin: "",
        newUsername: res.newUsername,
        newPin: "",
        confirmNewPin: ""
      });
      setAdminModalOpen(false);
    } catch (err: any) {
      onNotify("Gagal memperbarui kredensial: " + err.message, "error");
    } finally {
      setCredLoading(false);
    }
  };

  useEffect(() => {
    if (branding) {
      setBForm(branding);
    }
  }, [branding]);

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveBrandingSettings(bForm);
      if (onBrandingUpdate) {
        onBrandingUpdate(bForm);
      }
      onNotify("Pengaturan tampilan dashboard awal berhasil disimpan!", "success");
    } catch (err: any) {
      onNotify("Gagal menyimpan pengaturan: " + err.message, "error");
    }
  };

  // Results management search & filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [pkgFilter, setPkgFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const pkgs = await getAllPackages();
      setPackages(pkgs);
      
      const resList = await getAllResults();
      setResults(resList);

      if (pkgs.length > 0 && !selectedPkgIdForQuestions) {
        setSelectedPkgIdForQuestions(pkgs[0].id);
      }
    } catch (e: any) {
      onNotify("Error loading admin records: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch questions whenever selected package changes
  useEffect(() => {
    if (selectedPkgIdForQuestions) {
      getQuestionsForPackage(selectedPkgIdForQuestions)
        .then(setQuestions)
        .catch((err) => onNotify("Error loading questions: " + err.message, "error"));
    } else {
      setQuestions([]);
    }
  }, [selectedPkgIdForQuestions]);

  // Results history deletion handlers
  const handleDeleteSingleResult = (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Hapus History Pengerjaan?",
      message: `Apakah Anda yakin ingin menghapus history pengerjaan peserta '${name}'? Tindakan ini tidak dapat dibatalkan.`,
      onConfirm: async () => {
        try {
          await deleteResult(id);
          onNotify(`History '${name}' berhasil dihapus.`, "success");
          const resList = await getAllResults();
          setResults(resList);
          setSelectedResultIds((prev) => prev.filter((rId) => rId !== id));
        } catch (err: any) {
          onNotify("Gagal menghapus record: " + err.message, "error");
        } finally {
          setConfirmModal(null);
        }
      }
    });
  };

  const handleDeleteSelectedResults = () => {
    if (selectedResultIds.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: "Hapus History Terpilih?",
      message: `Apakah Anda yakin ingin menghapus ${selectedResultIds.length} history pengerjaan terpilih? Tindakan ini tidak dapat dibatalkan.`,
      onConfirm: async () => {
        try {
          await deleteMultipleResults(selectedResultIds);
          onNotify(`${selectedResultIds.length} history pengerjaan berhasil dihapus.`, "success");
          setSelectedResultIds([]);
          const resList = await getAllResults();
          setResults(resList);
        } catch (err: any) {
          onNotify("Gagal menghapus beberapa record: " + err.message, "error");
        } finally {
          setConfirmModal(null);
        }
      }
    });
  };

  const handleDeleteAllResults = () => {
    const allIds = filteredResults.map((r) => r.id);
    if (allIds.length === 0) {
      onNotify("Tidak ada data history untuk dihapus.", "info");
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: "Hapus Seluruh History?",
      message: `APAKAH ANDA YAKIN? Tindakan ini akan menghapus SELURUH history pengerjaan (${allIds.length} item) yang sesuai filter saat ini. Tindakan ini tidak dapat dibatalkan.`,
      onConfirm: async () => {
        try {
          await deleteMultipleResults(allIds);
          onNotify(`Seluruh ${allIds.length} history pengerjaan berhasil dibersihkan!`, "success");
          setSelectedResultIds([]);
          const resList = await getAllResults();
          setResults(resList);
        } catch (err: any) {
          onNotify("Gagal menghapus semua record: " + err.message, "error");
        } finally {
          setConfirmModal(null);
        }
      }
    });
  };

  // Packages functions
  const handleOpenPkgModal = (pkg: TryoutPackage | null = null) => {
    if (pkg) {
      setEditingPkg(pkg);
      setPkgForm({
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        password: pkg.password || "",
        duration: pkg.duration,
        passingGrade: pkg.passingGrade,
        isActive: pkg.isActive,
        secondAttemptThreshold: pkg.secondAttemptThreshold ?? 45,
      });
    } else {
      setEditingPkg(null);
      setPkgForm({
        id: `pkg_${Date.now()}`,
        name: "",
        description: "",
        password: "pass" + Math.floor(100 + Math.random() * 900),
        duration: 15,
        passingGrade: 65,
        isActive: true,
        secondAttemptThreshold: 45,
      });
    }
    setPkgModalOpen(true);
  };

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgForm.name.trim() || !pkgForm.description.trim()) {
      onNotify("Semua field nama dan deskripsi paket harus diisi.", "error");
      return;
    }
    try {
      const targetPackage: TryoutPackage = {
        ...pkgForm,
        createdAt: editingPkg ? editingPkg.createdAt : new Date().toISOString()
      };
      await savePackage(targetPackage);
      onNotify(`Paket '${pkgForm.name}' berhasil disimpan.`, "success");
      setPkgModalOpen(false);
      
      // Auto-select and jump to questions tab if this was a new package creation!
      if (!editingPkg) {
        setSelectedPkgIdForQuestions(targetPackage.id);
        setActiveTab("questions");
      }
      
      loadData();
    } catch (err: any) {
      onNotify("Gagal menyimpan paket: " + err.message, "error");
    }
  };

  const handleDeletePackage = (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Hapus Paket Soal?",
      message: `Apakah Anda yakin ingin menghapus paket soal '${name}'? Tindakan ini akan menghapus semua soal yang berasosiasi dengannya dan dapat merusak riwayat pengerjaan hasil.`,
      onConfirm: async () => {
        try {
          await deletePackage(id);
          onNotify(`Paket '${name}' berhasil dihapus.`, "success");
          if (selectedPkgIdForQuestions === id) {
            setSelectedPkgIdForQuestions("");
          }
          loadData();
        } catch (err: any) {
          onNotify("Gagal menghapus paket: " + err.message, "error");
        } finally {
          setConfirmModal(null);
        }
      }
    });
  };

  const handleTogglePackageActive = async (pkg: TryoutPackage) => {
    try {
      const updated = { ...pkg, isActive: !pkg.isActive };
      await savePackage(updated);
      onNotify(`Package is now ${updated.isActive ? "Active" : "Inactive"}.`, "success");
      loadData();
    } catch (err: any) {
      onNotify("Toggle status failed: " + err.message, "error");
    }
  };

  // Questions functions
  const handleOpenQuesModal = (ques: Question | null = null) => {
    if (ques) {
      setEditingQues(ques);
      setQuesForm({
        packageId: ques.packageId,
        text: ques.text,
        imageUrl: ques.imageUrl || "",
        options: {
          A: ques.options.A,
          B: ques.options.B,
          C: ques.options.C,
          D: ques.options.D,
          E: ques.options.E || ""
        },
        correctAnswer: ques.correctAnswer,
        scoreWeight: ques.scoreWeight,
        explanation: ques.explanation || ""
      });
    } else {
      setEditingQues(null);
      setQuesForm({
        packageId: selectedPkgIdForQuestions,
        text: "",
        imageUrl: "",
        options: { A: "", B: "", C: "", D: "", E: "" },
        correctAnswer: "A",
        scoreWeight: 10,
        explanation: ""
      });
    }
    setQuesModalOpen(true);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      onNotify("Ukuran file terlalu besar. Pilih file di bawah 3MB.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const MAX_DIM = 800;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.75);
          setQuesForm(prev => ({ ...prev, imageUrl: compressedBase64 }));
          onNotify("Gambar berhasil di-upload dan dikompresi.", "success");
        } else {
          setQuesForm(prev => ({ ...prev, imageUrl: src }));
        }
      };
      img.onerror = () => {
        onNotify("Gagal memuat file gambar.", "error");
      };
      img.src = src;
    };
    reader.onerror = () => {
      onNotify("Gagal membaca file gambar.", "error");
    };
    reader.readAsDataURL(file);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quesForm.packageId) {
      onNotify("Silakan pilih paket soal terlebih dahulu.", "error");
      return;
    }
    if (!quesForm.text.trim() || !quesForm.options.A.trim() || !quesForm.options.B.trim() || !quesForm.options.C.trim() || !quesForm.options.D.trim()) {
      onNotify("Harap isi teks pertanyaan dan minimal 4 pilihan jawaban (A sampai D).", "error");
      return;
    }
    try {
      const qId = editingQues ? editingQues.id : `ques_${Date.now()}`;
      const finalQuestion: Question = {
        id: qId,
        packageId: quesForm.packageId,
        text: quesForm.text,
        ...(quesForm.imageUrl?.trim() ? { imageUrl: quesForm.imageUrl.trim() } : {}),
        options: {
          A: quesForm.options.A,
          B: quesForm.options.B,
          C: quesForm.options.C,
          D: quesForm.options.D,
          ...(quesForm.options.E?.trim() ? { E: quesForm.options.E.trim() } : {})
        },
        correctAnswer: quesForm.correctAnswer,
        scoreWeight: Number(quesForm.scoreWeight),
        ...(quesForm.explanation?.trim() ? { explanation: quesForm.explanation.trim() } : {})
      };

      await saveQuestion(finalQuestion);
      onNotify("Pertanyaan berhasil disimpan.", "success");
      setQuesModalOpen(false);
      
      // Keep selected package in sync with where the question was saved
      if (quesForm.packageId !== selectedPkgIdForQuestions) {
        setSelectedPkgIdForQuestions(quesForm.packageId);
      } else {
        // reload questions list
        const qList = await getQuestionsForPackage(selectedPkgIdForQuestions);
        setQuestions(qList);
      }
    } catch (err: any) {
      onNotify("Gagal menyimpan pertanyaan: " + err.message, "error");
    }
  };

  const handleDeleteQuestion = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Hapus Pertanyaan?",
      message: "Apakah Anda yakin ingin menghapus pertanyaan ini dari paket soal?",
      onConfirm: async () => {
        try {
          await deleteQuestion(id);
          onNotify("Pertanyaan berhasil dihapus.", "success");
          const qList = await getQuestionsForPackage(selectedPkgIdForQuestions);
          setQuestions(qList);
        } catch (err: any) {
          onNotify("Gagal menghapus pertanyaan: " + err.message, "error");
        } finally {
          setConfirmModal(null);
        }
      }
    });
  };

  // PDF Export single result
  const exportResultToPDF = (res: TryoutResult) => {
    try {
      const doc = new jsPDF();
      
      // Theme colors
      const primaryColor = "#1D4ED8"; // Blue 700
      const slateDark = "#1E293B"; // Slate 800
      const grayLight = "#64748B"; // Slate 500

      // Top title banner
      doc.setFillColor(29, 78, 216); // Royal Blue
      doc.rect(0, 0, 210, 40, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("TRYOUT ICON TC EXAM CERTIFICATE", 15, 25);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.text("Generated Official Examination Audit Report", 15, 32);

      // Participant Header Card
      doc.setTextColor(slateDark);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("PARTICIPANT DETAILS", 15, 55);
      
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.line(15, 58, 195, 58);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(grayLight);
      doc.text("Full Name:", 15, 68);
      doc.text("Institution/School:", 15, 76);
      doc.text("Tryout Package:", 15, 84);
      doc.text("Exam Completed At:", 15, 92);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(slateDark);
      doc.text(res.participantName, 60, 68);
      doc.text(res.institution, 60, 76);
      doc.text(res.packageName, 60, 84);
      doc.text(new Date(res.createdAt).toLocaleString(), 60, 92);

      // Score Metrics Card
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(15, 102, 180, 50, "F");
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.rect(15, 102, 180, 50, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("EXAM SCORES & OUTCOME", 20, 112);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(grayLight);
      
      doc.text("First Attempt Score:", 20, 122);
      doc.text("Second Attempt Score:", 20, 130);
      doc.text("Total Total Questions Answered Correctly:", 20, 138);
      doc.text("Total Attempts:", 20, 146);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(slateDark);
      doc.text(`${res.firstScore} / 100`, 90, 122);
      doc.text(res.secondScore !== null ? `${res.secondScore} / 100` : "N/A (No 2nd Attempt)", 90, 130);
      
      const totalCorrect = res.firstAttemptCorrect + (res.secondAttemptCorrect || 0);
      const totalIncorrect = res.firstAttemptIncorrect - (res.secondAttemptCorrect || 0); // approx
      doc.text(`${totalCorrect} Correct answers`, 90, 138);
      doc.text(`${res.attemptCount} Attempt(s)`, 90, 146);

      // Score status large box
      doc.setFillColor(res.status === "PASS" ? 220 : 254, res.status === "PASS" ? 252 : 226, res.status === "PASS" ? 231 : 226); // green or red
      doc.rect(140, 110, 45, 34, "F");
      doc.setTextColor(res.status === "PASS" ? 21 : 153, res.status === "PASS" ? 128 : 27, res.status === "PASS" ? 61 : 27);
      doc.setFontSize(18);
      doc.text(res.status, 147, 126);
      doc.setFontSize(9);
      doc.text(`SCORE: ${res.finalScore}`, 147, 135);

      // Summary Statement
      doc.setTextColor(slateDark);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Verification Statement:", 15, 165);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(grayLight);
      doc.text(`This document verifies that the participant has simulated the Tryout ICON TC online exam successfully. All marks are computed automatically and secured by Tryout ICON TC data registries.`, 15, 172, { maxWidth: 180 });

      // Footnote
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(grayLight);
      doc.text("Tryout ICON TC Admin Portal - Authentic Validation Key: " + res.id, 15, 280);

      doc.save(`result_${res.participantName.replace(/\s+/g, "_")}.pdf`);
      onNotify(`Receipt for ${res.participantName} exported as PDF successfully!`, "success");
    } catch (err: any) {
      onNotify("PDF Generation failed: " + err.message, "error");
    }
  };

  // Dashboard calculation details
  const totalPkgs = packages.length;
  const totalParticipants = results.length;
  const completedResults = results;
  const passCount = completedResults.filter((r) => r.status === "PASS").length;
  const failCount = completedResults.filter((r) => r.status === "FAIL").length;
  const passRate = totalParticipants > 0 ? Math.round((passCount / totalParticipants) * 100) : 0;
  const failRate = totalParticipants > 0 ? Math.round((failCount / totalParticipants) * 100) : 0;
  const avgScore = totalParticipants > 0 
    ? Math.round((completedResults.reduce((sum, r) => sum + r.finalScore, 0) / totalParticipants) * 10) / 10
    : 0;

  // Filtered Results computing
  const filteredResults = results.filter((res) => {
    const matchesSearch = 
      res.participantName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      res.institution.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPkg = pkgFilter ? res.packageId === pkgFilter : true;
    const matchesStatus = statusFilter ? res.status === statusFilter : true;

    return matchesSearch && matchesPkg && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* Admin Title Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Admin Console</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Manage tryout packages, formulate exam questions, and oversee system simulated outcomes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAdminModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-750 shadow-xs hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750 transition cursor-pointer"
          >
            <KeyRound className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>Ubah Akun / Password</span>
          </button>

          <button
            onClick={loadData}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750 transition cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Data
          </button>
          
          <button
            onClick={() => handleOpenPkgModal(null)}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/15 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Create Package
          </button>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="border-b border-gray-100 dark:border-slate-800">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-1.5 border-b-2 py-4 text-xs font-semibold uppercase tracking-wider ${
              activeTab === "dashboard"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <LayoutDashboard className="h-4.5 w-4.5" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("packages")}
            className={`flex items-center gap-1.5 border-b-2 py-4 text-xs font-semibold uppercase tracking-wider ${
              activeTab === "packages"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <FolderKanban className="h-4.5 w-4.5" />
            Packages
          </button>
          <button
            onClick={() => setActiveTab("questions")}
            className={`flex items-center gap-1.5 border-b-2 py-4 text-xs font-semibold uppercase tracking-wider ${
              activeTab === "questions"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <HelpCircle className="h-4.5 w-4.5" />
            Questions
          </button>
          <button
            onClick={() => setActiveTab("results")}
            className={`flex items-center gap-1.5 border-b-2 py-4 text-xs font-semibold uppercase tracking-wider ${
              activeTab === "results"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <FileSpreadsheet className="h-4.5 w-4.5" />
            Results Registry
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-1.5 border-b-2 py-4 text-xs font-semibold uppercase tracking-wider ${
              activeTab === "settings"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Settings className="h-4.5 w-4.5" />
            Portal Settings
          </button>
        </nav>
      </div>

      {loading ? (
        /* Loading skeleton dashboard elements */
        <div className="space-y-6 animate-pulse">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-xl bg-gray-100 dark:bg-slate-800" />
            ))}
          </div>
          <div className="h-96 rounded-xl bg-gray-100 dark:bg-slate-800" />
        </div>
      ) : (
        <>
          {/* ======================================= TAB 1: DASHBOARD ======================================= */}
          {activeTab === "dashboard" && (
            <div className="space-y-8">
              {/* Stats bento Grid */}
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs dark:border-slate-850 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500 dark:text-slate-400">Total Participants</span>
                    <span className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                      <GraduationCap className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{totalParticipants}</h3>
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Simultaneously computed tries</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs dark:border-slate-850 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500 dark:text-slate-400">Active Packages</span>
                    <span className="rounded-lg bg-purple-50 p-2 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
                      <FolderKanban className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                      {packages.filter((p) => p.isActive).length} <span className="text-sm font-normal text-gray-400">/ {totalPkgs}</span>
                    </h3>
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Enabled active exams</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs dark:border-slate-850 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500 dark:text-slate-400">Pass Rate</span>
                    <span className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                      <Award className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{passRate}%</h3>
                    <span className="text-xs text-emerald-600 font-semibold">{passCount} passed</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Passing grade threshold: &gt;= 65</p>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs dark:border-slate-850 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500 dark:text-slate-400">Average Final Score</span>
                    <span className="rounded-lg bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                      <Clock className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{avgScore} <span className="text-sm font-normal text-gray-450 dark:text-slate-450">/ 100</span></h3>
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Arithmetic performance mean</p>
                  </div>
                </div>
              </div>

              {/* Progress Analytics Visual & Recent List */}
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Simulated Chart area */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs lg:col-span-1 dark:border-slate-850 dark:bg-slate-900">
                  <h3 className="text-sm font-bold text-gray-950 dark:text-white uppercase tracking-wider">Pass vs Fail distribution</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mb-6">Visual representation based on current tryouts data.</p>
                  
                  {totalParticipants === 0 ? (
                    <div className="flex h-56 flex-col items-center justify-center text-center">
                      <p className="text-sm font-medium text-gray-450 dark:text-slate-550">No tryout records registered yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center justify-center p-4">
                        {/* Custom visual progress circle */}
                        <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-12 border-gray-100 dark:border-slate-800">
                          <div 
                            className="absolute inset-0 rounded-full border-12 border-blue-600 dark:border-blue-500"
                            style={{ clipPath: `polygon(50% 50%, 50% 0%, ${passRate >= 25 ? "100%" : "50%"} ${passRate >= 25 ? "0%" : "0%"}, ${passRate >= 50 ? "100%" : "50%"} ${passRate >= 50 ? "100%" : "0%"}, ${passRate >= 75 ? "0%" : "50%"} ${passRate >= 75 ? "100%" : "0%"}, 50% 100%)` }}
                          />
                          <div className="text-center z-10">
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">{passRate}%</span>
                            <p className="text-[10px] text-gray-450 uppercase font-bold tracking-wide dark:text-slate-400">Pass rate</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100 dark:border-slate-800">
                        <div className="text-center">
                          <span className="inline-block h-2 w-2 rounded-full bg-blue-600 mr-2" />
                          <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">PASS ({passCount})</span>
                        </div>
                        <div className="text-center border-l border-gray-100 dark:border-slate-800">
                          <span className="inline-block h-2 w-2 rounded-full bg-red-500 mr-2" />
                          <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">FAIL ({failCount})</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Recent Activities Panel */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs lg:col-span-2 dark:border-slate-850 dark:bg-slate-900">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-950 dark:text-white uppercase tracking-wider">Recent Tryout Submissions</h3>
                    <button 
                      onClick={() => setActiveTab("results")} 
                      className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                    >
                      View All
                    </button>
                  </div>
                  
                  {results.length === 0 ? (
                    <div className="flex h-56 flex-col items-center justify-center text-center">
                      <GraduationCap className="h-10 w-10 text-gray-350 dark:text-slate-600 mb-2" />
                      <p className="text-sm font-medium text-gray-500 dark:text-slate-400">No recent submissions found.</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Start a tryout on the participant panel to verify.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-slate-800 max-h-[300px] overflow-y-auto pr-1">
                      {results.slice(0, 5).map((act) => (
                        <div key={act.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                              act.status === "PASS" 
                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400" 
                                : "bg-red-50 text-red-650 dark:bg-red-950/40 dark:text-red-400"
                            }`}>
                              {act.status === "PASS" ? <CheckCircle2 className="h-4.5 w-4.5" /> : <XCircle className="h-4.5 w-4.5" />}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-900 dark:text-white">{act.participantName}</p>
                              <p className="text-[10px] text-gray-400 dark:text-slate-500">
                                {act.institution} • {act.packageName}
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <span className="text-xs font-bold text-gray-950 dark:text-white">{act.finalScore} / 100</span>
                            <p className="text-[9px] text-gray-450 dark:text-slate-500">
                              {act.attemptCount === 2 ? "2nd Attempt Finished" : "1st Attempt"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ======================================= TAB 2: PACKAGES ======================================= */}
          {activeTab === "packages" && (
            <div className="rounded-2xl border border-gray-100 bg-white shadow-xs dark:border-slate-850 dark:bg-slate-900">
              <div className="p-6 border-b border-gray-100 dark:border-slate-850 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-950 dark:text-white uppercase tracking-wider">Exam Packages Registry</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Configure active exam sessions, set passwords, thresholds, and timers.</p>
                </div>
                <button
                  onClick={() => handleOpenPkgModal(null)}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition cursor-pointer self-start sm:self-auto shrink-0"
                >
                  <Plus className="h-4.5 w-4.5" />
                  Buat Paket Baru
                </button>
              </div>

              {packages.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center">
                  <FolderKanban className="h-10 w-10 text-gray-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm font-semibold text-gray-650 dark:text-slate-450">No Packages available.</p>
                  <button
                    onClick={() => handleOpenPkgModal(null)}
                    className="mt-4 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Add custom package now
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-[10px] font-bold text-gray-550 uppercase tracking-wider border-b border-gray-100 dark:bg-slate-850 dark:text-slate-400 dark:border-slate-800">
                        <th className="py-3 px-6">Package Name & Details</th>
                        <th className="py-3 px-4">Passcode</th>
                        <th className="py-3 px-4 text-center">Duration</th>
                        <th className="py-3 px-4 text-center">Passing Grade</th>
                        <th className="py-3 px-4 text-center">2nd Attempt Min</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-6 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs dark:divide-slate-850">
                      {packages.map((pkg) => (
                        <tr key={pkg.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-850/50">
                          <td className="py-4 px-6 md:max-w-xs">
                            <span className="font-semibold text-gray-900 dark:text-white block">{pkg.name}</span>
                            <span className="text-[11px] text-gray-450 line-clamp-1 dark:text-slate-400 mt-0.5">{pkg.description}</span>
                          </td>
                          <td className="py-4 px-4">
                            <code className="rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] dark:bg-slate-800 text-blue-700 dark:text-blue-300">
                              {pkg.password || "No Pass"}
                            </code>
                          </td>
                          <td className="py-4 px-4 text-center font-medium text-gray-900 dark:text-white">
                            {pkg.duration} Mins
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                              {pkg.passingGrade}%
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                              {pkg.secondAttemptThreshold ?? 45}%
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <button
                              onClick={() => handleTogglePackageActive(pkg)}
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase cursor-pointer transition ${
                                pkg.isActive
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                              }`}
                            >
                              {pkg.isActive ? "Active" : "Inactive"}
                            </button>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center justify-center gap-2.5">
                              <button
                                onClick={() => {
                                  setSelectedPkgIdForQuestions(pkg.id);
                                  setActiveTab("questions");
                                }}
                                className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 transition cursor-pointer dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/30"
                                title="Kelola pertanyaan di paket ini"
                              >
                                <HelpCircle className="h-3.5 w-3.5" />
                                Kelola Soal
                              </button>
                              <button
                                onClick={() => handleOpenPkgModal(pkg)}
                                className="p-1 text-gray-400 hover:text-blue-600 transition cursor-pointer"
                                title="Edit package attributes"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeletePackage(pkg.id, pkg.name)}
                                className="p-1 text-gray-400 hover:text-red-500 transition cursor-pointer"
                                title="Delete Package"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ======================================= TAB 3: QUESTIONS ======================================= */}
          {activeTab === "questions" && (
            <div className="space-y-6">
              {/* Package Select and title */}
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs dark:border-slate-850 dark:bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-gray-950 dark:text-white uppercase tracking-wider">Exam Questions Formulator</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Select which package catalog you want to update or assign questions for.</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <label htmlFor="pkgSelect" className="text-xs font-semibold text-gray-600 dark:text-slate-300">Target Package:</label>
                  <select
                    id="pkgSelect"
                    value={selectedPkgIdForQuestions}
                    onChange={(e) => setSelectedPkgIdForQuestions(e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white p-2 text-xs font-semibold text-gray-700 shadow-xs outline-none dark:border-slate-700 dark:bg-slate-850 dark:text-slate-300 focus:border-blue-500"
                  >
                    <option value="">-- Choose Exam Package --</option>
                    {packages.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name} ({pkg.isActive ? "Active" : "Inactive"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Questions Registry area */}
              {selectedPkgIdForQuestions && (
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs dark:border-slate-850 dark:bg-slate-900 space-y-6">
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-4">
                    <div>
                      <h4 className="text-xs font-bold text-gray-950 uppercase tracking-widest dark:text-white">ASSIGNED QUESTIONS ({questions.length})</h4>
                    </div>
                    <button
                      onClick={() => handleOpenQuesModal(null)}
                      className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                    >
                      <Plus className="h-4.5 w-4.5" />
                      Add Question
                    </button>
                  </div>

                  {questions.length === 0 ? (
                    <div className="text-center py-10">
                      <HelpCircle className="h-10 w-10 text-gray-350 dark:text-slate-600 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-gray-600 dark:text-slate-450">This package has no questions formulated yet.</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Formulate custom questions and allocate points weight to calculate grades.</p>
                    </div>
                  ) : (
                    <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
                      {questions.map((q, idx) => (
                        <div key={q.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 dark:border-slate-800 dark:bg-slate-850/50 space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                              {idx + 1}
                            </span>
                            
                            <div className="grow space-y-2">
                              <p className="text-xs font-semibold text-gray-900 leading-relaxed dark:text-white bg-transparent whitespace-pre-wrap">
                                {q.text}
                              </p>
                              {q.imageUrl && (
                                <div className="flex justify-start">
                                  <img
                                    src={q.imageUrl}
                                    alt="Question Visual Preview"
                                    className="max-h-24 object-contain rounded border border-gray-200 bg-white p-0.5 dark:border-slate-800 dark:bg-slate-900"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[10px] font-bold bg-gray-200/70 text-gray-700 rounded-sm px-1.5 py-0.5 mr-2 dark:bg-slate-750 dark:text-slate-300">
                                weight: {q.scoreWeight}
                              </span>
                              <button
                                onClick={() => handleOpenQuesModal(q)}
                                className="p-1 text-gray-450 hover:text-blue-600"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteQuestion(q.id)}
                                className="p-1 text-gray-450 hover:text-red-500"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Options grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-10 text-xs">
                            {Object.entries(q.options).map(([key, val]) => {
                              if (!val) return null;
                              const isCorrect = key === q.correctAnswer;
                              return (
                                <div 
                                  key={key} 
                                  className={`p-2 rounded-lg border flex items-center gap-2 ${
                                    isCorrect 
                                      ? "bg-emerald-50/80 border-emerald-200/60 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/45 dark:text-emerald-300" 
                                      : "bg-white border-gray-100 text-gray-700 dark:bg-slate-800 dark:border-slate-750 dark:text-slate-350"
                                  }`}
                                >
                                  <span className={`h-5 w-5 rounded-full flex shrink-0 items-center justify-center font-bold text-[10px] uppercase ${
                                    isCorrect 
                                      ? "bg-emerald-600 text-white" 
                                      : "bg-gray-100 text-gray-550 dark:bg-slate-700 dark:text-slate-400"
                                  }`}>
                                    {key}
                                  </span>
                                  <span className="whitespace-pre-wrap">{val}</span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Explanation block */}
                          {q.explanation && (
                            <div className="pl-10 text-[11px] text-gray-400 italic flex items-start gap-1">
                              <span className="font-bold text-gray-500 dark:text-slate-400 not-italic shrink-0">Solution key:</span>
                              <span className="dark:text-slate-350 whitespace-pre-wrap">{q.explanation}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ======================================= TAB 4: RESULTS ======================================= */}
          {activeTab === "results" && (
            <div className="space-y-6">
              {/* Search & Filters block */}
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs dark:border-slate-850 dark:bg-slate-900 space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-950 dark:text-white uppercase tracking-wider">Simulated Results Ledger</h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Review test results, execute audits, and print certifications.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleDeleteAllResults}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50/50 px-3.5 py-2 text-xs font-bold text-red-650 hover:bg-red-100 dark:border-red-950/40 dark:bg-red-950/20 dark:text-red-400 transition cursor-pointer shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Hapus Semua History ({filteredResults.length})
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-4.5">
                  {/* Search box */}
                  <div className="relative md:col-span-2">
                    <Search className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search participant or institution name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-xs font-semibold text-gray-750 outline-none dark:border-slate-700 dark:bg-slate-850 dark:text-slate-300 focus:border-blue-500"
                    />
                  </div>

                  {/* Package Filter */}
                  <div>
                    <select
                      value={pkgFilter}
                      onChange={(e) => setPkgFilter(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-xs font-semibold text-gray-750 outline-none dark:border-slate-700 dark:bg-slate-850 dark:text-slate-300 focus:border-blue-500"
                    >
                      <option value="">All Packages</option>
                      {packages.map((pkg) => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status filter */}
                  <div>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-xs font-semibold text-gray-750 outline-none dark:border-slate-700 dark:bg-slate-850 dark:text-slate-300 focus:border-blue-500"
                    >
                      <option value="">All Statuses</option>
                      <option value="PASS">PASS</option>
                      <option value="FAIL">FAIL</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Bulk operations ribbon */}
              {selectedResultIds.length > 0 && (
                <div className="flex items-center justify-between rounded-xl bg-red-50 p-4 border border-red-150 text-xs text-red-800 dark:bg-red-950/20 dark:border-red-900/60 dark:text-red-400 animate-in slide-in-from-top-3 duration-150">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{selectedResultIds.length} history pengerjaan terpilih</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleDeleteSelectedResults}
                      className="flex items-center gap-1.5 rounded-lg bg-red-650 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition shadow-xs cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Hapus Terpilih ({selectedResultIds.length})
                    </button>
                    <button
                      onClick={() => setSelectedResultIds([])}
                      className="text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 transition cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}

              {/* Results grid / table */}
              <div className="rounded-2xl border border-gray-100 bg-white shadow-xs dark:border-slate-850 dark:bg-slate-900 overflow-hidden">
                {filteredResults.length === 0 ? (
                  <div className="p-12 text-center">
                    <FileSpreadsheet className="h-10 w-10 text-gray-350 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-gray-600 dark:text-slate-450">No results found matching filtration.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse border-spacing-0">
                      <thead>
                        <tr className="bg-gray-50 text-[10px] font-bold text-gray-550 uppercase tracking-wider border-b border-gray-100 dark:bg-slate-850 dark:text-slate-400 dark:border-slate-800">
                          <th className="py-3.5 px-4 text-center w-12">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer h-4 w-4"
                              checked={filteredResults.length > 0 && selectedResultIds.length === filteredResults.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedResultIds(filteredResults.map(r => r.id));
                                } else {
                                  setSelectedResultIds([]);
                                }
                              }}
                            />
                          </th>
                          <th className="py-3.5 px-4">Participant</th>
                          <th className="py-3.5 px-4">Package</th>
                          <th className="py-3.5 px-4 text-center">First Score</th>
                          <th className="py-3.5 px-4 text-center">Second Score</th>
                          <th className="py-3.5 px-4 text-center">Final Score</th>
                          <th className="py-3.5 px-4 text-center">Outcome</th>
                          <th className="py-3.5 px-4 text-center">Tries</th>
                          <th className="py-3.5 px-4 text-center">Duration</th>
                          <th className="py-3.5 px-6 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-xs dark:divide-slate-850">
                        {filteredResults.map((res) => {
                          const isChecked = selectedResultIds.includes(res.id);
                          return (
                            <tr key={res.id} className={`hover:bg-gray-50/50 dark:hover:bg-slate-850/50 transition-colors ${isChecked ? "bg-blue-50/30 dark:bg-blue-950/10" : ""}`}>
                              <td className="py-4 px-4 text-center">
                                <input
                                  type="checkbox"
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer h-4 w-4"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedResultIds((prev) => [...prev, res.id]);
                                    } else {
                                      setSelectedResultIds((prev) => prev.filter(id => id !== res.id));
                                    }
                                  }}
                                />
                              </td>
                              <td className="py-4 px-4">
                                <span className="font-bold text-gray-900 dark:text-white block">{res.participantName}</span>
                                <span className="text-[10px] text-gray-450 block dark:text-slate-450 mt-0.5">{res.institution}</span>
                              </td>
                              <td className="py-4 px-4 font-medium text-gray-650 dark:text-slate-350">
                                {res.packageName}
                              </td>
                              <td className="py-4 px-4 text-center font-semibold text-gray-900 dark:text-white">
                                {res.firstScore}
                              </td>
                              <td className="py-4 px-4 text-center font-medium text-gray-450 dark:text-slate-400">
                                {res.secondScore !== null ? res.secondScore : "-"}
                              </td>
                              <td className="py-4 px-4 text-center font-extrabold text-blue-700 dark:text-blue-400">
                                {res.finalScore}
                              </td>
                              <td className="py-4 px-4 text-center">
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase ${
                                  res.status === "PASS"
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                    : "bg-red-50 text-red-650 dark:bg-red-950/40 dark:text-red-400"
                                }`}>
                                  {res.status}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-center font-bold text-gray-700 dark:text-slate-300">
                                {res.attemptCount}
                              </td>
                              <td className="py-4 px-4 text-center font-semibold text-gray-650 dark:text-slate-450 font-mono">
                                {formatDurationSeconds(res.durationSpent)}
                              </td>
                              <td className="py-4 px-6">
                                <div className="flex items-center justify-center gap-3">
                                  <button
                                    onClick={() => exportResultToPDF(res)}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 transition"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                    PDF
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSingleResult(res.id, res.participantName)}
                                    className="p-1 rounded text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition cursor-pointer"
                                    title="Hapus History"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================= TAB 5: PORTAL SETTINGS ======================================= */}
          {activeTab === "settings" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Card: Keamanan & Kredensial Akun Admin */}
              <div className="rounded-2xl border border-gray-150 bg-white p-6 shadow-xs dark:border-slate-850 dark:bg-slate-900">
                <div className="border-b border-gray-100 pb-4 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-950 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <KeyRound className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      Keamanan & Kredensial Login Admin
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                      Perbarui username dan kata sandi (PIN) login administrator default untuk perlindungan akses simulator.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-semibold self-start sm:self-auto">
                    <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span>Akun Aktif: <strong>{credForm.currentUsername || currentAdminUsername || "admin"}</strong></span>
                  </div>
                </div>

                <form onSubmit={handleUpdateCredentials} className="mt-6 space-y-4 text-xs">
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Password saat ini */}
                    <div className="md:col-span-2">
                      <label className="block font-bold text-gray-700 dark:text-slate-350 mb-1.5 uppercase tracking-wider text-[10px]">
                        Password / PIN Saat Ini <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                        <input
                          type={showCurrentPin ? "text" : "password"}
                          value={credForm.currentPin}
                          onChange={(e) => setCredForm({ ...credForm, currentPin: e.target.value })}
                          required
                          placeholder="Masukkan password/PIN lama Anda saat ini untuk otorisasi"
                          className="w-full rounded-lg border border-gray-250 bg-white py-2.5 pl-9 pr-10 font-semibold text-gray-750 outline-none dark:border-slate-700 dark:bg-slate-850 dark:text-slate-300 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPin(!showCurrentPin)}
                          className="absolute top-2.5 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {showCurrentPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
                        Verifikasi keamanan diperlukan sebelum sistem mengubah kredensial database.
                      </p>
                    </div>

                    {/* Username Baru */}
                    <div className="md:col-span-2">
                      <label className="block font-bold text-gray-700 dark:text-slate-350 mb-1.5 uppercase tracking-wider text-[10px]">
                        Username Admin Baru <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={credForm.newUsername}
                          onChange={(e) => setCredForm({ ...credForm, newUsername: e.target.value })}
                          required
                          minLength={3}
                          placeholder="Masukkan username baru (min. 3 karakter)"
                          className="w-full rounded-lg border border-gray-250 bg-white py-2.5 pl-9 pr-4 font-semibold text-gray-750 outline-none dark:border-slate-700 dark:bg-slate-850 dark:text-slate-300 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Password Baru */}
                    <div>
                      <label className="block font-bold text-gray-700 dark:text-slate-350 mb-1.5 uppercase tracking-wider text-[10px]">
                        Password / PIN Baru <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <KeyRound className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                        <input
                          type={showNewPin ? "text" : "password"}
                          value={credForm.newPin}
                          onChange={(e) => setCredForm({ ...credForm, newPin: e.target.value })}
                          required
                          minLength={4}
                          placeholder="Password baru (min. 4 karakter)"
                          className="w-full rounded-lg border border-gray-250 bg-white py-2.5 pl-9 pr-10 font-semibold text-gray-750 outline-none dark:border-slate-700 dark:bg-slate-850 dark:text-slate-300 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPin(!showNewPin)}
                          className="absolute top-2.5 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {showNewPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Konfirmasi Password Baru */}
                    <div>
                      <label className="block font-bold text-gray-700 dark:text-slate-350 mb-1.5 uppercase tracking-wider text-[10px]">
                        Konfirmasi Password / PIN Baru <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <KeyRound className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                        <input
                          type={showConfirmPin ? "text" : "password"}
                          value={credForm.confirmNewPin}
                          onChange={(e) => setCredForm({ ...credForm, confirmNewPin: e.target.value })}
                          required
                          minLength={4}
                          placeholder="Ulangi password baru"
                          className="w-full rounded-lg border border-gray-250 bg-white py-2.5 pl-9 pr-10 font-semibold text-gray-750 outline-none dark:border-slate-700 dark:bg-slate-850 dark:text-slate-300 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPin(!showConfirmPin)}
                          className="absolute top-2.5 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {showConfirmPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-slate-800">
                    <button
                      type="submit"
                      disabled={credLoading}
                      className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-bold text-white shadow-md shadow-blue-500/15 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 transition cursor-pointer"
                    >
                      {credLoading ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Menyimpan Perubahan...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-4 w-4" />
                          Simpan Kredensial Baru
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              <div className="rounded-2xl border border-gray-150 bg-white p-6 shadow-xs dark:border-slate-850 dark:bg-slate-900">
                <div className="border-b border-gray-100 pb-4 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-gray-950 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Kustomisasi Portal & Dashboard Utama
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    Edit konten teks landing page portal peserta, penulisan nama logo, dan set gambar logo kustom.
                  </p>
                </div>

                <form onSubmit={handleSaveBranding} className="mt-6 space-y-5 text-xs">
                  {/* Dashboard Header block */}
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="block font-bold text-gray-700 dark:text-slate-350 mb-1.5 uppercase tracking-wider text-[10px]">Judul Utama Landing Page</label>
                      <input
                        type="text"
                        value={bForm.title}
                        onChange={(e) => setBForm({ ...bForm, title: e.target.value })}
                        required
                        placeholder="Simulasi Ujian Tryout ICON TC"
                        className="w-full rounded-lg border border-gray-250 bg-white p-3 font-semibold text-gray-750 outline-none dark:border-slate-700 dark:bg-slate-850 dark:text-slate-300 focus:border-blue-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block font-bold text-gray-700 dark:text-slate-350 mb-1.5 uppercase tracking-wider text-[10px]">Deskripsi / Paragraf Selamat Datang</label>
                      <textarea
                        rows={4}
                        value={bForm.description}
                        onChange={(e) => setBForm({ ...bForm, description: e.target.value })}
                        required
                        placeholder="Teks petunjuk pendaftaran peserta..."
                        className="w-full rounded-lg border border-gray-250 bg-white p-3 font-semibold text-gray-750 outline-none dark:border-slate-700 dark:bg-slate-850 dark:text-slate-300 focus:border-blue-500 leading-relaxed"
                      />
                    </div>
                  </div>

                  {/* Logo block */}
                  <div className="border-t border-gray-100 pt-5 dark:border-slate-800 space-y-4">
                    <h4 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-blue-600" />
                      Konfigurasi Identitas Logo & Header Brand
                    </h4>

                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                      <div>
                        <label className="block font-bold text-gray-700 dark:text-slate-350 mb-1 text-[10px] uppercase">Logo Prefix (Teks Tebal)</label>
                        <input
                          type="text"
                          value={bForm.logoTextPrefix}
                          onChange={(e) => setBForm({ ...bForm, logoTextPrefix: e.target.value })}
                          required
                          className="w-full rounded-lg border border-gray-250 bg-white p-2.5 font-semibold text-gray-750 outline-none dark:border-slate-700 dark:bg-slate-850 dark:text-slate-300 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-gray-700 dark:text-slate-350 mb-1 text-[10px] uppercase">Logo Suffix (Teks Biasa)</label>
                        <input
                          type="text"
                          value={bForm.logoTextSuffix}
                          onChange={(e) => setBForm({ ...bForm, logoTextSuffix: e.target.value })}
                          required
                          className="w-full rounded-lg border border-gray-250 bg-white p-2.5 font-semibold text-gray-750 outline-none dark:border-slate-700 dark:bg-slate-850 dark:text-slate-300 focus:border-blue-500 text-blue-600 dark:text-blue-400"
                        />
                      </div>

                      <div className="sm:col-span-2 md:col-span-1">
                        <label className="block font-bold text-gray-700 dark:text-slate-350 mb-1 text-[10px] uppercase">Tipe Tampilan Simbol Logo</label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setBForm({ ...bForm, logoType: "icon" })}
                            className={`flex-1 rounded-lg border py-2 text-xs font-bold transition-all ${
                              bForm.logoType === "icon"
                                ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                                : "border-gray-200 bg-white text-gray-650 hover:bg-gray-50 dark:border-slate-750 dark:bg-slate-850 dark:text-slate-300"
                            }`}
                          >
                            Default Icon Vector
                          </button>
                          <button
                            type="button"
                            onClick={() => setBForm({ ...bForm, logoType: "url" })}
                            className={`flex-1 rounded-lg border py-2 text-xs font-bold transition-all ${
                              bForm.logoType === "url"
                                ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                                : "border-gray-200 bg-white text-gray-650 hover:bg-gray-50 dark:border-slate-750 dark:bg-slate-850 dark:text-slate-300"
                            }`}
                          >
                            Custom Image URL
                          </button>
                        </div>
                      </div>

                      <div className="sm:col-span-2 md:col-span-2">
                        <label className="block font-bold text-gray-700 dark:text-slate-350 mb-1 text-[10px] uppercase">Slogan / Keterangan Institusi Baris Kedua</label>
                        <input
                          type="text"
                          value={bForm.logoSubtext}
                          onChange={(e) => setBForm({ ...bForm, logoSubtext: e.target.value })}
                          required
                          className="w-full rounded-lg border border-gray-250 bg-white p-2.5 font-semibold text-gray-750 outline-none dark:border-slate-700 dark:bg-slate-850 dark:text-slate-300 focus:border-blue-500"
                        />
                      </div>

                      {bForm.logoType === "url" && (
                        <div className="sm:col-span-2 md:col-span-1 animate-in slide-in-from-top-2 duration-100">
                          <label className="block font-bold text-gray-700 dark:text-slate-350 mb-1 text-[10px] uppercase text-amber-650 dark:text-amber-400">Custom Logo Image URL</label>
                          <input
                            type="url"
                            value={bForm.logoUrl}
                            onChange={(e) => setBForm({ ...bForm, logoUrl: e.target.value })}
                            placeholder="https://domain.com/path-to-image.png"
                            required={bForm.logoType === "url"}
                            className="w-full rounded-lg border border-amber-300 bg-white p-2.5 font-semibold text-gray-750 outline-none dark:border-slate-700 dark:bg-slate-850 dark:text-slate-300 focus:border-blue-500"
                          />
                        </div>
                      )}

                      {bForm.logoType === "icon" && (
                        <div className="sm:col-span-2 md:col-span-3 pt-1">
                          <label className="block font-bold text-gray-700 dark:text-slate-350 mb-1.5 text-[10px] uppercase">Pilih Simbol Icon Vector Brand</label>
                          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                            {[
                              { name: "GraduationCap", label: "Kelulusan", icon: GraduationCap },
                              { name: "Award", label: "Penghargaan", icon: Award },
                              { name: "Trophy", label: "Piala", icon: Trophy },
                              { name: "BookOpen", label: "Buku", icon: BookOpen },
                              { name: "ShieldCheck", label: "Perisai", icon: ShieldCheck },
                              { name: "BrainCircuit", label: "Kecerdasan", icon: BrainCircuit },
                              { name: "Sparkles", label: "Prestasi", icon: Sparkles },
                              { name: "Zap", label: "Kilat", icon: Zap },
                            ].map((item) => {
                              const IconComp = item.icon;
                              const isSelected = (bForm.logoIconName || "BookOpen") === item.name;
                              return (
                                <button
                                  key={item.name}
                                  type="button"
                                  onClick={() => setBForm({ ...bForm, logoIconName: item.name })}
                                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all cursor-pointer ${
                                    isSelected
                                      ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 font-bold shadow-xs ring-2 ring-blue-500/20"
                                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-slate-750 dark:bg-slate-850 dark:text-slate-400"
                                  }`}
                                >
                                  <IconComp className="h-5 w-5 mb-1" />
                                  <span className="text-[10px]">{item.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-gray-150 pt-5 flex justify-end gap-3 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setBForm(branding || DEFAULT_BRANDING)}
                      className="rounded-lg border border-gray-250 bg-white py-2 px-5 font-semibold text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-850 dark:text-slate-450 transition cursor-pointer"
                    >
                      Batal Kustomisasi
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-blue-600 py-2 px-6 font-bold text-white hover:bg-blue-700 shadow-md shadow-blue-500/10 transition cursor-pointer"
                    >
                      Simpan Perubahan Dashboard
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      {/* ======================================= MODAL: CREATE/EDIT PACKAGE ======================================= */}
      {pkgModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-gray-150 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3 uppercase tracking-wider dark:text-white">
              {editingPkg ? "Modify Package Parameters" : "Instantiate Tryout Package"}
            </h3>

            <form onSubmit={handleSavePackage} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-gray-650 dark:text-slate-350 mb-1">Package ID</label>
                <input
                  type="text"
                  disabled={editingPkg !== null}
                  value={pkgForm.id}
                  onChange={(e) => setPkgForm({ ...pkgForm, id: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 font-mono text-[11px] font-semibold text-gray-500 outline-none dark:border-slate-700 dark:bg-slate-850 dark:text-slate-450 focus:border-blue-500 disabled:opacity-75"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-650 dark:text-slate-350 mb-1">Package Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Standard SAT Mathematics Prep"
                  value={pkgForm.name}
                  onChange={(e) => setPkgForm({ ...pkgForm, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 bg-white p-2.5 font-semibold text-gray-750 outline-none dark:border-slate-700 dark:bg-slate-850 dark:text-slate-300 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-650 dark:text-slate-350 mb-1">Package Description</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Summarize the core syllabus or outline..."
                  value={pkgForm.description}
                  onChange={(e) => setPkgForm({ ...pkgForm, description: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 bg-white p-2.5 font-semibold text-gray-750 outline-none dark:border-slate-700 dark:bg-slate-850 dark:text-slate-300 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-650 dark:text-slate-350 mb-1">Tryout Password (PIN)</label>
                  <input
                    type="text"
                    required
                    placeholder="password"
                    value={pkgForm.password}
                    onChange={(e) => setPkgForm({ ...pkgForm, password: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 bg-white p-2.5 font-semibold text-gray-750 outline-none dark:border-slate-700 dark:bg-slate-850 dark:text-slate-300 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-650 dark:text-slate-350 mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={300}
                    value={pkgForm.duration}
                    onChange={(e) => setPkgForm({ ...pkgForm, duration: Number(e.target.value) })}
                    className="w-full rounded-lg border border-gray-200 bg-white p-2.5 font-semibold text-gray-750 outline-none dark:border-slate-700 dark:bg-slate-850 dark:text-slate-300 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-650 dark:text-slate-350 mb-1">Minimum Passing Threshold (%)</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={100}
                  value={pkgForm.passingGrade}
                  onChange={(e) => setPkgForm({ ...pkgForm, passingGrade: Number(e.target.value) })}
                  className="w-full rounded-lg border border-gray-200 bg-white p-2.5 font-semibold text-gray-750 outline-none dark:border-slate-700 dark:bg-slate-850 dark:text-slate-300 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-650 dark:text-slate-350 mb-1">Ambang Batas Minimal Percobaan Kedua (%) / Second Attempt Min Threshold (%)</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={100}
                  value={pkgForm.secondAttemptThreshold ?? 45}
                  onChange={(e) => setPkgForm({ ...pkgForm, secondAttemptThreshold: Number(e.target.value) })}
                  className="w-full rounded-lg border border-gray-200 bg-white p-2.5 font-semibold text-gray-750 outline-none dark:border-slate-700 dark:bg-slate-850 dark:text-slate-300 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="activeCheck"
                  type="checkbox"
                  checked={pkgForm.isActive}
                  onChange={(e) => setPkgForm({ ...pkgForm, isActive: e.target.checked })}
                  className="h-4 w-4 rounded-sm border-gray-300 text-blue-600 dark:border-slate-700 dark:bg-slate-800"
                />
                <label htmlFor="activeCheck" className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                  Instantly active for tryout takers
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPkgModalOpen(false)}
                  className="rounded-lg bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================= MODAL: CREATE/EDIT QUESTION ======================================= */}
      {quesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-gray-150 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150 my-8">
            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3 uppercase tracking-wider dark:text-white">
              {editingQues ? "Edit Question Formulations" : "Compose Multi-choice Question"}
            </h3>

            <form onSubmit={handleSaveQuestion} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-gray-650 dark:text-slate-350 mb-1">Target Paket Soal (Target Package)</label>
                <select
                  required
                  value={quesForm.packageId}
                  onChange={(e) => setQuesForm({ ...quesForm, packageId: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 bg-white p-2.5 font-semibold text-gray-750 outline-none dark:border-slate-700 dark:bg-slate-850 dark:text-slate-300 focus:border-blue-500 cursor-pointer"
                >
                  <option value="">-- Pilih Paket Soal Target --</option>
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-650 dark:text-slate-350 mb-1">Question Statement</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Type the question content or pattern query here..."
                  value={quesForm.text}
                  onChange={(e) => setQuesForm({ ...quesForm, text: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 bg-white p-2.5 font-semibold text-gray-750 outline-none dark:border-slate-700 dark:bg-slate-850 dark:text-slate-300 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-650 dark:text-slate-350 mb-1">
                  Gambar Soal (Opsi Tambahan Gambar)
                </label>
                <div className="space-y-3 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/40">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="block text-[10px] text-gray-500 mb-1">Paste Image URL:</span>
                      <input
                        type="url"
                        placeholder="https://example.com/image.png"
                        value={quesForm.imageUrl?.startsWith("data:") ? "" : quesForm.imageUrl || ""}
                        onChange={(e) => setQuesForm({ ...quesForm, imageUrl: e.target.value })}
                        className="w-full rounded-md border border-gray-200 bg-white p-2 text-[11px] font-semibold text-gray-700 outline-none dark:border-slate-700 dark:bg-slate-850 dark:text-slate-300 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-500 mb-1">Upload File Local:</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="w-full text-[11px] text-gray-550 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-blue-50 file:text-blue-700 file:cursor-pointer hover:file:bg-blue-100 dark:file:bg-blue-950/40 dark:file:text-blue-300"
                      />
                    </div>
                  </div>

                  {quesForm.imageUrl && (
                    <div className="mt-2 flex items-center gap-3 border-t border-gray-100 dark:border-slate-800 pt-2 bg-transparent">
                      <img
                        src={quesForm.imageUrl}
                        alt="Preview"
                        className="h-14 w-20 object-contain rounded-md border border-gray-200 bg-white p-0.5 dark:border-slate-750 dark:bg-slate-800"
                        referrerPolicy="no-referrer"
                      />
                      <div className="grow">
                        <span className="text-[10px] text-emerald-650 dark:text-emerald-400 font-semibold block">
                          {quesForm.imageUrl.startsWith("data:") ? "✓ File gambar di-upload (Base64)" : "✓ Link URL gambar aktif"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuesForm({ ...quesForm, imageUrl: "" })}
                          className="text-[10px] text-red-650 hover:underline font-bold mt-0.5 block cursor-pointer transition active:scale-95"
                        >
                          Hapus Gambar (Clear Image)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Options inputs */}
              <div className="space-y-2 border-t border-gray-100 pt-3 dark:border-slate-800">
                <span className="block text-xs font-bold text-gray-900 mb-1 dark:text-white uppercase tracking-wider">Choice Options</span>
                
                <div className="grid gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 font-bold text-gray-600 select-none dark:text-slate-400">A</span>
                    <input
                      type="text"
                      required
                      placeholder="Enter option content"
                      value={quesForm.options.A}
                      onChange={(e) => setQuesForm({ ...quesForm, options: { ...quesForm.options, A: e.target.value } })}
                      className="grow rounded-lg border border-gray-200 bg-white p-1.5 font-semibold text-gray-750 outline-none dark:border-slate-700 dark:bg-slate-850 focus:border-blue-500 dark:text-slate-300"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="w-5 font-bold text-gray-600 select-none dark:text-slate-400">B</span>
                    <input
                      type="text"
                      required
                      placeholder="Enter option content"
                      value={quesForm.options.B}
                      onChange={(e) => setQuesForm({ ...quesForm, options: { ...quesForm.options, B: e.target.value } })}
                      className="grow rounded-lg border border-gray-200 bg-white p-1.5 font-semibold text-gray-750 outline-none dark:border-slate-700 dark:bg-slate-850 focus:border-blue-500 dark:text-slate-300"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="w-5 font-bold text-gray-600 select-none dark:text-slate-400">C</span>
                    <input
                      type="text"
                      required
                      placeholder="Enter option content"
                      value={quesForm.options.C}
                      onChange={(e) => setQuesForm({ ...quesForm, options: { ...quesForm.options, C: e.target.value } })}
                      className="grow rounded-lg border border-gray-200 bg-white p-1.5 font-semibold text-gray-750 outline-none dark:border-slate-700 dark:bg-slate-850 focus:border-blue-500 dark:text-slate-300"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="w-5 font-bold text-gray-600 select-none dark:text-slate-400">D</span>
                    <input
                      type="text"
                      required
                      placeholder="Enter option content"
                      value={quesForm.options.D}
                      onChange={(e) => setQuesForm({ ...quesForm, options: { ...quesForm.options, D: e.target.value } })}
                      className="grow rounded-lg border border-gray-200 bg-white p-1.5 font-semibold text-gray-750 outline-none dark:border-slate-700 dark:bg-slate-850 focus:border-blue-500 dark:text-slate-300"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="w-5 font-bold text-gray-400 select-none">E</span>
                    <input
                      type="text"
                      placeholder="Optional fifth option (E)"
                      value={quesForm.options.E}
                      onChange={(e) => setQuesForm({ ...quesForm, options: { ...quesForm.options, E: e.target.value } })}
                      className="grow rounded-lg border border-gray-200 bg-white p-1.5 text-gray-750 outline-none dark:border-slate-705 dark:bg-slate-850 focus:border-blue-500 dark:text-slate-350"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-3 dark:border-slate-855">
                <div>
                  <label className="block text-xs font-semibold text-gray-650 dark:text-slate-350 mb-1">Correct Answer Letter Key</label>
                  <select
                    value={quesForm.correctAnswer}
                    onChange={(e) => setQuesForm({ ...quesForm, correctAnswer: e.target.value as "A" | "B" | "C" | "D" | "E" })}
                    className="w-full rounded-lg border border-gray-200 bg-white p-2 text-xs font-semibold text-gray-750 outline-none dark:border-slate-707 dark:bg-slate-850 dark:text-slate-300 focus:border-blue-500"
                  >
                    <option value="A">Choice A</option>
                    <option value="B">Choice B</option>
                    <option value="C">Choice C</option>
                    <option value="D">Choice D</option>
                    {quesForm.options.E?.trim() && <option value="E">Choice E</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-650 dark:text-slate-350 mb-1">Score Weight (Allocation value)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={100}
                    value={quesForm.scoreWeight}
                    onChange={(e) => setQuesForm({ ...quesForm, scoreWeight: Number(e.target.value) })}
                    className="w-full rounded-lg border border-gray-200 bg-white p-2 text-xs font-semibold text-gray-750 outline-none dark:border-slate-707 dark:bg-slate-850 dark:text-slate-300 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-650 dark:text-slate-350 mb-1">Solution (Optional explanation key)</label>
                <textarea
                  rows={2}
                  placeholder="Explain why this choice works for participants tracking incorrect mistakes..."
                  value={quesForm.explanation}
                  onChange={(e) => setQuesForm({ ...quesForm, explanation: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 bg-white p-2 font-semibold text-gray-755 outline-none dark:border-slate-707 dark:bg-slate-850 dark:text-slate-350 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setQuesModalOpen(false)}
                  className="rounded-lg bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-750 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  Record Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation Dialog */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-[2px]">
          <div className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all dark:bg-slate-900 border border-gray-150/70 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400">
                <AlertCircle className="h-5.5 w-5.5" />
              </div>
              <div className="grow">
                <h3 className="text-base font-bold text-gray-950 dark:text-white">
                  {confirmModal.title}
                </h3>
                <p className="mt-2 text-xs font-medium text-gray-500 dark:text-slate-400 leading-relaxed bg-transparent">
                  {confirmModal.message}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 dark:border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="rounded-lg bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-750 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Batal (Cancel)
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition cursor-pointer active:scale-95"
              >
                Hapus (Confirm)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Credentials Change Modal */}
      {adminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[3px] overflow-y-auto">
          <div className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-2xl transition-all dark:bg-slate-900 border border-gray-150 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-950 dark:text-white">
                    Ubah Akun & Password Admin
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Akun Aktif: <span className="font-semibold text-blue-600 dark:text-blue-400">{credForm.currentUsername || currentAdminUsername || "admin"}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdminModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCredentials} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 dark:text-slate-350 mb-1.5 uppercase tracking-wider text-[10px]">
                  Password / PIN Saat Ini <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                  <input
                    type={showCurrentPin ? "text" : "password"}
                    value={credForm.currentPin}
                    onChange={(e) => setCredForm({ ...credForm, currentPin: e.target.value })}
                    required
                    placeholder="Masukkan password/PIN lama Anda saat ini"
                    className="w-full rounded-lg border border-gray-250 bg-white py-2.5 pl-9 pr-10 font-semibold text-gray-750 outline-none dark:border-slate-700 dark:bg-slate-850 dark:text-slate-300 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPin(!showCurrentPin)}
                    className="absolute top-2.5 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showCurrentPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
                  Verifikasi keamanan kredensial lama diperlukan sebelum menyimpan.
                </p>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-slate-350 mb-1.5 uppercase tracking-wider text-[10px]">
                  Username Admin Baru <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={credForm.newUsername}
                    onChange={(e) => setCredForm({ ...credForm, newUsername: e.target.value })}
                    required
                    minLength={3}
                    placeholder="Username baru (cth: admin_icon)"
                    className="w-full rounded-lg border border-gray-250 bg-white py-2.5 pl-9 pr-4 font-semibold text-gray-750 outline-none dark:border-slate-700 dark:bg-slate-850 dark:text-slate-300 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-slate-350 mb-1.5 uppercase tracking-wider text-[10px]">
                    Password / PIN Baru <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                    <input
                      type={showNewPin ? "text" : "password"}
                      value={credForm.newPin}
                      onChange={(e) => setCredForm({ ...credForm, newPin: e.target.value })}
                      required
                      minLength={4}
                      placeholder="Min. 4 karakter"
                      className="w-full rounded-lg border border-gray-250 bg-white py-2.5 pl-9 pr-10 font-semibold text-gray-750 outline-none dark:border-slate-700 dark:bg-slate-850 dark:text-slate-300 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPin(!showNewPin)}
                      className="absolute top-2.5 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showNewPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-slate-350 mb-1.5 uppercase tracking-wider text-[10px]">
                    Konfirmasi Password Baru <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                    <input
                      type={showConfirmPin ? "text" : "password"}
                      value={credForm.confirmNewPin}
                      onChange={(e) => setCredForm({ ...credForm, confirmNewPin: e.target.value })}
                      required
                      minLength={4}
                      placeholder="Ulangi password"
                      className="w-full rounded-lg border border-gray-250 bg-white py-2.5 pl-9 pr-10 font-semibold text-gray-750 outline-none dark:border-slate-700 dark:bg-slate-850 dark:text-slate-300 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPin(!showConfirmPin)}
                      className="absolute top-2.5 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showConfirmPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-100 dark:border-slate-800 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setAdminModalOpen(false)}
                  className="rounded-lg bg-gray-100 px-4 py-2.5 font-semibold text-gray-750 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={credLoading}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-bold text-white shadow-md shadow-blue-500/15 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 transition cursor-pointer"
                >
                  {credLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      Simpan Kredensial
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
