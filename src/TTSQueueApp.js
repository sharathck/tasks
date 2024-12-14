import React, { useState, useEffect } from 'react';
import { FaPlus, FaCheck, FaTrash, FaHeadphones, FaEdit, FaSignOutAlt, FaFileWord, FaFileAlt, FaCalendar, FaPlay, FaReadme, FaCheckDouble, FaClock, FaArrowLeft, FaVolumeUp } from 'react-icons/fa';
import './TTSQueueApp.css';
import { doc, deleteDoc, getDocs, startAfter, collection, query, where, orderBy, and, onSnapshot, addDoc, updateDoc, limit } from 'firebase/firestore';
import App from './App';
import { Readability } from '@mozilla/readability';
import { saveAs } from 'file-saver';
import * as docx from 'docx';
import * as speechsdk from 'microsoft-cognitiveservices-speech-sdk';
import { auth, db } from './Firebase';
import AudioApp from './AudioApp';
import VoiceSelect from './VoiceSelect';

const fireBaseTTSCollection = process.env.REACT_APP_FIREBASE_TTS_COLLECTION;
const speechKey = process.env.REACT_APP_AZURE_SPEECH_API_KEY;
const serviceRegion = 'eastus';
let articles = '';
let uid = '';
let isTriggeredFromMainApp = false;
let limitMax = 2;
if (process.env.REACT_APP_MAIN_APP == 'App') {
    isTriggeredFromMainApp = true;
    limitMax = 5;
}

