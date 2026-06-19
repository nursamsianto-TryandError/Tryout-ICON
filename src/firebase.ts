import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: "jaunty-plexus-qjwpf",
  appId: "1:388713790532:web:966725266cd8d3c2de9011",
  apiKey: "AIzaSyC5URf--p4bX6eVk5u-070omUH_7KFOScw",
  authDomain: "jaunty-plexus-qjwpf.firebaseapp.com",
  storageBucket: "jaunty-plexus-qjwpf.firebasestorage.app",
  messagingSenderId: "388713790532",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with custom database ID
export const db = getFirestore(app, "ai-studio-a7d0af64-38dd-44ad-83ca-5ae73f98d31b");
