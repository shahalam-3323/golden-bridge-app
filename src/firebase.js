import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// यहाँ हमने आपकी असली की (Key) को सीधे कोड में लिख दिया है
const firebaseConfig = {
  apiKey: "AIzaSyAeD6ya-LWahcnukCxna0xCqFZo4l6m8Kw", 
  authDomain: "://firebaseapp.com",
  projectId: "golden-bridge-v2",
  storageBucket: "golden-bridge-v2.firebasestorage.app",
  messagingSenderId: "885406712492",
  appId: "1:885406712492:web:c69806a08ca92b15769509"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
