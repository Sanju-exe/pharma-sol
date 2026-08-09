import React, { useState } from 'react';
import { API_BASE_URL } from './config';
import './Login.css';

export default function Login({ portalType, onLogin, onBack }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      alert("Please enter your email and password.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
          portalType: portalType
        }),
      });

      const data = await response.json();

      if (data.success) {
        onLogin(data.user);
      } else {
        alert(data.message || "Invalid credentials");
      }
    } catch (err) {
      console.error("Login failed (server offline/unreachable):", err);
      alert("An error occurred during verification. Please ensure the backend server is running.");
    }
  };

  const title = portalType === 'doctor' ? 'Doctor Portal Login' 
              : portalType === 'pharmacy' ? 'Pharmacy Login'
              : 'Receptionist Login';

  return (
    <div className="login-container">
      <button className="btn-back-login" onClick={onBack}>
         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
         Back
      </button>

      <div className="login-card">
        <div className="login-header">
           <div className="login-icon-box">
             {portalType === 'doctor' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>
             ) : portalType === 'pharmacy' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M10.5 20.5 19 12a4.95 4.95 0 1 0-7-7L3.5 13.5a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>
             ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/></svg>
             )}
           </div>
           <h2>{title}</h2>
           <p>Please log in with your credentials to continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
           <div className="form-group">
             <label>Email Address</label>
             <input type="email" placeholder="e.g. email@gmail.com" value={email} onChange={e => setEmail(e.target.value)} required />
           </div>
           <div className="form-group">
             <label>Password</label>
             <input type="password" placeholder="Enter password" value={password} onChange={e => setPassword(e.target.value)} required />
           </div>

           <button type="submit" className="btn-login-submit">Login & Enter</button>
        </form>
      </div>
    </div>
  );
}
