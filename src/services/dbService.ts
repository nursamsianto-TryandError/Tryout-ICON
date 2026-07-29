import { db } from "../firebase";
import { 
  collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc, 
  query, where, orderBy, limit, Timestamp, writeBatch 
} from "firebase/firestore";
import { TryoutPackage, Question, TryoutResult, BrandingSettings } from "../types";

// Auto-seed function to ensure the app has excellent default working data on first load.
export async function seedInitialDataIfEmpty() {
  try {
    // 1. Check Admins
    const adminCol = collection(db, "admins");
    const adminSnap = await getDocs(adminCol);
    if (adminSnap.empty) {
      console.log("Seeding default admin...");
      await setDoc(doc(db, "admins", "admin"), {
        username: "admin",
        pin: "admin123"
      });
    }

    // 2. Check Packages
    const pkgCol = collection(db, "tryout_packages");
    const pkgSnap = await getDocs(pkgCol);
    if (!pkgSnap.empty) {
      return; // Already populated
    }

    console.log("Database is kosong. Seeding sampel Tryout asli dan kumpulan soal...");

    // Create Package 1: Kemampuan Matematika & Logika Dasar
    const pkg1Id = "math-logic-sim-2026";
    const pkg1Data: TryoutPackage = {
      id: pkg1Id,
      name: "Kemampuan Matematika & Logika Dasar",
      description: "Ujian simulasi yang mencakup logika inti, penalaran aljabar, dan pola matematika kuantitatif. Sempurna untuk persiapan tes kompetensi umum.",
      password: "password123",
      duration: 10, // 10 menit
      passingGrade: 65,
      isActive: true,
      createdAt: new Date().toISOString(),
      secondAttemptThreshold: 45
    };
    await setDoc(doc(db, "tryout_packages", pkg1Id), pkg1Data);

    const questionsPkg1: Omit<Question, "id">[] = [
      {
        packageId: pkg1Id,
        text: "Dalam bahasa kode tertentu, 'COMPUTER' ditulis sebagai 'RFUVQNPC'. Bagaimana 'MEDICINE' ditulis dalam bahasa kode tersebut?",
        options: {
          A: "EOJDJEFM",
          B: "EOJDEJFM",
          C: "MFEJDJOE",
          D: "DJFMEOJE"
        },
        correctAnswer: "A",
        scoreWeight: 25,
        explanation: "Polanya: Balikkan kata computer menjadi retupmoc, kemudian ubah huruf batas dan geser lainnya. Pengaturan huruf atau pergeseran siklik: huruf pertama kata asli menjadi terakhir, huruf terakhir menjadi pertama. Huruf lainnya dinaikkan +1 dalam urutan terbalik."
      },
      {
        packageId: pkg1Id,
        text: "Rata-rata usia kelas berisi 30 siswa adalah 15 tahun. Jika usia guru dimasukkan, rata-ratanya meningkat sebesar 1 tahun. Berapakah usia guru tersebut?",
        options: {
          A: "40 tahun",
          B: "45 tahun",
          C: "46 tahun",
          D: "50 tahun",
          E: "55 tahun"
        },
        correctAnswer: "C",
        scoreWeight: 25,
        explanation: "Total usia 30 siswa = 30 * 15 = 450 tahun. Total usia termasuk guru = 31 * (15 + 1) = 31 * 16 = 496 tahun. Usia guru = 496 - 450 = 46 tahun."
      },
      {
        packageId: pkg1Id,
        text: "Seorang pedagang menjual buku catatan seharga Rp12.000 dengan mengambil keuntungan sebesar 20% dari harga beli. Berapakah harga beli persis dari buku catatan tersebut?",
        options: {
          A: "Rp9.600",
          B: "Rp10.000",
          C: "Rp10.500",
          D: "Rp11.000"
        },
        correctAnswer: "B",
        scoreWeight: 25,
        explanation: "Harga Jual (HJ) = Harga Beli (HB) * (1 + Keuntungan%). Rp12.000 = HB * 1,2 => HB = 12.000 / 1,2 = Rp10.000."
      },
      {
        packageId: pkg1Id,
        text: "Perhatikan deret berikut: 2, 1, (1/2), (1/4), ... Angka berapa yang harus muncul selanjutnya?",
        options: {
          A: "(1/3)",
          B: "(1/8)",
          C: "(2/8)",
          D: "(1/16)",
          E: "(1/12)"
        },
        correctAnswer: "B",
        scoreWeight: 25,
        explanation: "Ini adalah deret pembagian sederhana; setiap angka adalah setengah dari angka sebelumnya. (1/4) * (1/2) = (1/8)."
      }
    ];

    for (const q of questionsPkg1) {
      const qRef = doc(collection(db, "questions"));
      await setDoc(qRef, { ...q, id: qRef.id });
    }

    // Create Package 2: Sains & Biologi Lanjutan
    const pkg2Id = "science-tech-sim-2026";
    const pkg2Data: TryoutPackage = {
      id: pkg2Id,
      name: "Sains & Biologi Lanjutan",
      description: "Ujian intensif mengevaluasi proses biologis seluler, terminologi ilmiah, dan prinsip dasar organisasi kimia organik.",
      password: "sciencepass",
      duration: 15,
      passingGrade: 65,
      isActive: true,
      createdAt: new Date().toISOString(),
      secondAttemptThreshold: 45
    };
    await setDoc(doc(db, "tryout_packages", pkg2Id), pkg2Data);

    const questionsPkg2: Omit<Question, "id">[] = [
      {
        packageId: pkg2Id,
        text: "Organel sel manakah yang bertanggung jawab untuk mensintesis RNA ribosom (rRNA) dan membentuk subunit ribosom?",
        options: {
          A: "Lisosom",
          B: "Nukleolus",
          C: "Aparatus Golgi",
          D: "Retikulum Endoplasma",
          E: "Mitokondria"
        },
        correctAnswer: "B",
        scoreWeight: 20,
        explanation: "Nukleolus adalah struktur padat yang terletak di dalam nukleus tempat transkripsi RNA ribosom dan pembentukan ribosom berlangsung."
      },
      {
        packageId: pkg2Id,
        text: "Proses manakah yang bertanggung jawab paling utama untuk menghasilkan jumlah besar ATP selama respirasi seluler di dalam mitokondria?",
        options: {
          A: "Glikolisis",
          B: "Siklus Krebs",
          C: "Fosforilasi Oksidatif",
          D: "Fermentasi Asam Laktat"
        },
        correctAnswer: "C",
        scoreWeight: 20,
        explanation: "Fosforilasi oksidatif melalui rantai transpor elektron dan ATP sintase menghasilkan sekitar 32-34 ATP per molekul glukosa."
      },
      {
        packageId: pkg2Id,
        text: "Unsur Karbon memiliki nomor atom 6. Berapa banyak ikatan kovalen yang dapat dibentuk oleh satu atom karbon tunggal dengan atom lainnya?",
        options: {
          A: "2",
          B: "3",
          C: "4",
          D: "5",
          E: "6"
        },
        correctAnswer: "C",
        scoreWeight: 20,
        explanation: "Karbon memiliki 4 elektron valensi di kulit terluarnya, sehingga memerlukan 4 elektron tambahan untuk memenuhi aturan oktet dengan membentuk empat ikatan kimia kovalen."
      },
      {
        packageId: pkg2Id,
        text: "Manakah dari pernyataan berikut yang menggambarkan fungsi enzim dalam reaksi biokimia?",
        options: {
          A: "Mereka meningkatkan energi aktivasi reaksi.",
          B: "Mereka dikonsumsi sepenuhnya selama reaksi kimia.",
          C: "Mereka menurunkan energi aktivasi reaksi untuk mempercepat laju reaksi.",
          D: "Mereka hanya dapat mengkatalisis reaksi di lingkungan yang sangat basa."
        },
        correctAnswer: "C",
        scoreWeight: 20,
        explanation: "Enzim bertindak sebagai biokatalisator yang mempercepat reaksi dengan menurunkan hambatan energi aktivasi tanpa diubah atau habis dikonsumsi."
      },
      {
        packageId: pkg2Id,
        text: "Apakah unsur gas utama yang mendominasi komposisi atmosfer Bumi?",
        options: {
          A: "Oksigen",
          B: "Karbon Dioksida",
          C: "Argon",
          D: "Nitrogen",
          E: "Hidrogen"
        },
        correctAnswer: "D",
        scoreWeight: 20,
        explanation: "Nitrogen mencakup sekitar 78,08% dari atmosfer kering Bumi, diikuti oleh oksigen sekitar 20,95%."
      }
    ];

    for (const q of questionsPkg2) {
      const qRef = doc(collection(db, "questions"));
      await setDoc(qRef, { ...q, id: qRef.id });
    }

    console.log("Seeding complete!");
  } catch (error) {
    console.error("Error during Firestore seeding:", error);
  }
}

