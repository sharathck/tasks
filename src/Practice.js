import React, { useState, useEffect } from "react";
import './Practice.css';
import { collection, getDocs, addDoc, updateDoc, doc, writeBatch, query, where, getDoc } from 'firebase/firestore';
import { auth, db } from './Firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { FaArrowLeft } from 'react-icons/fa';
import GenAIApp from './GenAIApp';

const Practice = ({sourceDocumentID}) => {
    // Convert markdown content to JSON
    const [problems, setProblems] = useState([]);
    const [showMainApp, setShowMainApp] = useState(false);
    const [showAnswers, setShowAnswers] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [showPinModal, setShowPinModal] = useState(false);
    const [sourceDocID, setSourceDocID] = useState(sourceDocumentID);
    const [showMainAppButton, setShowMainAppButton] = useState(false);
    const CORRECT_PIN = '463859';

    const fetchInitialQuestions = async () => {
        try {
            const homeworkCollection = collection(db, 'homework');
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

    const handleSourceDocIDChange = async (event) => {
        const newSourceDocID = event.target.value;
        setSourceDocID(newSourceDocID);
        if (event.type === 'blur' || event.key === 'Enter') {
            await loadQuestions(newSourceDocID);
        }
    };

    const loadQuestions = async () => {
        if (!sourceDocID) {
            return;
        }

      await fetchInitialQuestions();

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
        console.log('Source Document ID:', sourceDocumentID);
        loadQuestions();
    }, [sourceDocumentID]);

    const handleAnswerChange = async (index, value) => {
        try {
            const problem = problems[index];
            const currentDateTime = new Date();

            // Update local state
            const newProblems = [...problems];
            newProblems[index] = { ...problem, userAnswer: value };
            setProblems(newProblems);

            // Update Firestore
            const docRef = doc(db, 'homework', problem.id);
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
        return <GenAIApp />;
    }

    return (
        <div className="homework-container">
            <div className="homework-header">
                {showMainAppButton && (
                    <button className='signoutbutton' onClick={() => setShowMainApp(!showMainApp)}>
                        <FaArrowLeft />
                    </button>
                )}
                   <button
                        className="button"
                        onClick={() => {
                            const printWindow = window.open('', '', 'height=500,width=800');
                            printWindow.document.write('<html><head><title>Homework</title>');
                            printWindow.document.write('<style>');
                            printWindow.document.write(`
                                body { font-family: Arial, sans-serif; margin: 20px; }
                                .grid { width: 100%; border-collapse: collapse; }
                                .grid th, .grid td { 
                                    border: 1px solid #ccc;
                                    padding: 8px;
                                    text-align: left;
                                }
                                .grid th { background-color: #f2f2f2; }
                            `);
                            printWindow.document.write('</style></head><body>');

                            let tableHtml = '<table class="grid"><tr><th>Question</th>';
                            if (showAnswers) {
                                tableHtml += '<th>Correct Answer</th>';
                            }
                            tableHtml += '<th>Student Answer</th></tr>';

                            problems.forEach(problem => {
                                tableHtml += `<tr><td>${problem.question}</td>`;
                                if (showAnswers) {
                                    tableHtml += `<td>${problem.correctAnswer}</td>`;
                                }
                                tableHtml += `<td>${problem.userAnswer}</td></tr>`;
                            });
                            tableHtml += '</table>';

                            printWindow.document.write(tableHtml);
                            printWindow.document.write('</body></html>');
                            printWindow.document.close();
                            printWindow.print();
                        }}
                    >
                        Print Grid
                    </button>
                    <button
                        className='show-answers-button'
                        onClick={handleShowAnswers}
                    >
                        {showAnswers ? 'Hide Answers' : 'Show Answers'}
                    </button>
            </div>
            <div className="homework-grid">
                <div className="grid-header">
                    <div className="question-col">Question</div>
                    {showAnswers && <div className="answer-col">Correct Answer</div>}
                    <div className="user-answer-col">Your Answer</div>
                </div>
                {problems.map((problem, index) => (
                    <div key={index} className="grid-row">
                        <div className="question-col">{problem.question}</div>
                        {showAnswers &&
                            <div className="answer-col correct-answer">{problem.correctAnswer}</div>}
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
        </div>
    );
};

export default Practice;