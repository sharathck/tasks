import React, { useState, useEffect } from 'react';
import { FaPlus, FaCheck, FaEye } from 'react-icons/fa';
import './App.css';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, addDoc, doc, updateDoc, limit } from 'firebase/firestore';
import { saveAs } from 'file-saver';
import * as docx from 'docx';
import { FaSignOutAlt, FaFileWord, FaFileAlt } from 'react-icons/fa';
import { useSwipeable } from 'react-swipeable';

const firebaseConfig = {
  apiKey: "AIzaSyBNeonGTfBV2QhXxkufPueC-gQLCrcsB08",
  authDomain: "reviewtext-ad5c6.firebaseapp.com",
  databaseURL: "https://reviewtext-ad5c6.firebaseio.com",
  projectId: "reviewtext-ad5c6",
  storageBucket: "reviewtext-ad5c6.appspot.com",
  messagingSenderId: "892085575649",
  appId: "1:892085575649:web:b57abe0e1438f10dc6fca0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
var articles = '';

function App() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [editTask, setEditTask] = useState(null);
  const [editTaskText, setEditTaskText] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);

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
      const limitValue = limitParam ? parseInt(limitParam) : 6;
      //print limit value
      console.log('limit value: ', limitValue);
      const q = query(tasksCollection, where('userId', '==', user.uid), where('status', '==', false), orderBy('createdDate', 'desc'), limit(limitValue));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const tasksData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        articles += tasksData.map((task) => task.task).join(' ');
        setTasks(tasksData);
      });

      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const tasksCollection = collection(db, 'tasks');
      const urlParams = new URLSearchParams(window.location.search);
      const limitParam = urlParams.get('limit');
      const limitValue = limitParam ? parseInt(limitParam) : 6;
      //print limit value
      console.log('limit value: ', limitValue);
      const q = query(tasksCollection, where('userId', '==', user.uid), where('status', '==', true), orderBy('createdDate', 'desc'), limit(limitValue));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const completedTasksData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCompletedTasks(completedTasksData);
      });

      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    if (showCompleted) {
      handleShowCompleted();
    }
  }, [showCompleted]);

  const handleSignIn = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider);
  };

  const handleSignOut = () => {
    auth.signOut();
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (newTask.trim() !== '') {
      const taskParts = newTask.trim().split(' ');
      let recurrence = taskParts.pop().toLowerCase();
      // cover recurrence field to lowercase and default it to ad-hoc if not daily, weekly, monthly, yearly
      recurrence = recurrence.toLowerCase();
      const trueRecurrences = ['daily', 'weekly', 'monthly', 'yearly'];
      if (!trueRecurrences.includes(recurrence)) {
        recurrence = 'ad-hoc';
      }

        await addDoc(collection(db, 'tasks'), {
          task: newTask,
          recurrence: recurrence,
          status: false,
          userId: user.uid,
          createdDate: new Date(),
          dueDate: new Date(),
          uemail: user.email
        });
        setNewTask('');

    }
  };

  const handleUpdateTask = async (taskId, newTaskText) => {
    if (newTaskText.trim() !== '') {
      const taskDocRef = doc(db, 'tasks', taskId);
      await updateDoc(taskDocRef, {
        task: newTaskText,
      });
    }
  };

  const handleToggleStatus = async (taskId, status, recurrence, dueDate) => {
    const taskDocRef = doc(db, 'tasks', taskId);
    const currentDate = new Date();
    let nextDueDate = new Date(dueDate);

    if (!status) {
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

      // Loop through the recurrence frequency to set the next due date correctly if it's in the past.
      while (nextDueDate < currentDate) {
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
        status: !status,
        dueDate: nextDueDate,
      });
    } else {
      await updateDoc(taskDocRef, {
        status: !status,
      });
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
      console.log(blob);
      const now = new Date();
      const date = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
      const time = `${now.getHours()}-${now.getMinutes()}}-${now.getSeconds()}`;
      const dateTime = `${date}__${time}`;
      saveAs(blob, dateTime + "_" + ".docx");
      console.log("Document created successfully");
    });
  };

  const generateText = async () => {
    const blob = new Blob([articles], { type: "text/plain;charset=utf-8" });
    const now = new Date();
    const date = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    const time = `${now.getHours()}-${now.getMinutes()}}-${now.getSeconds()}`;
    const dateTime = `${date}__${time}`;
    saveAs(blob, dateTime + ".txt");
  }
  
  const handleShowCompleted = () => {
    const tasksCollection = collection(db, 'tasks');
    const urlParams = new URLSearchParams(window.location.search);
    const limitParam = urlParams.get('limit');
    const limitValue = limitParam ? parseInt(limitParam) : 6;
    const q = query(tasksCollection, where('userId', '==', user.uid), where('status', '==', true), orderBy('createdDate', 'desc'), limit(limitValue));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const completedTasksData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCompletedTasks(completedTasksData);
    });

    return () => unsubscribe();
  };

  const handlers = useSwipeable({
    onSwipedRight: (eventData) => handleToggleStatus(eventData.event.target.dataset.taskId, eventData.event.target.dataset.status),
    preventDefaultTouchmoveEvent: true,
    trackMouse: true
  });

  return (
    <div className="app" style={{ fontSize: '24px' }}>
      {user ? (
        <div>
          <button className="signoutbutton" onClick={handleSignOut}>
            <FaSignOutAlt />
          </button>
          <button onClick={generateDocx}><FaFileWord /></button>
          <button className='textbutton' onClick={generateText}><FaFileAlt /></button>
          <form onSubmit={handleAddTask}>
            <input
              className="inputtextbox"
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
                <li key={task.id} {...handlers} data-task-id={task.id} data-status={task.status}>
                  {editTask === task.id ? (
                    <form onSubmit={handleUpdateTask}>
                      <input
                        type="text"
                        value={editTaskText}
                        onChange={(e) => setEditTaskText(e.target.value)}
                      />
                      <button type="submit" {...handlers}>
                        <FaCheck />
                      </button>
                    </form>
                  ) : (
                    <>
                      <button className='markcompletebutton' onClick={() => handleToggleStatus(task.id, task.status, task.recurrence, task.dueDate.toDate())}>
                        <FaCheck />
                      </button>
                      <span {...handlers}>
                        {task.task}
                        {task.recurrence && (
                          <span className="recurrence"> ({task.recurrence.charAt(0).toUpperCase() + task.recurrence.slice(1)})</span>
                        )}
                      </span>
                    </>
                  )}
                </li>
              ))}
          </ul>
          <button className='showcompletedbutton' onClick={() => setShowCompleted(!showCompleted)}>
            <FaEye /> {showCompleted ? 'Hide' : 'Show'} Completed Tasks
          </button>
          {showCompleted && (
            <div>
              <h2>Completed Tasks</h2>
              <ul>
                {completedTasks
                  .filter((task) => task.status)
                  .map((task) => (
                    <li key={task.id} className="completed">
                      <button onClick={() => handleToggleStatus(task.id, task.status)}>
                        <FaCheck />
                      </button>
                      {task.task}
                    </li>
                  ))}
              </ul>
              <div style={{ marginBottom: '110px' }}></div>
            </div>
          )}
        </div>
      ) : (
        <button onClick={handleSignIn}>Sign In with Google</button>
      )}
    </div>
  );
}

export default App;