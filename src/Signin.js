import GenAIApp from './GenAIApp';
import TTSQueueApp from './TTSQueueApp';
import App from './App';
import AudioApp from './AudioApp';
import './Signin.css';
import React, { useEffect, useState, useRef } from 'react';
import { FaSignOutAlt, FaBackward, FaArrowLeft, FaAlignJustify } from 'react-icons/fa';
import { auth, db } from './Firebase';
import Practice from './Practice';
import SignUp from './SignUp';

import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendEmailVerification,
    onAuthStateChanged,
    signOut,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail
} from 'firebase/auth';

function SigninApp() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [uid, setUid] = useState(null);
    const [genaiData, setGenaiData] = useState([]);
    const [currentFileUrl, setCurrentFileUrl] = useState('');
    const [isPlaying, setIsPlaying] = useState(false);
    const [selectedFileIndex, setSelectedFileIndex] = useState(null);
    const playerRef = useRef(null);
    const [user, setUser] = useState(null);
    const [showMainApp, setShowMainApp] = useState(false);
    const [showTTSQueueApp, setShowTTSQueueApp] = useState(false);
    const [showSignUp, setShowSignUp] = useState(false);
    const MainApp = process.env.REACT_APP_MAIN_APP;

    // Listen for authentication state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                console.log('Signin component User is signed in:', currentUser.uid);
            }
        });
        return () => unsubscribe();
    }, []);

    const handleSignInWithEmail = async () => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            if (!user.emailVerified) {
                await auth.signOut();
                alert('Please verify your email before signing in.');
            }
        } catch (error) {
            alert('Error signing in. ' + error.message);
            console.error('Error signing in:', error);
        }
    };

    const handleSignUpWithEmail = async () => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await sendEmailVerification(auth.currentUser);
            alert('Verification email sent! Please check your inbox.');
            if (!userCredential.user.emailVerified) {
                await auth.signOut();
            }
        } catch (error) {
            alert('Error signing up. ' + error.message);
            console.error('Error signing up:', error);
        }
    };

    const handleResetPassword = async () => {
        if (!email) {
            alert('Please enter your email to reset your password.');
            return;
        }
        try {
            await sendPasswordResetEmail(auth, email);
            alert('Password reset email sent! Please check your inbox.');
        } catch (error) {
            alert('Error sending password reset email. ' + error.message);
            console.error('Error sending password reset email:', error);
        }
    };

    const handleSignInWithGoogle = () => {
        const provider = new GoogleAuthProvider();
        signInWithPopup(auth, provider).catch((error) => {
            console.error('Error signing in with Google:', error);
            alert('Error signing in with Google: ' + error.message);
        });
    };
    const urlParams = new URLSearchParams(window.location.search);
    const homeworkParam = urlParams.get('h');
    const imageParam = urlParams.get('i');
    if (imageParam && imageParam.length > 5) {
        return (
            <div>
                <GenAIApp sourceImageInformation={imageParam} />
            </div>
        );
    }
    if (homeworkParam && homeworkParam.length > 5) {
        return (
            <Practice sourceDocumentID={homeworkParam} />
        );
    }
    if (user) {
        console.log('Signin component User is signed in:', user.uid);
        console.log('Hostname:', window.location.hostname);
        if ((user.uid !== 'bTGBBpeYPmPJonItYpUOCYhdIlr1' && user.uid !== 'qDzUX26K0dgtSMlN9PtCj6Q9L5J3') || window.location.hostname.includes('localhost')) {
            return (
                <GenAIApp user={user} />
            );
        }
        else {
            if (MainApp === 'GenAIApp') {
                return (
                    <GenAIApp user={user} />
                );
            }
            if (MainApp === 'TTSQueueApp') {
                return (
                    <TTSQueueApp user={user} />
                );
            }
            if (MainApp === 'App') {
                return (
                    <App user={user} />
                );
            }
            if (MainApp === 'AudioApp') {
                return (
                    <AudioApp user={user} />
                );
            }
        }
    }

    if (showSignUp) {
        return <SignUp onBackToSignIn={() => setShowSignUp(false)} />;
    }

    return (
        <div>
            <div style={{ fontSize: '22px', width: '100%', margin: '0 auto' }}>
                <br />
                <span style={{ fontSize: '16px', color: '#666' }}>First time user? Please click on </span>
                <button className="signuppagebutton" onClick={() => setShowSignUp(true)}>
                Sign Up
                </button>
                <br />                
                <br />
                <input
                    className="textinput"
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
                    className="textinput"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <br />
                <br />
                <button className="signonpagebutton" onClick={handleSignInWithEmail}>
                    Sign In
                </button>
                &nbsp;&nbsp;
                <button onClick={handleResetPassword}>
                    Did you forget Password?
                </button>
                <br />
                <br />
                
                <span> Or </span>
                <br />
                <br />
                <button className="signgooglepagebutton" onClick={handleSignInWithGoogle}>Sign In with Google</button>
                <br />
                <br />
            </div>
        </div>
    );
}

export default SigninApp;
