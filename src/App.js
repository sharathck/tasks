import React, { useState, useEffect } from 'react';
import { FaPlus, FaCheck, FaTrash, FaEdit } from 'react-icons/fa';
import './App.css';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, deleteDoc } from 'firebase/firestore';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, limit } from 'firebase/firestore';
import { saveAs } from 'file-saver';
import * as docx from 'docx';
import { FaSignOutAlt, FaFileWord, FaFileAlt, FaCalendar,FaPlay } from 'react-icons/fa';
import * as speechsdk from 'microsoft-cognitiveservices-speech-sdk';

const speechKey = process.env.REACT_APP_AZURE_SPEECH_API_KEY;
const serviceRegion = 'eastus';
const voiceName = 'en-US-AvaNeural';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
var articles = '';

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
  const [showDeleteButtons, setShowDeleteButtons] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const tasksCollection = collection(db, 'tasks');
      const urlParams = new URLSearchParams(window.location.search);
      const limitParam = urlParams.get('limit');
      const limitValue = limitParam ? parseInt(limitParam) : 500;
      console.log('limit value: ', limitValue);
      const currentDate = new Date();
      const q = query(tasksCollection, where('userId', '==', user.uid), where('status', '==', false), where('dueDate', '<', currentDate), orderBy('dueDate', 'desc'), limit(limitValue));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const tasksData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        articles += tasksData.map((task) => task.task).join(' . ');
        setTasks(tasksData);
      });

      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    if (showCurrent) {
      handleShowCurrent();
      setShowCurrent(false);
    }
  }, [showCurrent]);

  useEffect(() => {
    if (showCompleted) {
      handleShowCompleted();
    }
  }, [showCompleted]);

  useEffect(() => {
    if (showFuture) {
      handleShowFuture();
    }
  }, [showFuture]);

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
      console.log('taskDesc: ', taskDesc);
      const taskParts = newTask.trim().split(' ');
      let recurrence = taskParts.pop().toLowerCase();
      recurrence = recurrence.toLowerCase();
      const dueDate = new Date();
      const trueRecurrences = ['daily', 'weekly', 'monthly', 'yearly'];
      if (!trueRecurrences.includes(recurrence)) {
        recurrence = 'ad-hoc';
      }
      else {
        taskDesc = taskParts.join(' ');
      }
      // if last three words of the newTask are like "weekly on monday" or "weekly on tuesday" or "weekly on wednesday" or "weekly on thursday" or "weekly on friday" or "weekly on saturday" or "weekly on sunday" then set dueDate to respective day of the week
      let newTaskDesc = taskDesc.split(' ');
      console.log('newTaskDesc: ', newTaskDesc);
      const dayOfWeek = newTaskDesc.pop().toLowerCase();
      console.log('dayOfWeek: ', dayOfWeek);
      const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      if (daysOfWeek.includes(dayOfWeek)) {
        console.log('inside if dayOfWeek: ', dayOfWeek);
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

      const dayAdd = taskDesc.split(' ').pop().toLowerCase();
      console.log('dayAdd: ', dayAdd);
      //if dayAdd is Number then add that number of days to the dueDate
      if (!isNaN(dayAdd)) {
        taskDesc = taskDesc.split(' ').slice(0, -1).join(' ');
        console.log('taskDesc: ', taskDesc);
        dueDate.setDate(dueDate.getDate() + parseInt(dayAdd));
        console.log('dueDate: ', dueDate);
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
      setShowCurrent(true);
    }
  };

  const handleToggleStatus = async (taskId, status, recurrence, dueDate) => {
    const taskDocRef = doc(db, 'tasks', taskId);
    const currentDate = new Date();
    let nextDueDate = new Date(dueDate);
    console.log('recurrence: ', recurrence);
    console.log('nextDueDate: ', nextDueDate);
    console.log('currentDate: ', currentDate);
    console.log('status: ', status);
    console.log('taskId: ', taskId);
    console.log('dueDate: ', dueDate);
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

      while (recurrence != 'ad-hoc' && nextDueDate < currentDate) {
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
      // if recurrence is not ad-hoc then update both dueDate and status, else update only dueDate
      await updateDoc(taskDocRef, {
        dueDate: nextDueDate,
      });
    }
    else {
      await updateDoc(taskDocRef, {
        status: !status,
      });
    };
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
  }

  const handleEditTask = (task) => {
    setEditTask(task);
    setEditTaskText(task.task);
    setEditRecurrence(task.recurrence);
    setEditDueDate(new Date(task.dueDate.toDate()).toISOString().substring(0, 10));
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

  const handleShowCurrent = () => {
    const tasksCollection = collection(db, 'tasks');
    const urlParams = new URLSearchParams(window.location.search);
    const limitParam = urlParams.get('limit');
    const limitValue = limitParam ? parseInt(limitParam) : 500;
    console.log('limit value: ', limitValue);
    const currentDate = new Date();
    const q = query(tasksCollection, where('userId', '==', user.uid), where('status', '==', false), where('dueDate', '<', currentDate), orderBy('dueDate', 'desc'), limit(limitValue));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTasks(tasksData);
    });
    return () => unsubscribe();
  };

  const handleShowCompleted = () => {
    const tasksCollection = collection(db, 'tasks');
    const urlParams = new URLSearchParams(window.location.search);
    const limitParam = urlParams.get('limit');
    const limitValue = limitParam ? parseInt(limitParam) : 100;
    const q = query(tasksCollection, where('userId', '==', user.uid), where('status', '==', true), orderBy('createdDate', 'desc'), limit(limitValue));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const completedTasksData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      articles += completedTasksData.map((task) => task.task).join(' . ');
      setCompletedTasks(completedTasksData);
    });

    return () => unsubscribe();
  };

  const handleShowFuture = () => {
    const tasksCollection = collection(db, 'tasks');
    const q = query(tasksCollection, where('userId', '==', user.uid), where('dueDate', '>', new Date()), orderBy('dueDate', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const futureTasksData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      articles += futureTasksData.map((task) => task.task).join(' . ');
      setFutureTasks(futureTasksData);
    });

    return () => unsubscribe();
  };

  return (
    <div className="app" style={{ fontSize: '24px' }}>
      <script src="https://code.responsivevoice.org/responsivevoice.js?key=dnuoQRXn"></script>
      {user ? (
        <div>
          <button className="signoutbutton" onClick={handleSignOut}>
            <FaSignOutAlt />
          </button>
          <button onClick={generateDocx}><FaFileWord /></button>
          <button className='textbutton' onClick={generateText}><FaFileAlt /></button>
          <button className={showCompleted ? 'button_selected' : 'button'} onClick={() => setShowCompleted(!showCompleted)}>
            <img src="done.png" style={{ width: '15px', height: '15px' }} />
          </button>
          <button className={showFuture ? 'button_selected' : 'button'} onClick={() => setShowFuture(!showFuture)}>
            <img src="future.png" style={{ width: '15px', height: '15px' }} />
          </button>
          <button className={showEditButtons ? 'button_selected' : 'button'} onClick={() => setShowEditButtons(!showEditButtons)}><FaEdit /></button>
          <button className={showDueDates ? 'button_selected' : 'button'} onClick={() => setShowDueDates(!showDueDates)}><FaCalendar /></button>
          {showEditButtons && <button className={showDeleteButtons ? 'button_delete_selected' : 'button'} onClick={() => setShowDeleteButtons(!showDeleteButtons)}><FaTrash /></button>}
          <button onClick={synthesizeSpeech}><img src="speak.png" style={{ width: '15px', height: '15px' }} /></button>
          {showEditButtons && <button onClick={speakContent}><FaPlay /></button>}
          <form onSubmit={handleAddTask}>
            <input
              className="addTask"
              type="text"
              placeholder=""
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              autoFocus
            />
            <button className="addbutton" type="submit">
              <FaPlus />
            </button>
          </form>
          <ul>
            {tasks
              .filter((task) => !task.status)
              .map((task) => (
                <li key={task.id} data-task-id={task.id} data-status={task.status}>
                  <>
                    <button className='markcompletebutton' onClick={() => handleToggleStatus(task.id, task.status, task.recurrence, task.dueDate.toDate().toLocaleDateString())}>
                      <FaCheck />
                    </button>
                    <span>
                      {task.task}
                      {task.recurrence !== 'ad-hoc' && (
                        <span style={{ color: 'grey' }}> ({task.recurrence.charAt(0).toUpperCase() + task.recurrence.slice(1)})</span>
                      )}
                      {showDueDates && (
                        <span style={{ color: 'orange' }}> - {task.dueDate.toDate().toLocaleDateString()}</span>
                      )}
                    </span>
                    {showEditButtons && (
                      <button className='editbutton' onClick={() => handleEditTask(task)}>
                        <FaEdit style={{ color: 'Green', backgroundColor: 'whitesmoke' }} />
                      </button>
                    )}
                  </>
                </li>
              ))}
          </ul>
          {showCompleted && (
            <div>
              <ul>
                {completedTasks
                  .filter((task) => task.status)
                  .map((task) => (
                    <li key={task.id} className="completed">
                      <button onClick={() => handleToggleStatus(task.id, task.status, task.recurrence, task.dueDate.toDate().toLocaleDateString())}>
                        <FaCheck />
                      </button>
                      {task.task} &nbsp;&nbsp;
                      {task.recurrence !== 'ad-hoc' && (
                        <span style={{ color: 'grey' }}> ({task.recurrence.charAt(0).toUpperCase() + task.recurrence.slice(1)})</span>
                      )}
                      &nbsp;
                      {showDueDates && (
                        <span style={{ color: 'orange' }}> - {task.dueDate.toDate().toLocaleDateString()}</span>
                      )}
                      {showDeleteButtons && (
                        <button onClick={() => handleDeleteTask(task.id, task.task)} className='button_delete_selected'>
                          <FaTrash />
                        </button>
                      )}
                    </li>
                  ))}
              </ul>
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
                      <span style={{ color: 'orange' }}> - {task.dueDate.toDate().toLocaleDateString()}</span>
                    )}
                    &nbsp;
                    {task.recurrence !== 'ad-hoc' && (
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
              <div style={{ marginBottom: '10px' }}></div>
            </div>
          )}
          {editTask && (
            <div >
              <form style={{ position: 'fixed', width: '60%', bottom: '30%', left: '50%', transform: 'translate(-50%, -50%)', border: '2px solid', backgroundColor: 'whitesmoke', boxShadow: '2px 4px 12px rgba(0, 0, 0, 0.15)', fontSize: '16px' }} onSubmit={(e) => { e.preventDefault(); handleSaveTask(); }}>
                <input style={{ width: '80%' }}
                  type="text"
                  value={editTaskText}
                  onChange={(e) => setEditTaskText(e.target.value)}
                />
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
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                />
                <br />
                <button type="submit">Save</button>
                <button onClick={() => setEditTask(null)}>Cancel</button>
              </form>
            </div>
          )}
        </div>
      ) : (
        <button onClick={handleSignIn}>Sign In with Google</button>
      )}
      <div style={{ marginBottom: '120px' }}></div>
    </div>
  );
}

export default App;