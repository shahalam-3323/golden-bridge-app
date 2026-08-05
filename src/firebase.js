import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // Yeh line zaroori hai

const firebaseConfig = {
  apiKey: "AIzaSyCL0qS4mmYC9OjSenVD8-YtXqmETW8rZ2Y",
  authDomain: "golden-bridge-app.firebaseapp.com",
  projectId: "golden-bridge-app",
  storageBucket: "golden-bridge-app.firebasestorage.app",
  messagingSenderId: "898635643758",
  appId: "1:898635643758:web:c8670f67f5e3f1481cdf7f"
};

const app = initializeApp(firebaseConfig);

// Yeh dono export hote hain -> auth aur db
export const auth = getAuth(app);
export const db = getFirestore(app); 

export default app;