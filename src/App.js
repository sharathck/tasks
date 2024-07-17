import React, { useState, useEffect } from 'react';
import { FaPlus, FaCheck, FaTrash, FaHeadphones, FaEdit, FaSignOutAlt, FaFileWord, FaFileAlt, FaCalendar, FaPlay, FaReadme, FaArrowLeft, FaCheckDouble, FaClock } from 'react-icons/fa';
import './App.css';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, deleteDoc, collection, getDocs, startAfter, query, where, orderBy, onSnapshot, addDoc, updateDoc, limit, persistentLocalCache, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
import { getAuth, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, GoogleAuthProvider } from 'firebase/auth';
import { saveAs } from 'file-saver';
import * as docx from 'docx';
import * as speechsdk from 'microsoft-cognitiveservices-speech-sdk';

const speechKey = process.env.REACT_APP_AZURE_SPEECH_API_KEY;
const serviceRegion = 'eastus';
const voiceName = 'en-US-AvaNeural';
const isiPhone = /iPhone/i.test(navigator.userAgent);
console.log(isiPhone);
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
const db = getFirestore(app);
const auth = getAuth(app);
const tasksLimit = 199;
const fetchMoreTasksLimit = 50;
let articles = '';

function App() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
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

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      if (user.uid === 'bTGBBpeYPmPJonItYpUOCYhdIlr1') {
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
        articles += tasksData.map((task) => task.task).join(' . ');
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
  }, [user,showCurrent]);

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
        articles += tasksData.map((task) => task.task).join(' ');
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
        articles += futureTasksData.map((task) => task.task).join(' . ');
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

  const handleHideRecurrentTasks = async () => {
    setHideRecurrentTasks(!hideRecurrentTasks);
  };
  
  const handleSignIn = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider);
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

  const synthesizeSpeech = async () => {
    if (isiPhone) {
      speakContent();
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
    setShowCurrent(true);
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
    setReaderMode(true);
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

  const handleSignInWithEmail = async (e) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      if (!user.emailVerified) {
        await auth.signOut();
        alert('Please verify your email before signing in.');
      }
    } catch (error) {
      if (error.code === 'auth/wrong-password') {
        alert('Wrong password, please try again.');
      } else {
        alert('Error signing in, please try again.' + error.message);
        console.error('Error signing in:', error);
      }
    }
  };

  const handleSignUpWithEmail = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(auth.currentUser);
      const user = userCredential.user;
      alert('Verification email sent! Please check your inbox. Ater verification, please sign in.');
      if (!user.emailVerified) {
        await auth.signOut();
      }
    } catch (error) {
      alert('Error signing up, please try again.' + error.message);
      console.error('Error signing up:', error);
    }
  };

  const handleBack = () => {
    setReaderMode(false);
  };

  const handlePasswordReset = async () => {
    if (!email) {
      alert('Please enter your email address.');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      alert('Password reset email sent, please check your inbox.');
    } catch (error) {
      console.error('Error sending password reset email', error);
    }
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

  const showSharedTasks = async () => {
    if (user.uid === 'bTGBBpeYPmPJonItYpUOCYhdIlr1') {
      if (!sharedTasks) {
      const tasksCollection = collection(db, 'tasks');
      const currentDate = new Date();
      console.log('Admin user');
      const sharedQuery = query(tasksCollection, where('userId', 'in', ['bTGBBpeYPmPJonItYpUOCYhdIlr1', 'qDzUX26K0dgtSMlN9PtCj6Q9L5J3', 'yvsWRZwjTQecvGap3pGXWNGHoTp2', 'lpwCpZkPk2h1ZWrESgkyXPUXEPQ2']), where('status', '==', false), where('dueDate', '<', currentDate), orderBy('dueDate', 'desc'), limit(500));
      const tasksSnapshot = await getDocs(sharedQuery);
      const tasksList = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(tasksList);
      }
      else {
        setShowCurrent(true);
      }
    setSharedTasks(!sharedTasks);
  }
}

  return (
    <div>
      {user && (
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
              <button className='button' onClick={synthesizeSpeech}><FaHeadphones /></button>
              <button className='button' onClick={generateDocx}><FaFileWord /></button>
              <button className='button' onClick={generateText}><FaFileAlt /></button>
              {!showCompleted && !showFuture && (<button className='button' onClick={handleReaderMode}><FaReadme /></button>)}
              <button className="signoutbutton" title={articles} onClick={handleSignOut}>
                <FaSignOutAlt />
              </button>
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
                      .filter((task) => !task.status && (hideRecurrentTasks ? task.recurrence === 'ad-hoc' : true))
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
                  <button className="button" onClick={handleHideRecurrentTasks}>
                    {!hideRecurrentTasks ? 'Hide Recurrent Tasks' : 'Show Recurrent Tasks'}
                  </button>
                  <br />
                  <br />
                  {adminUser && (
                    <div>
                      <button className="button" onClick={showSharedTasks}>
                        {!sharedTasks ? 'Show Shared Tasks' : 'Hide Shared Tasks'}
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
                      .filter((task) => task.status)
                      .map((task) => (
                        <li key={task.id} className="completed">
                          <button onClick={() => handleToggleStatus(task.id, task.status, task.recurrence, task.dueDate.toDate().toLocaleDateString())}>
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
                    {futureTasks.map((task) => (
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
      )}
      {!user && (
        <div style={{ fontSize: '22px', width: '100%', margin: '0 auto' }}>
          <br />
          <br />
          <p>Sign In</p>
          <input
            className='textinput'
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
            className='textinput'
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <br />
          <br />
          <button className='signonpagebutton' onClick={() => handleSignInWithEmail()}>Sign In</button>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          <button className='signuppagebutton' onClick={() => handleSignUpWithEmail()}>Sign Up</button>
          <br />
          <br />
          <button onClick={() => handlePasswordReset()}>Forgot Password?</button>
          <br />
          <br />
          <br />
          <br />
          <p> OR </p>
          <br />
          <button className='signgooglepagebutton' onClick={handleSignIn}>Sign In with Google</button>
          <br />
        </div>
      )}
    </div>
  )
}


export default App;