import React, { useState, useEffect, useRef } from 'react';
import { FaPlus, FaSpinner, FaHeadphones, FaCheck, FaTrash, FaVolumeDown, FaEdit, FaSignOutAlt, FaFileWord, FaFileAlt, FaCalendar, FaTimes, FaPlay, FaSearch, FaReadme, FaArrowLeft, FaNotesMedical, FaCheckDouble, FaClock, FaAlignJustify, FaBrain, FaConfluence, FaVolumeUp, FaNewspaper, FaSync } from 'react-icons/fa';
import './App.css';
import { saveAs } from 'file-saver';
import * as docx from 'docx';
import * as speechsdk from 'microsoft-cognitiveservices-speech-sdk';
import AudioApp from './AudioApp';
import TTSQueueApp from './TTSQueueApp';
import GenAIApp from './GenAIApp';
import { doc, deleteDoc, collection, getDocs, startAfter, query, where, orderBy, onSnapshot, addDoc, updateDoc, limit } from 'firebase/firestore';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from './Firebase';
import VoiceSelect from './VoiceSelect';
import Notes from './Notes';
import Articles from './Articles';
import Practice from './Practice';
import Homework from './Homework';

const fireBaseTasksCollection = process.env.REACT_APP_FIREBASE_TASKS_COLLECTION;
console.log('Firebase tasks collection:', fireBaseTasksCollection);
const speechKey = process.env.REACT_APP_AZURE_SPEECH_API_KEY;
const serviceRegion = 'eastus';
const isiPhone = /iPhone/i.test(navigator.userAgent);
console.log(isiPhone);
const tasksLimit = 499;
const fetchMoreTasksLimit = 500;
let voiceInstructions = 'Voice Affect: Professional news reader quality. \n\nPacing: slow pace with very Long pause after each period or sentence for user to comprehend.\n\nPronunciation: go easy on letter s in words so that you can avoid hissing sound.\n\nPauses: very Long pause after each task or period or sentence for user to comprehend.';
let ttsGeneratedDocID = '';
let genaiVoiceName = 'shimmer';
function App() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [articles, setArticles] = useState('');
  const [completedTasks, setCompletedTasks] = useState([]);
  const [futureTasks, setFutureTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [editTask, setEditTask] = useState(null);
  const [editTaskText, setEditTaskText] = useState('');
  const [editRecurrence, setEditRecurrence] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [showFuture, setShowFuture] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showEditButtons, setShowEditButtons] = useState(true);
  const [showDueDates, setShowDueDates] = useState(true);
  const [showMoreButton, setShowMoreButton] = useState(false);
  const [showMoreCompletedButton, setShowMoreCompletedButton] = useState(false);
  const [showMoreFutureButton, setShowMoreFutureButton] = useState(false);
  const [showDeleteButtons, setShowDeleteButtons] = useState(false);
  const [canBeDeleted, setCanBeDeleted] = useState(false);
  const [readerMode, setReaderMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [adminUser, setAdminUser] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [speechRate, setSpeechRate] = useState('0%');
  const [speechSilence, setSpeechSilence] = useState(3900);
  const [lastVisible, setLastVisible] = useState(null); // State for the last visible document
  const [lastTask, setLastTask] = useState(null); // State for the limit of documents to show
  const urlParams = new URLSearchParams(window.location.search);
  const limitParam = urlParams.get('limit');
  const limitValue = limitParam ? parseInt(limitParam) : fetchMoreTasksLimit;
  const [hideRecurrentTasks, setHideRecurrentTasks] = useState(false);
  const [sharedTasks, setSharedTasks] = useState(false);
  const [showSearchBox, setShowSearchBox] = useState(false); // State for search box visibility 
  const [searchQuery, setSearchQuery] = useState(''); // State for search query
  const [showRecurrentTasks, setShowRecurrentTasks] = useState(false); // State for showing/hiding recurrent tasks
  const [isGeneratingTTS, setIsGeneratingTTS] = useState(false); // State for generating TTS
  const [showAudioPlayer, setShowAudioPlayer] = useState(false); // State for showing audio player
  const searchInputRef = useRef(null); // Reference for the search input
  const [answerData, setAnswerData] = useState('');
  const [voiceName, setVoiceName] = useState('en-US-EvelynMultilingualNeural');
  const [showAudioApp, setShowAudioApp] = useState(false);
  const [showTTSQueueApp, setShowTTSQueueApp] = useState(false);
  const [showGenAIApp, setShowGenAIApp] = useState(false);
  const [showNotesApp, setShowNotesApp] = useState(false);
  const [showArticlesApp, setShowArticlesApp] = useState(false);
  const [showLiveTTS, setShowLiveTTS] = useState(false);
  const [showHomeworkApp, setShowHomeworkApp] = useState(false);  // Add this line
  const [showGenerateHomeworkApp, setShowGenerateHomeworkApp] = useState(false);  // Add this line
  const [currentDocId, setCurrentDocId] = useState(null);
  const [isLiveAudioPlaying, setIsLiveAudioPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const audioPlayerRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(isPaused);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [loopCount, setLoopCount] = useState(0);
  const loopCountRef = useRef(0);
  const MAX_LOOPS = 10;
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);
  useEffect(() => {
    console.log('INSIDE audioUrl ', audioUrl);
    if (audioPlayerRef.current) {
      // Reload and attempt to play whenever the URL changes
      audioPlayerRef.current.load();
      setLoopCount(0); // Reset loop count when audio changes

      // Add ended event listener for looping
      const handleAudioEnded = () => {
        if (loopCountRef.current < MAX_LOOPS - 1) { // -1 because we already played it once
          console.log(`Audio loop completed: ${loopCountRef.current + 1} of ${MAX_LOOPS}`);
          setLoopCount(prevCount => prevCount + 1);
          audioPlayerRef.current.currentTime = 0;
          audioPlayerRef.current.play().catch(err => {
            console.warn('Autoplay prevented on loop', err);
          });
        } else {
          console.log('Finished all loops');
          setLoopCount(0);
        }
      };

      audioPlayerRef.current.addEventListener('ended', handleAudioEnded);

      audioPlayerRef.current
        .play()
        .catch(err => {
          console.warn('Autoplay prevented', err);
        });

      // Cleanup function to remove event listener
      return () => {
        if (audioPlayerRef.current) {
          audioPlayerRef.current.removeEventListener('ended', handleAudioEnded);
        }
      };
    }
  }, [audioUrl]);
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const adminUserIds = ['bTGBBpeYPmPJonItYpUOCYhdIlr1', 'qDzUX26K0dgtSMlN9PtCj6Q9L5J3', 'yvsWRZwjTQecvGap3pGXWNGHoTp2', 'lpwCpZkPk2h1ZWrESgkyXPUXEPQ2'];
      if (adminUserIds.includes(user.uid)) {
        setAdminUser(true);
      }
      const tasksCollection = collection(db, fireBaseTasksCollection);
      const urlParams = new URLSearchParams(window.location.search);
      const homeworkParam = urlParams.get('h');
      if (homeworkParam && homeworkParam.length > 5) {
        setCurrentDocId(homeworkParam);
        setShowHomeworkApp(true);
      }
      const genHomeworkParam = urlParams.get('g');
      if (genHomeworkParam && genHomeworkParam.length > 5) {
        setCurrentDocId(genHomeworkParam);
        setShowGenerateHomeworkApp(true);
      }
      const limitParam = urlParams.get('limit');
      const showCurrentLimitValue = limitParam ? parseInt(limitParam) : tasksLimit;
      const currentDate = new Date();

      let q = query(tasksCollection, where('userId', '==', user.uid), where('status', '==', false), where('dueDate', '<', currentDate), orderBy('dueDate', 'desc'), limit(showCurrentLimitValue));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const tasksData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setArticles(tasksData.map((task) => task.task).join(' . '));
        console.log('Articles:', articles);
        console.log('User:', user.uid);
        console.log('Showcurrent:', showCurrent);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        if (tasksData.length == tasksLimit) {
          setShowMoreButton(true);
        } else {
          setShowMoreButton(false);
        }
        setTasks(tasksData);
      });

      return () => unsubscribe();
    }
  }, [user, showCurrent]);

  useEffect(() => {
    if (showCompleted) {
      setShowFuture(false);
      setCanBeDeleted(true);
      const tasksCollection = collection(db, fireBaseTasksCollection);
      const q = query(tasksCollection, where('userId', '==', user.uid), where('status', '==', true), orderBy('createdDate', 'desc'), limit(limitValue));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const tasksData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setArticles(tasksData.map((task) => task.task).join(' . '));
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        if (tasksData.length == fetchMoreTasksLimit) {
          setShowMoreCompletedButton(true);
        } else {
          setShowMoreCompletedButton(false);
        }
        setCompletedTasks(tasksData);
      });
      return () => unsubscribe();
    }
  }, [showCompleted]);

  useEffect(() => {
    if (showFuture) {
      setShowCompleted(false);
      setCanBeDeleted(true);
      const tasksCollection = collection(db, fireBaseTasksCollection);
      const q = query(tasksCollection, where('userId', '==', user.uid), where('dueDate', '>', new Date()), orderBy('dueDate', 'asc'), limit(limitValue));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const futureTasksData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setArticles(futureTasksData.map((task) => task.task).join(' . '));
        if (futureTasksData.length == fetchMoreTasksLimit) {
          setShowMoreFutureButton(true);
        } else {
          setShowMoreFutureButton(false);
        }
        setFutureTasks(futureTasksData);
      });

      return () => unsubscribe();
    }
  }, [showFuture]);


  // Function to call the TTS API
  const callTTSAPI = async (message, appUrl) => {
    let now = new Date();
    console.log('before callTTS' + `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`);
    setIsGeneratingTTS(true); // Set generating state
    message = message.replace(/<[^>]*>?/gm, ''); // Remove HTML tags
    message = message.replace(/&nbsp;/g, ' '); // Replace &nbsp; with space
    // replace -,*,#,_,`,~,=,^,>,< with empty string
    message = message.replace(/[-*#_`~=^><]/g, '');

    console.log('Calling TTS API with message:', message);
    console.log('Calling TTS API with appUrl:', appUrl, 'voiceName:', voiceName);

    try {
      const response = await fetch(appUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: message, uid: user.uid, source: 'ta',
          voice_name: voiceName,
          silence_break: speechSilence,
          prosody_rate: speechRate
        })
      });

      if (!response.ok) {
        throw new Error([`Network response was not ok: ${response.statusText}`]);
      }
    } catch (error) {
      console.error('Error calling TTS API:', error);
      alert([`Error: ${error.message}`]);
    } finally {
      // Fetch the Firebase document data
      /*const genaiCollection = collection(db, 'genai', user.uid, 'MyGenAI');
      let q = query(genaiCollection, orderBy('createdDateTime', 'desc'), limit(1));
      const genaiSnapshot = await getDocs(q);
      const genaiList = genaiSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Get the answer from the first document
      if (genaiList.length > 0) {
        let answer = genaiList[0].answer;
        //extract from the position where http starts and until end
        answer = answer.substring(answer.indexOf('http'));
        // replace ) with empty string
        answer = answer.replace(')', '');
        setAnswerData(answer);
      }*/
      setIsGeneratingTTS(false); // Reset generating state
      setShowAudioApp(true);
      //now = new Date();
      //console.log('after callTTS' + `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`);

    }
  };

  const callGenAITTSAPI = async (message) => {

    setIsGeneratingTTS(true); // Set generating state to true
    const cleanedArticles = message
      .replace(/https?:\/\/[^\s]+/g, '')
      .replace(/http?:\/\/[^\s]+/g, '')
      .replace(/[#:\-*]/g, ' ')
      .replace(/[&]/g, ' and ')
      .replace('```json', '')
      .replace(/[<>]/g, ' ')
      //       .replace(/["]/g, '&quot;')
      //       .replace(/[']/g, '&apos;')
      .trim();
    console.log('Calling Gena AI TTS API with message:', cleanedArticles);
    let genaiVoiceName = 'coral';
    if (voiceName.length < 9) {
      genaiVoiceName = voiceName;
    }
    try {
      const response = await fetch(process.env.REACT_APP_TTS_GENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: cleanedArticles,
          uid: user.uid,
          source: 'ta',
          voice_name: 'shimmer',
          chunk_size: 7900,
          instructions: voiceInstructions,
        })
      });

      if (!response.ok) {
        throw new Error([`Network response was not ok: ${response.statusText}`]);
      }
      let data;
      // Try to get docID with retry logic
      let retries = 12;
      while (retries > 0) {
        data = await response.json();
        if (data[0]?.docID) {
          // docID exists
          break;
        }
        // Wait 2 seconds before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
        retries--;
        if (retries === 0) {
          throw new Error('Failed to get document ID after multiple retries');
        }
      }
      ttsGeneratedDocID = data[0].docID;
    } catch (error) {
      console.error('Error calling TTS API:', error);
      alert([`Error: ${error.message}`]);
    } finally {
      setIsGeneratingTTS(false); // Reset generating state
      // Optionally, refresh data
    }
  };

  const handleHideRecurrentTasks = async () => {
    setHideRecurrentTasks(!hideRecurrentTasks);
  };

  const handleSignOut = () => {
    auth.signOut();
  };



  const handleSearchButtonClick = () => {
    setShowSearchBox(prevShowSearchBox => {
      const newShowSearchBox = !prevShowSearchBox;
      if (newShowSearchBox) {
        setTimeout(() => {
          searchInputRef.current?.focus(); // Focus on the search input
        }, 0);
      } else {
        setSearchQuery(''); // Reset search query if hiding the search box
      }
      return newShowSearchBox;
    });
  };

  // Helper function to split messages into chunks
  const splitMessage = (msg, chunkSize = 2000) => {
    const chunks = [];
    let currentPos = 0;
    while (currentPos < msg.length) {
      let chunk = msg.substr(currentPos, chunkSize);
      let splitPos = chunkSize;

      // If we're not at the end, look for last period
      if (currentPos + chunkSize < msg.length) {
        const lastPeriod = chunk.lastIndexOf('.');
        if (lastPeriod !== -1) {
          splitPos = lastPeriod + 1; // Include the period
        }
        else {
          const lastComma = chunk.lastIndexOf(',');
          if (lastComma !== -1) {
            splitPos = lastComma + 1; // Include the comma
          }
          else {
            const lastSpace = chunk.lastIndexOf(' ');
            if (lastSpace !== -1) {
              splitPos = lastSpace + 1; // Include the space
            }
            else {
              const lastQuestion = chunk.lastIndexOf('?');
              if (lastQuestion !== -1) {
                splitPos = lastSpace + 1;
              }
            }
          }
        }
      }

      chunk = chunk.substr(0, splitPos);
      chunks.push(chunk.trim());
      currentPos += splitPos;
    }

    return chunks;
  };

  const synthesizeSpeech = async () => {
    setIsLiveAudioPlaying(!isLiveAudioPlaying);
    // Clean the text by removing URLs and special characters
    const cleanedArticles = articles
      .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
      .replace(/http?:\/\/[^\s]+/g, '') // Remove URLs
      .replace(/[#:\-*]/g, ' ')
      .replace(/[&]/g, ' and ')
      .replace(/[<>]/g, ' ')
      //       .replace(/["]/g, '&quot;')
      //       .replace(/[']/g, '&apos;')
      .trim(); // Remove leading/trailing spaces

    try {
      try {
        console.log('Synthesizing speech...' + cleanedArticles);
        const speechConfig = speechsdk.SpeechConfig.fromSubscription(speechKey, serviceRegion);
        speechConfig.speechSynthesisOutputFormat = speechsdk.SpeechSynthesisOutputFormat.Audio16Khz128KBitRateMonoMp3;

        speechConfig.speechSynthesisVoiceName = voiceName;
        console.log('Voice name:', voiceName);
        const audioConfig = speechsdk.AudioConfig.fromDefaultSpeakerOutput();
        const synthesizer = new speechsdk.SpeechSynthesizer(speechConfig, null); // No need to pass audioConfig here since we're capturing audio data

        // Create chunks and synthesize them sequentially
        const chunks = splitMessage(cleanedArticles);
        const audioBlobs = [];

        for (const chunk of chunks) {
          await new Promise((resolve, reject) => {
            synthesizer.speakTextAsync(chunk,
              result => {
                if (result.reason === speechsdk.ResultReason.SynthesizingAudioCompleted) {
                  const audioData = result.audioData;
                  const blob = new Blob([audioData], { type: 'audio/mp3' });
                  audioBlobs.push(blob);
                  resolve();
                } else {
                  reject(new Error('Synthesis failed'));
                }
              },
              error => reject(error)
            );
          });
        }

        if (audioBlobs.length > 0) {
          const finalBlob = new Blob(audioBlobs, { type: 'audio/mp3' });
          setAudioUrl(URL.createObjectURL(finalBlob));
        }
      } catch (error) {
        console.error(`Error synthesizing speech: ${error}`);
      } finally {
        setIsLiveAudioPlaying(false);
      }
    }
    catch (error) {
      console.error(`Error synthesizing speech: ${error}`);
    }
    finally {
      setIsLiveAudioPlaying(false);
    }
  };

  const synthesizeSSMLSpeech = async () => {
    setIsLiveAudioPlaying(!isLiveAudioPlaying);
    // Clean the text by removing URLs and special characters
    const cleanedArticles = articles
      .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
      .replace(/http?:\/\/[^\s]+/g, '') // Remove URLs
      .replace(/[#:\-*]/g, ' ')
      .replace(/[&]/g, ' and ')
      .replace(/[<>]/g, ' ')
      //       .replace(/["]/g, '&quot;')
      //       .replace(/[']/g, '&apos;')
      .trim(); // Remove leading/trailing spaces

    try {
      try {
        console.log('Synthesizing speech...' + cleanedArticles);
        const speechConfig = speechsdk.SpeechConfig.fromSubscription(speechKey, serviceRegion);
        speechConfig.speechSynthesisOutputFormat = speechsdk.SpeechSynthesisOutputFormat.Audio16Khz128KBitRateMonoMp3;

        speechConfig.speechSynthesisVoiceName = voiceName;
        console.log('Voice name:', voiceName);
        const audioConfig = speechsdk.AudioConfig.fromDefaultSpeakerOutput();
        const synthesizer = new speechsdk.SpeechSynthesizer(speechConfig, null); // No need to pass audioConfig here since we're capturing audio data

        // Create chunks and synthesize them sequentially
        const chunks = splitMessage(cleanedArticles);
        const audioBlobs = [];
        for (const chunk of chunks) {

            let ssml_chunk_clean = chunk.replace('&', ' and ')
              .replace('<', ' ')
              .replace('>', ' ')
              .replace('"', '&quot;')
              .replace("'", '&apos;')
              .replace('.', ` .<break time="${speechSilence}ms" />`);
            ssml_chunk_clean = ssml_chunk_clean.replace(/([.?!])\s*(?=[A-Z])/g, `$1<break time="${speechSilence}ms" />`);
            let ssml_chunk_final = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" 
                xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="string">
                <voice name="${voiceName}">
                ${ssml_chunk_clean}
                </voice>
            </speak>`;
            console.log('SSML chunk:', ssml_chunk_final);

          await new Promise((resolve, reject) => {
            synthesizer.speakSsmlAsync(ssml_chunk_final,
              result => {
              if (result.reason === speechsdk.ResultReason.SynthesizingAudioCompleted) {
                const audioData = result.audioData;
                const blob = new Blob([audioData], { type: 'audio/mp3' });
                audioBlobs.push(blob);
                resolve();
              } else {
                reject(new Error('Synthesis failed'));
              }
              },
              error => reject(error)
            );                
          });
        }

        if (audioBlobs.length > 0) {
          const finalBlob = new Blob(audioBlobs, { type: 'audio/mp3' });
          setAudioUrl(URL.createObjectURL(finalBlob));
        }
      } catch (error) {
        console.error(`Error synthesizing speech: ${error}`);
      } finally {
        setIsLiveAudioPlaying(false);
      }
    }
    catch (error) {
      console.error(`Error synthesizing speech: ${error}`);
    }
    finally {
      setIsLiveAudioPlaying(false);
    }
  };

  const handlePlayPause = async () => {
    setIsPaused(!isPaused);
    console.log('isPaused ', isPaused);
    console.log('isPausedRef.current.value ', isPausedRef.current);
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Check if there's a valid audio element and it's not paused
    if (audioPlayerRef.current) {
      if (!isPausedRef.current) {
        audioPlayerRef.current.play()
          .catch(err => console.warn('Playback prevented', err));
      } else {
        const currentTime = audioPlayerRef.current.currentTime;
        audioPlayerRef.current.pause();
        audioPlayerRef.current.currentTime = currentTime;
      }
    }
  };

  const speakContent = async () => {
    const speechSynthesis = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(articles);
    speechSynthesis.speak(utterance);
  };

  const handleAddTask = async (e) => {
    setShowAudioPlayer(false);
    e.preventDefault();
    if (newTask.trim() !== '') {
      setIsAddingTask(true); // Disable the add button
      try {
        let taskDesc = newTask.trim();
        const taskParts = newTask.trim().split(' ');
        let recurrence = taskParts.pop().toLowerCase();
        recurrence = recurrence.toLowerCase();
        const dueDate = new Date();
        const trueRecurrences = ['daily', 'weekly', 'monthly', 'yearly'];
        if (!trueRecurrences.includes(recurrence)) {
          recurrence = 'ad-hoc';
        } else {
          taskDesc = taskParts.join(' ');
        }
        let newTaskDesc = taskDesc.split(' ');
        const dayOfWeek = newTaskDesc.pop().toLowerCase();
        const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        if (daysOfWeek.includes(dayOfWeek)) {
          taskDesc = newTaskDesc.join(' ');
          recurrence = 'weekly';
          const currentDate = new Date();
          let dayIndex = daysOfWeek.indexOf(dayOfWeek);
          let dayDiff = dayIndex - currentDate.getDay();
          if (dayDiff < 0) {
            dayDiff -= 7;
          }
          dueDate.setDate(dueDate.getDate() + dayDiff);
        }

        await addDoc(collection(db, fireBaseTasksCollection), {
          task: taskDesc,
          recurrence: recurrence,
          status: false,
          userId: user.uid,
          createdDate: new Date(),
          dueDate: dueDate,
          uemail: user.email
        });
        setNewTask('');
      } finally {
        setIsAddingTask(false); // Re-enable the add button
      }
    }
    setShowCurrent(!showCurrent);
  };

  const handleToggleStatus = async (taskId, status, recurrence, dueDate) => {
    const taskDocRef = doc(db, fireBaseTasksCollection, taskId);
    const currentDate = new Date();
    let nextDueDate = new Date(dueDate);
    if (recurrence !== 'ad-hoc') {
      switch (recurrence) {
        case 'daily':
          nextDueDate.setDate(nextDueDate.getDate() + 1);
          break;
        case 'weekly':
          nextDueDate.setDate(nextDueDate.getDate() + 7);
          break;
        case 'monthly':
          nextDueDate.setMonth(nextDueDate.getMonth() + 1);
          break;
        case 'yearly':
          nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
          break;
        default:
          break;
      }

      while (recurrence !== 'ad-hoc' && nextDueDate < currentDate) {
        switch (recurrence) {
          case 'daily':
            nextDueDate.setDate(nextDueDate.getDate() + 1);
            break;
          case 'weekly':
            nextDueDate.setDate(nextDueDate.getDate() + 7);
            break;
          case 'monthly':
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);
            break;
          case 'yearly':
            nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
            break;
          default:
            break;
        }
      }

      await updateDoc(taskDocRef, {
        dueDate: nextDueDate,
      });
    } else {
      await updateDoc(taskDocRef, {
        status: !status,
      });
    }
  };

  const handleDeleteTask = async (taskId, taskText) => {
    const confirmation = window.confirm(`Are you sure you want to delete this task: ${taskText.substring(0, 30)}...?`);
    if (confirmation) {
      await deleteDoc(doc(db, fireBaseTasksCollection, taskId));
    }
  };

  const generateDocx = async () => {
    const doc = new docx.Document({
      sections: [{
        properties: {},
        children: [
          new docx.Paragraph({
            children: [
              new docx.TextRun(articles),
            ],
          }),
        ],
      }]
    });

    docx.Packer.toBlob(doc).then(blob => {
      const now = new Date();
      const date = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
      const time = `${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}`;
      const dateTime = `${date}__${time}`;
      saveAs(blob, dateTime + "_" + ".docx");
    });
  };

  const generateText = async () => {
    const blob = new Blob([articles], { type: "text/plain;charset=utf-8" });
    const now = new Date();
    const date = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    const time = `${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}`;
    const dateTime = `${date}__${time}`;
    saveAs(blob, dateTime + ".txt");
  };

  const handleEditTask = (task) => {
    setEditTask(task);
    setEditTaskText(task.task);
    setEditRecurrence(task.recurrence);
    const usTimezoneOffset = new Date().getTimezoneOffset() * 60000; // Get the offset in milliseconds
    const taskDueDate = new Date(task.dueDate.toDate() - usTimezoneOffset);
    setEditDueDate(taskDueDate.toISOString().slice(0, 16));
  };

  const handleSaveTask = async () => {
    const taskDocRef = doc(db, fireBaseTasksCollection, editTask.id);
    await updateDoc(taskDocRef, {
      task: editTaskText,
      recurrence: editRecurrence,
      dueDate: new Date(editDueDate),
    });
    setEditTask(null);
  };

  const generateTTS = () => {
    //   setReaderMode(true);
    //log the exact date and time
    const cleanedArticles = articles
      .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
      .replace(/http?:\/\/[^\s]+/g, '') // Remove URLs
      .replace(/[#:\-*]/g, ' ') // Remove special characters
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim(); // Remove leading/trailing spaces

    if (cleanedArticles.length > 2) {
      /* const chunks = [];
       for (let i = 0; i < promptInput.length; i += 3999) {
         chunks.push(promptInput.substring(i, i + 3999));
       }
       for (const chunk of chunks) {
         callTTSAPI(chunk);
       }*/
      callTTSAPI(cleanedArticles, process.env.REACT_APP_TTS_SSML_API_URL);
    }
    else {
      callTTSAPI(cleanedArticles, 'https://us-central1-reviewtext-ad5c6.cloudfunctions.net/function-18');
    }
  };

  const generateGenAITTS = () => {
    //   setReaderMode(true);
    //log the exact date and time
    const cleanedArticles = articles
      .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
      .replace(/http?:\/\/[^\s]+/g, '') // Remove URLs
      .replace(/[#:\-*]/g, ' ') // Remove special characters
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim(); // Remove leading/trailing spaces
    callGenAITTSAPI(cleanedArticles);
  };

  const fetchMoreFutureData = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const limitParam = urlParams.get('limit');
      const limitValue = limitParam ? parseInt(limitParam) : fetchMoreTasksLimit;
      const tasksCollection = collection(db, fireBaseTasksCollection);
      const currentDate = new Date();
      if (lastVisible) {
        const q = query(tasksCollection, where('userId', '==', user.uid), where('dueDate', '>', currentDate), orderBy('dueDate', 'asc'), startAfter(lastVisible), limit(limitValue));
        const tasksSnapshot = await getDocs(q);
        const tasksList = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLastVisible(tasksSnapshot.docs[tasksSnapshot.docs.length - 1]);
        if (tasksList.length === fetchMoreTasksLimit) {
          setShowMoreFutureButton(true);
        } else {
          setShowMoreFutureButton(false);
        }
        setFutureTasks(prevData => [...prevData, ...tasksList]);
      }
      else {
        alert('No more data to fetch');
      }
    } catch (error) {
      console.error("Error fetching more data: ", error);
    }
  };

  const handleBack = () => {
    setReaderMode(false);
  };

  const fetchMoreData = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const limitParam = urlParams.get('limit');
      const limitValue = limitParam ? parseInt(limitParam) : fetchMoreTasksLimit;
      const tasksCollection = collection(db, fireBaseTasksCollection);
      if (lastVisible) {
        const q = query(tasksCollection, where('userId', '==', user.uid), where('status', '==', true), orderBy('createdDate', 'desc'), startAfter(lastVisible), limit(limitValue));
        const tasksSnapshot = await getDocs(q);
        const tasksList = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLastVisible(tasksSnapshot.docs[tasksSnapshot.docs.length - 1]); // Fixed: using tasksSnapshot instead of snapshot
        if (tasksList.length == fetchMoreTasksLimit) {
          setShowMoreCompletedButton(true);
        } else {
          setShowMoreCompletedButton(false);
        }
        setCompletedTasks(prevData => [...prevData, ...tasksList]);
      }
      else {
        alert('No more data to fetch');
      }
    } catch (error) {
      console.error("Error fetching more data: ", error);
    }
  };

  const fetchMoreTasks = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const limitParam = urlParams.get('limit');
      const limitValue = limitParam ? parseInt(limitParam) : fetchMoreTasksLimit;
      const tasksCollection = collection(db, fireBaseTasksCollection);
      const currentDate = new Date();
      if (lastVisible) {
        const q = query(tasksCollection, where('userId', '==', user.uid), where('status', '==', false), where('dueDate', '<', currentDate), orderBy('dueDate', 'desc'), startAfter(lastVisible), limit(limitValue));
        const tasksSnapshot = await getDocs(q);
        const tasksList = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTasks(prevData => [...prevData, ...tasksList]);
        setLastVisible(tasksSnapshot.docs[tasksSnapshot.docs.length - 1]); // Fixed: using tasksSnapshot instead of snapshot
        if (tasksList.length == fetchMoreTasksLimit) {
          setShowMoreButton(true);
        } else {
          setShowMoreButton(false);
        }
      }
      else {
        alert('No more data to fetch');
      }
    } catch (error) {
      console.error("Error fetching more data: ", error);
    }
  };
  const handleClearSearch = () => {
    setSearchQuery(''); // Clear the search query
  };

  const showSharedTasks = async () => {
    if (!sharedTasks) {
      const tasksCollection = collection(db, fireBaseTasksCollection);
      const currentDate = new Date();
      console.log('Admin user');
      const sharedQuery = query(tasksCollection, where('userId', 'in', ['qDzUX26K0dgtSMlN9PtCj6Q9L5J3']), where('status', '==', false), where('dueDate', '<', currentDate), orderBy('dueDate', 'desc'), limit(500));
      const tasksSnapshot = await getDocs(sharedQuery);
      const tasksList = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(tasksList);
    }
    else {
      setShowCurrent(!showCurrent);
    }
    setSharedTasks(!sharedTasks);
  }

  const showAarushTasks = async () => {
    if (!sharedTasks) {
      const tasksCollection = collection(db, fireBaseTasksCollection);
      const currentDate = new Date();
      console.log('Admin user');
      const sharedQuery = query(tasksCollection, where('userId', '==', 'yvsWRZwjTQecvGap3pGXWNGHoTp2'), where('status', '==', false), where('dueDate', '<', currentDate), orderBy('dueDate', 'desc'), limit(500));
      const tasksSnapshot = await getDocs(sharedQuery);
      const tasksList = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(tasksList);
    }
    else {
      setShowCurrent(!showCurrent);
    }
    setSharedTasks(!sharedTasks);
  }

  const showSharathTasks = async () => {
    if (!sharedTasks) {
      const tasksCollection = collection(db, fireBaseTasksCollection);
      const currentDate = new Date();
      console.log('Admin user');
      const sharedQuery = query(tasksCollection, where('userId', '==', 'bTGBBpeYPmPJonItYpUOCYhdIlr1'), where('status', '==', false), where('dueDate', '<', currentDate), orderBy('dueDate', 'desc'), limit(500));
      const tasksSnapshot = await getDocs(sharedQuery);
      const tasksList = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(tasksList);
    }
    else {
      setShowCurrent(!showCurrent);
    }
    setSharedTasks(!sharedTasks);
  }


  // Add URL detection helper function
  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  // Add task text renderer function
  const renderTaskText = (text) => {
    if (isValidUrl(text.trim())) {
      return (
        <a
          href={text.trim()}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#0066cc', textDecoration: 'underline' }}
        >
          {text}
        </a>
      );
    }
    return text;
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (showGenAIApp) {
    return (
      <GenAIApp user={user} />
    );
  }
  if (showAudioApp) {
    return (
      <AudioApp user={user} />
    );
  }

  if (showNotesApp) {
    return (
      <Notes user={user} />
    );
  }

  if (showArticlesApp) {
    return (
      <Articles user={user} />
    );
  }

  if (showTTSQueueApp) {
    return (
      <TTSQueueApp user={user} />
    );
  }

  if (showHomeworkApp) {  // Add this block
    return (
      <Practice user={user} sourceDocumentID={currentDocId} onBack={() => setShowHomeworkApp(false)} />
    );
  }

  if (showGenerateHomeworkApp) {  // Add this block
    return (
      <Homework user={user} sourceDocumentID={currentDocId} onBack={() => showGenerateHomeworkApp(false)} />
    );
  }

  return (
    <div>
      <div>
        {readerMode ? (
          <div>
            <button className='app_button' onClick={handleBack}><FaArrowLeft /></button>
            <p>{articles}</p>
          </div>
        ) : (
          <div>
                <button style={{ color: isLiveAudioPlaying ? 'orange' : 'grey', fontSize: '12px', border: isLiveAudioPlaying ? '3' : '0', backgroundColor: isLiveAudioPlaying ? 'black' : 'white' }} onClick={synthesizeSSMLSpeech}>Audio</button>
                <button style={{ color: 'grey', fontSize: '12px', border: '0', backgroundColor: 'white' }} onClick={() => setShowAudioApp(!showAudioApp)}>
                  Queue
                </button>
                &nbsp;
                <button style={{ color: 'grey', fontSize: '12px', border: '0', backgroundColor: 'white' }} onClick={() => setShowTTSQueueApp(!showTTSQueueApp)}>
                  Read
                </button>
                &nbsp;
                <button style={{ color: 'grey', fontSize: '12px', border: '0', backgroundColor: 'white' }} onClick={() => setShowGenAIApp(!showGenAIApp)}>
                  Research
                </button>
                &nbsp;
                <button style={{ color: 'grey', fontSize: '12px', border: '0', backgroundColor: 'white' }} onClick={() => setShowCompleted(!showCompleted)}>
                  Done
                </button>
                <button style={{ color: 'grey', fontSize: '12px', border: '0', backgroundColor: 'white' }} onClick={() => setShowFuture(!showFuture)}>
                  Future
                </button>
            {audioUrl && (
              <div>
                <br />
                <br />
                <button
                  className={isPaused ? 'button_selected' : 'signoutbutton'}
                  onClick={() => { handlePlayPause(); }}
                  style={{ marginLeft: '10px' }}
                >
                  {isPaused ? 'Play' : 'Pause'}
                </button>
                {loopCount > 0 && (
                  <span style={{ marginLeft: '10px', color: 'green' }}>
                    Loop: {loopCount}/{MAX_LOOPS}
                  </span>
                )}
                <br />
                <br />
              </div>
            )}
            {audioUrl && (
              <audio
                ref={audioPlayerRef}
                controls
                style={{ width: '50%', marginLeft: '10px', marginTop: '10px' }}
                src={audioUrl} // Add this prop
              />
            )
            }
            {showSearchBox && (
              <div> <input
                type="text"
                className="searchTask"
                placeholder="Search tasks"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                ref={searchInputRef}
              />
                <button className='app_button' onClick={handleClearSearch} >
                  <FaTimes />
                </button>
              </div>
            )}
            {isGeneratingTTS && <div> <br /> <p>Generating audio...</p> </div>}
            {answerData && (
              <div>
                <br />
                <a href={answerData} target="_blank" rel="noopener noreferrer">Play/Download</a>
              </div>
            )}
            {!showCompleted && !showFuture && (
              <div>
                <form onSubmit={handleAddTask}>
                  <input
                    className="addTask"
                    type="text"
                    placeholder=""
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                  />
                  <button className="app_button_addbutton" type="submit" disabled={isAddingTask}>
                    <FaPlus />
                  </button>
                </form>
                <ul>
                  {tasks
                    .filter((task) => !task.status && (hideRecurrentTasks ? task.recurrence === 'ad-hoc' : true) && (searchQuery ? task.task.toLowerCase().includes(searchQuery.toLowerCase()) : true))
                    .map((task) => (
                      <li key={task.id} data-task-id={task.id} data-status={task.status}>
                        <>
                          <button className='markcompletebutton' onClick={() => handleToggleStatus(task.id, task.status, task.recurrence, task.dueDate.toDate().toLocaleDateString())}>
                            <FaCheck />
                          </button>
                          <span>
                            {renderTaskText(task.task)}
                            {task.recurrence && task.recurrence !== 'ad-hoc' && (
                              <span style={{ color: 'grey' }}> ({task.recurrence.charAt(0).toUpperCase() + task.recurrence.slice(1)})</span>
                            )}
                            {showDueDates && (
                              <span style={{ color: 'grey', fontSize: '12px' }}> - {task.dueDate.toDate().toLocaleDateString()}_{task.dueDate.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            )}
                          </span>
                          {showEditButtons && (
                            <button style={{ color: 'grey', fontSize: '12px', border: '0', backgroundColor: 'white' }} onClick={() => handleEditTask(task)}>
                              edit
                            </button>
                          )}
                        </>
                      </li>
                    ))}
                </ul>
                {showMoreButton && <button className="button" onClick={fetchMoreTasks}>Show More</button>}
                <br />
                <br />
                <button className={showRecurrentTasks ? 'app_button_selected' : 'app_button'} onClick={handleHideRecurrentTasks}>
                  <FaConfluence />
                </button>

                <button className='app_button' onClick={generateDocx}><FaFileWord /></button>
                <button className='app_button' onClick={generateText}><FaFileAlt /></button>
                <button className={showSearchBox ? 'app_button_selected' : 'app_button'} onClick={handleSearchButtonClick}>
                  <FaSearch />
                </button>
                <button className="app_button_signoutbutton" onClick={handleSignOut}>
                  <FaSignOutAlt />
                </button>
                <br />
                <br />
                {/* Add the voice name input box */}
                <VoiceSelect
                  selectedVoice={voiceName} // Current selected voice
                  onVoiceChange={setVoiceName} // Handler to update selected voice
                /> &nbsp;
                <button className={isGeneratingTTS ? 'app_button_selected' : 'app_button'} onClick={synthesizeSpeech}><FaHeadphones /></button>
                <br />
                <br />
                {<button className={!isLiveAudioPlaying ? 'app_button' : 'app_button_selected'} onClick={synthesizeSpeech}>                                    {isLiveAudioPlaying
                  ? (<FaSpinner className="spinning" />)
                  : (<FaVolumeUp />)}</button>}
                {!showCompleted && !showFuture && readerMode && (<button className={isGeneratingTTS ? 'app_button_selected' : 'app_button'} onClick={generateTTS}><FaReadme /></button>)}
                &nbsp;
                <button className={isGeneratingTTS ? 'app_button_selected' : 'app_button'} onClick={generateGenAITTS}><FaVolumeDown /></button>
                <button className={showAudioApp ? 'app_button_selected' : 'app_button'} onClick={() => setShowAudioApp(!showAudioApp)}>
                  <FaPlay />
                </button>
                &nbsp;
                <button className={showTTSQueueApp ? 'app_button_selected' : 'app_button'} onClick={() => setShowTTSQueueApp(!showTTSQueueApp)}>
                  <FaAlignJustify />
                </button>
                &nbsp;
                <button className={showGenAIApp ? 'app_button_selected' : 'app_button'} onClick={() => setShowGenAIApp(!showGenAIApp)}>
                  <FaBrain />
                </button>
                &nbsp;
                <button className={showCompleted ? 'app_button_selected' : 'app_button'} onClick={() => setShowCompleted(!showCompleted)}>
                  <FaCheckDouble />
                </button>
                <button className={showFuture ? 'app_button_selected' : 'app_button'} onClick={() => setShowFuture(!showFuture)}>
                  <FaClock />
                </button>&nbsp;
                <br />
                <br />
                <button className="app_button" onClick={handleRefresh}>
                  <FaSync />
                </button>
                <button className={isGeneratingTTS ? 'app_button_selected' : 'app_button'} onClick={generateTTS}><FaHeadphones /></button>
                <button className={showNotesApp ? 'app_button_selected' : 'app_button'} onClick={() => setShowNotesApp(!showNotesApp)}>
                  <FaNotesMedical />
                </button>
                <button className={showArticlesApp ? 'app_button_selected' : 'app_button'} onClick={() => setShowArticlesApp(!showArticlesApp)}>
                  <FaNewspaper />
                </button>
                <button className={showDueDates ? 'app_button_selected' : 'app_button'} onClick={() => setShowDueDates(!showDueDates)}><FaCalendar /></button>
                <button className={showEditButtons ? 'app_button_selected' : 'app_button'} onClick={() => setShowEditButtons(!showEditButtons)}><FaEdit /></button>
                {showEditButtons && (showCompleted || showFuture) && <button className={showDeleteButtons ? 'button_delete_selected' : 'app_button'} onClick={() => setShowDeleteButtons(!showDeleteButtons)}><FaTrash /></button>}
                <br />
                <br />
                &nbsp;
                {adminUser && (
                  <div>
                    <button className="button" onClick={showSharedTasks}>
                      {!sharedTasks ? 'Show Navya Tasks' : 'Hide Navya Tasks'}
                    </button>
                    <br />
                    <br />
                  </div>
                )}
                {adminUser && (
                  <div>
                    <button className="button" onClick={showAarushTasks}>
                      {!sharedTasks ? 'Show Aarush Tasks' : 'Hide Aarush Tasks'}
                    </button>
                    <br />
                    <br />
                    <button className="button" onClick={showSharathTasks}>
                      {!sharedTasks ? 'Show Sharath Tasks' : 'Hide Sharath Tasks'}
                    </button>
                  </div>
                )}
                <div>
                  <br />
                  <br />
                  <br />
                  <br />
                  <br />
                  <br />
                  <br />
                  <br />
                  <br />
                </div>
              </div>
            )}
            {showCompleted && (
              <div>
                <h2>Completed Tasks</h2>
                <ul>
                  {completedTasks
                    .filter((task) => task.status && (searchQuery ? task.task.toLowerCase().includes(searchQuery.toLowerCase()) : true))
                    .map((task) => (
                      <li key={task.id} className="completed">
                        <button className='donemarkcompletebutton' onClick={() => handleToggleStatus(task.id, task.status, task.recurrence, task.dueDate.toDate().toLocaleDateString())}>
                          <FaCheck />
                        </button>
                        {renderTaskText(task.task)} &nbsp;&nbsp;
                        {task.recurrence && task.recurrence !== 'ad-hoc' && (
                          <span style={{ color: 'grey' }}> ({task.recurrence.charAt(0).toUpperCase() + task.recurrence.slice(1)})</span>
                        )}
                        &nbsp;
                        {showDueDates && (
                          <span style={{ color: 'grey', fontSize: '12px' }}> - {task.dueDate.toDate().toLocaleDateString()}_{task.dueDate.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        )}
                        {showDeleteButtons && (
                          <button onClick={() => handleDeleteTask(task.id, task.task)} className='button_delete_selected'>
                            <FaTrash />
                          </button>
                        )}
                      </li>
                    ))}
                </ul>
                {showMoreCompletedButton && <button className="button" onClick={fetchMoreData}>Show More</button>}
                <div style={{ marginBottom: '110px' }}></div>
              </div>
            )}
            {showFuture && (
              <div>
                <h2>Future Tasks</h2>
                <ul>
                  {futureTasks
                    .filter((task) => (searchQuery ? task.task.toLowerCase().includes(searchQuery.toLowerCase()) : true))
                    .map((task) => (
                      <li key={task.id}>
                        {renderTaskText(task.task)}
                        &nbsp;
                        {showDueDates && (
                          <span style={{ color: 'grey', fontSize: '12px' }}> - {task.dueDate.toDate().toLocaleDateString()}_{task.dueDate.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        )}
                        &nbsp;
                        {task.recurrence && task.recurrence !== 'ad-hoc' && (
                          <span style={{ color: 'grey' }}> ({task.recurrence.charAt(0).toUpperCase() + task.recurrence.slice(1)})</span>
                        )}
                        &nbsp;
                        {showEditButtons && (
                          <button className='editbutton' onClick={() => handleEditTask(task)}>
                            <FaEdit style={{ color: 'Green', backgroundColor: 'whitesmoke' }} />
                          </button>
                        )}
                        &nbsp;
                        {showDeleteButtons && (
                          <button onClick={() => handleDeleteTask(task.id, task.task)} className='button_delete_selected'>
                            <FaTrash />
                          </button>
                        )}
                      </li>
                    ))}
                </ul>
                {showMoreFutureButton && <button className="button" onClick={fetchMoreFutureData}>Show More</button>}
                <div style={{ marginBottom: '110px' }}></div>
              </div>
            )}
            {editTask && (
              <div >
                <form className='editForm' onSubmit={(e) => { e.preventDefault(); handleSaveTask(); }}>
                  <input style={{ width: '80%' }}
                    type="text"
                    value={editTaskText}
                    onChange={(e) => setEditTaskText(e.target.value)}
                  />
                  <br />
                  <br />
                  <select
                    value={editRecurrence}
                    onChange={(e) => setEditRecurrence(e.target.value)}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="ad-hoc">Ad-hoc</option>
                  </select>
                  &nbsp;&nbsp;
                  <input
                    type="datetime-local"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                  />
                  <br />
                  <br />
                  <button className="button" type="submit">Save</button>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                  <button className="button" onClick={() => setEditTask(null)}>Cancel</button>
                </form>
              </div>
            )}
          </div>

        )}
      </div>
    </div>
  )
}


export default App;