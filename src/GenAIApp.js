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
import MarkdownIt from 'markdown-it';
import MdEditor from 'react-markdown-editor-lite';
// import style manually
import 'react-markdown-editor-lite/lib/index.css';

const speechKey = process.env.REACT_APP_AZURE_SPEECH_API_KEY;
const serviceRegion = 'eastus';
const isiPhone = /iPhone/i.test(navigator.userAgent);
console.log(isiPhone);

let searchQuery = '';
let searchModel = 'All';
let dataLimit = 11;
let promptSuggestion = 'NA';
let autoPromptInput = '';
let fullPromptInput = '';
let autoPromptSeparator = '### all the text from below is strictly for reference and prompt purpose to answer the question asked above this line. ######### '
let questionTrimLength = 200;
let appendPrompt = ' ';

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
    const [isOpenAI, setIsOpenAI] = useState(false);
    const [isAnthropic, setIsAnthropic] = useState(true);
    const [isGemini, setIsGemini] = useState(true);
    const [isGpto1Mini, setIsGpto1Mini] = useState(true);
    const [isLlama, setIsLlama] = useState(false);
    const [isMistral, setIsMistral] = useState(false);
    const [isGpt4Turbo, setIsGpt4Turbo] = useState(false);
    const [isGeminiFast, setIsGeminiFast] = useState(false);
    const [isPerplexityFast, setIsPerplexityFast] = useState(false);
    const [isPerplexity, setIsPerplexity] = useState(false);
    const [isCodestral, setIsCodestral] = useState(false);
    const [isGeneratingGeminiFast, setIsGeneratingGeminiFast] = useState(false);
    const [isImage_Dall_e_3, setIsImage_Dall_e_3] = useState(false);
    const [isTTS, setIsTTS] = useState(false);
    const [isGeneratingTTS, setIsGeneratingTTS] = useState(false);
    const [iso1, setIso1] = useState(false); // New state for o1
    const [isGeneratingo1, setIsGeneratingo1] = useState(false);
    const [isGeneratingMistral, setIsGeneratingMistral] = useState(false);
    const [isGeneratingLlama, setIsGeneratingLlama] = useState(false);
    const [isGeneratingGpt4Turbo, setIsGeneratingGpt4Turbo] = useState(false);
    const [isGeneratingPerplexityFast, setIsGeneratingPerplexityFast] = useState(false);
    const [isGeneratingPerplexity, setIsGeneratingPerplexity] = useState(false);
    const [isGeneratingCodeStral, setIsGeneratingCodeStral] = useState(false);
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
    const [showMistral, setShowMistral] = useState(false);
    const [showLlama, setShowLlama] = useState(false);
    const [showGpt4oMini, setShowGpt4oMini] = useState(false);
    const [showGeminiFast, setShowGeminiFast] = useState(true);
    const [showPerplexityFast, setShowPerplexityFast] = useState(false);
    const [showPerplexity, setShowPerplexity] = useState(true);
    const [showCodeStral, setShowCodeStral] = useState(true);
    const [showGemini, setShowGemini] = useState(true);
    const [showAnthropic, setShowAnthropic] = useState(true);
    const [showOpenAI, setShowOpenAI] = useState(true);
    const [showo1, setShowo1] = useState(false);
    const [showImageDallE3, setShowImageDallE3] = useState(false);
    const [showTTS, setShowTTS] = useState(false);
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
    const [modelCodestralApi, setModelCodestralApi] = useState('mistral-codestral-api'); // New state
    const [autoPrompt, setAutoPrompt] = useState(true);
    const [showSaveButton, setShowSaveButton] = useState(false);
    const [showSourceDocument, setShowSourceDocument] = useState(false);
    const mdParser = new MarkdownIt(/* Markdown-it options */);

    // Add new state variables for Claude-Haiku
    const [isClaudeHaiku, setIsClaudeHaiku] = useState(false);
    const [isGeneratingClaudeHaiku, setIsGeneratingClaudeHaiku] = useState(false);

    // Add showClaudeHaiku state variable
    const [showClaudeHaiku, setShowClaudeHaiku] = useState(true); // Set to true or false as needed

    // Add new state variables for Sambanova
    const [isSambanova, setIsSambanova] = useState(true);
    const [isGeneratingSambanova, setIsGeneratingSambanova] = useState(false);
    const [showSambanova, setShowSambanova] = useState(false);
    const [modelSambanova, setModelSambanova] = useState('sambanova');

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
            const currentDateTime = new Date();
            const promptSize = editPromptFullText.length; // Calculate the size of the prompt

            if (!user) {
                console.error("No user is signed in");
                return;
            }
            const genaiCollection = collection(db, 'genai', user.uid, 'prompts');
            if (selectedPrompt == 'NA' || selectedPrompt == null) {
                console.log('Adding new prompt');
                const newDocRef = await addDoc(genaiCollection, {
                    tag: editPromptTag,
                    fullText: editPromptFullText,
                    createdDateTime: currentDateTime,
                    modifiedDateTime: currentDateTime,
                    size: promptSize
                });
                docId = newDocRef.id;
            } else {
                console.log('Updating prompt');
                const q = query(genaiCollection, where('tag', '==', selectedPrompt), limit(1));
                const genaiSnapshot = await getDocs(q);
                const genaiList = genaiSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const docRef = doc(db, 'genai', user.uid, 'prompts', genaiList[0].id);
                await updateDoc(docRef, {
                    tag: editPromptTag,
                    fullText: editPromptFullText,
                    modifiedDateTime: currentDateTime,
                    size: promptSize
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
        const marker = '###';
        const markerIndex = question.indexOf(marker);
        if (markerIndex !== -1) {
            return question.substring(0, Math.min(markerIndex, questionTrimLength));
        }
        else {
            return question.substring(0, questionTrimLength);
        }
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
                setEmail(currentUser.email);
                console.log('User is signed in:', currentUser.uid);
                // Fetch data for the authenticated user
                fetchData(currentUser.uid);
                fetchPrompts(currentUser.uid);
                await fetchGenAIParameters(currentUser.uid);
            }
            else {
                console.log('No user is signed in');
            }
        });
        return () => unsubscribe();
    }, [showEditPopup]);

    const fetchGenAIParameters = async (firebaseUserID) => {
        try {
            console.log('Fetching genai parameters...');
            const configurationCollection = collection(db, 'genai', firebaseUserID, 'configuration');
            const q = query(configurationCollection, where('setup', '==', 'genai'));
            const voiceNamesSnapshot = await getDocs(q);
            voiceNamesSnapshot.forEach(doc => {
                const data = doc.data();
                console.log('Data:', data.temperature, data.top_p);
                if (data.temperature !== undefined) setTemperature(data.temperature);
                if (data.top_p !== undefined) setTop_p(data.top_p);
                if (data.autoPrompt !== undefined) setAutoPrompt(data.autoPrompt);
                if (data.autoPromptLimit !== undefined) setAutoPromptLimit(data.autoPromptLimit);
                if (data.dataLimit !== undefined) dataLimit = data.dataLimit;
                if (data.isAnthropic !== undefined) setIsAnthropic(data.isAnthropic);
                if (data.isGemini !== undefined) setIsGemini(data.isGemini);
                if (data.isOpenAI !== undefined) setIsOpenAI(data.isOpenAI);
                if (data.isGpto1Mini !== undefined) setIsGpto1Mini(data.isGpto1Mini);
                if (data.iso1 !== undefined) setIso1(data.iso1);
                if (data.isImage_Dall_e_3 !== undefined) setIsImage_Dall_e_3(data.isImage_Dall_e_3);
                if (data.isTTS !== undefined) setIsTTS(data.isTTS);
                if (data.isLlama !== undefined) setIsLlama(data.isLlama);
                if (data.isMistral !== undefined) setIsMistral(data.isMistral);
                if (data.isGpt4Turbo !== undefined) setIsGpt4Turbo(data.isGpt4Turbo);
                if (data.isGpt4oMini !== undefined) setIsGpt4oMini(data.isGpt4oMini);
                if (data.isGeminiFast !== undefined) setIsGeminiFast(data.isGeminiFast);
                if (data.isPerplexityFast !== undefined) setIsPerplexityFast(data.isPerplexityFast);
                if (data.isPerplexity !== undefined) setIsPerplexity(data.isPerplexity);
                if (data.isCodestral !== undefined) setIsCodestral(data.isCodestral);
                if (data.isClaudeHaiku !== undefined) setIsClaudeHaiku(data.isClaudeHaiku);
                if (data.isSambanova !== undefined) setIsSambanova(data.isSambanova);
                if (data.showAnthropic !== undefined) setShowAnthropic(data.showAnthropic);
                if (data.showGemini !== undefined) setShowGemini(data.showGemini);
                if (data.showOpenAI !== undefined) setShowOpenAI(data.showOpenAI);
                if (data.showGpt4Turbo !== undefined) setShowGpt4Turbo(data.showGpt4Turbo);
                if (data.showMistral !== undefined) setShowMistral(data.showMistral);
                if (data.showPerplexityFast !== undefined) setShowPerplexityFast(data.showPerplexityFast);
                if (data.showGpt4oMini !== undefined) setShowGpt4oMini(data.showGpt4oMini);
                if (data.showGeminiFast !== undefined) setShowGeminiFast(data.showGeminiFast);
                if (data.showCodeStral !== undefined) setShowCodeStral(data.showCodeStral);
                if (data.showLlama !== undefined) setShowLlama(data.showLlama);
                if (data.showo1 !== undefined) setShowo1(data.showo1);
                if (data.showo1Mini !== undefined) setShowo1Mini(data.showo1Mini);
                if (data.showClaudeHaiku !== undefined) setShowClaudeHaiku(data.showClaudeHaiku);
                if (data.showSambanova !== undefined) setShowSambanova(data.showSambanova);
                if (data.showTTS !== undefined) {
                    setShowTTS(data.showTTS);
                }
                if (data.showImageDallE3 !== undefined) setShowImageDallE3(data.showImageDallE3);
                if (data.autoPromptSeparator !== undefined) {
                    autoPromptSeparator = data.autoPromptSeparator;
                }
                if (data.questionTrimLength !== undefined) {
                    questionTrimLength = data.questionTrimLength;
                }
            });
        } catch (error) {
            console.error("Error fetching genAI parameters: ", error);
            return [];
        }
    };
    // Fetch prompts from Firestore
    const fetchPrompts = async (userID) => {
        try {
            const genaiCollection = collection(db, 'genai', userID, 'prompts');
            const q = query(genaiCollection, limit(1000), orderBy('modifiedDateTime', 'desc'));
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
            const showFullQuestionState = {};
            genaiList.forEach(doc => {
                showFullQuestionState[doc.id] = false;
            });
            setShowFullQuestion(showFullQuestionState);
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

    const [showFullQuestion, setShowFullQuestion] = useState({});

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
        // Clean the text by removing URLs and special characters
        const cleanedArticles = articles
            .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
            .replace(/http?:\/\/[^\s]+/g, '') // Remove URLs
            .replace(/[^a-zA-Z0-9\s]/g, ' ') // Remove special characters
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .trim(); // Remove leading/trailing spaces

        if (isiPhone) {
            window.scrollTo(0, 0);
            alert('Please go to top of the page to check status and listen to the audio');
            callTTSAPI(cleanedArticles, process.env.REACT_APP_TTS_API_URL);
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

        const chunks = splitMessage(cleanedArticles);
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
         const genaiList = genaiSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); */
        fullPromptInput = promptValue;
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
            const response = await fetch(`${process.env.REACT_APP_GENAI_API_URL}search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ q: promptInput, uid: user.uid, collection: 'prompts', limit: autoPromptLimit })
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
            setEditPromptFullText(fullTexts.join("\n"));
            const promptTag = docsSnapshot.docs.map(doc => doc.data().tag);
            setEditPromptTag(promptTag);
            console.log('Edit Prompt:', editPromptTag);
            console.log('Select Prompt Tag:', fullTexts);
            setSelectedPrompt(promptTag);
            setShowSourceDocument(true);
            autoPromptInput = promptInput;
            autoPromptInput = autoPromptInput + "\n" + autoPromptSeparator + "\n" + fullTexts.join("\n");
        } catch (error) {
            console.error('Error searching prompts:', error);
            alert(`Error: ${error.message}`);
        }
    };

    // **New Event Handlers for Generate and Refresh**

    // Handler for Generate Button Click
    // **Handler for Generate Button Click**
    const handleGenerate = async () => {
        setShowSourceDocument(false);
        if (!promptInput.trim()) {
            alert('Please enter a prompt.');
            return;
        }

        // Check if at least one model is selected
        if (!isOpenAI && !isAnthropic && !isGemini && !isGpto1Mini && !iso1 && !isImage_Dall_e_3 && !isTTS && !isLlama && !isMistral && !isGpt4Turbo && !isGpt4oMini && !isGeminiFast && !isPerplexityFast && !isPerplexity && !isCodestral && !isClaudeHaiku && !isSambanova) {
            alert('Please select at least one model.');
            return;
        }
        
        if (isSambanova) {
            setIsGeneratingSambanova(true); // Set generating state to true
            callAPI(modelSambanova);
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

        if (isCodestral) {
            setIsGeneratingCodeStral(true); // Set generating state to true
            callAPI(modelCodestralApi);
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

        if (isClaudeHaiku) {
            setIsGeneratingClaudeHaiku(true); // Set generating state to true
            callAPI('Claude-Haiku');
        }

        try {
            const configurationCollection = collection(db, 'genai', user.uid, 'configuration');
            const q = query(configurationCollection, where('setup', '==', 'genai'));
            const configSnapshot = await getDocs(q);
            if (configSnapshot.empty) {
                console.log('No configuration found');
                return;
            }
            configSnapshot.forEach(async (doc) => {
                await updateDoc(doc.ref, {
                    // Model states
                    isOpenAI,
                    isAnthropic,
                    isGemini,
                    isGpto1Mini,
                    isLlama,
                    isMistral,
                    isGpt4Turbo,
                    isGeminiFast,
                    isPerplexityFast,
                    isPerplexity,
                    isCodestral,
                    isClaudeHaiku,
                    iso1,
                    isSambanova, // Add this line

                    // Feature states
                    isTTS,
                    isImage_Dall_e_3,

                    // Parameters
                    temperature,
                    top_p,
                    dataLimit,
                    autoPrompt,

                    // Update timestamp
                    lastUpdated: new Date()
                }, { merge: true });
            });  // Optionally, refresh data

        } catch (error) {
            console.error('Error updating configuration:', error);
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
                let finalPrompt = promptInput;
                if (fullPromptInput.length > 2) {
                    finalPrompt = promptInput + autoPromptSeparator + fullPromptInput;
                }
                response = await fetch(process.env.REACT_APP_GENAI_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ prompt: finalPrompt, model: selectedModel, uid: uid, temperature: temperature, top_p: top_p })
                });
            }
            if (!response.ok) {
                const errorData = await response.json();
                alert(errorData.error + 'Failed to generate content');
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
            if (selectedModel === modelCodestralApi) {
                setIsGeneratingCodeStral(false);
            }
            if (selectedModel === 'Claude-Haiku') {
                setIsGeneratingClaudeHaiku(false);
            }
            if (selectedModel === modelSambanova) {
                setIsGeneratingSambanova(false);
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
                setIsCodestral(false);
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
            setShowSaveButton(true);
            setEditPromptTag(selectedPrompt);
            setEditPromptFullText(selectedPromptFullText);
        }
    };

    const handleEditSource = async () => {
        if (selectedPrompt) {
            setShowSaveButton(false);
            setShowEditPopup(true);
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

    // Update saveReaction function to include docId
    const saveReaction = async (docId, reaction) => {
        try {
            const docRef = doc(db, 'genai', uid, 'MyGenAI', docId);
            await updateDoc(docRef, {
                reaction: reaction,
                updatedAt: new Date()
            });

            // Update local state to reflect the change
            const updatedData = genaiData.map(item => {
                if (item.id === docId) {
                    return { ...item, reaction: reaction };
                }
                return item;
            });
            setGenaiData(updatedData);
        } catch (error) {
            console.error('Error saving reaction:', error);
        }
    };

    return (
        <div>
            <div className={`main-content ${showEditPopup ? 'dimmed' : ''}`}>
                <div>
                    {email == 'erpgenai@gmail.com' &&
                        (<h3>This site is created by Sharath K for Demo purpose only.</h3>)
                    }
                    <textarea
                        className="promptInput"
                        value={promptInput}
                        onChange={(e) => setPromptInput(e.target.value)}
                        placeholder="Enter your prompt here..."
                    />
                </div>
                <div style={{ marginBottom: '20px' }}>
                   {showSambanova && (
                        <button className={isSambanova ? 'button_selected' : 'button'} onClick={() => setIsSambanova(!isSambanova)}>
                            <label className={isGeneratingSambanova ? 'flashing' : ''}>Llama</label>
                        </button>
                    )}
                    {showOpenAI && (
                        <button className={isOpenAI ? 'button_selected' : 'button'} onClick={() => setIsOpenAI(!isOpenAI)}>
                            <label className={isGenerating ? 'flashing' : ''}>ChatGPT</label>
                        </button>
                    )}
                    {showAnthropic && (
                        <button className={isAnthropic ? 'button_selected' : 'button'} onClick={() => setIsAnthropic(!isAnthropic)}>
                            <label className={isGeneratingAnthropic ? 'flashing' : ''}>Claude</label>
                        </button>
                    )}
                    {showGemini && (
                        <button className={isGemini ? 'button_selected' : 'button'} onClick={() => setIsGemini(!isGemini)}>
                            <label className={isGeneratingGemini ? 'flashing' : ''}>Gemini</label>
                        </button>
                    )}
                    {showo1Mini && (
                        <button className={isGpto1Mini ? 'button_selected' : 'button'} onClick={() => setIsGpto1Mini(!isGpto1Mini)}>
                            <label className={isGeneratingo1Mini ? 'flashing' : ''}>o1-mini</label>
                        </button>
                    )}
                    {showMistral && (
                        <button className={isMistral ? 'button_selected' : 'button'} onClick={() => setIsMistral(!isMistral)}>
                            <label className={isGeneratingMistral ? 'flashing' : ''}>Mistral</label>
                        </button>
                    )}
                    {showLlama && (
                        <button className={isLlama ? 'button_selected' : 'button'} onClick={() => setIsLlama(!isLlama)}>
                            <label className={isGeneratingLlama ? 'flashing' : ''}>Llama(405B)</label>
                        </button>
                    )}
                    {showGpt4Turbo && (
                        <button className={isGpt4Turbo ? 'button_selected' : 'button'} onClick={() => setIsGpt4Turbo(!isGpt4Turbo)}>
                            <label className={isGeneratingGpt4Turbo ? 'flashing' : ''}>Gpt4Turbo</label>
                        </button>
                    )}
                    {showGeminiFast && (
                        <button className={isGeminiFast ? 'button_selected' : 'button'} onClick={() => setIsGeminiFast(!isGeminiFast)}>
                            <label className={isGeneratingGeminiFast ? 'flashing' : ''}>Gemini-Fast</label>
                        </button>
                    )}
                    {showGpt4oMini && (
                        <button className={isGpt4oMini ? 'button_selected' : 'button'} onClick={() => setIsGpt4oMini(!isGpt4oMini)}>
                            <label className={isGeneratingGpt4oMini ? 'flashing' : ''}>Gpt4oMini</label>
                        </button>
                    )}
                    {showo1 && (
                        <button className={iso1 ? 'button_selected' : 'button'} onClick={() => setIso1(!iso1)}>
                            <label className={isGeneratingo1 ? 'flashing' : ''}>o1</label>
                        </button>
                    )}
                    {showPerplexityFast && (
                        <button className={isPerplexityFast ? 'button_selected' : 'button'} onClick={() => setIsPerplexityFast(!isPerplexityFast)}>
                            <label className={isGeneratingPerplexityFast ? 'flashing' : ''}>Perplexity-Fast</label>
                        </button>
                    )}
                    {showPerplexity && (
                        <button className={isPerplexity ? 'button_selected' : 'button'} onClick={() => setIsPerplexity(!isPerplexity)}>
                            <label className={isGeneratingPerplexity ? 'flashing' : ''}>Plxty</label>
                        </button>
                    )}
                    {showCodeStral && (
                        <button className={isCodestral ? 'button_selected' : 'button'} onClick={() => setIsCodestral(!isCodestral)}>
                            <label className={isGeneratingCodeStral ? 'flashing' : ''}>CodeStral</label>
                        </button>
                    )}
                    {showClaudeHaiku && (
                        <button className={isClaudeHaiku ? 'button_selected' : 'button'} onClick={() => setIsClaudeHaiku(!isClaudeHaiku)}>
                            <label className={isGeneratingClaudeHaiku ? 'flashing' : ''}>Claude-Haiku</label>
                        </button>
                    )}
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
                    {showImageDallE3 && <button className={isImage_Dall_e_3 ? 'button_selected' : 'button'} onClick={() => handleDall_e_3Change(!isImage_Dall_e_3)}>
                        <label className={isGeneratingImage_Dall_e_3 ? 'flashing' : ''}>IMAGE</label>
                    </button>}
                    {showTTS && (<button className={isTTS ? 'button_selected' : 'button'} onClick={() => handleTTSChange(!isTTS)}>
                        <label className={isGeneratingTTS ? 'flashing' : ''}>TTS</label>
                    </button>)}
                    {isTTS && (
                        <VoiceSelect
                            selectedVoice={voiceName} // Current selected voice
                            onVoiceChange={setVoiceName} // Handler to update selected voice
                        />
                    )}
                    {!isTTS && (
                        <select className="promptDropdownInput" id="promptSelect"
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
                    {!isTTS && (
                        <button
                            className="signonpagebutton"
                            onClick={() => handleEditPrompt()}
                            style={{ padding: '10px', background: 'lightblue', fontSize: '16px' }}
                        >
                            <FaEdit />
                        </button>
                    )}
                    <button className={autoPrompt ? 'button_selected' : 'button'} onClick={() => setAutoPrompt(!autoPrompt)}>
                        AutoPrompt
                    </button>
                    <button
                        onClick={handleGenerate}
                        className="generateButton"
                        style={{ marginLeft: '16px', padding: '9px 9px', fontSize: '16px' }}
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
                            isGeneratingGpt4Turbo ||
                            isGeneratingGeminiFast ||
                            isGeneratingPerplexity ||
                            isGeneratingPerplexityFast ||
                            isGeneratingCodeStral ||
                            isGeneratingGpt4oMini ||
                            isGeneratingClaudeHaiku ||
                            isGeneratingSambanova
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
                            isGeneratingCodeStral ||
                            isGeneratingGpt4oMini ||
                            isGeneratingClaudeHaiku ||
                            isGeneratingSambanova ? (
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
                    {autoPrompt && selectedPrompt && showSourceDocument && (
                        <div style={{ marginTop: '10px', fontSize: '16px' }}>
                            Source document(s): <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleEditSource();
                                }}
                                className="sourceDocumentButton"
                            >
                                {selectedPrompt}

                            </button>
                        </div>
                    )}
                </div>
                <label>
                    Limit:
                    <input
                        className="limitInput"
                        type="number"
                        onBlur={(event) => handleLimitChange(event)}
                        onKeyDown={(event) => (event.key === "Enter" || event.key === "Tab") && handleLimitChange(event)}
                        defaultValue={dataLimit}
                        min={1}
                    />
                </label>
                <input
                    className="searchInput"
                    type="text"
                    onKeyDown={(event) => (event.key === "Enter" || event.key === "Tab") && handleVectorSearchChange(event)}
                    placeholder="Semantic or Vector Search"
                />
                <input
                    className="searchInput"
                    type="text"
                    onKeyDown={(event) => (event.key === "Enter" || event.key === "Tab") && handleSearchChange(event)}
                    placeholder="Keyword Search"
                />

                <select
                    className="modelInput"
                    value={searchModel}
                    onChange={(e) => handleModelChange(e.target.value)}
                    style={{ marginLeft: '2px', padding: '2px', fontSize: '16px' }}
                >
                    <option value="All">All</option>
                    <option value="chatgpt-4o-latest">ChatGPT</option>
                    <option value="gemini-1.5-pro-002">Gemini</option>
                    <option value="claude-3-5-sonnet-latest">Claude</option>
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
                    <option value="codestral">CodeStral</option>
                    <option value="Claude-Haiku">Claude-Haiku</option>
                    <option value="sambanova-1">Sambanova</option>
                </select>
                {showEditPopup && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <br />
                            <h3>Add/Edit Prompt</h3>
                            <label>Tag:</label>
                            <input
                                type="text"
                                value={editPromptTag}
                                onChange={(e) => setEditPromptTag(e.target.value)}
                                className="promptTag"
                            />
                            <br />
                            <MdEditor
                                style={{ height: '500px', fontSize: '2rem' }}
                                value={editPromptFullText}
                                renderHTML={editPromptFullText => mdParser.render(editPromptFullText)}
                                onChange={({ text }) => setEditPromptFullText(text)}
                                config={{ view: { menu: true, md: false, html: true } }}
                            />
                            <div>
                                {showSaveButton && (<button onClick={handleSavePrompt} className="signinbutton">Save</button>)}
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
                            <div className="outputDetailsFormat" key={item.createdDateTime}>
                                <div className="responseFormat">
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
                                        {item.showRawQuestion ? item.question : (showFullQuestion[item.id] ? <ReactMarkdown>{item.question}</ReactMarkdown> : <ReactMarkdown>{getQuestionSubstring(item.question)}</ReactMarkdown>)}
                                    </div>
                                    <button onClick={() => {
                                        setShowFullQuestion(prev => ({
                                            ...prev,
                                            [item.id]: !prev[item.id]
                                        }));
                                    }}>            {showFullQuestion[item.id] ? 'Less' : 'More'}
                                    </button>

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
                                        {item.showRawAnswer ? item.answer :                             (<MdEditor
                                value={editPromptFullText}
                                renderHTML={editPromptFullText => mdParser.render(item.answer)}
                                config={{ view: { menu: false, md: false, html: true } }}
                            />)}
                                    </div>

                                    <br />
                                    <br />
                                    {/* Add reaction buttons JSX */}
                                    <div className="reaction-buttons">
                                        <button
                                            className={`reaction-btn ${item.reaction === 'love' ? 'active' : ''}`}
                                            onClick={() => saveReaction(item.id, 'love')}
                                        >
                                            👍👍 Helpful
                                        </button>
                                        <button
                                            className={`reaction-btn ${item.reaction === 'like' ? 'active' : ''}`}
                                            onClick={() => saveReaction(item.id, 'like')}
                                        >
                                            👍 Informative
                                        </button>
                                        <button
                                            className={`reaction-btn ${item.reaction === 'improve' ? 'active' : ''}`}
                                            onClick={() => saveReaction(item.id, 'improve')}
                                        >
                                            🤔 Could be better
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button className="fetchButton" onClick={fetchMoreData} style={{ marginTop: '20px', padding: '10px 20px', fontSize: '16px' }}>
                            Show more information
                        </button>
                    </div>}
                </div>
            </div>
        </div>
    );
};

export default GenAIApp;
