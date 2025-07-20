importScripts("https://www.gstatic.com/firebasejs/10.7.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyD7xpSItJ0DW9PR2F2cSnFhcVE8E4Z_4Fg",
  authDomain: "techroutes-256bd.firebaseapp.com",
  projectId: "techroutes-256bd",
  messagingSenderId: "820184232165",
  appId: "1:820184232165:web:4c0f58d76490bf9fa7e40c"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/logo192.png"
  });
});
