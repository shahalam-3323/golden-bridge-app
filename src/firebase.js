import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Debugging: Ye check karne ke liye ki Vercel environment variable bhej raha hai ya nahi
console.log("Firebase API Key Status:", process.env.REACT_APP_FIREBASE_API_KEY ? "Loaded Successfully" : "MISSING/UNDEFINED");

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: "golden-bridge-v2.firebaseapp.com",
  projectId: "golden-bridge-v2",
  storageBucket: "golden-bridge-v2.firebasestorage.app",
  messagingSenderId: "885406712492",
  appId: "1:885406712492:web:c69806a08ca92b15769509"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;