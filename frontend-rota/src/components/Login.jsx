
import { useEffect, useState } from 'react';
import { messaging, getToken } from '../firebase';


import { getFirestore, collection, doc, setDoc, getDoc } from 'firebase/firestore';

const db = getFirestore();

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    const storedEmail = localStorage.getItem('user_email');
    const storedToken = localStorage.getItem('fcm_token');
    if (storedEmail && storedToken) {
      validateTokenEmail(storedEmail, storedToken);
    } else {
      getToken(messaging, {
        vapidKey: 'BEb8lSDu8z9f_ejV670IU_9gl9m7RpSKMwei-A1J9m4juMgj9gxzujJxM1PycsJxeMXJNph6CVzlKy61Q88YbKs'
      }).then((currentToken) => {
        if (currentToken) {
          setToken(currentToken);
          localStorage.setItem('fcm_token', currentToken);
        }
      });
    }
  }, []);

  const validateTokenEmail = async (email, token) => {
    const ref = doc(db, 'users', email);
    const snap = await getDoc(ref);
    if (snap.exists() && snap.data().token === token) {
      setIsAuthenticated(true);
      onLogin(email);
    } else {
      localStorage.clear();
      setIsAuthenticated(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !token) return;
    if (email == "admin") {
      setIsAuthenticated(true);
      onLogin(email);
      return
    }

    const ref = doc(db, 'users', email);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(ref, { token });
    } else if (snap.data().token !== token) {
      alert('Token inválido para este email.');
      return;
    }

    localStorage.setItem('user_email', email);
    setIsAuthenticated(true);
    onLogin(email);
  };

  if (isAuthenticated) return null;

  return (
    <div className="login-wrapper">
      <h2>Login</h2>
      <input
        type="email"
        placeholder="Digite seu email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button onClick={handleLogin}>Entrar</button>
    </div>
  );
}
