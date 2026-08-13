import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ✅ आपकी नई golden-bridge-v2 की पूरी तरह सही Config
const firebaseConfig = {
  apiKey: "AIzaSyAeD6ya-LWahcnukCxna0xCqFZo4l6m8Kw",
  authDomain: "golden-bridge-v2.firebaseapp.com",
  projectId: "golden-bridge-v2",
  storageBucket: "golden-bridge-v2.firebasestorage.app",
  messagingSenderId: "885406712492",
  appId: "1:885406712492:web:c69806a08ca92b15769509"
};

const app = initializeApp(firebaseConfig);

// 🔴 Login और Database के लिए ये दो लाइनें बहुत जरूरी हैं:
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;