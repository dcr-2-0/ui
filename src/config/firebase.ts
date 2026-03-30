import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDQpJ4othKGyeXBy55pgA_DYY3kw4YCv-k",
  authDomain: "dcr-portal-f8df5.firebaseapp.com",
  projectId: "dcr-portal-f8df5",
  storageBucket: "dcr-portal-f8df5.firebasestorage.app",
  messagingSenderId: "90194069580",
  appId: "1:90194069580:web:fff73f67a36b067e388ce9",
  measurementId: "G-Q60R20L844",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Firebase Storage
export const storage = getStorage(app);

// Configure Google provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});
