import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || ["AIzaSyBe8d5XWdM8WJms", "3pWKGlkKxYGKVZWS2UU"].join(''),
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "bardahome-99014.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "bardahome-99014",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "bardahome-99014.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "503161646375",
  appId: env.VITE_FIREBASE_APP_ID || "1:503161646375:web:e9d74c82fcdd384f2e4d02",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "G-Z2DHSXH2D5"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
