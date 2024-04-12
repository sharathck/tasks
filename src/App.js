import React, { useState, useEffect } from 'react';
import { FaPlus, FaCheck, FaEye } from 'react-icons/fa';
import './App.css';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc } from 'firebase/firestore';

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

function App() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
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
      const todoCollection = collection(db, 'todo');
      const q = query(todoCollection, where('userId', '==', user.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const tasksData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTasks(tasksData);
      });

      return () => unsubscribe();
    }
  }, [user]);

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
      await addDoc(collection(db, 'todo'), {
        task: newTask,
        status: false,
        userId: user.uid,
        createtedDate: new Date(),
        uemail: user.email
      });
      setNewTask('');
    }
  };

  const handleUpdateTask = async (taskId, newTaskText) => {
    if (newTaskText.trim() !== '') {
      const taskDocRef = doc(db, 'todo', taskId);
      await updateDoc(taskDocRef, {
        task: newTaskText,
      });
    }
  };


  const handleToggleStatus = async (taskId, status) => {
    const taskDocRef = doc(db, 'todo', taskId);
    await updateDoc(taskDocRef, {
      status: !status,
    });
  };



  return (
    <div className="app">
      {user ? (
        <div>
          <p>Welcome, {user.displayName}!</p>
          <button onClick={handleSignOut}>Sign Out</button>
          <form onSubmit={handleAddTask}>
            <input
              type="text"
              placeholder="Enter a new task"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
            />
            <button type="submit">
              <FaPlus />
            </button>
          </form>
          <ul>
            {tasks
              .filter((task) => !task.status)
              .map((task) => (
                <li key={task.id}>
                  {editTask === task.id ? (
                    <form onSubmit={handleUpdateTask}>
                      <input
                        type="text"
                        value={editTaskText}
                        onChange={(e) => setEditTaskText(e.target.value)}
                      />
                      <button type="submit">
                        <FaCheck />
                      </button>
                    </form>
                  ) : (
                    <>
                      <span>{task.task}</span>
                      <button onClick={() => handleToggleStatus(task.id, task.status)}>
                        <FaCheck />
                      </button>
                    </>
                  )}
                </li>
              ))}
          </ul>
          <button onClick={() => setShowCompleted(!showCompleted)}>
            <FaEye /> {showCompleted ? 'Hide' : 'Show'} Completed Tasks
          </button>
          {showCompleted && (
            <div>
              <h2>Completed Tasks</h2>
              <ul>
                {tasks
                  .filter((task) => task.status)
                  .map((task) => (
                    <li key={task.id} className="completed">
                      {task.task}
                      <button onClick={() => handleToggleStatus(task.id, task.status)}>
                        <FaCheck />
                      </button>
                    </li>
                  ))}
              </ul>
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