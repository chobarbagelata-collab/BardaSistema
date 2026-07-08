import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBe8d5XWdM8WJms3pWKGlkKxYGKVZWS2UU",
  authDomain: "bardahome-99014.firebaseapp.com",
  projectId: "bardahome-99014",
  storageBucket: "bardahome-99014.firebasestorage.app",
  messagingSenderId: "503161646375",
  appId: "1:503161646375:web:e9d74c82fcdd384f2e4d02",
  measurementId: "G-Z2DHSXH2D5"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
