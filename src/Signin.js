import App from './App';
import './Signin.css';
import React, { useEffect, useState, useRef } from 'react';
import { FaSignOutAlt,FaBackward, FaArrowLeft,FaAlignJustify } from 'react-icons/fa';
import {auth, db } from './Firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';

function SigninApp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [uid, setUid] = useState(null);
  const [genaiData, setGenaiData] = useState([]);
  const [currentFileUrl, setCurrentFileUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedFileIndex, setSelectedFileIndex] = useState(null);
  const playerRef = useRef(null);
  const [user, setUser] = useState(null);
  const [showMainApp, setShowMainApp] = useState(false);
  const [showTTSQueueApp, setShowTTSQueueApp] = useState(false);

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        console.log('Signin component User is signed in:', currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  // Function to fetch data from Firestore
  const fetchData = async (userID) => {
    try {
      const genaiCollection = collection(db, 'genai', userID, 'MyGenAI');
      let q = query(genaiCollection, where('model', '==', 'azure-tts'), orderBy('createdDateTime', 'desc'), limit(100));
      const genaiSnapshot = await getDocs(q);
      const genaiList = genaiSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Replace '[play/download](' and ')' from answer field
      genaiList.forEach(item => {
        item.answer = item.answer.replace('[play/download](', '').replace(/\)$/, '');
      });

      setGenaiData(genaiList);
    } catch (error) {
      console.error("Error fetching data: ", error);
    }
  };

  const setAudioSource = (url, index) => {
    setCurrentFileUrl(url);
    setIsPlaying(true);
    setSelectedFileIndex(index);
  };

  const handleSignInWithEmail = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      if (!user.emailVerified) {
        await auth.signOut();
        alert('Please verify your email before signing in.');
      }
    } catch (error) {
      alert('Error signing in. ' + error.message);
      console.error('Error signing in:', error);
    }
  };

  const handleSignUpWithEmail = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(auth.currentUser);
      alert('Verification email sent! Please check your inbox.');
      if (!userCredential.user.emailVerified) {
        await auth.signOut();
      }
    } catch (error) {
      alert('Error signing up. ' + error.message);
      console.error('Error signing up:', error);
    }
  };

  const handleSignInWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch((error) => {
      console.error('Error signing in with Google:', error);
      alert('Error signing in with Google: ' + error.message);
    });
  };

  const handleSignOut = () => {
    signOut(auth).catch((error) => {
      console.error('Error signing out:', error);
      alert('Error signing out: ' + error.message);
    });
  };
  if (user){
    return (
      <App user={user} />
    );
  }

  return (
    <div>
        // Unauthenticated User Interface: Authentication Forms
        <div style={{ fontSize: '22px', width: '100%', margin: '0 auto' }}>
          <br />
          <p>Sign In</p>
          <input
            className="textinput"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <br />
          <br />
          <input
            type="password"
            className="textinput"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <br />
          <br />
          <button className="signonpagebutton" onClick={handleSignInWithEmail}>
            Sign In
          </button>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          <button className="signuppagebutton" onClick={handleSignUpWithEmail}>
            Sign Up
          </button>
          <br />
          <br />
          <button onClick={() => alert('Please enter your email to reset your password.')}>
            Forgot Password?
          </button>
          <br />
          <br />
          <button className="signgooglepagebutton" onClick={handleSignInWithGoogle}>Sign In with Google</button>
          <br />
          <br />
        </div>
    </div>
  );
}

export default SigninApp;