// Admins Collection: Auth simulation query
export async function validateAdminLogin(username: string, pin: string): Promise<boolean> {
  try {
    const adminDocRef = doc(db, "admins", username);
    const adminDoc = await getDoc(adminDocRef);
    if (adminDoc.exists()) {
      return adminDoc.data().pin === pin;
    }
    return false;
  } catch (e) {
    console.error(e);
    return false;
  }
}

// Packages Service
export async function getActivePackages(): Promise<TryoutPackage[]> {
  const q = query(collection(db, "tryout_packages"), where("isActive", "==", true));
  const snap = await getDocs(q);
  const list: TryoutPackage[] = [];
  snap.forEach((d) => {
    list.push(d.data() as TryoutPackage);
  });
  return list;
}

export async function getAllPackages(): Promise<TryoutPackage[]> {
  const snap = await getDocs(collection(db, "tryout_packages"));
  const list: TryoutPackage[] = [];
  snap.forEach((d) => {
    list.push(d.data() as TryoutPackage);
  });
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function savePackage(pkg: TryoutPackage): Promise<void> {
  const pRef = doc(db, "tryout_packages", pkg.id);
  await setDoc(pRef, pkg);
}

export async function deletePackage(id: string): Promise<void> {
  await deleteDoc(doc(db, "tryout_packages", id));
  // Clean up related questions too
  const qSnap = await getDocs(query(collection(db, "questions"), where("packageId", "==", id)));
  const batch = writeBatch(db);
  qSnap.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
}

// Questions Service
export async function getQuestionsForPackage(packageId: string): Promise<Question[]> {
  const q = query(collection(db, "questions"), where("packageId", "==", packageId));
  const snap = await getDocs(q);
  const list: Question[] = [];
  snap.forEach((d) => {
    list.push(d.data() as Question);
  });
  return list;
}

export async function saveQuestion(question: Question): Promise<void> {
  const qRef = doc(db, "questions", question.id);
  await setDoc(qRef, question);
}

export async function deleteQuestion(id: string): Promise<void> {
  await deleteDoc(doc(db, "questions", id));
}

// Participant result submission and grading logic
export interface SubmissionData {
  participantName: string;
  institution: string;
  packageId: string;
  packageName: string;
  answers: Record<string, string>; // questionId -> letter choice
  questions: Question[]; // list of all exam questions
  attemptNum: 1 | 2;
  existingResultId?: string; // used for second attempt updates
  durationSpent?: number; // total time spent in seconds
}

export async function submitTryoutAnswers(data: SubmissionData): Promise<TryoutResult> {
  const { participantName, institution, packageId, packageName, answers, questions, attemptNum, existingResultId } = data;

  // 1. Calculate Score
  let scorePoints = 0;
  let totalWeight = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  const incorrectQuestionIds: string[] = [];

  questions.forEach((q) => {
    totalWeight += q.scoreWeight;
    const isCorrect = answers[q.id] === q.correctAnswer;
    if (isCorrect) {
      scorePoints += q.scoreWeight;
      correctCount++;
    } else {
      incorrectCount++;
      incorrectQuestionIds.push(q.id);
    }
  });

  const rawScore = totalWeight > 0 ? (scorePoints / totalWeight) * 100 : 0;
  const roundedScore = Math.round(rawScore * 10) / 10; // keep one decimal point

  // Load custom package thresholds from database
  let passGrade = 65;
  let secondAttemptMin = 45;
  try {
    const pkgSnap = await getDoc(doc(db, "tryout_packages", packageId));
    if (pkgSnap.exists()) {
      const pkgData = pkgSnap.data() as TryoutPackage;
      if (pkgData.passingGrade !== undefined) {
        passGrade = pkgData.passingGrade;
      }
      if (pkgData.secondAttemptThreshold !== undefined) {
        secondAttemptMin = pkgData.secondAttemptThreshold;
      }
    }
  } catch (e) {
    console.error("Error loading package thresholds:", e);
  }

  if (attemptNum === 1) {
    // Determine status based on Rules
    // Rule 1: PASS if >= passGrade
    // Rule 2: SECOND ATTEMPT if roundedScore >= secondAttemptMin and < passGrade
    // Rule 3: FAIL if < secondAttemptMin
    let status: "PASS" | "FAIL" = "FAIL";
    if (roundedScore >= passGrade) {
      status = "PASS";
    } else {
      status = "FAIL";
    }

    const resultId = existingResultId || `res_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newResult: TryoutResult = {
      id: resultId,
      participantName,
      institution,
      packageId,
      packageName,
      firstScore: roundedScore,
      secondScore: null,
      finalScore: roundedScore,
      firstAttemptCorrect: correctCount,
      firstAttemptIncorrect: incorrectCount,
      secondAttemptCorrect: null,
      secondAttemptIncorrect: null,
      status, // PASS or FAIL
      attemptCount: 1,
      incorrectQuestions: incorrectQuestionIds,
      answersFirst: answers,
      answersSecond: null,
      createdAt: new Date().toISOString(),
      durationSpent: data.durationSpent
    };

    await setDoc(doc(db, "results", resultId), newResult);
    return newResult;

  } else {
    // This is Attempt 2!
    // We fetch the existing result and update it.
    if (!existingResultId) {
      throw new Error("Missing existing result state for second attempt submission.");
    }

    const docRef = doc(db, "results", existingResultId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error("Previous tryout result not found in database.");
    }

    const prevResult = docSnap.data() as TryoutResult;

    // Recalculate score for second attempt.
    // The second attempt only shows incorrect questions.
    // Let's find out how many of those are answered correctly now.
    // Total original score + the new points for correctly answered wrong questions!
    let correctAnswersOnRefined = 0;
    let incorrectAnswersOnRefined = 0;

    questions.forEach((q) => {
      if (prevResult.incorrectQuestions.includes(q.id)) {
        if (answers[q.id] === q.correctAnswer) {
          correctAnswersOnRefined++;
        } else {
          incorrectAnswersOnRefined++;
        }
      }
    });

    // Score weight sum for correct answers overall:
    // Any question correct in first attempt + any question now correct in second attempt
    let totalCorrectWeight = 0;
    let allFinalCorrectCount = 0;

    questions.forEach((q) => {
      const wasCorrectFirst = prevResult.answersFirst[q.id] === q.correctAnswer;
      const wasCorrectSecond = answers[q.id] === q.correctAnswer; // current input
      
      if (wasCorrectFirst || (prevResult.incorrectQuestions.includes(q.id) && wasCorrectSecond)) {
        totalCorrectWeight += q.scoreWeight;
        allFinalCorrectCount++;
      }
    });

    const finalRawScore = totalWeight > 0 ? (totalCorrectWeight / totalWeight) * 100 : 0;
    const finalRoundedScore = Math.round(finalRawScore * 10) / 10;
    const finalStatus = finalRoundedScore >= passGrade ? "PASS" : "FAIL";

    const updatedResult: TryoutResult = {
      ...prevResult,
      secondScore: finalRoundedScore,
      finalScore: finalRoundedScore,
      secondAttemptCorrect: correctAnswersOnRefined,
      secondAttemptIncorrect: incorrectAnswersOnRefined,
      status: finalStatus,
      attemptCount: 2,
      answersSecond: answers,
      durationSpent: data.durationSpent !== undefined ? data.durationSpent : prevResult.durationSpent,
    };

    await setDoc(docRef, updatedResult);
    return updatedResult;
  }
}

// Fetch all results (Admin) with quick search/filters
export async function getAllResults(): Promise<TryoutResult[]> {
  const snap = await getDocs(collection(db, "results"));
  const list: TryoutResult[] = [];
  snap.forEach((d) => {
    list.push(d.data() as TryoutResult);
  });
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ---------------- GLOBAL PORTAL BRANDING SETTINGS ----------------

export const DEFAULT_BRANDING: BrandingSettings = {
  title: "Simulasi Ujian Tryout ICON TC",
  description: "Selamat datang di sistem simulasi ujian Tryout ICON TC (ICON Training Center)! Masukkan detail identitas diri Anda, gunakan kata sandi paket dari instruktur, dan mulailah mengerjakan asesmen simulasi terstandar dengan hasil evaluasi instan.",
  logoTextPrefix: "Tryout ",
  logoTextSuffix: "ICON TC",
  logoSubtext: "ICON TC Exam Simulation System",
  logoType: "icon",
  logoIconName: "BookOpen",
  logoUrl: ""
};

export async function getBrandingSettings(): Promise<BrandingSettings> {
  try {
    const docRef = doc(db, "portal_settings", "branding");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { ...DEFAULT_BRANDING, ...docSnap.data() } as BrandingSettings;
    } else {
      await setDoc(docRef, DEFAULT_BRANDING);
      return DEFAULT_BRANDING;
    }
  } catch (e) {
    console.error("Error loading branding from firestore:", e);
    return DEFAULT_BRANDING;
  }
}

export async function saveBrandingSettings(settings: BrandingSettings): Promise<void> {
  const docRef = doc(db, "portal_settings", "branding");
  await setDoc(docRef, settings);
}

// ---------------- RESULT RECORD DELETION SERVICES ----------------

export async function deleteResult(id: string): Promise<void> {
  await deleteDoc(doc(db, "results", id));
}

export async function deleteMultipleResults(ids: string[]): Promise<void> {
  const batch = writeBatch(db);
  ids.forEach((id) => {
    batch.delete(doc(db, "results", id));
  });
  await batch.commit();
}

