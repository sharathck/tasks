import React, { useState, useEffect } from 'react';
import { FaPlus, FaCheck, FaEye } from 'react-icons/fa';
import './App.css';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, addDoc, doc, updateDoc } from 'firebase/firestore';
import { Readability } from '@mozilla/readability';
import { saveAs } from 'file-saver';
import * as docx from 'docx';

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
      const q = query(todoCollection, where('userId', '==', user.uid), orderBy('createdDate','desc'));
      
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
      let textresponse = '';
      if (newTask.substring(0, 4) == 'http') {
        const response = await fetch('https://corsproxy.io/?'+ encodeURIComponent(newTask));
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        // Initialize Readability with the document
        const reader = new Readability(doc);
        const article = reader.parse();
        try {
          textresponse = article.title + ' . ' + article.textContent;
        }
        catch (error) {
          textresponse = error + '   Could not parse url : ' + newTask;
        }
      }
      else {
        textresponse = newTask;
      }

      await addDoc(collection(db, 'todo'), {
        task: textresponse,
        status: false,
        userId: user.uid,
        createdDate: new Date(),
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
      const time = `${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}`;
      const dateTime = `${date}__${time}`;
      saveAs(blob, dateTime + "_" +  ".docx");
      console.log("Document created successfully");
    });  };


  return (
    <div className="app">
      {user ? (
        <div>
            {/* <p> {user.displayName}!</p> */}
          <button onClick={handleSignOut}>Sign Out</button>
          <button onClick={generateDocx}>Docx</button>
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