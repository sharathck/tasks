import React, { useState, useEffect } from "react";
import './Homework.css';
import { collection, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { auth, db } from './Firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { FaArrowLeft } from 'react-icons/fa';  // Add this import
import App from './App';  // Add this import

const initialProblems = [
    { category: 'Addition', question: 'What is 7 + 18?', answer: '', correctAnswer: '25' },
    { category: 'Addition', question: 'What is 14 + 89?', answer: '', correctAnswer: '103' },
    { category: 'Subtraction', question: 'What is 98 - 45?', answer: '', correctAnswer: '53' },
    { category: 'Multiplication', question: 'What is 7 * 8?', answer: '', correctAnswer: '56' }
];

const Homework = () => {
    const [problems, setProblems] = useState(initialProblems);
    const [user, setUser] = useState(null);
    const [showMainApp, setShowMainApp] = useState(false);  // Add this state

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                fetchHomework(currentUser.uid);
            }
        });
        return () => unsubscribe();
    }, []);

    const fetchHomework = async (userId) => {
        try {
            const homeworkCollection = collection(db, 'genai', userId, 'notes');
            const snapshot = await getDocs(homeworkCollection);
            const savedProblems = snapshot.docs
                .filter(doc => doc.data().type === 'homework')
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            
            if (savedProblems.length > 0) {
                setProblems(savedProblems);
            }
        } catch (error) {
            console.error("Error fetching homework:", error);
        }
    };

    const handleAnswerChange = async (index, value) => {
        const newProblems = [...problems];
        newProblems[index] = { ...newProblems[index], answer: value };
        setProblems(newProblems);

        try {
            if (!user) return;

            const problem = newProblems[index];
            const currentDateTime = new Date();

            if (problem.id) {
                // Update existing document
                const docRef = doc(db, 'genai', user.uid, 'notes', problem.id);
                await updateDoc(docRef, {
                    answer: value,
                    modifiedDateTime: currentDateTime
                });
            } else {
                // Create new document
                const homeworkCollection = collection(db, 'genai', user.uid, 'notes');
                const docRef = await addDoc(homeworkCollection, {
                    type: 'homework',
                    category: problem.category,
                    question: problem.question,
                    answer: value,
                    correctAnswer: problem.correctAnswer,
                    createdDateTime: currentDateTime,
                    modifiedDateTime: currentDateTime
                });
                newProblems[index].id = docRef.id;
                setProblems(newProblems);
            }
        } catch (error) {
            console.error("Error saving answer:", error);
        }
    };

    if (showMainApp) {  // Add this condition
        return (
            <App user={user} />
        );
    }

    return (
        <div className="homework-container">
            <button className='signoutbutton' onClick={() => setShowMainApp(!showMainApp)}>
                <FaArrowLeft />
            </button>
            <div className="homework-grid">
                <div className="grid-header">
                    <div className="question-col">Question</div>
                    <div className="answer-col">Your Answer</div>
                </div>
                {problems.map((problem, index) => (
                    <div key={index} className="grid-row">
                        <div className="question-col">{problem.question}</div>
                        <div className="answer-col">
                            <input
                                type="text"
                                value={problem.answer}
                                onChange={(e) => handleAnswerChange(index, e.target.value)}
                                placeholder="Enter answer"
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Homework;