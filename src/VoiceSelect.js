import React, { useEffect, useState, useRef } from 'react';
import { auth, db } from './Firebase';
import { collection, doc, where, addDoc, getDocs, query, orderBy, startAfter, limit, updateDoc } from 'firebase/firestore';
import {
    onAuthStateChanged,
    signOut,
} from 'firebase/auth';

const VoiceSelect = ({ selectedVoice, onVoiceChange }) => {
    const [genaiVoices, setGenaiVoices] = useState([]);
    const [user, setUser] = useState(null);
    const [uid, setUid] = useState(null);
    // Listen for authentication state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                setUid(currentUser.uid);
                console.log('User is signed in:', currentUser.uid);
                await fetchVoiceNames();
            }
            else {
                console.log('No user is signed in');
            }
        });
        return () => unsubscribe();
    }, []);

    // Function to fetch data from Firestore
    const fetchVoiceNames = async () => {
        try {
            console.log('Fetching voice names...');
            const voiceNamesCollection = collection(db, 'public');
            const q = query(voiceNamesCollection, where('setup', '==', 'tts'));
            const voiceNamesSnapshot = await getDocs(q);
            voiceNamesSnapshot.forEach(doc => {
                const data = doc.data();
                if (Array.isArray(data.tts)) {
                    console.log('Voice names:', data.tts);
                    setGenaiVoices(prevVoices => [...prevVoices, ...data.tts]);
                }
            });
        } catch (error) {
            console.error("Error fetching voice names: ", error);
            return [];
        }
    };

    return (
        <select
            value={selectedVoice}
            onChange={(e) => onVoiceChange(e.target.value)}
            style={{ marginLeft: '1px', padding: '1px', fontSize: '16px' }}
        >
            {genaiVoices.map((tts) => (
                <option key={tts} value={tts}>
                    {tts}
                </option>
            ))}
        </select>
    );
};

export default VoiceSelect;