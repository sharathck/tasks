import App from './App';
import TTSQueueApp from './TTSQueueApp';
import './AudioApp.css';
import React, { useEffect, useState, useRef } from 'react';
import H5AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';
import { FaSignOutAlt, FaBackward, FaCheckDouble, FaArrowLeft, FaAlignJustify } from 'react-icons/fa';
import { doc, deleteDoc, collection, getDocs, startAfter, query, where, orderBy, onSnapshot, addDoc, updateDoc, limit } from 'firebase/firestore';
import { auth, db } from './Firebase';
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
  const [showArticlesOnly, setShowArticlesOnly] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newFileName, setNewFileName] = useState('');

   // Listen for authentication state changes
   useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setUid(currentUser.uid);
        console.log('User is signed in:', currentUser.uid);
        if (showCompleted) {
          fetchCompletedData(user.uid);
        } else {
        if (showArticlesOnly){
          await fetchArticlesOnlyData(currentUser.uid);
        }
        else {
        // Fetch data for the authenticated user
        await fetchData(currentUser.uid);
        }
      }
      }
    });
    return () => unsubscribe();
  }, [showCompleted, showArticlesOnly]);

  const fetchCompletedData = async (userID) => {
    try {
      const genaiCollection = collection(db, 'genai', userID, 'MyGenAI');
      let q = query(
        genaiCollection,
        where('status', '==', true),
        orderBy('createdDateTime', 'desc'),
        limit(200)
      );
      const genaiSnapshot = await getDocs(q);
      const genaiList = genaiSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      genaiList.forEach(item => {
          item.answer = item.answer.replace('[play/download](', '').replace(/\)$/, '');
      });
      setGenaiData(genaiList);
    } catch (error) {
      console.error("Error fetching completed data: ", error);
    }
  };

  // Function to fetch data from Firestore
  const fetchArticlesOnlyData = async (userID) => {
    try {
      const genaiCollection = collection(db, 'genai', userID, 'MyGenAI');
      let q = query(
        genaiCollection,
        where('model', '==', 'azure-tts'),
        orderBy('createdDateTime', 'desc'),
        limit(200)
      );
      const genaiSnapshot = await getDocs(q);
      const genaiList = genaiSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(doc => doc.answer?.endsWith('de.mp3)')); 
      // Replace '[play/download](' and ')' from answer field
      genaiList.forEach(item => {
        // check if status field exists
        if (!item.hasOwnProperty('status')) {
        item.answer = item.answer.replace('[play/download](', '').replace(/\)$/, '');
        }
        else {
          item.answer = '';
        }
      });

      setGenaiData(genaiList);
    } catch (error) {
      console.error("Error fetching data: ", error);
    }
  };



  // Function to fetch data from Firestore
  const fetchData = async (userID) => {
    try {
      const genaiCollection = collection(db, 'genai', userID, 'MyGenAI');
      let q = query(
        genaiCollection,
        where('model', '==', 'azure-tts'),
        orderBy('createdDateTime', 'desc'),
        limit(200)
      );
      const genaiSnapshot = await getDocs(q);
      const genaiList = genaiSnapshot.docs
      .map(doc => {
        const data = { id: doc.id, ...doc.data() };
        // Calculate file size - this is an estimation since we don't have direct access to file size
        const sizeInKB = Math.round(data.answer.length / 100); // rough estimation
        return { ...data, sizeKB: sizeInKB };
      }); 
      // Replace '[play/download](' and ')' from answer field
      genaiList.forEach(item => {
        // check if status field exists
        if (!item.hasOwnProperty('status') || item.status === false) {
          item.answer = item.answer.replace('[play/download](', '').replace(/\)$/, '');
          }
          else {
            item.answer = '';
          }
      });
      // remove items with empty answer field
      const filteredGenaiList = genaiList.filter(item => item.answer !== '');
      setGenaiData(filteredGenaiList);
    } catch (error) {
      console.error("Error fetching data: ", error);
    }
  };

  const setAudioSource = (url, index) => {
    setCurrentFileUrl(url);
    setIsPlaying(true);
    setSelectedFileIndex(index);
  };

  const handleRename = async (itemId, newName) => {
    try {
      const docRef = doc(db, 'genai', user.uid, 'MyGenAI', itemId);
      await updateDoc(docRef, {
        customFileName: newName
      });
      setEditingId(null);
      // Update local state
      setGenaiData(prevData =>
        prevData.map(item =>
          item.id === itemId
            ? { ...item, customFileName: newName }
            : item
        )
      );
    } catch (error) {
      console.error("Error renaming file:", error);
    }
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

  const handleSignOut = () => {
    signOut(auth).catch((error) => {
      console.error('Error signing out:', error);
      alert('Error signing out: ' + error.message);
    });
  };
  if (showMainApp) {
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
      <div className="AudioApp">
        <button className={showMainApp ? 'button_selected' : 'button'} onClick={() => setShowMainApp(!showMainApp)}>
          <FaArrowLeft />
        </button>
        &nbsp;&nbsp;
        <button className={showArticlesOnly ? 'button_selected' : 'button'} onClick={() => setShowArticlesOnly(!showArticlesOnly)}>
          Articles Only
        </button>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
        <button className={showTTSQueueApp ? 'button_selected' : 'button'} onClick={() => setShowTTSQueueApp(!showTTSQueueApp)}>
          <FaAlignJustify />
        </button>
        &nbsp;&nbsp;&nbsp;&nbsp;
        <button className={showCompleted ? 'button_selected' : 'button'} onClick={() => setShowCompleted(!showCompleted)}>
        <FaCheckDouble />
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
              <ul style={{ listStyleType: 'none', padding: 0 }}>
                {genaiData.map((item, index) => (
                  <li key={index} className={selectedFileIndex === index ? 'selected-file' : ''} 
                      style={{ margin: '10px 0', padding: '2px', minHeight: '40px', borderRadius: '2px', 
                              backgroundColor: selectedFileIndex === index ? '#f0f0f0' : '#fff',
                              display: 'grid', gridTemplateColumns: '30% 40% 10% 10% 10%', alignItems: 'center' }}>
                    
                    {/* File Name/Rename Column */}
                    <div>
                      {editingId === item.id ? (
                        <input
                          type="text"
                          value={newFileName}
                          onChange={(e) => setNewFileName(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleRename(item.id, newFileName);
                            }
                          }}
                          onBlur={() => handleRename(item.id, newFileName)}
                          autoFocus
                        />
                      ) : (
                        <span onDoubleClick={() => {
                          setEditingId(item.id);
                          setNewFileName(item.customFileName || item.answer.split('/').pop().replace('.mp3', ''));
                        }}>
                          {item.customFileName || item.answer.split('/').pop().replace('.mp3', '')}
                        </span>
                      )}
                    </div>

                    {/* Question Preview Column */}
                    <div style={{ fontSize: '0.9em', color: '#666' }}>
                      {item.question ? item.question.substring(0, 50) + (item.question.length > 50 ? '...' : '') : 'No question available'}
                    </div>

                    {/* File Size Column */}
                    <div>{item.question.length  || 'N/A'} </div>

                    {/* Play Button Column */}
                    <a href={item.answer} download onClick={(e) => { 
                      e.preventDefault(); 
                      setAudioSource(item.answer, index); 
                    }}>
                      Play
                    </a>

                    {/* Status Checkbox Column */}
                    <input
                      type="checkbox"
                      checked={item.status === true}
                      onChange={async (e) => {
                        const newStatus = e.target.checked;
                        const docRef = doc(db, 'genai', user.uid, 'MyGenAI', item.id);
                        await updateDoc(docRef, { status: newStatus });
                        setGenaiData((prevData) =>
                          prevData.map((dataItem) =>
                            dataItem.id === item.id ? { ...dataItem, status: newStatus } : dataItem
                          )
                        );
                      }}
                    />
                  </li>
                ))}
              </ul>
          </div>
        </header>
      </div>
    </div>
  );
}

export default AudioApp;
