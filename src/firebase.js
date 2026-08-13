import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ✅ बिल्कुल सही Config (Firebase Console से कॉपी की हुई)
const firebaseConfig = {
  apiKey: "AIzaSyCySt4xuFA8N90rc_g4lmY5AH0s4-psbSM",
  authDomain: "golden-bridge-app.firebaseapp.com",
  projectId: "golden-bridge-app",
  storageBucket: "golden-bridge-app.firebasestorage.app",
  messagingSenderId: "898635643758",
  appId: "1:898635643758:web:c8670f67f5e3f1481cdf7f"
};

const app = initializeApp(firebaseConfig);

// 🔴 Login और Database के लिए ये दो लाइनें बहुत जरूरी हैं:
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;