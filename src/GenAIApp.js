import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import * as speechsdk from 'microsoft-cognitiveservices-speech-sdk';
import { FaPlay, FaReadme, FaArrowLeft, FaSignOutAlt, FaSpinner, FaCloudDownloadAlt, FaEdit, FaMarkdown, FaEnvelopeOpenText, FaHeadphones } from 'react-icons/fa';
import './GenAIApp.css';
import { collection, doc, where, addDoc, getDocs, query, orderBy, startAfter, limit, updateDoc } from 'firebase/firestore';
import {
    onAuthStateChanged,
    signOut,
} from 'firebase/auth';
import App from './App';
import { auth, db } from './Firebase';
import VoiceSelect from './VoiceSelect';
import { TbEmpathize } from "react-icons/tb";
import { MdSettingsInputComponent } from "react-icons/md";
import { FaK } from "react-icons/fa6";

const speechKey = process.env.REACT_APP_AZURE_SPEECH_API_KEY;
const serviceRegion = 'eastus';
const isiPhone = /iPhone/i.test(navigator.userAgent);
console.log(isiPhone);

let searchQuery = '';
let searchModel = 'All';
let dataLimit = 11;
let promptSuggestion = 'NA';
let autoPromptInput = '';

const GenAIApp = () => {
    // **State Variables**
    const [genaiData, setGenaiData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [lastVisible, setLastVisible] = useState(null); // State for the last visible document
    const [language, setLanguage] = useState("en");
    // Authentication state
    const [user, setUser] = useState(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [uid, setUid] = useState(null);
    const [promptInput, setPromptInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isGeneratingGemini, setIsGeneratingGemini] = useState(false);
    const [isGeneratingAnthropic, setIsGeneratingAnthropic] = useState(false);
    const [isGeneratingo1Mini, setIsGeneratingo1Mini] = useState(false);
    const [isGeneratingImage_Dall_e_3, setIsGeneratingImage_Dall_e_3] = useState(false);
    const [isGpt4oMini, setIsGpt4oMini] = useState(false);
    const [isGeneratingGpt4oMini, setIsGeneratingGpt4oMini] = useState(false);
    const [isOpenAI, setIsOpenAI] = useState(true);
    const [isAnthropic, setIsAnthropic] = useState(true);
    const [isGemini, setIsGemini] = useState(false);
    const [isGpto1Mini, setIsGpto1Mini] = useState(false);
    const [isLlama, setIsLlama] = useState(true);
    const [isMistral, setIsMistral] = useState(false);
    const [isGpt4Turbo, setIsGpt4Turbo] = useState(false);
    const [isGeminiFast, setIsGeminiFast] = useState(false);
    const [isPerplexityFast, setIsPerplexityFast] = useState(false);
    const [isPerplexity, setIsPerplexity] = useState(false);
    const [isGeneratingGeminiFast, setIsGeneratingGeminiFast] = useState(false);
    const [isImage_Dall_e_3, setIsImage_Dall_e_3] = useState(false);
    const [isTTS, setIsTTS] = useState(false);
    const [isGeneratingTTS, setIsGeneratingTTS] = useState(false);
    const [iso1, setIso1] = useState(false); // New state for o1
    const [isGeneratingo1, setIsGeneratingo1] = useState(false); // New state for generating o1
    const [isGeneratingMistral, setIsGeneratingMistral] = useState(false);
    const [isGeneratingLlama, setIsGeneratingLlama] = useState(false);
    const [isGeneratingGpt4Turbo, setIsGeneratingGpt4Turbo] = useState(false);
    const [isGeneratingPerplexityFast, setIsGeneratingPerplexityFast] = useState(false);
    const [isGeneratingPerplexity, setIsGeneratingPerplexity] = useState(false);
    const [voiceName, setVoiceName] = useState('en-US-AriaNeural');
    const [genaiPrompts, setGenaiPrompts] = useState([]);
    const [showEditPopup, setShowEditPopup] = useState(false);
    const [editPromptTag, setEditPromptTag] = useState('');
    const [editPromptFullText, setEditPromptFullText] = useState('');
    const [generatedResponse, setGeneratedResponse] = useState(null);
    const [selectedPrompt, setSelectedPrompt] = useState(null);
    const [selectedPromptFullText, setSelectedPromptFullText] = useState(null);
    const [showMainApp, setShowMainApp] = useState(false);
    const [GenAIParameter, setGenAIParameter] = useState(false);
    const [temperature, setTemperature] = useState(0.7);
    const [top_p, setTop_p] = useState(0.8);
    const [autoPromptLimit, setAutoPromptLimit] = useState(1);
    const [showGpt4Turbo, setShowGpt4Turbo] = useState(true);
    const [showMistral, setShowMistral] = useState(true);
    const [showLlama, setShowLlama] = useState(true);
    const [showGpt4oMini, setShowGpt4oMini] = useState(true);
    const [showGeminiFast, setShowGeminiFast] = useState(true);
    const [showPerplexityFast, setShowPerplexityFast] = useState(true);
    const [showPerplexity, setShowPerplexity] = useState(true);
    const [showGemini, setShowGemini] = useState(true);
    const [showAnthropic, setShowAnthropic] = useState(true);
    const [showOpenAI, setShowOpenAI] = useState(true);
    const [showo1, setShowo1] = useState(true);
    const [showImageDallE3, setShowImageDallE3] = useState(true);
    const [showTTS, setShowTTS] = useState(true);
    const [showo1Mini, setShowo1Mini] = useState(true);
    const [modelAnthropic, setModelAnthropic] = useState('claude');
    const [modelGemini, setModelGemini] = useState('gemini');
    const [modelOpenAI, setModelOpenAI] = useState('gpt-4o');
    const [modelGpto1Mini, setModelGpto1Mini] = useState('o1-mini');
    const [modelo1, setModelo1] = useState('o1');
    const [modelLlama, setModelLlama] = useState('llama');
    const [modelMistral, setModelMistral] = useState('mistral');
    const [modelGpt4oMini, setModelGpt4oMini] = useState('gpt-4o-mini');
    const [modelGeminiFast, setModelGeminiFast] = useState('gemini-flash-fast');
    const [modelGpt4Turbo, setModelGpt4Turbo] = useState('gpt-4-turbo');
    const [modelImageDallE3, setModelImageDallE3] = useState('dall-e-3');
    const [modelPerplexityFast, setModelPerplexityFast] = useState('perplexity-fast');
    const [modelPerplexity, setModelPerplexity] = useState('perplexity');
    const [autoPrompt, setAutoPrompt] = useState(false);

    const embedPrompt = async (docId) => {
        try {
            console.log('Embedding prompt:', docId);
            const response = await fetch(`${process.env.REACT_APP_GENAI_API_URL}embed-prompt`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ doc_id: docId, uid: uid })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to embed prompt.');
            }
            const data = await response.json();
            console.log('Embed Prompt Response:', data);
        } catch (error) {
            console.error('Error embedding prompt:', error);
            alert(`Error: ${error.message}`);
        }
    };
    // Helper function to save prompt
    const handleSavePrompt = async () => {
        if (!editPromptTag.trim() || !editPromptFullText.trim()) {
            alert('Please enter a prompt.');
            return;
        }
        try {
            const user = auth.currentUser;
            let docId = '';
            if (!user) {
                console.error("No user is signed in");
                return;
            }
            const genaiCollection = collection(db, 'genai', user.uid, 'prompts');
            if (selectedPrompt == 'NA' || selectedPrompt == null) {
                console.log('Adding new prompt');
                const newDocRef = await addDoc(genaiCollection, {
                    tag: editPromptTag,
                    fullText: editPromptFullText
                });
                docId = newDocRef.id;
            }
            else {
                console.log('Updating prompt');
                const q = query(genaiCollection, where('tag', '==', selectedPrompt), limit(1));
                const genaiSnapshot = await getDocs(q);
                const genaiList = genaiSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const docRef = doc(db, 'genai', user.uid, 'prompts', genaiList[0].id);
                await updateDoc(docRef, {
                    tag: editPromptTag,
                    fullText: editPromptFullText
                });
                docId = docRef.id;
            }
            embedPrompt(docId);
            setEditPromptTag('');
            setEditPromptFullText('');
            setShowEditPopup(false);
            return;

        } catch (error) {
            console.error("Error saving prompt: ", error);
        }
    };


    // Helper function to get URL parameters
    const getUrlParameter = (name) => {
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        return urlParams.get(name);
    };

    const questionLimit = getUrlParameter('question_limit');
    const telugu = getUrlParameter('telugu');
    const hindi = getUrlParameter('hindi');

    // Helper function to truncate questions based on limit
    const getQuestionSubstring = (question) => {
        if (questionLimit) {
            return question.substring(0, parseInt(questionLimit));
        }
        return question;
    };

    // Listen for authentication state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                const urlParams = new URLSearchParams(window.location.search);
                const genaiParam = urlParams.get('genai');
                if (genaiParam) {
                    setGenAIParameter(true);
                }
                if (process.env.REACT_APP_MAIN_APP === 'GenAI') {
                    setGenAIParameter(true);
                }
                setUid(currentUser.uid);
                console.log('User is signed in:', currentUser.uid);
                // Fetch data for the authenticated user
                await fetchData(currentUser.uid);
                fetchPrompts(currentUser.uid);
                fetchGenAIParameters();
            }
            else {
                console.log('No user is signed in');
            }
        });
        return () => unsubscribe();
    }, []);

    const fetchGenAIParameters = async () => {
        try {
            console.log('Fetching genai parameters...');
            const voiceNamesCollection = collection(db, 'public');
            const q = query(voiceNamesCollection, where('setup', '==', 'genai'));
            const voiceNamesSnapshot = await getDocs(q);
            voiceNamesSnapshot.forEach(doc => {
                const data = doc.data();
                console.log('Data:', data.temperature, data.top_p);
                setTemperature(data.temperature);
                setTop_p(data.top_p);
                setAutoPromptLimit(data.autoPromptLimit);
                dataLimit = data.dataLimit;
                setIsAnthropic(data.isAnthropic);
                setIsGemini(data.isGemini);
                setIsOpenAI(data.isOpenAI);
                setIsGpto1Mini(data.isGpto1Mini);
                setIso1(data.iso1);
                setIsImage_Dall_e_3(data.isImage_Dall_e_3);
                setIsTTS(data.isTTS);
                setIsLlama(data.isLlama);
                setIsMistral(data.isMistral);
                setIsGpt4Turbo(data.isGpt4Turbo);
                setIsGpt4oMini(data.isGpt4oMini);
                setIsGeminiFast(data.isGeminiFast);
                setIsPerplexityFast(data.isPerplexityFast);
                setIsPerplexity(data.isPerplexity);
                setShowGpt4Turbo(data.showGpt4Turbo);
                setShowPerplexityFast(data.showPerplexityFast);
                setShowGpt4oMini(data.showGpt4oMini);
                setShowGeminiFast(data.showGeminiFast);
            });
        } catch (error) {
            console.error("Error fetching voice names: ", error);
            return [];
        }
    };

    // Fetch prompts from Firestore
    const fetchPrompts = async (userID) => {
        try {
            const genaiCollection = collection(db, 'genai', userID, 'prompts');
            const q = query(genaiCollection, limit(100), orderBy('tag', 'asc'));
            const genaiSnapshot = await getDocs(q);
            const genaiList = genaiSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setGenaiPrompts(genaiList);
        } catch (error) {
            console.error("Error fetching prompts: ", error);
        }
    };

    // Function to fetch data from Firestore
    const fetchData = async (userID) => {
        try {
            const genaiCollection = collection(db, 'genai', userID, 'MyGenAI');
            let q;
            q = query(genaiCollection, orderBy('createdDateTime', 'desc'), limit(dataLimit));
            if (hindi) {
                q = query(genaiCollection, orderBy('createdDateTime', 'desc'), where('language', '==', 'Hindi'), limit(dataLimit));
            }
            if (telugu) {
                q = query(genaiCollection, orderBy('createdDateTime', 'desc'), where('language', '==', 'Telugu'), limit(dataLimit));
            }
            const genaiSnapshot = await getDocs(q);
            const genaiList = genaiSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setGenaiData(genaiList);
            setLastVisible(genaiSnapshot.docs[genaiSnapshot.docs.length - 1]); // Set last visible document
        } catch (error) {
            console.error("Error fetching data: ", error);
        }
    };

    // Handlers for input changes
    const handleLimitChange = (event) => {
        dataLimit = parseInt(event.target.value);
        bigQueryResults();
    };

    const handleSearchChange = (event) => {
        searchQuery = event.target.value;
        bigQueryResults();
    };

    const handleVectorSearchChange = (event) => {
        searchQuery = event.target.value;
        vectorSearchResults();
    };

    const [showFullQuestion, setShowFullQuestion] = useState(false);

    const handleShowMore = () => {
        setShowFullQuestion(true);
    };

    // Helper function to split messages into chunks
    const splitMessage = (msg, chunkSize = 4000) => {
        const chunks = [];
        for (let i = 0; i < msg.length; i += chunkSize) {
            chunks.push(msg.substring(i, i + chunkSize));
        }
        return chunks;
    };

    // Function to synthesize speech
    const synthesizeSpeech = async (articles, language) => {
        if (isiPhone) {
            window.scrollTo(0, 0);
            alert('Please go to top of the page to check status and listen to the audio');
            callTTSAPI(articles, process.env.REACT_APP_TTS_API_URL);
            return;
        }
        const speechConfig = speechsdk.SpeechConfig.fromSubscription(speechKey, serviceRegion);
        speechConfig.speechSynthesisVoiceName = voiceName;
        if (language === "Spanish") {
            speechConfig.speechSynthesisVoiceName = "es-MX-DaliaNeural";
        }
        if (language === "Hindi") {
            speechConfig.speechSynthesisVoiceName = "hi-IN-SwaraNeural";
        }
        if (language === "Telugu") {
            speechConfig.speechSynthesisVoiceName = "te-IN-ShrutiNeural";
        }

        const audioConfig = speechsdk.AudioConfig.fromDefaultSpeakerOutput();
        const speechSynthesizer = new speechsdk.SpeechSynthesizer(speechConfig, audioConfig);

        const chunks = splitMessage(articles);
        for (const chunk of chunks) {
            try {
                const result = await speechSynthesizer.speakTextAsync(chunk);
                if (result.reason === speechsdk.ResultReason.SynthesizingAudioCompleted) {
                    console.log(`Speech synthesized to speaker for text: [${chunk}]`);
                } else if (result.reason === speechsdk.ResultReason.Canceled) {
                    const cancellationDetails = speechsdk.SpeechSynthesisCancellationDetails.fromResult(result);
                    if (cancellationDetails.reason === speechsdk.CancellationReason.Error) {
                        console.error(`Error details: ${cancellationDetails.errorDetails}`);
                    }
                }
            } catch (error) {
                console.error(`Error synthesizing speech: ${error}`);
            }
        }
    };

    // Function to render question with 'More' button
    const renderQuestion = (question) => {
        if (showFullQuestion) {
            return <ReactMarkdown>{question}</ReactMarkdown>;
        } else {
            const truncatedQuestion = getQuestionSubstring(question);
            return (
                <div>
                    <ReactMarkdown>{question.substring(0, parseInt(400))}</ReactMarkdown>
                    <button onClick={handleShowMore}>More</button>
                </div>
            );
        }
    };

    // Function to fetch more data for pagination
    const fetchMoreData = async () => {
        try {
            // get auth user
            const user = auth.currentUser;
            if (!user) {
                console.error("No user is signed in");
                return;
            }
            else {
                console.log('User is signed in:', user.uid);
                const genaiCollection = collection(db, 'genai', user.uid, 'MyGenAI');
                let nextQuery;
                nextQuery = query(genaiCollection, orderBy('createdDateTime', 'desc'), startAfter(lastVisible), limit(dataLimit));
                if (hindi) {
                    nextQuery = query(genaiCollection, orderBy('createdDateTime', 'desc'), where('language', '==', 'Hindi'), startAfter(lastVisible), limit(dataLimit));
                }
                if (telugu) {
                    nextQuery = query(genaiCollection, orderBy('createdDateTime', 'desc'), where('language', '==', 'Telugu'), startAfter(lastVisible), limit(dataLimit));
                }

                const genaiSnapshot = await getDocs(nextQuery);
                const genaiList = genaiSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setGenaiData(prevData => [...prevData, ...genaiList]);
                setLastVisible(genaiSnapshot.docs[genaiSnapshot.docs.length - 1]); // Update last visible document
            }
        } catch (error) {
            console.error("Error fetching more data: ", error);
        }
    };

    const handlePromptChange = async (promptValue) => {
        /* const genaiCollection = collection(db, 'genai', uid, 'prompts');
         const q = query(genaiCollection, where('tag', '==', promptValue), limit(1));
         const genaiSnapshot = await getDocs(q);
         const genaiList = genaiSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));*/
        setPromptInput(prevInput => prevInput + "\n " + "------------ prompt --------------" + "\n" + promptValue);
    };

    // Sign Out
    const handleSignOut = () => {
        signOut(auth).catch((error) => {
            console.error('Error signing out:', error);
            alert('Error signing out: ' + error.message);
        });
    };

    const searchPrompts = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_GENAI_API_URL}prompt-search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ q: promptInput, uid: user.uid, limit: autoPromptLimit })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to search prompts.');
            }

            const data = await response.json();
            const docIds = data.document_ids;

            const genaiCollection = collection(db, 'genai', uid, 'prompts');
            const docsQuery = query(genaiCollection, where('__name__', 'in', docIds));
            const docsSnapshot = await getDocs(docsQuery);
            const fullTexts = docsSnapshot.docs.map(doc => doc.data().fullText);
            autoPromptInput = promptInput;
            autoPromptInput = autoPromptInput + "    " + fullTexts.join("\n");
        } catch (error) {
            console.error('Error searching prompts:', error);
            alert(`Error: ${error.message}`);
        }
    };

    // **New Event Handlers for Generate and Refresh**

    // Handler for Generate Button Click
    // **Handler for Generate Button Click**
    const handleGenerate = async () => {
        if (!promptInput.trim()) {
            alert('Please enter a prompt.');
            return;
        }

        // Check if at least one model is selected
        if (!isOpenAI && !isAnthropic && !isGemini && !isGpto1Mini && !iso1 && !isImage_Dall_e_3 && !isTTS && !isLlama && !isMistral && !isGpt4Turbo && !isGpt4oMini && !isGeminiFast && !isPerplexityFast && !isPerplexity) {
            alert('Please select at least one model.');
            return;
        }

        // Generate API calls for each selected model
        if (isAnthropic) {
            setIsGeneratingAnthropic(true); // Set generating state to true
            callAPI(modelAnthropic);
        }

        if (isGemini) {
            setIsGeneratingGemini(true); // Set generating state to true
            callAPI(modelGemini);
        }
        if (isOpenAI) {
            setIsGenerating(true); // Set generating state to true
            callAPI(modelOpenAI);
        }

        if (isGpto1Mini) {
            setIsGeneratingo1Mini(true); // Set generating state to true
            callAPI(modelGpto1Mini);
        }

        if (iso1) {
            setIsGeneratingo1(true); // Set generating state to true
            callAPI(modelo1);
        }

        if (isLlama) {
            setIsGeneratingLlama(true); // Set generating state to true
            callAPI(modelLlama);
        }

        if (isMistral) {
            setIsGeneratingMistral(true); // Set generating state to true
            callAPI(modelMistral);
        }

        if (isGpt4oMini) {
            setIsGeneratingGpt4oMini(true); // Set generating state to true
            callAPI(modelGpt4oMini);
        }

        if (isGeminiFast) {
            setIsGeneratingGeminiFast(true); // Set generating state to true
            callAPI(modelGeminiFast);
        }

        if (isGpt4Turbo) {
            setIsGeneratingGpt4Turbo(true); // Set generating state to true
            callAPI(modelGpt4Turbo);
        }

        if (isPerplexityFast) {
            setIsGeneratingPerplexityFast(true); // Set generating state to true
            callAPI(modelPerplexityFast);
        }

        if (isPerplexity) {
            setIsGeneratingPerplexity(true); // Set generating state to true
            callAPI(modelPerplexity);
        }

        // **Handle DALL·E 3 Selection**
        if (isImage_Dall_e_3) {
            setIsGeneratingImage_Dall_e_3(true); // Set generating state to true
            callAPI(modelImageDallE3);
        }

        // **Handle TTS Selection**
        if (isTTS) {
            // if promptInput is > 9000 characters, then split it into chunks and call TTS API for each chunk
            //

            if (promptInput.length > 2) {
                /* const chunks = [];
                 for (let i = 0; i < promptInput.length; i += 3999) {
                   chunks.push(promptInput.substring(i, i + 3999));
                 }
                 for (const chunk of chunks) {
                   callTTSAPI(chunk);
                 }*/
                callTTSAPI(promptInput, process.env.REACT_APP_TTS_API_URL);
            }
            else {
                callTTSAPI(promptInput, 'https://us-central1-reviewtext-ad5c6.cloudfunctions.net/function-18');
            }
        }
    };

    const callAPI = async (selectedModel) => {
        console.log('Calling API with model:', selectedModel + ' URL: ' + process.env.REACT_APP_GENAI_API_URL);

        try {
            let response;
            if (autoPrompt) {
                await searchPrompts();
                console.log('Prompt:', autoPromptInput);
                response = await fetch(process.env.REACT_APP_GENAI_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ prompt: autoPromptInput, model: selectedModel, uid: uid, temperature: temperature, top_p: top_p })
                });
            }
            else {
                response = await fetch(process.env.REACT_APP_GENAI_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ prompt: promptInput, model: selectedModel, uid: uid, temperature: temperature, top_p: top_p })
                });
            }
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate content.');
            }
            const data = await response.json();
            console.log('Response:', data);
        } catch (error) {
            console.error('Error generating content:', error);
            alert(`Error: ${error.message}`);
        } finally {
            // click refresh button
            searchQuery = '';
            searchModel = 'All';
            console.log('Fetching data after generating content');
            fetchData(uid);
            if (selectedModel === modelOpenAI) {
                setIsGenerating(false);
            }
            if (selectedModel === modelAnthropic) {
                setIsGeneratingAnthropic(false);
            }
            if (selectedModel === modelGemini) {
                setIsGeneratingGemini(false);
            }
            if (selectedModel === modelGpto1Mini) {
                setIsGeneratingo1Mini(false);
            }
            if (selectedModel === modelo1) {
                setIsGeneratingo1(false);
            }
            if (selectedModel === modelImageDallE3) {
                setIsGeneratingImage_Dall_e_3(false);
            }
            if (selectedModel === modelMistral) {
                setIsGeneratingMistral(false);
            }
            if (selectedModel === modelLlama) {
                setIsGeneratingLlama(false);
            }
            if (selectedModel === modelGpt4Turbo) {
                setIsGeneratingGpt4Turbo(false);
            }
            if (selectedModel === modelGpt4oMini) {
                setIsGeneratingGpt4oMini(false);
            }
            if (selectedModel === modelGeminiFast) {
                setIsGeneratingGeminiFast(false);
            }
            if (selectedModel === modelPerplexityFast) {
                setIsGeneratingPerplexityFast(false);
            }
            if (selectedModel === modelPerplexity) {
                setIsGeneratingPerplexity(false);
            }

        }
    };

    // Function to call the TTS API
    const callTTSAPI = async (message, apiUrl) => {
        console.log('Calling TTS API with message:', message, ' voiceName:', voiceName);
        console.log('API URL:', apiUrl);
        setIsGeneratingTTS(true); // Set generating state to true

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: message, uid: uid, source: 'ai', voice_name: voiceName })
            });

            if (!response.ok) {
                throw new Error([`Network response was not ok: ${response.statusText}`]);
            }
        } catch (error) {
            console.error('Error calling TTS API:', error);
            alert([`Error: ${error.message}`]);
        } finally {
            setIsGeneratingTTS(false); // Reset generating state
            // Optionally, refresh data
            fetchData(uid);
        }
    };
    // Handler for DALL·E 3 Checkbox Change
    const handleDall_e_3Change = (checked) => {
        setIsImage_Dall_e_3(checked);
        if (checked) {
            // Uncheck other models
            if (isOpenAI || isAnthropic || isGemini || isGpto1Mini || iso1 || isTTS) {
                setIsOpenAI(false);
                setIsAnthropic(false);
                setIsGemini(false);
                setIsGpto1Mini(false);
                setIso1(false);
                setIsTTS(false);
                setIsLlama(false);
                setIsMistral(false);
                setIsGpt4Turbo(false);
                setIsGpt4oMini(false);
                setIsGeminiFast(false);
                setIsPerplexityFast(false);
                setIsPerplexity(false);
            }

            // Set the promptSelect dropdown to "image"
            const promptSelect = document.getElementById('promptSelect');
            if (promptSelect) {
                const imageOption = Array.from(promptSelect.options).find(option => option.text.toLowerCase() === 'image');
                if (imageOption) {
                    promptSelect.value = imageOption.value;
                    // Trigger the onChange event manually
                    const event = new Event('change', { bubbles: true });
                    promptSelect.dispatchEvent(event);
                }
            }
        }
    };


    const handleTTSChange = (checked) => {
        setIsTTS(checked);

        if (checked) {
            // Optionally, uncheck DALL·E 3 or other models if needed
            // For example, if TTS should not coexist with DALL·E 3:
            if (isOpenAI || isAnthropic || isGemini || isGpto1Mini || iso1 || isImage_Dall_e_3) {
                setIsOpenAI(false);
                setIsOpenAI(false);
                setIsAnthropic(false);
                setIsGemini(false);
                setIsGpto1Mini(false);
                setIso1(false);
                setIsImage_Dall_e_3(false);
            }
        }
    };

    const handleEditPrompt = () => {
        setShowEditPopup(true);
        if (selectedPrompt) {
            setEditPromptTag(selectedPrompt);
            setEditPromptFullText(selectedPromptFullText);
        }
    };

    const handleModelChange = (modelValue) => {
        searchModel = modelValue;
        bigQueryResults();
    }

    const vectorSearchResults = async () => {
        setIsLoading(true);
        console.log("Fetching data for Vector search query:", searchQuery);
        console.log("URL:", process.env.REACT_APP_GENAI_API_VECTOR_URL);
        fetch(process.env.REACT_APP_GENAI_API_VECTOR_URL, {
            method: "POST",
            body: JSON.stringify({
                uid: uid,
                q: searchQuery,
                limit: dataLimit,
            })
        })
            .then((res) => res.json())
            .then(async (data) => {
                const docIds = data.document_ids;
                const genaiCollection = collection(db, 'genai', uid, 'MyGenAI');
                const docsQuery = query(genaiCollection, where('__name__', 'in', docIds));
                const docsSnapshot = await getDocs(docsQuery);
                const genaiList = docsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setGenaiData(genaiList);
                setIsLoading(false);
            })
            .catch((error) => {
                console.error("Error fetching data:", error);
                setIsLoading(false);
            });
    }

    const bigQueryResults = () => {
        setIsLoading(true);
        console.log("Fetching data for search query:", searchQuery);
        console.log("search model:", searchModel);
        console.log("limit:", dataLimit);
        console.log("URL:", process.env.REACT_APP_GENAI_API_BIGQUERY_URL);
        fetch(process.env.REACT_APP_GENAI_API_BIGQUERY_URL, {
            method: "POST",
            body: JSON.stringify({
                uid: uid,
                limit: dataLimit,
                q: searchQuery,
                model: searchModel
            })
        })
            .then((res) => res.json())
            .then((data) => {
                setGenaiData(data);
                setIsLoading(false);
            })
            .catch((error) => {
                console.error("Error fetching data:", error);
                setIsLoading(false);
            });
    }
    if (showMainApp) {
        return (
            <App user={user} />
        );
    }

    return (
        <div>
            <div>
                <div>
                    <textarea
                        value={promptInput}
                        onChange={(e) => setPromptInput(e.target.value)}
                        placeholder="Enter your prompt here..."
                        style={{ width: '99%', padding: '2px', height: '140px', fontSize: '16px' }}
                    />
                </div>
                <div style={{ marginBottom: '20px' }}>
                    <label className={isGenerating ? 'flashing' : ''}>
                        <input
                            type="checkbox"
                            value="openai"
                            onChange={(e) => {
                                setIsOpenAI(e.target.checked);
                                if (e.target.checked) setIsTTS(false);
                                if (e.target.checked) setIsImage_Dall_e_3(false);
                            }}
                            checked={isOpenAI}
                        />
                        ChatGPT
                    </label>
                    <label className={isGeneratingAnthropic ? 'flashing' : ''} style={{ marginLeft: '8px' }}>
                        <input
                            type="checkbox"
                            value="anthropic"
                            onChange={(e) => {
                                setIsAnthropic(e.target.checked);
                                if (e.target.checked) setIsTTS(false);
                                if (e.target.checked) setIsImage_Dall_e_3(false);
                            }}
                            checked={isAnthropic}
                        />
                        Claude
                    </label>
                    <label className={isGeneratingGemini ? 'flashing' : ''} style={{ marginLeft: '8px' }}>
                        <input
                            type="checkbox"
                            value="gemini"
                            onChange={(e) => {
                                setIsGemini(e.target.checked);
                                if (e.target.checked) setIsTTS(false);
                                if (e.target.checked) setIsImage_Dall_e_3(false);
                            }}
                            checked={isGemini}
                        />
                        Gemini
                    </label>
                    <label className={isGeneratingo1Mini ? 'flashing' : ''} style={{ marginLeft: '8px' }}>
                        <input
                            type="checkbox"
                            value="o1-mini"
                            onChange={(e) => {
                                setIsGpto1Mini(e.target.checked);
                                if (e.target.checked) setIsTTS(false);
                                if (e.target.checked) setIsImage_Dall_e_3(false);
                            }}
                            checked={isGpto1Mini}
                        />
                        o1-mini
                    </label>
                    <label className={isGeneratingLlama ? 'flashing' : ''} style={{ marginLeft: '8px' }}>
                        <input
                            type="checkbox"
                            value="llama"
                            onChange={(e) => setIsLlama(e.target.checked)}
                            checked={isLlama}
                        />
                        Llama
                    </label>
                    <label className={isGeneratingMistral ? 'flashing' : ''} style={{ marginLeft: '8px' }}>
                        <input
                            type="checkbox"
                            value="mistral"
                            onChange={(e) => setIsMistral(e.target.checked)}
                            checked={isMistral}
                        />
                        Mistral
                    </label>
                    {showGpt4Turbo && <label className={isGeneratingGpt4Turbo ? 'flashing' : ''} style={{ marginLeft: '8px' }}>
                        <input
                            type="checkbox"
                            value="Gpt4Turbo"
                            onChange={(e) => setIsGpt4Turbo(e.target.checked)}
                            checked={isGpt4Turbo}
                        />
                        Gpt4Turbo
                    </label>}
                    {showGeminiFast && <label className={isGeneratingGeminiFast ? 'flashing' : ''} style={{ marginLeft: '8px' }}>
                        <input
                            type="checkbox"
                            value="gemini-fast"
                            onChange={(e) => setIsGeminiFast(e.target.checked)}
                            checked={isGeminiFast}
                        />
                        Gemini-Fast
                    </label>}
                    {showGpt4oMini && <label className={isGeneratingGpt4oMini ? 'flashing' : ''} style={{ marginLeft: '8px' }}>
                        <input
                            type="checkbox"
                            value="gpt4mini"
                            onChange={(e) => setIsGpt4oMini(e.target.checked)}
                            checked={isGpt4oMini}
                        />
                        Gpt4oMini
                    </label>}
                    <label className={isGeneratingo1 ? 'flashing' : ''} style={{ marginLeft: '8px' }}>
                        <input
                            type="checkbox"
                            value="o1"
                            onChange={(e) => {
                                setIso1(e.target.checked);
                                if (e.target.checked) setIsTTS(false);
                                if (e.target.checked) setIsImage_Dall_e_3(false);
                            }}
                            checked={iso1}
                        />
                        o1
                    </label>
                    {showPerplexityFast && <label className={isGeneratingPerplexityFast ? 'flashing' : ''} style={{ marginLeft: '8px' }}>
                        <input

                            type="checkbox"
                            value="perplexity-fast"
                            onChange={(e) => setIsPerplexityFast(e.target.checked)}
                            checked={isPerplexityFast}
                        />
                        Perplexity-Fast
                    </label>}
                    <label className={isGeneratingPerplexity ? 'flashing' : ''} style={{ marginLeft: '8px' }}>

                        <input
                            type="checkbox"
                            value="perplexity"
                            onChange={(e) => setIsPerplexity(e.target.checked)}
                            checked={isPerplexity}
                        />
                        Plxty
                    </label>

                    <label style={{ marginLeft: '8px' }}>
                        Temp:
                        <input
                            type="number"
                            value={temperature}
                            onChange={(e) => setTemperature(parseFloat(e.target.value))}
                            step="0.1"
                            min="0"
                            max="1"
                            style={{ width: '50px', marginLeft: '5px' }}
                        />
                    </label>
                    <label style={{ marginLeft: '8px' }}>
                        Top_p:
                        <input
                            type="number"
                            value={top_p}
                            onChange={(e) => setTop_p(parseFloat(e.target.value))}
                            step="0.1"
                            min="0"
                            max="1"
                            style={{ width: '50px', marginLeft: '5px' }}
                        />
                    </label>
                    {showImageDallE3 && <label className={isGeneratingImage_Dall_e_3 ? 'flashing' : ''} style={{ marginLeft: '8px' }}>
                        <input
                            type="checkbox"
                            value="dall-e-3"
                            onChange={(e) => handleDall_e_3Change(e.target.checked)}
                            checked={isImage_Dall_e_3}
                        />
                        IMAGE
                    </label>}
                    <label className={isGeneratingTTS ? 'flashing' : ''} style={{ marginLeft: '8px' }}>
                        <input
                            type="checkbox"
                            value="tts"
                            onChange={(e) => handleTTSChange(e.target.checked)}
                            checked={isTTS}
                        />
                        TTS
                    </label>
                    {isTTS && (
                        <VoiceSelect
                            selectedVoice={voiceName} // Current selected voice
                            onVoiceChange={setVoiceName} // Handler to update selected voice
                        />
                    )}
                    {!isTTS && (
                        <select id="promptS</label>elect"
                            onChange={(e) => {
                                handlePromptChange(e.target.value);
                                setSelectedPrompt(e.target.options[e.target.selectedIndex].text);
                                setSelectedPromptFullText(e.target.value);
                            }}
                            style={{ marginLeft: '2px', padding: '2px', fontSize: '16px' }}
                        >
                            <option value="NA">Select Prompt</option>
                            {genaiPrompts.map((prompt) => (
                                <option key={prompt.id} value={prompt.fullText}>{prompt.tag}</option>
                            ))}
                        </select>
                    )}
                    <label>
                        <input
                            type="checkbox"
                            checked={autoPrompt}
                            onChange={(e) => setAutoPrompt(e.target.checked)}
                        />
                        AutoAI
                    </label>
                    {!isTTS && (
                        <button
                            className="signonpagebutton"
                            onClick={() => handleEditPrompt()}
                            style={{ padding: '10px', background: 'lightblue', fontSize: '16px' }}
                        >
                            <FaEdit />
                        </button>
                    )}
                    <button
                        onClick={handleGenerate}
                        className="signonpagebutton"
                        style={{ marginLeft: '20px', padding: '15px 20px', fontSize: '16px' }}
                        disabled={
                            isGenerating ||
                            isGeneratingGemini ||
                            isGeneratingAnthropic ||
                            isGeneratingo1Mini ||
                            isGeneratingo1 ||
                            isGeneratingImage_Dall_e_3 ||
                            isGeneratingTTS ||
                            isGeneratingMistral ||
                            isGeneratingLlama ||
                            isGeneratingGpt4Turbo
                        }
                    >
                        {isGenerating ||
                            isGeneratingGemini ||
                            isGeneratingAnthropic ||
                            isGeneratingo1Mini ||
                            isGeneratingo1 ||
                            isGeneratingImage_Dall_e_3 ||
                            isGeneratingTTS ||
                            isGeneratingMistral ||
                            isGeneratingLlama ||
                            isGeneratingGpt4Turbo ||
                            isGeneratingGeminiFast ||
                            isGeneratingPerplexity ||
                            isGeneratingPerplexityFast ||
                            isGeneratingGpt4oMini ? (
                            <FaSpinner className="spinning" />
                        ) : (
                            'GenAI'
                        )}
                    </button>
                    &nbsp; &nbsp;
                    {!GenAIParameter ? (
                        <button className='signoutbutton' onClick={() => setShowMainApp(!showMainApp)}>
                            <FaArrowLeft />
                        </button>
                    ) : (
                        <button className='signoutbutton' onClick={handleSignOut}><FaSignOutAlt /> </button>
                    )}
                </div>
                <label>
                    Limit:
                    <input
                        type="number"
                        onBlur={(event) => handleLimitChange(event)}
                        onKeyDown={(event) => (event.key === "Enter" || event.key === "Tab") && handleLimitChange(event)}
                        defaultValue={dataLimit}
                        style={{ width: "50px", margin: "0 10px" }}
                        min={1}
                    />
                </label>
                <input
                    type="text"
                    onKeyDown={(event) => (event.key === "Enter" || event.key === "Tab") && handleVectorSearchChange(event)}
                    placeholder="Semantic or Vector Search"
                    style={{ width: '30%', padding: '10px', border: '2px', fontSize: '16px' }}
                />
                <input
                    type="text"
                    onKeyDown={(event) => (event.key === "Enter" || event.key === "Tab") && handleSearchChange(event)}
                    placeholder="Keyword Search"
                    style={{ width: '30%', padding: '10px', marginLeft: '5px', border: '2px', fontSize: '16px' }}
                />

                <select
                    value={searchModel}
                    onChange={(e) => handleModelChange(e.target.value)}
                    style={{ marginLeft: '2px', padding: '2px', fontSize: '16px' }}
                >
                    <option value="All">All</option>
                    <option value="chatgpt-4o-latest">ChatGPT</option>
                    <option value="gemini-1.5-pro-002">Gemini</option>
                    <option value="gemini-1.5-pro-exp-0827">gemini-1.5-pro-exp-0827</option>
                    <option value="claude-3-5-sonnet-20240620">Claude</option>
                    <option value="o1-mini">o1-mini</option>
                    <option value="o1-preview">o1</option>
                    <option value="azure-tts">TTS</option>
                    <option value="dall-e-3">IMAGE</option>
                    <option value="Mistral-large-2407">Mistral</option>
                    <option value="meta-llama-3.1-405b-instruct">Llama</option>
                    <option value="gpt-4-turbo">Gpt4Turbo</option>
                    <option value="gpt-4o-mini">Gpt4oMini</option>
                    <option value="gemini-flash-fast">GeminiFast</option>
                    <option value="perplexity-fast">PerplexityFast</option>
                    <option value="perplexity">Perplexity</option>
                </select>
                {showEditPopup && (
                    <div style={{ border: '4px' }}>
                        <div className="popup-inner">
                            <br />
                            <h3>Add/Edit Prompt</h3>
                            <label>Tag:</label>
                            <input
                                type="text"
                                value={editPromptTag}
                                onChange={(e) => setEditPromptTag(e.target.value)}
                                className="popup-input"
                            />
                            <br />
                            <textarea
                                value={editPromptFullText}
                                style={{ height: '100px', width: '96%' }}
                                onChange={(e) => setEditPromptFullText(e.target.value)}
                                className="popup-textarea"
                            />
                            <div>
                                <button onClick={handleSavePrompt} className="signinbutton">Save</button>
                                <button onClick={() => setShowEditPopup(false)} className="signoutbutton">Cancel</button>
                            </div>
                            <br />
                            <br />
                        </div>
                    </div>
                )}
                {/* **Display Generated Response** 
          {generatedResponse && (
            <div style={{ marginTop: '20px', border: '1px solid #ccc', padding: '20px', borderRadius: '5px' }}>
              <h3>Response is generated, click Refresh button to see results</h3>
            </div>
          )}*/}

                {/* **Existing Data Display** */}
                <div>
                    {isLoading && <p> Loading Data...</p>}
                    {!isLoading && <div>
                        {genaiData.map((item) => (
                            <div key={item.createdDateTime}>
                                <div style={{ border: "1px dotted black", padding: "2px", backgroundColor: "#e4ede8" }}>
                                    <h4 style={{ color: "brown" }}>
                                        <span style={{ color: "#a3780a", fontWeight: "bold" }}> Prompt </span>
                                        @ <span style={{ color: "black", fontSize: "16px" }}>{new Date(item.createdDateTime).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })}</span>
                                        &nbsp;
                                        on <span style={{ color: "grey", fontSize: "16px" }}>{new Date(item.createdDateTime).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                        &nbsp;&nbsp;
                                        <span style={{ color: "blue", fontSize: "16px" }}>{item.model}   </span>
                                        &nbsp;
                                        <button onClick={() => {
                                            const updatedData = genaiData.map(dataItem => {
                                                if (dataItem.id === item.id) {
                                                    return { ...dataItem, showRawQuestion: !dataItem.showRawQuestion };
                                                }
                                                return dataItem;
                                            });
                                            setGenaiData(updatedData);
                                        }}>
                                            {item.showRawQuestion ? <FaMarkdown /> : <FaEnvelopeOpenText />}
                                        </button>
                                    </h4>
                                    <div style={{ fontSize: '16px' }}>
                                        {item.showRawQuestion ? item.question : renderQuestion(item.question)}
                                    </div>
                                </div>
                                <div style={{ border: "1px solid black" }}>
                                    <div style={{ color: "green", fontWeight: "bold" }}>---- Response ----
                                        {item.model !== 'dall-e-3' && item.model !== 'azure-tts' && (
                                            <button className="signgooglepagebutton" onClick={() => synthesizeSpeech(item.answer, item.language || "English")}><FaHeadphones /></button>
                                        )}
                                        &nbsp; &nbsp; &nbsp;
                                        <button onClick={() => {
                                            const updatedData = genaiData.map(dataItem => {
                                                if (dataItem.id === item.id) {
                                                    return { ...dataItem, showRawAnswer: !dataItem.showRawAnswer };
                                                }
                                                return dataItem;
                                            });
                                            setGenaiData(updatedData);
                                        }}>
                                            {item.showRawAnswer ? <FaMarkdown /> : <FaEnvelopeOpenText />}
                                        </button>
                                    </div>
                                    <div style={{ fontSize: '16px' }}>
                                        {item.showRawAnswer ? item.answer : <ReactMarkdown>{item.answer}</ReactMarkdown>}
                                    </div>
                                </div>
                                <br />
                                <br />
                            </div>
                        ))}
                        <button className="fetchButton" onClick={fetchMoreData} style={{ marginTop: '20px', padding: '10px 20px', fontSize: '16px' }}>
                            Show more information
                        </button>
                    </div>}
                </div>
            </div>
        </div >
    );
};

export default GenAIApp;