function TTSQueueApp() {
    const [user, setUser] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [completedTasks, setCompletedTasks] = useState([]);
    const [newTask, setNewTask] = useState('');
    const [editTask, setEditTask] = useState(null);
    const [editTaskText, setEditTaskText] = useState('');
    const [showCompleted, setShowCompleted] = useState(false);
    const [readerMode, setReaderMode] = useState(false);
    const [lastVisible, setLastVisible] = useState(null);
    const [lastArticle, setLastArticle] = useState(null);
    const [answerData, setAnswerData] = useState('');
    const [isGeneratingTTS, setIsGeneratingTTS] = useState(false);
    const [showMainApp, setShowMainApp] = useState(false);
    const [showAudioApp, setShowAudioApp] = useState(false);
    const [voiceName, setVoiceName] = useState('en-US-Ava:DragonHDLatestNeural');
    const [limitActiveValue, setLimitActiveValue] = useState(limitMax);
    const [showLiveTTS, setShowLiveTTS] = useState(false);

    const isiPhone = /iPhone/i.test(navigator.userAgent);
    console.log(isiPhone);
    const todoCollection = collection(db, fireBaseTTSCollection)

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setUser(user);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (user) {
            uid = user.uid;
            const urlParams = new URLSearchParams(window.location.search);
            const limitParam = urlParams.get('limit');
            if (limitParam) {
                setLimitActiveValue(limitParam);
            }
            articles = '';
            //print limit value
            console.log('limit value: ', limitActiveValue);
            const q = query(todoCollection, where('userId', '==', user.uid), where('status', '==', false), orderBy('createdDate', 'desc'), limit(limitActiveValue));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const tasksData = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                articles += tasksData.map((task) => task.task).join(' ');
                setLastArticle(snapshot.docs[snapshot.docs.length - 1]); // Set last visible document
                setTasks(tasksData);
            });

            return () => unsubscribe();
        }
    }, [user, limitActiveValue]);


    useEffect(() => {
        if (showCompleted) {
            const tasksCollection = collection(db, fireBaseTTSCollection);
            const urlParams = new URLSearchParams(window.location.search);
            const limitParam = urlParams.get('limit');
            const limitValue = limitParam ? parseInt(limitParam) : 6;
            const q = query(tasksCollection, where('userId', '==', user.uid), where('status', '==', true), orderBy('createdDate', 'desc'), limit(limitValue));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const tasksData = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
                setCompletedTasks(tasksData);
            });
            return () => unsubscribe();
        }
    }, [showCompleted]);

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

    const generateTTS = () => {
        //   setReaderMode(true);
        //log the exact date and time
        const cleanedArticles = articles
        .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
        .replace(/http?:\/\/[^\s]+/g, '') // Remove URLs
        .replace(/[^a-zA-Z0-9\s]/g, ' ') // Remove special characters
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
          callTTSAPI(cleanedArticles, process.env.REACT_APP_TTS_API_URL);
        }
        else {
          callTTSAPI(cleanedArticles, 'https://us-central1-reviewtext-ad5c6.cloudfunctions.net/function-18');
        }
      };

    const synthesizeSpeech = async () => {
        const speechConfig = speechsdk.SpeechConfig.fromSubscription(speechKey, serviceRegion);
        speechConfig.speechSynthesisVoiceName = voiceName;

        const audioConfig = speechsdk.AudioConfig.fromDefaultSpeakerOutput();
        const speechSynthesizer = new speechsdk.SpeechSynthesizer(speechConfig, audioConfig);
        const cleanedArticles = articles
            .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
            .replace(/http?:\/\/[^\s]+/g, '') // Remove URLs
            .replace(/[^a-zA-Z0-9\s]/g, ' ') // Remove special characters
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .trim(); // Remove leading/trailing spaces
        
        const chunks = splitMessage(cleanedArticles);
        for (const chunk of chunks) {
            try {
                const result = await speechSynthesizer.speakTextAsync(chunk);
                if (result.reason === speechsdk.ResultReason.SynthesizingAudioCompleted) {
                    console.log(`Speech synthesized to speaker for text: [${chunk}]`);
                } else if (result.reason === speechsdk.ResultReason.Canceled) {
                    const cancellationDetails = speechsdk.SpeechSynthesisCancellationDetails.fromResult(result);
                    console.error(`Speech synthesis canceled: ${cancellationDetails.reason}`);
                    if (cancellationDetails.reason === speechsdk.CancellationReason.Error) {
                        console.error(`Error details: ${cancellationDetails.errorDetails}`);
                    }
                }
            } catch (error) {
                console.error(`Error synthesizing speech: ${error}`);
            }
        }
    };

    const handleAddTask = async (e) => {
        e.preventDefault();
        if (newTask.trim() !== '') {
            let textresponse = '';
            if (newTask.substring(0, 4) == 'http') {
                const urlWithoutProtocol = newTask.replace(/^https?:\/\//, '');
                const response = await fetch('https://us-central1-reviewtext-ad5c6.cloudfunctions.net/function-9?url=' + newTask);
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

            await addDoc(collection(db, fireBaseTTSCollection), {
                task: textresponse,
                status: false,
                userId: user.uid,
                createdDate: new Date(),
                uemail: user.email
            });
            articles = textresponse + " " + articles;
            setNewTask('');
        }
    };

    const handleUpdateTask = async (taskId, newTaskText) => {
        if (newTaskText.trim() !== '') {
            const taskDocRef = doc(db, fireBaseTTSCollection, taskId);
            await updateDoc(taskDocRef, {
                task: newTaskText,
            });
        }
    };


    const handleToggleStatus = async (taskId, status) => {
        const taskDocRef = doc(db, fireBaseTTSCollection, taskId);
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
            saveAs(blob, dateTime + "_" + ".docx");
            console.log("Document created successfully");
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

    const handleReaderMode = () => {
        setReaderMode(true);
    };

    const handleBack = () => {
        setReaderMode(false);
    };

    const fetchMoreData = async () => {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const limitParam = urlParams.get('limit');
            const limitValue = limitParam ? parseInt(limitParam) : 21;
            const tasksCollection = collection(db, fireBaseTTSCollection);

            if (lastVisible) {
                const q = query(tasksCollection, where('userId', '==', user.uid), where('status', '==', true), orderBy('createdDate', 'desc'), startAfter(lastVisible), limit(limitValue));
                const tasksSnapshot = await getDocs(q);
                const tasksList = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setCompletedTasks(prevData => [...prevData, ...tasksList]);
                setLastVisible(tasksSnapshot.docs[tasksSnapshot.docs.length - 1]);
            }
            else {
                alert('No more data to fetch');
            }
        } catch (error) {
            console.error("Error fetching more data: ", error);
        }
    };

    const handleDeleteTask = async (taskId, taskText) => {
        const confirmation = window.confirm(`Are you sure you want to delete this task: ${taskText.substring(0, 30)}...?`);
        if (confirmation) {
            await deleteDoc(doc(db, fireBaseTTSCollection, taskId));
        }
    };

    // Function to call the TTS API
    const callTTSAPI = async (message, appUrl) => {
        let now = new Date();
        console.log('Calling TTS API with appUrl:', appUrl, 'voiceName:', voiceName);
        console.log('before callTTS' + `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`);
        setIsGeneratingTTS(true); // Set generating state
        message = message.replace(/<[^>]*>?/gm, ''); // Remove HTML tags
        message = message.replace(/&nbsp;/g, ' '); // Replace &nbsp; with space
        // replace -,*,#,_,`,~,=,^,>,< with empty string
        message = message.replace(/[-*#_`~=^><]/g, ''); // Ensure global replacement

        console.log('Calling TTS API with message:', message);

        try {
            console.log('Inside try Calling TTS API with appUrl:', appUrl);
            const response = await fetch(appUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: message, uid: uid })
            });

            if (!response.ok) {
                throw new Error([`Network response was not ok: ${response.statusText}`]);
            }
        } catch (error) {
            console.error('Error calling TTS API:', error);
            setIsGeneratingTTS(false);
        } finally {
            // Fetch the Firebase document data
            const markItems = query(todoCollection, where('userId', '==', user.uid), where('status', '==', false), orderBy('createdDate', 'desc'), limit(limitActiveValue));
            const tasksSnapshot = await getDocs(markItems);
            for (const doc of tasksSnapshot.docs) {
                console.log('doc:', doc.data());
                await updateDoc(doc.ref, { status: true });
            }

            if (!isTriggeredFromMainApp) {
                const genaiCollection = collection(db, 'genai', uid, 'MyGenAI');
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
            }
            else {
                setShowAudioApp(true);
            }
            setIsGeneratingTTS(false); // Reset generating state
            // now = new Date();
            // console.log('after callTTS' + `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`);

        }
    };

    const fetchMoreArticles = async () => {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const limitParam = urlParams.get('limit');
            const limitValue = limitParam ? parseInt(limitParam) : 6;
            const tasksCollection = collection(db, fireBaseTTSCollection);
            if (lastArticle) {
                const q = query(tasksCollection, where('userId', '==', user.uid), where('status', '==', false), orderBy('createdDate', 'desc'), startAfter(lastArticle), limit(limitValue));
                const tasksSnapshot = await getDocs(q);
                const tasksList = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setTasks(prevData => [...prevData, ...tasksList]);
                setLastArticle(tasksSnapshot.docs[tasksSnapshot.docs.length - 1]);
            }
            else {
                alert('No more data to fetch');
            }
        } catch (error) {
            console.error("Error fetching more data: ", error);
        }
    };
    if (showMainApp) {
        return (
            <App user={user} />
        );
    }

    if (showAudioApp) {
        return (
            <AudioApp user={user} />
        );
    }

    return (
        <div>
            <div className="app" style={{ marginBottom: '120px', fontSize: '24px' }}>
                {readerMode ? (
                    <div>
                        <button className="tts-button" onClick={handleBack}><FaArrowLeft /></button>
                        <p>{articles}</p>
                    </div>
                ) : (
                    <div>
                        {isTriggeredFromMainApp && <button className={showMainApp ? 'tts-button_selected' : 'tts-button'} onClick={() => setShowMainApp(!showMainApp)}>
                            <FaArrowLeft />
                        </button>
                        }
                        &nbsp;
                        <input
                            onChange={(e) => {
                                if (parseInt(e.target.value) > 0) { setLimitActiveValue(parseInt(e.target.value)); }
                                else { setLimitActiveValue(1); }
                            }}
                            style={{ width: '30px', height: '25px', fontSize: '18px' }}
                            min="0"
                            placeholder={limitActiveValue}
                            max="99"
                        />
                        {isTriggeredFromMainApp && <button className={showAudioApp ? 'button_selected' : 'tts-button'} onClick={() => setShowAudioApp(!showAudioApp)}>
                            <FaPlay />
                        </button>
                        }
                        &nbsp;
                        <button className={showCompleted ? 'tts-button_selected' : 'tts-button'} onClick={() => setShowCompleted(!showCompleted)}>
                            <FaCheckDouble />
                        </button>
                        <button className='tts-button' onClick={generateDocx}><FaFileWord /></button>
                        <button className='tts-button' onClick={generateText}><FaFileAlt /></button>
                        <button className={isGeneratingTTS ? 'button_selected' : 'tts-button'} onClick={generateTTS}><FaHeadphones /></button>
                        {!isiPhone && <button className={showLiveTTS ? 'button_selected' : 'tts-button'} onClick={synthesizeSpeech}><FaVolumeUp /></button>}
                        <button className='tts-button' onClick={handleReaderMode}><FaReadme /></button>
                        <button className="tts-button" onClick={handleSignOut}>
                            <FaSignOutAlt />
                        </button>
                        <br />
                        <br />
                        <span style={{ textAlign: 'center', color: 'blue', fontWeight: 'bold', fontSize: '18px' }}>IMPORTANT  </span> &nbsp;
                        <VoiceSelect
                            selectedVoice={voiceName} // Current selected voice
                            onVoiceChange={setVoiceName} // Handler to update selected voice
                        />
                        {isGeneratingTTS && <div> <br /> <p>Generating audio...</p> </div>}
                        {answerData && (
                            <div>
                                <br />
                                <a href={answerData} target="_blank" rel="noopener noreferrer">Play/Download</a>
                            </div>
                        )}
                        {!showCompleted && (
                            <div>

                                <form onSubmit={handleAddTask}>
                                    <input
                                        className="tts-addTask"
                                        type="text"
                                        placeholder=""
                                        value={newTask}
                                        onChange={(e) => setNewTask(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Shift') { handleAddTask(e); } }}
                                        autoFocus
                                    />
                                    <button className="tts-addbutton" type="submit">
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
                                                        <button className='tts-markcompletebutton' onClick={() => handleToggleStatus(task.id, task.status)}>
                                                            <FaCheck />
                                                        </button>
                                                        <span>{task.task}</span>
                                                    </>
                                                )}
                                            </li>
                                        ))}
                                </ul>
                                <button className="tts-button" onClick={fetchMoreArticles}>Show More</button>
                            </div>
                        )}
                        {showCompleted && (
                            <div>
                                <ul>
                                    {completedTasks
                                        .filter((task) => task.status)
                                        .map((task) => (
                                            <li key={task.id} className="completed">
                                                <button onClick={() => handleToggleStatus(task.id, task.status)}>
                                                    <FaCheck />
                                                </button>
                                                {task.task.substring(0, 88)}
                                                <button onClick={() => handleDeleteTask(task.id, task.task)} className='tts-button_delete_selected'>
                                                    <FaTrash />
                                                </button>
                                            </li>
                                        ))}
                                </ul>
                                <button className="button" onClick={fetchMoreData}>Show More</button>
                                <div style={{ marginBottom: '110px' }}></div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default TTSQueueApp;