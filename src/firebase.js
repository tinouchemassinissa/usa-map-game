import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDNYWqQQTq7rwDafnus-Y5T92L3UrlUwyA",
  authDomain: "eco-sorter-5d8ff.firebaseapp.com",
  projectId: "eco-sorter-5d8ff",
  storageBucket: "eco-sorter-5d8ff.firebasestorage.app",
  messagingSenderId: "825749656915",
  appId: "1:825749656915:web:b8de0b8d4f7e6e1807fda6"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
