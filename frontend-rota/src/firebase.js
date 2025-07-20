// src/firebase.js
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyD7xpSItJ0DW9PR2F2cSnFhcVE8E4Z_4Fg',
  authDomain: 'techroutes-256bd.firebaseapp.com',
  projectId: 'techroutes-256bd',
  storageBucket: 'techroutes-256bd.appspot.com',
  messagingSenderId: '820184232165',
  appId: '1:820184232165:web:4c0f58d76490bf9fa7e40c'
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

const db = getFirestore(app);

export { app, db };
