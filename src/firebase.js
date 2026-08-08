import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ✅ सही Config (नई API Key + सही IDs)
const firebaseConfig = {
  apiKey: "AIzaSyBH5NckkV7-lVxT8cqAbdPJUQvjzZj--HY",
  authDomain: "golden-bridge-app.firebaseapp.com",
  projectId: "golden-bridge-app",
  storageBucket: "golden-bridge-app.firebasestorage.app",
  messagingSenderId: "898600643758",
  appId: "1:898635600758:web:c8670f67f5e3f1481cdf7f"
};

const app = initializeApp(firebaseConfig);

// 🔴 Login और Database के लिए ये दो लाइनें बहुत जरूरी हैं:
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;