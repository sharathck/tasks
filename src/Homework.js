import React, { useState, useEffect } from "react";
import './Homework.css';
import { collection, getDocs, addDoc, updateDoc, doc, writeBatch, query, where, getDoc } from 'firebase/firestore';
import { auth, db } from './Firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { FaArrowLeft } from 'react-icons/fa';
import GenAIApp from './GenAIApp';

const Homework = ({sourceDocumentID}) => {
    // Convert markdown content to JSON
    const [problems, setProblems] = useState([]);
    const [user, setUser] = useState(null);
    const [showMainApp, setShowMainApp] = useState(false);
    const [showAnswers, setShowAnswers] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [showPinModal, setShowPinModal] = useState(false);
    const [sourceDocID, setSourceDocID] = useState(sourceDocumentID);
    const [showMainAppButton, setShowMainAppButton] = useState(false);
    const CORRECT_PIN = '789251';

    const initializeHomeworkData = async (firestoreData, userId) => {
        try {
            const homeworkCollection = collection(db, 'genai', userId, 'homework');
            const q = query(homeworkCollection, where('sourceDocumentID', '==', sourceDocID));

            // First check if data already exists
            const snapshot = await getDocs(q);
            if (snapshot.docs.length > 2) {
                console.log('Existing homework data found. Skipping initialization');
                return;
            }

            // Parse the questions from Firestore data
            let questions = [];
            try {
                // Try parsing if it's a JSON string
                if (typeof firestoreData === 'string') {
                    const jsonData = JSON.parse(firestoreData);
                    questions = Array.isArray(jsonData) ? jsonData : jsonData.questions || [];
                } else if (firestoreData.questions) {
                    // If it's already an object with questions
                    questions = firestoreData.questions;
                } else if (Array.isArray(firestoreData)) {
                    // If it's already an array
                    questions = firestoreData;
                }
            } catch (parseError) {
                console.error("Error parsing questions data:", parseError);
                return;
            }

            if (!questions.length) {
                console.error("No valid questions found in data");
                return;
            }
            // Add questions to homework collection
            const currentDateTime = new Date();
            const batch = writeBatch(db);
            questions.forEach((question) => {
                const docRef = doc(homeworkCollection);
                batch.set(docRef, {
                    question: question.Question || question.question,
                    correctAnswer: question.Answer || question.answer || question.correctAnswer,
                    userAnswer: '',
                    createdDateTime: currentDateTime,
                    modifiedDateTime: currentDateTime,
                    sourceDocumentID: sourceDocID,
                    sourceDocumentIDCreatedDateTime: currentDateTime
                });
            });
            await batch.commit();
            console.log('Personal Homework data initialized successfully');
            const sharedHomeworkCollection = collection(db, 'homework');
            const sharedbatch = writeBatch(db);
            questions.forEach((question) => {
                const docRef = doc(sharedHomeworkCollection);
                sharedbatch.set(docRef, {
                    question: question.Question || question.question,
                    correctAnswer: question.Answer || question.answer || question.correctAnswer,
                    userAnswer: '',
                    createdDateTime: currentDateTime,
                    modifiedDateTime: currentDateTime,
                    sourceDocumentID: sourceDocID,
                    sourceDocumentIDCreatedDateTime: currentDateTime
                });
            });
            await sharedbatch.commit();
            console.log('Shared Homework data initialized successfully');
        } catch (error) {
            console.error("Error initializing homework data:", error);
            console.log("Firestore Data received:", firestoreData);
        }
    };

    const fetchInitialQuestions = async (userId) => {
        try {
            const homeworkCollection = collection(db, 'genai', userId, 'homework');
            const q = query(homeworkCollection, where('sourceDocumentID', '==', sourceDocID));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const fetchedProblems = snapshot.docs.map(doc => ({
                    id: doc.id,
                    question: doc.data().question,
                    correctAnswer: doc.data().correctAnswer,
                    userAnswer: doc.data().userAnswer || '',
                }));
                setProblems(fetchedProblems);
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error fetching initial questions:", error);
            return false;
        }
    };

    const fetchQuestionsFromFirestore = async (userId) => {
        try {
            const docRef = doc(db, 'genai', user.uid, 'MyGenAI', sourceDocID);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data().answer;
                console.log('First fetched data from Firestore:', data);
                return data;
            }
            return null;
        } catch (error) {
            console.error("Error fetching questions from Firestore:", error);
            return null;
        }
    };

    const handleSourceDocIDChange = async (event) => {
        const newSourceDocID = event.target.value;
        setSourceDocID(newSourceDocID);
        if (event.type === 'blur' || event.key === 'Enter') {
            await loadQuestions(newSourceDocID);
        }
    };

    const loadQuestions = async () => {
        if (!user?.uid) return;

        if (!sourceDocID) {
            return;
        }

        // Try to fetch existing questions first
        const existingQuestions = await fetchInitialQuestions(user.uid);

        if (!existingQuestions) {
            // If no existing questions, try to fetch from Firestore
            console.log('No existing questions found. Fetching from Firestore...');
            const firestoreQuestions = await fetchQuestionsFromFirestore(user.uid);
            if (firestoreQuestions) {
                console.log('Inside fetched questions from Firestore:', firestoreQuestions);
                // Initialize homework with Firestore questions
                const cleanContent = firestoreQuestions.replace(/\r/g, '').trim();
                let jsonContent = '';
                if (cleanContent.startsWith('[')) {
                    jsonContent = cleanContent.trim();
                }
                else {
                    // Extract content between ```json and ``` markers
                    const jsonMatch = cleanContent.match(/```(?:json|JSON)\s*([\s\S]*?)\s*```/);

                    // Clean and parse the JSON content
                    jsonContent = jsonMatch[1].trim();
                }

                const questionsJson = JSON.parse(jsonContent);
                console.log("Parsed JSON:", questionsJson); // Debug log
                await initializeHomeworkData(questionsJson, user.uid);
                await fetchInitialQuestions(user.uid);
            }
        }
    };
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const homeworkParam = urlParams.get('h');
        if (homeworkParam && homeworkParam.length > 5) {
            setShowMainAppButton(false);
        }
        else {
            setShowMainAppButton(true);
        }
        loadQuestions();
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, [user]);

    const handleAnswerChange = async (index, value) => {
        try {
            if (!user) return;

            const problem = problems[index];
            const currentDateTime = new Date();

            // Update local state
            const newProblems = [...problems];
            newProblems[index] = { ...problem, userAnswer: value };
            setProblems(newProblems);

            // Update Firestore
            const docRef = doc(db, 'genai', user.uid, 'homework', problem.id);
            await updateDoc(docRef, {
                userAnswer: value,
                modifiedDateTime: currentDateTime
            });

        } catch (error) {
            console.error("Error updating answer:", error);
        }
    };

    const handlePinSubmit = () => {
        if (pinInput === CORRECT_PIN) {
            setShowAnswers(true);
            setShowPinModal(false);
            setPinInput('');
        } else {
            alert('Incorrect PIN');
            setPinInput('');
        }
    };

    const handleShowAnswers = () => {
        if (!showAnswers) {
            setShowPinModal(true);
        } else {
            setShowAnswers(false);
        }
    };

    if (showMainApp) {
        return <GenAIApp user={user} />;
    }

    return (
        <div className="homework-container">
            <div className="homework-header">
                {showMainAppButton && (
                    <button className='signoutbutton' onClick={() => setShowMainApp(!showMainApp)}>
                        <FaArrowLeft />
                    </button>
                )}
                <div className="source-doc-container">
                    <input
                        type="text"
                        className="source-doc-input"
                        value={sourceDocID}
                        onChange={(e) => setSourceDocID(e.target.value)}
                        onBlur={handleSourceDocIDChange}
                        onKeyPress={(e) => e.key === 'Enter' && handleSourceDocIDChange(e)}
                        placeholder="Enter Source Document ID"
                    />
                    <button
                        className="fetch-button"
                        onClick={() => loadQuestions(sourceDocID)}
                    >
                        Fetch Questions
                    </button>
                    <button 
                            className="button"
                            onClick={() => {
                                const baseUrl = window.location.href.split('?')[0];
                                const newUrl = `${baseUrl}?h=${sourceDocID}`;
                                navigator.clipboard.writeText(newUrl)
                                    .then(() => {
                                        alert('URL copied to clipboard!');
                                    })
                                    .catch(err => {
                                        console.error('Failed to copy URL:', err);
                                        alert('Failed to copy URL');
                                    });
                            }}
                        >
                            Copy URL
                        </button>
                </div>
                <button
                    className='show-answers-button'
                    onClick={handleShowAnswers}
                >
                    {showAnswers ? 'Hide Answers' : 'Show Answers'}
                </button>
            </div>

            {showPinModal && (
                <div className="pin-modal">
                    <div className="pin-modal-content">
                        <h3>Enter PIN to view answers</h3>
                        <input
                            type="password"
                            value={pinInput}
                            onChange={(e) => setPinInput(e.target.value)}
                            placeholder="Enter PIN"
                        />
                        <button onClick={handlePinSubmit}>Submit</button>
                        <button onClick={() => setShowPinModal(false)}>Cancel</button>
                    </div>
                </div>
            )}

            <div className="homework-grid">
                <div className="grid-header">
                    <div className="question-col">Question</div>
                    {showAnswers && <div className="answer-col">Correct Answer</div>}
                    <div className="user-answer-col">Your Answer</div>
                </div>
                {problems.map((problem, index) => (
                    <div key={index} className="grid-row">
                        <div className="question-col">{problem.question}</div>
                        {showAnswers && problem.userAnswer && 
                            <div className="answer-col">{problem.correctAnswer}</div>}
                        <div className="user-answer-col">
                            <input
                                type="text"
                                value={problem.userAnswer}
                                onChange={(e) => handleAnswerChange(index, e.target.value)}
                                placeholder="Enter your answer"
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Homework;