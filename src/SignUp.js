import React, { useState } from 'react';
import { auth } from './Firebase';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import './Signin.css';

function SignUp({ onBackToSignIn }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSignUp = async () => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await sendEmailVerification(auth.currentUser);
            alert('Verification email sent! Please check your inbox.');
            if (!userCredential.user.emailVerified) {
                await auth.signOut();
            }
            onBackToSignIn();
        } catch (error) {
            alert('Error signing up. ' + error.message);
            console.error('Error signing up:', error);
        }
    };

    return (
        <div>
            <div style={{ fontSize: '22px', width: '100%', margin: '0 auto' }}>
                <br />
                <p>Sign Up</p>
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
                <button className="signuppagebutton" onClick={handleSignUp}>
                    Sign Up
                </button>
                <br />
                <br />
                <button onClick={onBackToSignIn}>
                    Back to Sign In
                </button>
            </div>
        </div>
    );
}

export default SignUp;
