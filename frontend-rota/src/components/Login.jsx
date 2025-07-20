import { useEffect, useState } from 'react';
import { db } from '../firebase';


export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const storedEmail = localStorage.getItem('user_email');
    const storedDeviceId = localStorage.getItem('device_id');
    if (storedEmail && storedDeviceId) {
      validateDeviceId(storedEmail, storedDeviceId);
    }
  }, []);

  const validateDeviceId = async (email, deviceId) => {
    const ref = doc(db, 'users', email);
    const snap = await getDoc(ref);
    if (snap.exists() && snap.data().deviceId === deviceId) {
      setIsAuthenticated(true);
      const ssvs = snap.data().ssvs || [];
      onLogin(email, ssvs);
    } else {
      localStorage.clear();
      setIsAuthenticated(false);
    }
  };

  const handleLogin = async () => {
    if (!email) return;
    const deviceId = crypto.randomUUID();

    if (email === 'admin') {
      setIsAuthenticated(true);
      onLogin(email, []);
      return;
    }

    const ref = doc(db, 'users', email);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(ref, { deviceId, ssvs: [] });
    } else if (snap.data().deviceId !== deviceId) {
      alert('Dispositivo não autorizado para este email.');
      return;
    }

    const ssvs = snap.data().ssvs || [];
    localStorage.setItem('user_email', email);
    localStorage.setItem('device_id', deviceId);
    setIsAuthenticated(true);
    onLogin(email, ssvs);
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
