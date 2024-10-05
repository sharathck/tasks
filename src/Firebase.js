import { initializeApp } from 'firebase/app';
import { getFirestore, doc, deleteDoc, collection, getDocs, startAfter, query, where, orderBy, onSnapshot, addDoc, updateDoc, limit, persistentLocalCache, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
import { getAuth, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, GoogleAuthProvider } from 'firebase/auth';

// Firebase configuration (replace with your environment configs)
const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID
  };
  
  const app = initializeApp(firebaseConfig, { localCache: persistentLocalCache(), cacheSizeBytes: CACHE_SIZE_UNLIMITED });
  export const db = getFirestore(app);
  export const auth = getAuth(app);