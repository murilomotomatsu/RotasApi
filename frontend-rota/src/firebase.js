import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: 'AIzaSyD7xpSItJ0DW9PR2F2cSnFhcVE8E4Z_4Fg',
  authDomain: 'techroutes-256bd.firebaseapp.com',
  projectId: 'techroutes-256bd',
  storageBucket: 'techroutes-256bd.appspot.com',
  messagingSenderId: '820184232165',
  appId: '1:820184232165:web:4c0f58d76490bf9fa7e40c'
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export { messaging, getToken, onMessage };
