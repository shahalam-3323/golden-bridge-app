import React, { useState } from 'react';
import { auth, db } from './firebase'; // db import kiya hai
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore'; // Firestore ke liye

function Login() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isSignup) {
        // 1. Auth mein user create karo
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Database mein user ka naam aur initial data save karo
        await setDoc(doc(db, "users", user.uid), {
          fullName: name,
          deposit: "₹50,000.00",
          target: "₹1,00,000.00",
          currentValue: 50000.06
        });

        alert('Account created! Name saved successfully.');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        alert('Logged in successfully!');
      }
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="login-container">
      <h2>{isSignup ? 'Sign Up' : 'Login'}</h2>
      <form onSubmit={handleSubmit}>
        {isSignup && (
          <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required />
        )}
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit">{isSignup ? 'Create Account' : 'Login'}</button>
      </form>
      <p onClick={() => setIsSignup(!isSignup)} style={{cursor: 'pointer', color: '#e5b94f'}}>
        {isSignup ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
      </p>
    </div>
  );
}
export default Login;