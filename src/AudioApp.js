import './App.css';
import App from './App';
import TTSQueueApp from './TTSQueueApp';
import './AudioApp.css';
import React, { useEffect, useState, useRef } from 'react';
import H5AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';
import { FaSignOutAlt,FaBackward, FaArrowLeft,FaAlignJustify } from 'react-icons/fa';
import {collection, where, getDocs, query, orderBy, limit } from 'firebase/firestore';
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

function AudioApp() {
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
        setUid(currentUser.uid);
        console.log('User is signed in:', currentUser.uid);
        // Fetch data for the authenticated user
        await fetchData(currentUser.uid);
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
  if (showMainApp){
    return (
      <App user={user} />
    );
  }
  if (showTTSQueueApp) {
    return (
      <TTSQueueApp user={user} />
    );
  }

  return (
    <div>
      {!user ? (
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
      ) : (
        // Authenticated User Interface: Data Display and New Functionalities
        <div className="AudioApp">
        <button className={showMainApp ? 'button_selected' : 'button'} onClick={() => setShowMainApp(!showMainApp)}>
                <FaArrowLeft />
        </button>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        <button className={showTTSQueueApp ? 'button_selected' : 'button'} onClick={() => setShowTTSQueueApp(!showTTSQueueApp)}>
                <FaAlignJustify />
        </button>
        <button className="signoutbutton" onClick={handleSignOut}><FaSignOutAlt /></button>
        <header className="AudioApp-header">
        <div style={{ width: '99%' }}>
          <H5AudioPlayer
            ref={playerRef}
            src={currentFileUrl}
            autoPlay={isPlaying}
            showJumpControls={true}
            showDownloadProgress={true}
            showFilledProgress={true}
            showFilledVolume={true}
            progressJumpSteps={{ forward: 45000, backward: 20000 }}
            controls={true}
            onError={(error) => console.error('Error loading or playing audio:', error)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
              const nextFileIndex = (selectedFileIndex + 1) % genaiData.length;
              setAudioSource(genaiData[nextFileIndex].answer, nextFileIndex);
            }}
          />
          <ul style={{ listStyleType: 'none' }}>
            {genaiData.map((item, index) => (
              <li key={index} className={selectedFileIndex === index ? 'selected-file' : ''}>
                <a href={item.answer} download onClick={(e) => { e.preventDefault(); setAudioSource(item.answer, index); }}>
                  {item.answer.replace('https://storage.googleapis.com/audio-genai/', '').replace(new RegExp(`_${user.uid}_[^_]*_`), '_').replace('.mp3','').replace(uid,'').replace('https://storage.googleapis.com/reviewtext-ad5c6.appspot.com/user_audio/','').replace('/','')} {/* Fall back to a generic name if none is provided */}
                </a>
              </li>
            ))}
          </ul>
            </div>
          </header>
        </div>
      )}
    </div>
  );
}

export default AudioApp;
