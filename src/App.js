import React, { useState, useEffect, useRef } from 'react';
import { FaPlus, FaCheck, FaTrash, FaHeadphones, FaEdit, FaSignOutAlt, FaFileWord, FaFileAlt, FaCalendar, FaTimes, FaPlay, FaSearch, FaReadme, FaArrowLeft, FaCheckDouble, FaClock, FaAlignJustify, FaBrain, FaConfluence } from 'react-icons/fa';
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

const speechKey = process.env.REACT_APP_AZURE_SPEECH_API_KEY;
const serviceRegion = 'eastus';
const isiPhone = /iPhone/i.test(navigator.userAgent);
console.log(isiPhone);
const tasksLimit = 499;
const fetchMoreTasksLimit = 500;

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
  const [showEditButtons, setShowEditButtons] = useState(false);
  const [showDueDates, setShowDueDates] = useState(false);
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
  const [voiceName, setVoiceName] = useState('en-US-AriaNeural');
  const [showAudioApp, setShowAudioApp] = useState(false);
  const [showTTSQueueApp, setShowTTSQueueApp] = useState(false);
  const [showGenAIApp, setShowGenAIApp] = useState(false);

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
      const tasksCollection = collection(db, 'tasks');
      const urlParams = new URLSearchParams(window.location.search);
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
      const tasksCollection = collection(db, 'tasks');
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
      const tasksCollection = collection(db, 'tasks');
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
        body: JSON.stringify({ message: message, uid: user.uid, source: 'ta', voice_name: voiceName })
      });

      if (!response.ok) {
        throw new Error([`Network response was not ok: ${response.statusText}`]);
      }
    } catch (error) {
      console.error('Error calling TTS API:', error);
      alert([`Error: ${error.message}`]);
    } finally {
      // Fetch the Firebase document data
      const genaiCollection = collection(db, 'genai', user.uid, 'MyGenAI');
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
      }
      setIsGeneratingTTS(false); // Reset generating state
      now = new Date();
      console.log('after callTTS' + `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`);

    }
  };

  const handleHideRecurrentTasks = async () => {
    setHideRecurrentTasks(!hideRecurrentTasks);
  };

  const handleSignOut = () => {
    auth.signOut();
  };

  const splitMessage = (msg, chunkSize = 4000) => {
    const chunks = [];
    for (let i = 0; i < msg.length; i += chunkSize) {
      chunks.push(msg.substring(i, i + chunkSize));
    }
    return chunks;
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

  const synthesizeSpeech = async () => {
    if (isiPhone) {
      handleReaderMode();
      return;
    }
    const speechConfig = speechsdk.SpeechConfig.fromSubscription(speechKey, serviceRegion);
    speechConfig.speechSynthesisVoiceName = voiceName;

    const audioConfig = speechsdk.AudioConfig.fromDefaultSpeakerOutput();
    const speechSynthesizer = new speechsdk.SpeechSynthesizer(speechConfig, audioConfig);

    const chunks = splitMessage(articles);
    for (const chunk of chunks) {
      try {
        const result = await speechSynthesizer.speakTextAsync(chunk);
        if (result.reason === speechsdk.ResultReason.SynthesizingAudioCompleted) {
          console.log(`Speech synthesized to speaker for text: [${chunk}]`);
        } else if (result.reason === speechsdk.ResultReason.Canceled) {
          const cancellationDetails = speechsdk.SpeechSynthesisCancellationDetails.fromResult(result);
          if (cancellationDetails.reason === speechsdk.CancellationReason.Error) {
            console.error(`Error details: ${cancellationDetails.errorDetails}`);
          }
        }
      } catch (error) {
        console.error(`Error synthesizing speech: ${error}`);
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

      await addDoc(collection(db, 'tasks'), {
        task: taskDesc,
        recurrence: recurrence,
        status: false,
        userId: user.uid,
        createdDate: new Date(),
        dueDate: dueDate,
        uemail: user.email
      });
      setNewTask('');
    }
    setShowCurrent(!showCurrent);
  };

  const handleToggleStatus = async (taskId, status, recurrence, dueDate) => {
    const taskDocRef = doc(db, 'tasks', taskId);
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
      await deleteDoc(doc(db, 'tasks', taskId));
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
    const taskDocRef = doc(db, 'tasks', editTask.id);
    await updateDoc(taskDocRef, {
      task: editTaskText,
      recurrence: editRecurrence,
      dueDate: new Date(editDueDate),
    });
    setEditTask(null);
  };

  const handleReaderMode = () => {
    //   setReaderMode(true);
    //log the exact date and time
    if (articles.length > 2) {
      /* const chunks = [];
       for (let i = 0; i < promptInput.length; i += 3999) {
         chunks.push(promptInput.substring(i, i + 3999));
       }
       for (const chunk of chunks) {
         callTTSAPI(chunk);
       }*/
      callTTSAPI(articles, process.env.REACT_APP_API_URL);
    }
    else {
      callTTSAPI(articles, 'https://us-central1-reviewtext-ad5c6.cloudfunctions.net/function-18');
    }
  };

  const fetchMoreFutureData = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const limitParam = urlParams.get('limit');
      const limitValue = limitParam ? parseInt(limitParam) : fetchMoreTasksLimit;
      const tasksCollection = collection(db, 'tasks');
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
      const tasksCollection = collection(db, 'tasks');
      if (lastVisible) {
        const q = query(tasksCollection, where('userId', '==', user.uid), where('status', '==', true), orderBy('createdDate', 'desc'), startAfter(lastVisible), limit(limitValue));
        const tasksSnapshot = await getDocs(q);
        const tasksList = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLastVisible(tasksSnapshot.docs[tasksSnapshot.docs.length - 1]);
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
      const tasksCollection = collection(db, 'tasks');
      const currentDate = new Date();
      if (lastVisible) {
        const q = query(tasksCollection, where('userId', '==', user.uid), where('status', '==', false), where('dueDate', '<', currentDate), orderBy('dueDate', 'desc'), startAfter(lastVisible), limit(limitValue));
        const tasksSnapshot = await getDocs(q);
        const tasksList = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTasks(prevData => [...prevData, ...tasksList]);
        setLastVisible(tasksSnapshot.docs[tasksSnapshot.docs.length - 1]);
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
      const tasksCollection = collection(db, 'tasks');
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
      const tasksCollection = collection(db, 'tasks');
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

  if (showTTSQueueApp) {
    return (
      <TTSQueueApp user={user} />
    );
  }

  return (
    <div>
      <div className="app" style={{ marginBottom: '120px', fontSize: '24px' }}>
        {readerMode ? (
          <div>
            <button className='button' onClick={handleBack}><FaArrowLeft /></button>
            <p>{articles}</p>
          </div>
        ) : (
          <div>
            <button className={showCompleted ? 'button_selected' : 'button'} onClick={() => setShowCompleted(!showCompleted)}>
              <FaCheckDouble />
            </button>
            <button className={showFuture ? 'button_selected' : 'button'} onClick={() => setShowFuture(!showFuture)}>
              <FaClock />
            </button>
            <button className={showDueDates ? 'button_selected' : 'button'} onClick={() => setShowDueDates(!showDueDates)}><FaCalendar /></button>
            <button className={showEditButtons ? 'button_selected' : 'button'} onClick={() => setShowEditButtons(!showEditButtons)}><FaEdit /></button>
            {showEditButtons && (showCompleted || showFuture) && <button className={showDeleteButtons ? 'button_delete_selected' : 'button'} onClick={() => setShowDeleteButtons(!showDeleteButtons)}><FaTrash /></button>}
            <button className={isGeneratingTTS ? 'button_selected' : 'button'} onClick={synthesizeSpeech}><FaHeadphones /></button>
            {!showCompleted && !showFuture && readerMode && (<button className={isGeneratingTTS ? 'button_selected' : 'button'} onClick={handleReaderMode}><FaReadme /></button>)}
            <button className={showSearchBox ? 'button_selected' : 'button'} onClick={handleSearchButtonClick}>
              <FaSearch />
            </button>
            <button className={showAudioApp ? 'button_selected' : 'button'} onClick={() => setShowAudioApp(!showAudioApp)}>
              <FaPlay />
            </button>
            <button className={showTTSQueueApp ? 'button_selected' : 'button'} onClick={() => setShowTTSQueueApp(!showTTSQueueApp)}>
              <FaAlignJustify />
            </button>
            <button className={showGenAIApp ? 'button_selected' : 'button'} onClick={() => setShowGenAIApp(!showGenAIApp)}>
              <FaBrain />
            </button>
            <button className="button" onClick={handleSignOut}>
              <FaSignOutAlt />
            </button>
            {showSearchBox && (
              <div> <input
                type="text"
                className="searchTask"
                placeholder="Search tasks"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                ref={searchInputRef}
              />
                <button className='button' onClick={handleClearSearch} >
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
                  <button className="addbutton" type="submit">
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
                            {task.task}
                            {task.recurrence && task.recurrence !== 'ad-hoc' && (
                              <span style={{ color: 'grey' }}> ({task.recurrence.charAt(0).toUpperCase() + task.recurrence.slice(1)})</span>
                            )}
                            {showDueDates && (
                              <span style={{ color: 'orange' }}> - {task.dueDate.toDate().toLocaleDateString()} _ {task.dueDate.toDate().toLocaleTimeString()}</span>
                            )}
                          </span>
                          {showEditButtons && (
                            <button className='button' onClick={() => handleEditTask(task)}>
                              <FaEdit style={{ color: 'Green', backgroundColor: 'whitesmoke' }} />
                            </button>
                          )}
                        </>
                      </li>
                    ))}
                </ul>
                {showMoreButton && <button className="button" onClick={fetchMoreTasks}>Show More</button>}
                <br />
                <br />
                <button className={showRecurrentTasks ? 'button_selected' : 'button'} onClick={handleHideRecurrentTasks}>
                  <FaConfluence />
                </button>

                <button className='button' onClick={generateDocx}><FaFileWord /></button>
                <button className='button' onClick={generateText}><FaFileAlt /></button>
                <br />
                <br />
                {/* Add the voice name input box */}
                <VoiceSelect
                  selectedVoice={voiceName} // Current selected voice
                  onVoiceChange={setVoiceName} // Handler to update selected voice
                /> &nbsp;
                <button className={isGeneratingTTS ? 'button_selected' : 'button'} onClick={synthesizeSpeech}><FaHeadphones /></button>
                <br />
                <br />
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
                  </div>
                )}
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
                        {task.task} &nbsp;&nbsp;
                        {task.recurrence && task.recurrence !== 'ad-hoc' && (
                          <span style={{ color: 'grey' }}> ({task.recurrence.charAt(0).toUpperCase() + task.recurrence.slice(1)})</span>
                        )}
                        &nbsp;
                        {showDueDates && (
                          <span style={{ color: 'orange' }}> - {task.dueDate.toDate().toLocaleDateString()} _ {task.dueDate.toDate().toLocaleTimeString()}</span>
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
                        {task.task}
                        &nbsp;
                        {showDueDates && (
                          <span style={{ color: 'orange' }}> - {task.dueDate.toDate().toLocaleDateString()} _ {task.dueDate.toDate().toLocaleTimeString()}</span>
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