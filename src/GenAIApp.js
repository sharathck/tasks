import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import * as speechsdk from 'microsoft-cognitiveservices-speech-sdk';
import { FaPlay, FaReadme, FaArrowLeft, FaSignOutAlt, FaSpinner, FaCloudDownloadAlt, FaEdit, FaMarkdown, FaEnvelopeOpenText, FaHeadphones, FaYoutube, FaPrint, FaSyncAlt } from 'react-icons/fa';
import './GenAIApp.css';
import { collection, doc, where, addDoc, getDocs, getDoc, query, orderBy, startAfter, limit, updateDoc } from 'firebase/firestore';
import {
    onAuthStateChanged,
    signOut,
} from 'firebase/auth';
import App from './App';
import { auth, db, vertexAI } from './Firebase';
import VoiceSelect from './VoiceSelect';
import Homework from "./Homework";
import MarkdownIt from 'markdown-it';
import MdEditor from 'react-markdown-editor-lite';
// import style manually
import 'react-markdown-editor-lite/lib/index.css';
import youtubeIcon from './youtube.png';
import tasksIcon from './todo.jpg';
import { getGenerativeModel } from "firebase/vertexai";

const speechKey = process.env.REACT_APP_AZURE_SPEECH_API_KEY;
const serviceRegion = 'eastus';
const isiPhone = /iPhone/i.test(navigator.userAgent);
console.log(isiPhone);
let searchQuery = '';
let promptName = '';
let invocationType = '';
let searchModel = 'All';
let userID = '';
let dataLimit = 51;
let youtubeContentInput = '';
let generatedDocID = '';
let ttsGeneratedDocID = '';
let imageGenerationPrompt = '';
let imagePromptsGenerationInput = '';
let promptSuggestion = 'NA';
let autoPromptInput = '';
let youtubePromptInput = '';
let youtubeDescriptionPromptInput = '';
let googleSearchPromptText = '';
let googleSearchPromptInput = '';
let youtubeSelected = false;
let imageGenerationPromptInput = '';
let stories_image_generation_prompt = '';
let usaNewsPrompt = '';
let techNewsPrompt = '';
let reviewsPromptInput = '';
let firebaseAPI = false;
let voiceInstructions = 'Voice Affect: Professional news reader quality pronunciation.\n\nTone: Confident and cheerful.\n\nPacing: Steady and measured.\n\nEmotion: Happy tone.\n\nPronunciation: go easy on letter s in words so that you can avoid hissing sound.\n\nPauses: Use thoughtful pauses.';
let imagesSearchPrompt = 'For the following content, I would like to search for images for my reserach project. Please divide following content in 5-10 logical and relevant image descriptions that I can use to search in google images.::: For each image description, include clickable url to search google images ::::: below is the full content ::::: ';
let fullPromptInput = '';
let autoPromptSeparator = '### all the text from below is strictly for reference and prompt purpose to answer the question asked above this line. ######### '
let questionTrimLength = 200;
let appendPrompt = ' ';
let imagePromptInput = '';
let imageSelected = false;
let homeWorkInput = '';
let quizInput = '';
let quizMultipleChoicesInput = '';
let chunk_size = 4000;
let silence_break = 900;
let YouTubePrompt = '';
let intelligentQuestionsPrompt = '';
let quizPrompt = '';
let practicePrompt = '';
let quizMultipleChoicesPrompt = '';
let adminUser = false;
let quiz_Multiple_Choices_Label = '';
let genai_stories_label = '';
let genai_image_label = '';
let genai_youtube_label = '';
let genai_tasks_label = '';
let genai_search_label = '';
let genai_audio_label = '';
let genai_autoprompt_label = '';
let latest_info_label = '';
let bedtime_stories_content_input = '';
let story_teller_prompt = '';
let explainInput = '';
let explainPrompt = '';
let answerInput = ''; // New variable for answer input
let answerPrompt = ''; // New variable for answer prompt
let lyricsInput = '';
let lyricsPrompt = '';
let homeWorkTemperture = 0.1;
let homeWorkTop_p = 0.2;
let quizTemperture = 0.1;
let quizTop_p = 0.1;
let quizMultipleChoicesTemperture = 0.1;
let quizMultipleChoicesTop_p = 0.2;
let modelQuiz = 'gpt';
let modelQuizChoices = 'gpt';
let modelHomeWork = 'gpt';
let modelExplain = 'gpt';
let modelAnswer = 'gpt'; // New variable for answer model
let newsSource = 'perplexity';
let searchSource = 'perplexity';
let reviewsPrompt = '';
let vertexAIModelName = '';
let ttsVoiceName = 'en-US-EvelynNeural';
let googleTTSVoiceName = 'en-US-Chirp-HD-F';

const GenAIApp = ({ sourceImageInformation }) => {
    // **State Variables**
    const [isGeneratingImages, setIsGeneratingImages] = useState(false);
    const [isGeneratingYouTubeMusic, setIsGeneratingYouTubeMusic] = useState(false);
    const [isExplain, setIsExplain] = useState(false);
    const [isAnswer, setIsAnswer] = useState(false); // New state for "Answer with Steps"
    const [isLyrics, setIsLyrics] = useState(false);
    const [fetchFromPublic, setFetchFromPublic] = useState(false);
    const [generateGeminiImage, setGenerateGeminiImage] = useState(true);
    const [generateDalleImage, setGenerateDalleImage] = useState(false);
    const [isGeneratingYouTubeBedtimeStory, setIsGeneratingYouTubeBedtimeStory] = useState(false);
    const [showDedicatedDownloadButton, setShowDedicatedDownloadButton] = useState(false);
    const [showBigQueryModelSearch, setShowBigQueryModelSearch] = useState(false);
    const [showDownloadTextButton, setShowDownloadTextButton] = useState(false);
    const [showOnlyAudioTitleDescriptionButton, setShowOnlyAudioTitleDescriptionButton] = useState(false);
    const [genOpenAIImage, setGenOpenAIImage] = useState(true);
    const [sourceImageParameter, setSourceImageParameter] = useState(sourceImageInformation);
    const [genaiData, setGenaiData] = useState([]);
    const [isDownloading, setIsDownloading] = useState();
    const [isLoading, setIsLoading] = useState(false);
    const [lastVisible, setLastVisible] = useState(null); // State for the last visible document
    const [language, setLanguage] = useState("en");
    const [isLiveAudioPlayingPrompt, setIsLiveAudioPlayingPrompt] = useState(false);
    const [isGeneratingYouTubeAudioTitlePrompt, setIsGeneratingYouTubeAudioTitlePrompt] = useState(false);
    // Authentication state
    const [user, setUser] = useState(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [uid, setUid] = useState(null);
    const [promptInput, setPromptInput] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isGeneratingGemini, setIsGeneratingGemini] = useState(false);
    const [isGeneratingAnthropic, setIsGeneratingAnthropic] = useState(false);
    const [isGeneratingoMini, setisGeneratingoMini] = useState(false);
    const [isGeneratingImage_Dall_e_3, setIsGeneratingImage_Dall_e_3] = useState(false);
    const [isChatGPT, setIsChatGPT] = useState(false);
    const [isGeneratingChatGPT, setIsGeneratingChatGPT] = useState(false);
    const [isOpenAI, setIsOpenAI] = useState(false);
    const [isAnthropic, setIsAnthropic] = useState(true);
    const [isClaudeThinking, setIsClaudeThinking] = useState(false);
    const [isGemini, setIsGemini] = useState(true);
    const [isoMini, setIsoMini] = useState(true);
    const [isLlama, setIsLlama] = useState(false);
    const [isMistral, setIsMistral] = useState(false);
    const [isGptTurbo, setIsGptTurbo] = useState(false);
    const [isGeminiSearch, setIsGeminiSearch] = useState(true);
    const [isGeminiFlash, setIsGeminiFlash] = useState(false);
    const [isPerplexityFast, setIsPerplexityFast] = useState(false);
    const [isPerplexity, setIsPerplexity] = useState(false);
    const [isCodestral, setIsCodestral] = useState(false);
    const [isGeneratingGeminiFast, setIsGeneratingGeminiFast] = useState(false);
    const [isGeneratingGeminiSearch, setIsGeneratingGeminiSearch] = useState(false);
    const [isGeneratingGeminiFlash, setIsGeneratingGeminiFlash] = useState(false);
    const [isGeneratingPerplexityFast, setIsGeneratingPerplexityFast] = useState(false);
    const [isGeneratingTTS, setIsGeneratingTTS] = useState(false);
    const [iso1, setIso1] = useState(false); // New state for o1
    const [isGeneratingo, setisGeneratingo] = useState(false);
    const [isGeneratingLlama, setIsGeneratingLlama] = useState(false);
    const [isGeneratingGptTurbo, setIsGeneratingGptTurbo] = useState(false);
    const [isGeneratingPerplexity, setIsGeneratingPerplexity] = useState(false);
    const [isGeneratingCodeStral, setIsGeneratingCodeStral] = useState(false);
    const [isGeneratingMistral, setIsGeneratingMistral] = useState(false);
    const [voiceName, setVoiceName] = useState('en-US-EvelynMultilingualNeural');
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
    const temperatureRef = useRef(temperature);
    const [top_p, setTop_p] = useState(0.8);
    const top_pRef = useRef(top_p);
    const [autoPromptLimit, setAutoPromptLimit] = useState(1);
    const [showTemp, setShowTemp] = useState(false);
    const [showTop_p, setShowTop_p] = useState(false);
    const [showGptTurbo, setShowGptTurbo] = useState(true);
    const [showMistral, setShowMistral] = useState(false);
    const [showLlama, setShowLlama] = useState(false);
    const [showChatGPT, setShowChatGPT] = useState(true);
    const [showGeminiSearch, setShowGeminiSearch] = useState(false);
    const [showGeminiFlash, setShowGeminiFlash] = useState(false);
    const [showPerplexityFast, setShowPerplexityFast] = useState(false);
    const [showPerplexity, setShowPerplexity] = useState(false);
    const [showCodeStral, setShowCodeStral] = useState(false);
    const [showGemini, setShowGemini] = useState(false);
    const [showClaudeThinking, setShowClaudeThinking] = useState(false);
    const [showAnthropic, setShowAnthropic] = useState(false);
    const [showGpt, setshowGpt] = useState(false);
    const [showo, setshowo] = useState(false);
    const [showImageDallE3, setShowImageDallE3] = useState(false);
    const [showTTS, setShowTTS] = useState(false);
    const [showoMini, setshowoMini] = useState(false);
    const [showAutoPrompt, setShowAutoPrompt] = useState(false);
    const [modelAnthropic, setModelAnthropic] = useState('claude');
    const [modelGemini, setModelGemini] = useState('gemini');
    const [modelGpt, setModelGpt] = useState('gpt');
    const [modeloMini, setModeloMini] = useState('o-mini-think');
    const [modelo, setModelo] = useState('o-think');
    const [modelLlama, setModelLlama] = useState('llama');
    const [modelClaudeThinking, setModelClaudeThinking] = useState('claude-think');
    const [modelMistral, setModelMistral] = useState('mistral');
    const [modelChatGPT, setModelChatGPT] = useState('chatgpt-latest');
    const [modelGeminiSearch, setModelGeminiSearch] = useState('gemini-search');
    const [modelGeminiFlash, setModelGeminiFlash] = useState('gemini-think');
    const [modelGptTurbo, setModelGptTurbo] = useState('gpt-real-time');
    const [modelImageDallE3, setModelImageDallE3] = useState('dall-e-3');
    const [modelPerplexityFast, setModelPerplexityFast] = useState('perplexity-think');
    const [modelPerplexity, setModelPerplexity] = useState('perplexity');
    const [modelCodestralApi, setModelCodestralApi] = useState('mistral-codestral-api'); // New state
    const [modelDeepSeekChat, setModelDeepSeekChat] = useState('deepseek-chat');
    const [modelGeminiImage, setModelGeminiImage] = useState('gemini-image');
    const [autoPrompt, setAutoPrompt] = useState(false);
    const [showSaveButton, setShowSaveButton] = useState(true);
    const [showSourceDocument, setShowSourceDocument] = useState(false);
    const [showYouTubeButton, setShowYouTubeButton] = useState(false);
    const [showSimpleAIAgents, setShowSimpleAIAgents] = useState(false);
    const mdParser = new MarkdownIt(/* Markdown-it options */);

    // Add new state variables for Claude-Haiku
    const [isDeepSeekChat, setIsDeepSeekChat] = useState(false);
    const [isGeneratingDeepSeekChat, setIsGeneratingDeepSeekChat] = useState(false);

    // Add showDeepSeekChat state variable
    const [showDeepSeekChat, setShowDeepSeekChat] = useState(false); // Set to true or false as needed

    // Add new state variables for DeepSeekThink
    const [isDeepSeekThink, setIsDeepSeekThink] = useState(false);
    const [isGeneratingDeepSeekThink, setIsGeneratingDeepSeekThink] = useState(false);
    const [showDeepSeekThink, setShowDeepSeekThink] = useState(false);
    const [modelDeepSeekThink, setModelDeepSeekThink] = useState('deepseek-think');

    // Add new state variables near other model state variables
    const [isGroq, setIsGroq] = useState(false);
    const [isGeneratingGroq, setIsGeneratingGroq] = useState(false);
    const [showGroq, setShowGroq] = useState(false);
    const [modelGroq, setModelGroq] = useState('groq');
    const [labelGroq, setLabelGroq] = useState('Llama');

    // Add new state variables for nova after other model state variables
    const [isNova, setIsNova] = useState(false);
    const [isGeneratingNova, setIsGeneratingNova] = useState(false);
    const [showNova, setShowNova] = useState(false);
    const [modelNova, setModelNova] = useState('nova');

    // Add these state variables near other state declarations
    const [labelGpt, setLabelGpt] = useState('ChatGPT');
    const [labelAnthropic, setLabelAnthropic] = useState('Claude');
    const [labelGemini, setLabelGemini] = useState('Gemini');
    const [labeloMini, setLabeloMini] = useState('o3-mini');
    const [labelMistral, setLabelMistral] = useState('Mistral');
    const [labelLlama, setLabelLlama] = useState('Llama(405B)');
    const [labelGptTurbo, setLabelGptTurbo] = useState('ChatGPT RealTime');
    const [labelGeminiSearch, setLabelGeminiSearch] = useState('SearchGenAI');
    const [labelGeminiFlash, setLabelGeminiFlash] = useState('Gemini Flash');
    const [labelChatGPT, setLabelChatGPT] = useState('ChatGPT');
    const [labelo, setLabelo] = useState('o1');
    const [labelPerplexityFast, setLabelPerplexityFast] = useState('Perplexity-Fast');
    const [labelPerplexity, setLabelPerplexity] = useState('Plxty');
    const [labelCodestral, setLabelCodestral] = useState('CodeStral');
    const [labelDeepSeekChat, setLabelDeepSeekChat] = useState('DeepSeek');
    const [labelDeepSeekThink, setLabelDeepSeekThink] = useState('DeepSeek Think');
    const [labelNova, setLabelNova] = useState('Nova');
    const [isYouTubeTitle, setIsYouTubeTitle] = useState(false);
    const [isImagesSearch, setIsImagesSearch] = useState(false);
    const [showImagesSearchWordsButton, setShowImagesSearchWordsButton] = useState(false);
    const [showYouTubeTitleDescriptionButton, setShowYouTubeTitleDescriptionButton] = useState(false);
    const [ishomeWork, setIshomeWork] = useState(false);
    const [isQuiz, setIsQuiz] = useState(false);
    const [showhomeWorkButton, setShowhomeWorkButton] = useState(true);

    // Add state variable for AI Search
    const [isAISearch, setIsAISearch] = useState(false);
    const [showAISearchButton, setShowAISearchButton] = useState(false); // or set based on configuration
    // Add these state variables near other state declarations
    const [isLiveAudioPlaying, setIsLiveAudioPlaying] = useState({});
    const [isGeneratingDownloadableAudio, setIsGeneratingDownloadableAudio] = useState({});
    // Add new state variable for YouTube audio title button
    const [isGeneratingYouTubeAudioTitle, setIsGeneratingYouTubeAudioTitle] = useState({});
    const [showhomeWorkApp, setShowhomeWorkApp] = useState(false);
    const [currentDocId, setCurrentDocId] = useState(null);
    const currentDocIdRef = useRef(currentDocId);

    // Add new state variables after other state variables
    const [showGenAIButton, setShowGenAIButton] = useState(false);
    const [showPromptsDropDown, setShowPromptsDropDown] = useState(false);
    const [showVoiceSelect, setShowVoiceSelect] = useState(false);
    const [showEditPromptButton, setShowEditPromptButton] = useState(false);
    const [showPromptsDropDownAfterSearch, setShowPromptsDropDownAfterSearch] = useState(false);
    const [showBackToAppButton, setShowBackToAppButton] = useState(false);
    // Add new states for Quiz-Multiple Choices
    const [isQuizMultipleChoice, setIsQuizMultipleChoice] = useState(false);
    const [showQuizMultipleChoiceButton, setShowQuizMultipleChoiceButton] = useState(true);

    /* Add new state variables for fetched texts */
    const [practiceButtonLabel, setPracticeButtonLabel] = useState('');
    const [noteText, setNoteText] = useState('');
    const [placeholderText, setPlaceholderText] = useState('');
    const [semanticSearchPlaceholder, setSemanticSearchPlaceholder] = useState('');
    const [keywordSearchPlaceholder, setKeywordSearchPlaceholder] = useState('');
    const [practicePageButtonLabel, setPracticePageButtonLabel] = useState('');
    const [quizButtonLabel, setQuizButtonLabel] = useState('');
    const [speechRate, setSpeechRate] = useState('0%');
    const [speechSilence, setSpeechSilence] = useState(200);
    const [youtubeSpeecRate, setYoutubeSpeechRate] = useState('0%');
    const [youtubeSpeechSilence, setYoutubeSpeechSilence] = useState(200);
    const [storyTellingSpeechRate, setStoryTellingSpeechRate] = useState('-25%');
    const [storyTellingSpeechSilence, setStoryTellingSpeechSilence] = useState(1200);

    // Add refs for speech variables
    const speechRateRef = useRef(speechRate);
    const speechSilenceRef = useRef(speechSilence);
    const youtubeSpeecRateRef = useRef(youtubeSpeecRate);
    const youtubeSpeechSilenceRef = useRef(youtubeSpeechSilence);
    const storyTellingSpeechRateRef = useRef(storyTellingSpeechRate);
    const storyTellingSpeechSilenceRef = useRef(storyTellingSpeechSilence);
    const promptInputRef = useRef(promptInput);

    // Update refs when state changes
    useEffect(() => {
        youtubeSpeecRateRef.current = youtubeSpeecRate;
        youtubeSpeechSilenceRef.current = youtubeSpeechSilence;
        storyTellingSpeechRateRef.current = storyTellingSpeechRate;
        storyTellingSpeechSilenceRef.current = storyTellingSpeechSilence;
        speechRateRef.current = speechRate;
        speechSilenceRef.current = speechSilence;
        promptInputRef.current = promptInput;
        currentDocIdRef.current = currentDocId;
    }, [youtubeSpeecRate, youtubeSpeechSilence, storyTellingSpeechRate, storyTellingSpeechSilence, speechRate, speechSilence, promptInput, currentDocId]);

    // Add new show state variables
    const [showPrint, setShowPrint] = useState(false);

    // Add new state variables after other model state variables
    const [isCerebras, setIsCerebras] = useState(false);
    const [isGeneratingCerebras, setIsGeneratingCerebras] = useState(false);
    const [showCerebras, setShowCerebras] = useState(false);
    const [modelCerebras, setModelCerebras] = useState('llama-c');
    const [labelCerebras, setLabelCerebras] = useState('Llama-C');

    // Add new model "DeepSeek" state variables
    const [isDeepSeek, setIsDeepSeek] = useState(false);
    const [isGeneratingDeepSeek, setIsGeneratingDeepSeek] = useState(false);
    const [showDeepSeek, setShowDeepSeek] = useState(false);
    const [modelDeepSeek, setModelDeepSeek] = useState('DeepSeek');
    const [labelDeepSeek, setLabelDeepSeek] = useState('DS');

    const [labelClaudeThinking, setLabelClaudeThinking] = useState('Claude Think');
    const [isGeneratingClaudeThinking, setIsGeneratingClaudeThinking] = useState(false);


    // Add new state variables with other model states
    const [isGeminiFlashFast, setIsGeminiFlashFast] = useState(false);
    const [isGeneratingGeminiFlashFast, setIsGeneratingGeminiFlashFast] = useState(false);
    const [showGeminiFlashFast, setShowGeminiFlashFast] = useState(false);
    const [modelGeminiFlashFast, setModelGeminiFlashFast] = useState('gemini-flash-fast');
    const [labelGeminiFlashFast, setLabelGeminiFlashFast] = useState('Gemini Fast');

    const [youtubeTitlePrompt, setYoutubeTitlePrompt] = useState(`### Give me the best YouTube Title for the above content`);
    const [youtubeDescriptionPrompt, setYoutubeDescriptionPrompt] = useState(`#### Give me the best YouTube description for the above content, I need exactly one response and don't include any other text or URLs in the response. ----- Text from below is only prompt purpose --- YouTube description should be engaging, detailed, informative, and YouTube search engine optimized and SEO friendly, it can contain special characters, emojis, and numbers to make it more appealing and expressive. Please use the emojis, icons to make it more visually appealing.   Use relevant tags to improve the visibility and reach of your video in Youtube video Description.   Use bullet points, numbered points, lists, and paragraphs to organize Youtube video description.  Bold, italicize, underline, and highlight important information in Youtube video description.   Also, please request users to subscribe and click on bell icon for latest content at the end. `);
    const youtubeDescriptionPromptRef = useRef(youtubeDescriptionPrompt);
    const youtubeTitlePromptRef = useRef(youtubeTitlePrompt);

    useEffect(() => {
        temperatureRef.current = temperature;
        top_pRef.current = top_p;
        youtubeDescriptionPromptRef.current = youtubeDescriptionPrompt;
        youtubeTitlePromptRef.current = youtubeTitlePrompt;
    }, [temperature, top_p, youtubeTitlePrompt, youtubeDescriptionPrompt]);

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
            if (selectedPrompt === 'NA' || selectedPrompt == null) {
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

                if (genaiSnapshot.empty) {
                    console.log('No existing prompt found, adding new one');
                    const newDocRef = await addDoc(genaiCollection, {
                        tag: editPromptTag,
                        fullText: editPromptFullText,
                        createdDateTime: currentDateTime,
                        modifiedDateTime: currentDateTime,
                        size: promptSize
                    });
                    docId = newDocRef.id;
                } else {
                    const docToUpdate = genaiSnapshot.docs[0];
                    const docRef = doc(db, 'genai', user.uid, 'prompts', docToUpdate.id);
                    await updateDoc(docRef, {
                        tag: editPromptTag,
                        fullText: editPromptFullText,
                        modifiedDateTime: currentDateTime,
                        size: promptSize
                    });
                    docId = docToUpdate.id;
                }
            }

            if (docId) {
                await embedPrompt(docId);
            }

            setEditPromptTag('');
            setEditPromptFullText('');
            setShowEditPopup(false);
            await fetchPrompts(user.uid);

        } catch (error) {
            console.error("Error saving prompt: ", error);
            alert('Error saving prompt: ' + error.message);
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
        // if question is undefined or null, return an empty string
        if (!question) {
            return '';
        }
        // if length of the question is less than the limit, return the question
        if (question.length <= questionTrimLength) {
            return question;
        }
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
                userID = currentUser.uid;
                console.log('User is signed in:', currentUser.uid);
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
                console.log('isGeneratingGeminiSearch:', isGeneratingGeminiSearch);

                // Fetch data for the authenticated user
                fetchData(currentUser.uid);
                fetchPrompts(currentUser.uid);
                await checkAdminUsers();
                await fetchGenAIParameters(currentUser.uid);
                await fetchTexts();
                // Set visibility of back button based on admin status
                setShowBackToAppButton(adminUser);
            }
            else {
                console.log('No user is signed in');
            }
        });
        return () => unsubscribe();
    }, [showEditPopup]);

    const checkAdminUsers = async () => {
        console.log('Fetching genai parameters...');
        const configurationCollection = collection(db, 'public');
        const q = query(configurationCollection, where('setup', '==', 'genaiAdmin'));
        const adminSnapshot = await getDocs(q);
        const adminEmails = [];
        adminSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.emailAddresses && Array.isArray(data.emailAddresses)) {
                adminEmails.push(...data.emailAddresses);
            }
        });
        if (adminEmails.includes(auth.currentUser.email)) {
            console.log('Admin user:', auth.currentUser.email);
            adminUser = true;
        } else {
            console.log('Not an admin user:', auth.currentUser.email);
            adminUser = false;
        }
    }
    const fetchGenAIParameters = async (firebaseUserID) => {
        try {
            if (!firebaseUserID) {
                console.error('No user ID provided');
                return;
            }
            let q = '';
            if (adminUser) {
                console.log('Fetching global genai parameters...');
                const configurationCollection = collection(db, 'public');
                q = query(configurationCollection, where('setup', '==', 'genaiAdmin'));
            }
            else {
                console.log('Fetching user specific genai parameters...');
                const configurationCollection = collection(db, 'genai', firebaseUserID, 'configuration');
                q = query(configurationCollection, where('setup', '==', 'genai'));
            }
            const configurationSnapshot = await getDocs(q);
            configurationSnapshot.forEach(doc => {
                const data = doc.data();
                console.log('Fully Array Data:', data);
                console.log('Data:', data.temperature, data.top_p);
                console.log('showGemini:', data.showGemini);
                console.log('showGpt:', data.showGpt);
                console.log('showGptTurbo:', data.showGptTurbo);
                if (data.temperature !== undefined) {
                    setTemperature(data.temperature);
                }
                if (data.top_p !== undefined) {
                    setTop_p(data.top_p);
                }
                if (data.autoPrompt !== undefined) {
                    setAutoPrompt(data.autoPrompt);
                }
                if (data.autoPromptLimit !== undefined) {
                    setAutoPromptLimit(data.autoPromptLimit);
                }
                if (data.dataLimit !== undefined) {
                    dataLimit = data.dataLimit;
                }
                if (data.isGroq !== undefined) {
                    setIsGroq(data.isGroq);
                }
                if (data.isAnthropic !== undefined) {
                    setIsAnthropic(data.isAnthropic);
                }
                if (data.isGemini !== undefined) {
                    setIsGemini(data.isGemini);
                }
                if (data.isOpenAI !== undefined) {
                    setIsOpenAI(data.isOpenAI);
                }
                if (data.isoMini !== undefined) {
                    setIsoMini(data.isoMini);
                }
                if (data.iso1 !== undefined) {
                    setIso1(data.iso1);
                }
                if (data.showImageDallE3 !== undefined) {
                    setShowImageDallE3(data.showImageDallE3);
                }
                if (data.showTTS !== undefined) {
                    setShowTTS(data.showTTS);
                }
                if (data.isLlama !== undefined) {
                    setIsLlama(data.isLlama);
                }
                if (data.isMistral !== undefined) {
                    setIsMistral(data.isMistral);
                }
                if (data.isGptTurbo !== undefined) {
                    setIsGptTurbo(data.isGptTurbo);
                }
                if (data.isChatGPT !== undefined) {
                    setIsChatGPT(data.isChatGPT);
                }
                if (data.isGeminiSearch !== undefined) {
                    setIsGeminiSearch(data.isGeminiSearch);
                }
                if (data.isGeminiFlash !== undefined) {
                    setIsGeminiFlash(data.isGeminiFlash);
                }
                if (data.isPerplexityFast !== undefined) {
                    setIsPerplexityFast(data.isPerplexityFast);
                }
                if (data.isPerplexity !== undefined) {
                    setIsPerplexity(data.isPerplexity);
                }
                if (data.isCodestral !== undefined) {
                    setIsCodestral(data.isCodestral);
                }
                if (data.isDeepSeekChat !== undefined) {
                    setIsDeepSeekChat(data.isDeepSeekChat);
                }
                if (data.isDeepSeekThink !== undefined) {
                    setIsDeepSeekThink(data.isDeepSeekThink);
                }
                if (data.showAnthropic !== undefined) {
                    setShowAnthropic(data.showAnthropic);
                }
                if (data.showGemini !== undefined) {
                    setShowGemini(data.showGemini);
                }
                if (data.showGpt !== undefined) {
                    setshowGpt(data.showGpt);
                }
                if (data.showGptTurbo !== undefined) {
                    // setShowGptTurbo(data.showGptTurbo);
                }
                if (data.showMistral !== undefined) {
                    setShowMistral(data.showMistral);
                }
                if (data.showPerplexityFast !== undefined) {
                    setShowPerplexityFast(data.showPerplexityFast);
                }
                if (data.showPerplexity !== undefined) {
                    setShowPerplexity(data.showPerplexity);
                }
                if (data.showChatGPT !== undefined) {
                    setShowChatGPT(data.showChatGPT);
                }
                if (data.showGeminiSearch !== undefined) {
                    console.log('Setting showGeminiSearch:', data.showGeminiSearch);
                    setShowGeminiSearch(data.showGeminiSearch);
                }
                if (data.showGeminiFlash !== undefined) {
                    setShowGeminiFlash(data.showGeminiFlash);
                }
                if (data.showCodeStral !== undefined) {
                    setShowCodeStral(data.showCodeStral);
                }
                if (data.showLlama !== undefined) {
                    setShowLlama(data.showLlama);
                }
                if (data.showo !== undefined) {
                    setshowo(data.showo);
                }
                if (data.showoMini !== undefined) {
                    setshowoMini(data.showoMini);
                }
                if (data.showDeepSeekChat !== undefined) {
                    setShowDeepSeekChat(data.showDeepSeekChat);
                }
                if (data.showDeepSeekThink !== undefined) {
                    setShowDeepSeekThink(data.showDeepSeekThink);
                }
                if (data.showGroq !== undefined) {
                    setShowGroq(data.showGroq);
                }
                if (data.showNova !== undefined) {
                    setShowNova(data.showNova);
                }
                if (data.labelGroq !== undefined) {
                    setLabelGroq(data.labelGroq);
                }
                if (data.labelGpt !== undefined) {
                    setLabelGpt(data.labelGpt);
                }
                if (data.labelAnthropic !== undefined) {
                    setLabelAnthropic(data.labelAnthropic);
                }
                if (data.labelGemini !== undefined) {
                    setLabelGemini(data.labelGemini);
                }
                if (data.labeloMini !== undefined) {
                    setLabeloMini(data.labeloMini);
                }
                if (data.labelMistral !== undefined) {
                    setLabelMistral(data.labelMistral);
                }
                if (data.labelLlama !== undefined) {
                    setLabelLlama(data.labelLlama);
                }
                if (data.labelGptTurbo !== undefined) {
                    //   setLabelGptTurbo(data.labelGptTurbo);
                }
                if (data.labelGeminiSearch !== undefined) {
                    setLabelGeminiSearch(data.labelGeminiSearch);
                }
                if (data.labelGeminiFlash !== undefined) {
                    setLabelGeminiFlash(data.labelGeminiFlash);
                }
                if (data.labelChatGPT !== undefined) {
                    setLabelChatGPT(data.labelChatGPT);
                }
                if (data.labelo !== undefined) {
                    setLabelo(data.labelo);
                }
                if (data.labelPerplexityFast !== undefined) {
                    setLabelPerplexityFast(data.labelPerplexityFast);
                }
                if (data.labelPerplexity !== undefined) {
                    setLabelPerplexity(data.labelPerplexity);
                }
                if (data.labelCodestral !== undefined) {
                    setLabelCodestral(data.labelCodestral);
                }
                if (data.labelDeepSeekChat !== undefined) {
                    setLabelDeepSeekChat(data.labelDeepSeekChat);
                }
                if (data.labelDeepSeekThink !== undefined) {
                    setLabelDeepSeekThink(data.labelDeepSeekThink);
                }
                if (data.labelNova !== undefined) {
                    setLabelNova(data.labelNova);
                }
                if (data.showYouTubeButton !== undefined) {
                    setShowYouTubeButton(data.showYouTubeButton);
                }
                if (data.showImagesSearchWordsButton !== undefined) {
                    setShowImagesSearchWordsButton(data.showImagesSearchWordsButton);
                }
                if (data.showYouTubeTitleDescriptionButton !== undefined) {
                    setShowYouTubeTitleDescriptionButton(data.showYouTubeTitleDescriptionButton);
                }
                if (data.showhomeWorkButton !== undefined) {
                    setShowhomeWorkButton(data.showhomeWorkButton);
                }
                if (data.voiceName !== undefined) {
                    setVoiceName(data.voiceName);
                }
                if (data.chunk_size !== undefined) {
                    chunk_size = data.chunk_size;
                }
                if (data.silence_break !== undefined) {
                    silence_break = data.silence_break;
                }
                if (data.showAISearchButton !== undefined) {
                    setShowAISearchButton(data.showAISearchButton);
                }
                if (data.showGenAIButton !== undefined) {
                    setShowGenAIButton(data.showGenAIButton);
                }
                if (data.showPromptsDropDown !== undefined) {
                    setShowPromptsDropDown(data.showPromptsDropDown);
                }
                if (data.showVoiceSelect !== undefined) {
                    setShowVoiceSelect(data.showVoiceSelect);
                }
                if (data.showEditPromptButton !== undefined) {
                    setShowEditPromptButton(data.showEditPromptButton);
                }
                if (data.showPromptsDropDownAfterSearch !== undefined) {
                    setShowPromptsDropDownAfterSearch(data.showPromptsDropDownAfterSearch);
                }
                if (data.showSaveButton !== undefined) {
                    setShowSaveButton(data.showSaveButton);
                }
                if (data.showSourceDocument !== undefined) {
                    setShowSourceDocument(data.showSourceDocument);
                }
                if (data.showBackToAppButton !== undefined) {
                    setShowBackToAppButton(data.showBackToAppButton);
                }
                if (data.showAutoPrompt !== undefined) {
                    setShowAutoPrompt(data.showAutoPrompt);
                }
                if (data.showTemp !== undefined) {
                    setShowTemp(data.showTemp);
                }
                if (data.showTop_p !== undefined) {
                    setShowTop_p(data.showTop_p);
                }
                if (data.showPrint !== undefined) {
                    setShowPrint(data.showPrint);
                }
                if (data.isCerebras !== undefined) {
                    setIsCerebras(data.isCerebras);
                }
                if (data.showCerebras !== undefined) {
                    setShowCerebras(data.showCerebras);
                }
                if (data.labelCerebras !== undefined) {
                    setLabelCerebras(data.labelCerebras);
                }
                if (data.showOnlyAudioTitleDescriptionButton !== undefined) {
                    setShowOnlyAudioTitleDescriptionButton(data.showOnlyAudioTitleDescriptionButton);
                }
                if (data.showDedicatedDownloadButton !== undefined) {
                    setShowDedicatedDownloadButton(data.showDedicatedDownloadButton);
                }
                if (data.genOpenAIImage !== undefined) {
                    setGenOpenAIImage(data.genOpenAIImage);
                }
                if (data.speechRate !== undefined) {
                    setSpeechRate(data.speechRate);
                }
                if (data.speechSilence !== undefined) {
                    setSpeechSilence(data.speechSilence);
                }
                if (data.youtubeSpeechRate !== undefined) {
                    setYoutubeSpeechRate(data.youtubeSpeechRate);
                }
                if (data.youtubeSpeechSilence !== undefined) {
                    setYoutubeSpeechSilence(data.youtubeSpeechSilence);
                }
                if (data.storyTellingSpeechRate !== undefined) {
                    setStoryTellingSpeechRate(data.storyTellingSpeechRate);
                }
                if (data.storyTellingSpeechSilence !== undefined) {
                    setStoryTellingSpeechSilence(data.storyTellingSpeechSilence);
                }
                if (data.showDownloadTextButton !== undefined) {
                    setShowDownloadTextButton(data.showDownloadTextButton);
                }
                if (data.showBigQueryModelSearch !== undefined) {
                    setShowBigQueryModelSearch(data.showBigQueryModelSearch);
                }
                if (data.fetchFromPublic !== undefined) {
                    setFetchFromPublic(data.fetchFromPublic);
                }
                if (data.generateGeminiImage !== undefined) {
                    setGenerateGeminiImage(data.generateGeminiImage);
                }
                if (data.generateDalleImage !== undefined) {
                    setGenerateDalleImage(data.generateDalleImage);
                }
                if (data.isDeepSeek !== undefined) {
                    setIsDeepSeek(data.isDeepSeek);
                }
                if (data.showDeepSeek !== undefined) {
                    setShowDeepSeek(data.showDeepSeek);
                }
                if (data.labelDeepSeek !== undefined) {
                    setLabelDeepSeek(data.labelDeepSeek);
                }
                if (data.homeWorkTemperture !== undefined) {
                    homeWorkTemperture = data.homeWorkTemperture;
                }
                if (data.homeWorkTop_p !== undefined) {
                    homeWorkTop_p = data.homeWorkTop_p;
                }
                if (data.quizTemperture !== undefined) {
                    quizTemperture = data.quizTemperture;
                }
                if (data.quizTop_p !== undefined) {
                    quizTop_p = data.quizTop_p;
                }
                if (data.quizMultipleChoicesTemperture !== undefined) {
                    quizMultipleChoicesTemperture = data.quizMultipleChoicesTemperture;
                }
                if (data.quizMultipleChoicesTop_p !== undefined) {
                    quizMultipleChoicesTop_p = data.quizMultipleChoicesTop_p;
                }
                if (data.modelQuiz !== undefined) {
                    modelQuiz = data.modelQuiz;
                }
                if (data.modelQuizChoices !== undefined) {
                    modelQuizChoices = data.modelQuizChoices;
                }
                if (data.modelHomeWork !== undefined) {
                    modelHomeWork = data.modelHomeWork;
                }
                if (data.modelExplain !== undefined) {
                    modelExplain = data.modelExplain;
                }
                if (data.modelAnswer !== undefined) {
                    modelAnswer = data.modelAnswer;
                }
                if (data.isGeminiFlashFast !== undefined) {
                    setIsGeminiFlashFast(data.isGeminiFlashFast);
                }
                if (data.showGeminiFlashFast !== undefined) {
                    setShowGeminiFlashFast(data.showGeminiFlashFast);
                }
                if (data.labelGeminiFlashFast !== undefined) {
                    setLabelGeminiFlashFast(data.labelGeminiFlashFast);
                }
                if (data.isClaudeThinking !== undefined) {
                    setIsClaudeThinking(data.isClaudeThinking);
                }
                if (data.showClaudeThinking !== undefined) {
                    setShowClaudeThinking(data.showClaudeThinking);
                }
                if (data.labelClaudeThinking !== undefined) {
                    setLabelClaudeThinking(data.labelClaudeThinking);
                }

                if (data.showSimpleAIAgents !== undefined) {
                    setShowSimpleAIAgents(data.showSimpleAIAgents);
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

    const handleInvocationChange = (event) => {
        invocationType = event.target.value;
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
        console.log('Before Splitting message:', msg);
        for (let i = 0; i < msg.length; i += chunkSize) {
            console.log('Part ', i, '  message:', msg.substring(i, i + chunkSize));
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
            .replace(/[#:\-*]/g, ' ')
            .replace(/[&]/g, ' and ')
            .replace(/[<>]/g, ' ')
            //       .replace(/["]/g, '&quot;')
            //       .replace(/[']/g, '&apos;')
            .trim(); // Remove leading/trailing spaces

        if (isiPhone) {
            window.scrollTo(0, 0);
            alert('Please go to top of the page to check status and listen to the audio');
            callTTSAPI(cleanedArticles, process.env.REACT_APP_TTS_SSML_API_URL);
            return;
        }
        try {
            try {
                console.log('Synthesizing speech...' + cleanedArticles);
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
                    await new Promise((resolve, reject) => {
                        speechSynthesizer.speakTextAsync(chunk, result => {
                            if (result.reason === speechsdk.ResultReason.SynthesizingAudioCompleted) {
                                console.log(`Speech synthesized to speaker for text: [${chunk}]`);
                                resolve();
                            } else if (result.reason === speechsdk.ResultReason.Canceled) {
                                const cancellationDetails = speechsdk.SpeechSynthesisCancellationDetails.fromResult(result);
                                if (cancellationDetails.reason === speechsdk.CancellationReason.Error) {
                                    console.error(`Error details: ${cancellationDetails.errorDetails}`);
                                    reject(new Error(cancellationDetails.errorDetails));
                                } else {
                                    reject(new Error('Speech synthesis canceled'));
                                }
                            }
                        }, error => {
                            console.error(`Error synthesizing speech: ${error}`);
                            reject(error);
                        });
                    });
                }
            } catch (error) {
                console.error(`Error synthesizing speech: ${error}`);
            } finally {
                setIsLiveAudioPlaying(false);
            }
        }
        catch (error) {
            console.error(`Error synthesizing speech: ${error}`);
        }
        finally {
            setIsLiveAudioPlaying(false);
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

    const generateAndDownloadYouTubeUploadInformation = async (message) => {
        const firestoreResponseData = message;
        console.log('First fetched data from Firestore:', firestoreResponseData);
        console.log('firestoreResponseData:', firestoreResponseData);
        if (firestoreResponseData === undefined || firestoreResponseData.length < 100) {
            alert('ERROR: Prompt response is not generated.');
            return;
        }

        setIsYouTubeTitle(true);
        setIsGemini(true);
        setIsGeneratingGemini(true);
        youtubePromptInput = firestoreResponseData + youtubeTitlePrompt;
        youtubeSelected = true;
        await callAPI(modelo, 'youtubeTitle');
        console.log('youtube Title Gen and Upload generatedDocID:', generatedDocID);
        const youtubeTitledocRef = doc(db, 'genai', user.uid, 'MyGenAI', generatedDocID);
        const youtubeTitledocSnap = await getDoc(youtubeTitledocRef);
        if (youtubeTitledocSnap.exists()) {
            console.log('Youtube title fetched data from Firestore:', youtubeTitledocSnap.data().answer);
            const plainText = (youtubeTitledocSnap.data().answer || '')
                .replace(/[#*~`>-]/g, '')
                .replace(/\r?\n/g, '\r\n');
            const blob = new Blob([plainText], { type: 'text/plain' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'title.txt';
            link.click();
        }
        youtubeDescriptionPromptInput = firestoreResponseData + youtubeDescriptionPrompt;
        await callAPI(modelo, 'youtubeDescription');
        console.log('youtube Description Gen and Upload generatedDocID:', generatedDocID);
        const youtubeDescrdocRef = doc(db, 'genai', user.uid, 'MyGenAI', generatedDocID);
        const youtubeDescrdocSnap = await getDoc(youtubeDescrdocRef);
        if (youtubeDescrdocSnap.exists()) {
            console.log('Youtube title fetched data from Firestore:', youtubeDescrdocSnap.data().answer);
            const plainText = (youtubeDescrdocSnap.data().answer || '')
                .replace(/[#*~`>-]/g, '')
                .replace(/\r?\n/g, '\r\n');
            const blob = new Blob([plainText], { type: 'text/plain' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'description.txt';
            link.click();
        }
        await callTTSAPI(firestoreResponseData, process.env.REACT_APP_TTS_SSML_API_URL);
        console.log('TTS generatedDocID:', ttsGeneratedDocID);
        const ttsdocRef = doc(db, 'genai', user.uid, 'MyGenAI', ttsGeneratedDocID);
        const ttsdocSnap = await getDoc(ttsdocRef);
        if (ttsdocSnap.exists()) {
            console.log('TTS fetched data from Firestore:', ttsdocSnap.data().answer);
            const audioURL = ttsdocSnap.data().answer;
            console.log('TTS audioURL:', audioURL);
            await handleDownload(audioURL, 'azure-tts');
        }

    };

    const generateYouTubeUploadInformation = async (message, invocation_source = 'youtube') => {
        const firestoreResponseData = message;
        console.log('First fetched data from Firestore:', firestoreResponseData);
        console.log('firestoreResponseData:', firestoreResponseData);
        if (firestoreResponseData === undefined || firestoreResponseData.length < 100) {
            alert('ERROR: Prompt response is not generated.');
            return;
        }
        // Execute YouTube Title/Description/Audio
        youtubeSelected = true;
        setIsYouTubeTitle(true);
        setIsGeneratingTTS(true);
        setIsGemini(true);
        setIsGeneratingGemini(true);
        await generateAndDownloadYouTubeUploadInformation(firestoreResponseData);
        if (invocation_source !== 'stories' && invocation_source !== 'youtube_own_content') {
            // Execute Image Search
            imagePromptInput = firestoreResponseData + imagesSearchPrompt;
            imageSelected = true;
            setIsGeneratingGemini(true);
            setIsGemini(true);
            setIsImagesSearch(true);
            await callAPI(modelGemini, 'imagesSearchWords');
            console.log('Image Search generatedDocID', generatedDocID);
            const imageSearchdocRef = doc(db, 'genai', user.uid, 'MyGenAI', generatedDocID);
            const imageSearchdocSnap = await getDoc(imageSearchdocRef);
            if (imageSearchdocSnap.exists()) {
                const ifirestoreResponseData = imageSearchdocSnap.data().answer;
                console.log('Gen AI Images Search - Second fetched data from Firestore:', ifirestoreResponseData);
                if (ifirestoreResponseData) {
                    const parts = ifirestoreResponseData.match(/\[.*?\]/g)?.map(match => match.slice(1, -1)) || [];
                    for (const part of parts) {
                        console.log('image prompt part:', part);
                        imageGenerationPromptInput = part;
                        const encodedPrompt = encodeURIComponent(imageGenerationPromptInput);
                        window.open(`https://www.google.com/search?tbm=isch&q=${encodedPrompt}`, '_blank');
                    }
                } else {
                    console.error('imageSearchfirestoreResponseData is null or undefined');
                }
            }
        }
        imagePromptsGenerationInput = firestoreResponseData + imageGenerationPrompt;
        if (invocation_source === 'stories' || invocation_source === 'youtube_own_content') {
            console.log('Invoking stories image generation', stories_image_generation_prompt);
            imagePromptsGenerationInput = firestoreResponseData + stories_image_generation_prompt;
        }
        await callAPI(modelGemini, 'imageGeneration');
        console.log('Image Generation generatedDocID', generatedDocID);
        const idocRef = doc(db, 'genai', user.uid, 'MyGenAI', generatedDocID);
        const idocSnap = await getDoc(idocRef);
        if (idocSnap.exists()) {
            const ifirestoreResponseData = idocSnap.data().answer;
            console.log('Gen AI Image Generation - Second fetched data from Firestore:', ifirestoreResponseData);
            if (ifirestoreResponseData) {
                const parts = ifirestoreResponseData.match(/\[.*?\]/g)?.map(match => match.slice(1, -1)) || [];
                for (const part of parts) {
                    console.log('image prompt part:', part);
                    imageGenerationPromptInput = part;
                    setIsGeneratingImage_Dall_e_3(true);
                    if (generateGeminiImage === true) {
                        await callAPI(modelGeminiImage, 'image_ai_agent');
                        if (1 === 2) {
                            console.log('Image generatedDocID:', generatedDocID);
                            const ttsdocRef = doc(db, 'genai', user.uid, 'MyGenAI', generatedDocID);
                            const ttsdocSnap = await getDoc(ttsdocRef);
                            if (ttsdocSnap.exists()) {
                                console.log('Image fetched data from Firestore:', ttsdocSnap.data().answer);
                                const audioURL = ttsdocSnap.data().answer;
                                console.log('Image URL:', audioURL);
                                await handleDownload(audioURL, 'image');
                            }
                        }
                    }
                    if (generateDalleImage === true) {
                        await callAPI(modelImageDallE3, 'image_ai_agent');
                        console.log('Image generatedDocID:', generatedDocID);
                        if (1 === 2) {
                            const ttsdocRef = doc(db, 'genai', user.uid, 'MyGenAI', generatedDocID);
                            const ttsdocSnap = await getDoc(ttsdocRef);
                            if (ttsdocSnap.exists()) {
                                console.log('Image fetched data from Firestore:', ttsdocSnap.data().answer);
                                const audioURL = ttsdocSnap.data().answer;
                                console.log('Image URL:', audioURL);
                                await handleDownload(audioURL, 'image');
                            }
                        }
                    }
                }
                setIsGeneratingImage_Dall_e_3(false);
            } else {
                console.error('ifirestoreResponseData is null or undefined');
            }
        }
        setIsGeneratingYouTubeAudioTitlePrompt(false);
        setIsGeneratingYouTubeBedtimeStory(false);
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
        if (!isOpenAI && !isAnthropic && !isGemini && !isoMini && !iso1 && !isLlama && !isMistral && !isGptTurbo && !isChatGPT && !isGeminiSearch && !isGeminiFlash && !isPerplexityFast && !isPerplexity && !isCodestral && !isDeepSeekChat && !isDeepSeekThink && !isGroq && !isNova && !isCerebras && !isDeepSeek && !isGeminiFlashFast && !isClaudeThinking) {
            alert('Please select at least one model.');
            return;
        }

        if (isGroq && showGroq) {
            setIsGeneratingGroq(true); // Set generating state to true
            callAPI(modelGroq);
        }

        if (isDeepSeekThink && showDeepSeekThink) {
            setIsGeneratingDeepSeekThink(true); // Set generating state to true
            callAPI(modelDeepSeekThink);
        }

        if (isDeepSeekChat && showDeepSeekChat) {
            setIsGeneratingDeepSeekChat(true); // Set generating state to true
            callAPI(modelDeepSeekChat);
        }

        if (isClaudeThinking && showClaudeThinking) {
            setIsGeneratingClaudeThinking(true);
            callAPI(modelClaudeThinking);
        }

        // Generate API calls for each selected model
        if (isAnthropic && showAnthropic) {
            setIsGeneratingAnthropic(true); // Set generating state to true
            callAPI(modelAnthropic);
        }

        if (isGemini && showGemini) {
            setIsGeneratingGemini(true); // Set generating state to true
            callAPI(modelGemini);
        }
        if (isOpenAI && showGpt) {
            setIsGenerating(true); // Set generating state to true
            callAPI(modelGpt);
        }

        if (isoMini && showoMini) {
            setisGeneratingoMini(true); // Set generating state to true
            callAPI(modeloMini);
        }

        if (iso1 && showo) {
            setisGeneratingo(true); // Set generating state to true
            callAPI(modelo);
        }

        if (isLlama && showLlama) {
            setIsGeneratingLlama(true); // Set generating state to true
            callAPI(modelLlama);
        }

        if (isMistral && showMistral) {
            setIsGeneratingMistral(true); // Set generating state to true
            callAPI(modelMistral);
        }

        if (isChatGPT && showChatGPT) {
            setIsGeneratingChatGPT(true); // Set generating state to true
            callAPI(modelChatGPT);
        }

        if (isGeminiSearch && showGeminiSearch) {
            setIsGeneratingGeminiSearch(true); // Set generating state to true
            callAPI(modelGeminiSearch);
        }

        if (isGeminiFlash && showGeminiFlash) {
            setIsGeneratingGeminiFlash(true); // Set generating state to true
            callAPI(modelGeminiFlash);
        }

        if (isGptTurbo && showGptTurbo) {
            setIsGeneratingGptTurbo(true); // Set generating state to true
            callAPI(modelGptTurbo);
        }

        if (isPerplexityFast && showPerplexityFast) {
            setIsGeneratingPerplexityFast(true); // Set generating state to true
            callAPI(modelPerplexityFast);
        }

        if (isPerplexity && showPerplexity) {
            setIsGeneratingPerplexity(true); // Set generating state to true
            callAPI(modelPerplexity);
        }

        if (isCodestral && showCodeStral) {
            setIsGeneratingCodeStral(true); // Set generating state to true
            callAPI(modelCodestralApi);
        }

        if (isNova && showNova) {
            setIsGeneratingNova(true); // Set generating state to true
            callAPI(modelNova);
        }
        if (isCerebras && showCerebras) {
            setIsGeneratingCerebras(true); // Set generating state to true
            callAPI(modelCerebras);
        }
        if (isDeepSeek && showDeepSeek) {
            setIsGeneratingDeepSeek(true);
            callAPI(modelDeepSeek);
        }
        if (isGeminiFlashFast && showGeminiFlashFast) {
            setIsGeneratingGeminiFlashFast(true);
            callAPI(modelGeminiFlashFast);
        }
        updateConfiguration();
    };

    const updateConfiguration = async () => {

        try {
            const configurationCollection = collection(db, 'genai', user.uid, 'configuration');
            const q = query(configurationCollection, where('setup', '==', 'genai'));
            const configSnapshot = await getDocs(q);
            if (configSnapshot.empty) {
                console.log('No configuration found, adding new document');
                // addDoc
                await addDoc(configurationCollection, {
                    setup: 'genai',
                    isOpenAI,
                    isAnthropic,
                    isGemini,
                    isoMini,
                    isLlama,
                    isMistral,
                    isGptTurbo,
                    isGeminiSearch,
                    isGeminiFlash,
                    isPerplexityFast,
                    isPerplexity,
                    isCodestral,
                    isDeepSeekChat,
                    iso1,
                    isDeepSeekThink, // Add this line
                    isGroq,
                    isNova,
                    temperature,
                    top_p,
                    dataLimit,
                    autoPrompt,
                    lastUpdated: new Date(),
                    autoPromptLimit,
                    voiceName,
                    chunk_size,
                    silence_break,
                    isChatGPT,
                    labelGroq,
                    labelGpt,
                    labelAnthropic,
                    labelGemini,
                    labeloMini,
                    labelLlama,
                    labelMistral,
                    labelGptTurbo,
                    labelGeminiSearch,
                    labelGeminiFlash,
                    labelChatGPT,
                    labelo,
                    labelPerplexityFast,
                    labelPerplexity,
                    labelCodestral,
                    labelDeepSeekChat,
                    labelDeepSeekThink,
                    labelNova,
                    isCerebras,
                    labelCerebras,
                    isDeepSeek,
                    labelDeepSeek,
                    isGeminiFlashFast,
                    labelGeminiFlashFast,
                    isClaudeThinking,
                    labelClaudeThinking,
                });
                return;
            }
            else {
                configSnapshot.forEach(async (doc) => {
                    await updateDoc(doc.ref, {
                        // Model states
                        isOpenAI,
                        isAnthropic,
                        isGemini,
                        isoMini,
                        isLlama,
                        isMistral,
                        isGptTurbo,
                        isGeminiSearch,
                        isGeminiFlash,
                        isPerplexityFast,
                        isPerplexity,
                        isCodestral,
                        isDeepSeekChat,
                        iso1,
                        isDeepSeekThink, // Add this line
                        isGroq,
                        isNova,
                        temperature,
                        top_p,
                        dataLimit,
                        autoPrompt,
                        lastUpdated: new Date(),
                        autoPromptLimit,
                        voiceName,
                        chunk_size,
                        silence_break,
                        isChatGPT,
                        labelGroq,
                        labelGpt,
                        labelAnthropic,
                        labelGemini,
                        labeloMini,
                        labelLlama,
                        labelMistral,
                        labelGptTurbo,
                        labelGeminiSearch,
                        labelGeminiFlash,
                        labelChatGPT,
                        labelo,
                        labelPerplexityFast,
                        labelPerplexity,
                        labelCodestral,
                        labelDeepSeekChat,
                        labelDeepSeekThink,
                        labelNova,
                        isCerebras,
                        labelCerebras,
                        isDeepSeek,
                        labelDeepSeek,
                        isGeminiFlashFast,
                        labelGeminiFlashFast,
                        isClaudeThinking,
                        labelClaudeThinking,
                    }, { merge: true });
                });
            }

        } catch (error) {
            console.error('Error updating configuration:', error);
        }
    };

    const callAPI = async (selectedModel, invocationType = 'GenAI') => {
        console.log('Calling API with model:', selectedModel + ' URL: ' + process.env.REACT_APP_GENAI_API_URL, ' youtubeSelected: ', youtubeSelected, ' youtubePromptInput:', youtubePromptInput, '  youtubeDescriptionPromptInput : ', youtubeDescriptionPromptInput);
        console.log('youtube Content Input prompt:', youtubeContentInput);
        console.log('imageGenerationPromptInput :', imageGenerationPromptInput);
        console.log('imagePromptsGenerationInput:', imagePromptsGenerationInput);
        try {
            let response;
            let promptText = promptInput;
            // Get prompt text from Firebase if promptName is not blank
            let promptNameText = '';
            console.log('Prompt Name:', promptName);
            if (promptName) {
                try {
                    const promptsCollection = collection(db, 'genai', 'bTGBBpeYPmPJonItYpUOCYhdIlr1', 'prompts');
                    const q = query(promptsCollection,
                        where('tag', '==', promptName),
                        orderBy('modifiedDateTime', 'asc'),
                        limit(1)
                    );
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                        promptNameText = querySnapshot.docs[0].data().fullText;
                        console.log('Prompt Name Text:', promptNameText);
                    }
                } catch (error) {
                    console.error('Error getting prompt text:', error);
                }
            }
            if (promptNameText) {
                promptText = promptText + '\n' + promptNameText;
            }
            // Determine promptText based on invocation type
            switch (invocationType) {
                case 'imageGeneration':
                    promptText = imagePromptsGenerationInput;
                    break;
                case 'image_ai_agent':
                    promptText = imageGenerationPromptInput;
                    break;
                case 'image':
                    promptText = promptInput;
                    break;
                case 'youtube':
                    promptText = youtubeContentInput;
                    break;
                case 'youtubeTitle':
                    promptText = youtubePromptInput;
                    break;
                case 'youtubeDescription':
                    promptText = youtubeDescriptionPromptInput;
                    break;
                case 'imagesSearchWords':
                    promptText = imagePromptInput;
                    break;
                case 'bedtime_stories':
                    promptText = bedtime_stories_content_input;
                    break;
                case 'homeWork':
                    promptText = homeWorkInput;
                    break;
                case 'quiz':
                    promptText = quizInput;
                    break;
                case 'google-search':
                    promptText = googleSearchPromptInput;
                    break;
                case 'reviews':
                    promptText = reviewsPromptInput;
                    break;
                case 'usa-news':
                    promptText = usaNewsPrompt;
                    break;
                case 'tech-news':
                    promptText = techNewsPrompt;
                    break;
                case 'quiz_with_choices':
                    promptText = quizMultipleChoicesInput;
                    break;
                case 'explain':
                    promptText = explainInput;
                    break;
                case 'lyrics':
                    promptText = lyricsInput;
                    break;
                case 'answer':
                    promptText = answerInput;
                    break;
                default:
                    if (autoPrompt) {
                        await searchPrompts();
                        promptText = autoPromptInput;
                    } else if (fullPromptInput.length > 2) {
                        promptText = promptInput + autoPromptSeparator + fullPromptInput;
                    }
            }
            console.log('temp:', temperatureRef.current.valueOf(), 'top_p:', top_pRef.current.valueOf());
            // if prompt dropdown selected is practice_questions then invocationType should be homeWork
            if (selectedPrompt === 'practice_questions' || promptName === 'practice_questions') {
                invocationType = 'homeWork';
            }
            if (selectedPrompt === 'quiz_with_choices' || promptName === 'quiz_with_choices') {
                invocationType = 'quiz_with_choices';
            }
            if (selectedPrompt === 'quiz' || promptName === 'quiz') {
                invocationType = 'quiz';
            }
            if (firebaseAPI === true) {
                const generationConfig = {
                    temperature: temperatureRef.current.valueOf(),
                    top_p: top_pRef.current.valueOf()
                };
                const model = getGenerativeModel(vertexAI, { model: vertexAIModelName, generationConfig });
                const result = await model.generateContent(promptText);
                const text = await result.response.text();
                const now = new Date();
                const formattedDateTime = now.toLocaleString('en-US', {
                    timeZone: 'America/Chicago',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                }).replace(/(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+):(\d+)/, '$3-$1-$2 $4:$5:$6');
                console.log('Model Name :', vertexAIModelName,);
                const docRef = await addDoc(collection(db, "genai", userID, "MyGenAI"), {
                    question: promptText,
                    inputPrompt: promptInput + ' ' + invocationType,
                    answer: text,
                    model: vertexAIModelName,
                    createdDateTime: formattedDateTime,
                    invocationType: invocationType
                });
                generatedDocID = docRef.id;
            }
            else {
                // Single API call with the determined promptText
                response = await fetch(process.env.REACT_APP_GENAI_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        prompt: promptText,
                        model: selectedModel,
                        uid: uid,
                        temperature: temperatureRef.current.valueOf(),
                        top_p: top_pRef.current.valueOf(),
                        invocationType: invocationType
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    alert(errorData.error + 'Failed to generate content');
                    throw new Error(errorData.error || 'Failed to generate content.');
                }

                let data;
                data = await response.json();
                generatedDocID = data[0].results[0].docID;

            }
            console.log('Generated Doc ID:', generatedDocID, '  invocationType:', invocationType);
            if (['homeWork', 'quiz_with_choices', 'quiz'].includes(invocationType)) {
                setCurrentDocId(generatedDocID);
                console.log('currenDocID:', currentDocId);
                //setShowhomeWorkApp(true);
            }
            //console.log('Response:', data);
        } catch (error) {
            console.error('Error generating content:', error);
            alert(`Error: ${error.message}`);
        } finally {
            // click refresh button
            searchQuery = '';
            invocationType = '';
            searchModel = 'All';
            firebaseAPI = false;
            youtubeSelected = false;
            imageSelected = false;
            setIsYouTubeTitle(false);
            setIsImagesSearch(false);
            setIsGeneratingGeminiSearch(false);
            setIsAISearch(false);
            console.log('Fetching data after generating content');
            fetchData(userID);
            if (selectedModel === modelGpt) {
                setIsGenerating(false);
            }
            if (selectedModel === modelAnthropic) {
                setIsGeneratingAnthropic(false);
            }
            if (selectedModel === modelGemini) {
                setIsGeneratingGemini(false);
            }
            if (selectedModel === modeloMini) {
                setisGeneratingoMini(false);
            }
            if (selectedModel === modelo) {
                setisGeneratingo(false);
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
            if (selectedModel === modelGptTurbo) {
                setIsGeneratingGptTurbo(false);
            }
            if (selectedModel === modelChatGPT) {
                setIsGeneratingChatGPT(false);
            }
            if (selectedModel === modelGeminiSearch) {
                setIsGeneratingGeminiSearch(false);
            }
            if (selectedModel === modelGeminiFlash) {
                setIsGeneratingGeminiFlash(false);
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
            if (selectedModel === modelDeepSeekChat) {
                setIsGeneratingDeepSeekChat(false);
            }
            if (selectedModel === modelDeepSeekThink) {
                setIsGeneratingDeepSeekThink(false);
            }
            if (selectedModel === modelGroq) {
                setIsGeneratingGroq(false);
            }
            if (selectedModel === modelNova) {
                setIsGeneratingNova(false);
            }
            if (selectedModel === modelCerebras) {
                setIsGeneratingCerebras(false);
            }
            if (selectedModel === modelDeepSeek) {
                setIsGeneratingDeepSeek(false);
            }
            if (selectedModel === modelGeminiFlashFast) {
                setIsGeneratingGeminiFlashFast(false);
            }
            if (selectedModel === modelClaudeThinking) {
                setIsGeneratingClaudeThinking(false);
            }
            console.log('isGeneratingGeminiSearch:', isGeneratingGeminiSearch);
        }
    };

    // Function to call the TTS API
    const callTTSAPI = async (message, apiUrl) => {

        setIsGeneratingTTS(true); // Set generating state to true
        ttsVoiceName = voiceName;
        const cleanedArticles = message
            .replace(/https?:\/\/[^\s]+/g, '')
            .replace(/http?:\/\/[^\s]+/g, '')
            .replace(/[#:\-*]/g, ' ')
            .replace(/[&]/g, ' and ')
            .replace('```json', '')
            .replace(/[<>]/g, ' ')
            //       .replace(/["]/g, '&quot;')
            //       .replace(/[']/g, '&apos;')
            .trim();
        console.log('Calling TTS API with message:', cleanedArticles, ' voiceName:', voiceName);
        console.log('speechSilence:', speechSilenceRef.current.valueOf(), 'speechRate:', speechRateRef.current.valueOf());
        console.log('API URL:', apiUrl);
        if (!apiUrl) {
            console.error('API URL is not defined');
            return;
        }
        if (!cleanedArticles) {
            console.error('Cleaned articles are empty');
            return;
        }
        if (apiUrl.includes('geminitts')) {
            ttsVoiceName = googleTTSVoiceName;
        }
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: cleanedArticles,
                    uid: uid,
                    source: 'ai',
                    voice_name: ttsVoiceName,
                    chunk_size: chunk_size,
                    silence_break: speechSilenceRef.current.valueOf(),
                    prosody_rate: speechRateRef.current.valueOf()
                })
            });

            if (!response.ok) {
                throw new Error([`Network response was not ok: ${response.statusText}`]);
            }
            let data;
            // Try to get docID with retry logic
            let retries = 12;
            while (retries > 0) {
                data = await response.json();
                if (data[0]?.docID) {
                    // docID exists
                    break;
                }
                // Wait 2 seconds before retrying
                await new Promise(resolve => setTimeout(resolve, 2000));
                retries--;
                if (retries === 0) {
                    throw new Error('Failed to get document ID after multiple retries');
                }
            }
            ttsGeneratedDocID = data[0].docID;
        } catch (error) {
            console.error('Error calling TTS API:', error);
            alert([`Error: ${error.message}`]);
        } finally {
            setIsGeneratingTTS(false); // Reset generating state
            // Optionally, refresh data
            fetchData(uid);
            updateConfiguration();
        }
    };

    // Function to call the TTS API
    const callGenAITTSAPI = async (message) => {

        setIsGeneratingTTS(true); // Set generating state to true
        let genAIVoiceInstructions = voiceInstructions;
        const cleanedArticles = message
            .replace(/https?:\/\/[^\s]+/g, '')
            .replace(/http?:\/\/[^\s]+/g, '')
            .replace(/[#:\-*]/g, ' ')
            .replace(/[&]/g, ' and ')
            .replace('```json', '')
            .replace(/[<>]/g, ' ')
            //       .replace(/["]/g, '&quot;')
            //       .replace(/[']/g, '&apos;')
            .trim();
        console.log('Calling Gena AI TTS API with message:', cleanedArticles);
        console.log('selectedPromptFullText:', selectedPromptFullText);
        let genaiVoiceName = 'shimmer';
        let promptNameText = '';
        if (voiceName.length < 9) {
            genaiVoiceName = voiceName;
        }
        if (selectedPromptFullText && selectedPromptFullText.includes("Pronunciation:")) {
            genAIVoiceInstructions = selectedPromptFullText;
        }
        try {
            const response = await fetch(process.env.REACT_APP_TTS_GENAI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: cleanedArticles,
                    uid: uid,
                    source: 'ai',
                    voice_name: genaiVoiceName,
                    chunk_size: 7900,
                    instructions: genAIVoiceInstructions,
                })
            });

            if (!response.ok) {
                throw new Error([`Network response was not ok: ${response.statusText}`]);
            }
            let data;
            // Try to get docID with retry logic
            let retries = 12;
            while (retries > 0) {
                data = await response.json();
                if (data[0]?.docID) {
                    // docID exists
                    break;
                }
                // Wait 2 seconds before retrying
                await new Promise(resolve => setTimeout(resolve, 2000));
                retries--;
                if (retries === 0) {
                    throw new Error('Failed to get document ID after multiple retries');
                }
            }
            ttsGeneratedDocID = data[0].docID;
        } catch (error) {
            console.error('Error calling TTS API:', error);
            alert([`Error: ${error.message}`]);
        } finally {
            setIsGeneratingTTS(false); // Reset generating state
            // Optionally, refresh data
            fetchData(uid);
            updateConfiguration();
        }
    };
    // Handler for DALL·E 3 Checkbox Change
    const handleDall_e_3Change = async (checked) => {
        setIsGeneratingImage_Dall_e_3(true); // Set generating state to true
        await callAPI(modelGeminiImage, 'image');
        if (genOpenAIImage) {
            await callAPI(modelImageDallE3, 'image');
        }
        setIsGeneratingImage_Dall_e_3(false);
    };

    // Handler for TTS Checkbox Change
    const handleTTSChange = async () => {
        setIsGeneratingTTS(true);
        await callTTSAPI(promptInput, process.env.REACT_APP_TTS_SSML_API_URL);
        setIsGeneratingTTS(false);
    };

    // Add this helper function to manage text model visibility
    const setVisibilityOfTextModels = (status) => {
        // Set all "is" states to false/true
        setIsOpenAI(status);
        setIsAnthropic(status);
        setIsGemini(status);
        setIsoMini(status);
        setIso1(status);
        setIsLlama(status);
        setIsMistral(status);
        setIsGptTurbo(status);
        setIsChatGPT(status);
        setIsGeminiSearch(status);
        setIsGeminiFlash(status);
        setIsPerplexityFast(status);
        setIsPerplexity(status);
        setIsCodestral(status);
        setIsDeepSeekChat(status);
        setIsDeepSeekThink(status);
        setIsGroq(status);
        setIsNova(status);
        setIsCerebras(status);
        setIsDeepSeek(status);
        setIsGeminiFlashFast(status);
        setIsClaudeThinking(status);
    };

    // Add this helper function to handle LLM model selection
    const handleLLMChange = (setter, value) => {
        setter(value);
    };

    const handleEditPrompt = () => {
        setShowEditPopup(true);
        setShowSaveButton(true);
        if (selectedPrompt) {
            setEditPromptTag(selectedPrompt);
            setEditPromptFullText(selectedPromptFullText);
        }
    };

    const handleEditSource = async () => {
        if (selectedPrompt) {
            setShowSaveButton(true);
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
                model: searchModel,
                invocationType: invocationType
            })
        })
            .then((res) => res.json())
            .then((data) => {
                // Print data objects received from API
                data.forEach(item => {
                    console.log(item);
                });
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

    if (showhomeWorkApp) {  // Add this block
        return (
            <Homework
                user={user}
                onBack={() => setShowhomeWorkApp(false)}
                sourceDocumentID={currentDocId}
            />
        );
    }

    const handleDownload = async (mp3UrlText, modelName) => {
        setIsDownloading(true);
        try {
            const mp3FileUrl = mp3UrlText?.match(/\(([^)]+)\)/g)?.map(url => url.slice(1, -1));
            const proxyUrl = `https://genaiapp-892085575649.us-central1.run.app/proxy-download?url=${encodeURIComponent(mp3FileUrl)}`;
            const response = await fetch(proxyUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const prefix = modelName === 'azure-tts' ? 'Audio_' : 'Image_';
            const extension = mp3FileUrl[0].substring(mp3FileUrl[0].lastIndexOf('.'));
            link.download = `${prefix}_${new Date().toISOString().slice(0, 19).replace(/[-:]/g, '_').replace('T', '__')}${extension}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
        }
        finally {
            setIsDownloading(false);
        }
    };

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

    const handleIconClick = (event) => {
        event.target.classList.add('icon-animation');
        setTimeout(() => {
            event.target.classList.remove('icon-animation');
        }, 1000);
    };

    const handlehomeWork = async (message) => {
        if (!message.trim()) {
            alert('Please enter a prompt.');
            return;
        }
        setIshomeWork(true);
        setTemperature(homeWorkTemperture);
        setTop_p(homeWorkTop_p);
        // Need to wait for state updates to be applied
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Append the prompt to promptInput
        homeWorkInput = message + intelligentQuestionsPrompt;
        await callAPI(modelHomeWork, 'homeWork');
        updateConfiguration();
        setIshomeWork(false);
    };

    // Add handleQuiz function after handlehomeWork
    const handleQuiz = async (message) => {
        if (!message.trim()) {
            alert('Please enter a message.');
            return;
        }
        setTemperature(quizTemperture);
        setTop_p(quizTop_p);
        setIsQuiz(true);
        // Need to wait for state updates to be applied
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Append the prompt to promptInput
        quizInput = message + quizPrompt;
        await callAPI(modelQuiz, 'quiz');
        updateConfiguration();
        setIsQuiz(false);
    };


    // Add the handler function for multiple choice quiz
    const handleMultipleChoiceQuiz = async (message) => {
        if (!message.trim()) {
            alert('Please enter a message.');
            return;
        }
        setTemperature(quizMultipleChoicesTemperture);
        setTop_p(quizMultipleChoicesTop_p);
        setIsQuizMultipleChoice(true);
        // Append the prompt to promptInput
        await new Promise(resolve => setTimeout(resolve, 1000));
        quizMultipleChoicesInput = message + quizMultipleChoicesPrompt;
        setIsGeneratingGemini(true);
        await callAPI(modelQuizChoices, 'quiz_with_choices');
        updateConfiguration();
        setIsQuizMultipleChoice(false);
    };

    const fetchTexts = async () => {
        let q;
        try {
            if (fetchFromPublic) {
                console.log('Fetching Texts from public collection');
                q = query(
                    collection(db, 'public'),
                    where('tag', '>', ''),
                    where('fullText', '>', '')
                );
            } else {
                console.log('Fetching Texts from user collection');
                q = query(collection(db, 'genai', 'bTGBBpeYPmPJonItYpUOCYhdIlr1', 'prompts'), where('tag', '>', ''),
                    where('fullText', '>', ''), orderBy('modifiedDateTime', 'asc'));
            }
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                //  console.log('fetchTexts Data:', data.tag, '    ', data.fullText);
                switch (data.tag) {
                    case 'practice-button-label':
                        setPracticeButtonLabel(data.fullText);
                        break;
                    case 'Note':
                        setNoteText(data.fullText);
                        break;
                    case 'placeholder':
                        setPlaceholderText(data.fullText);
                        break;
                    case 'placeholder-semantic-search':
                        setSemanticSearchPlaceholder(data.fullText);
                        break;
                    case 'placeholder-keyword-search':
                        setKeywordSearchPlaceholder(data.fullText);
                        break;
                    case 'practice-questions-page-button-level':
                        setPracticePageButtonLabel(data.fullText);
                        break;
                    case 'quiz-button-label':
                        setQuizButtonLabel(data.fullText);
                        break;
                    case 'YouTube_title':
                        setYoutubeTitlePrompt(data.fullText);
                        break;
                    case 'YouTube_description':
                        setYoutubeDescriptionPrompt(data.fullText);
                        break;
                    case 'imagesSearchPrompt':
                        imagesSearchPrompt = data.fullText;
                        break;
                    case 'autoPromptSeparator':
                        autoPromptSeparator = data.fullText;
                        break;
                    case 'YouTube':
                        YouTubePrompt = data.fullText;
                        break;
                    case 'imageGenerationPrompt':
                        imageGenerationPrompt = data.fullText;
                        break;
                    case 'stories_image_generation_prompt':
                        stories_image_generation_prompt = data.fullText;
                        break;
                    case 'quiz_with_choices':
                        quizMultipleChoicesPrompt = data.fullText;
                        break;
                    case 'quiz_Multiple_Choices_Label':
                        quiz_Multiple_Choices_Label = data.fullText;
                        break;
                    case 'genai_stories_label':
                        genai_stories_label = data.fullText;
                        break;
                    case 'genai_image_label':
                        genai_image_label = data.fullText;
                        break;
                    case 'genai_youtube_label':
                        genai_youtube_label = data.fullText;
                        break;
                    case 'genai_tasks_label':
                        genai_tasks_label = data.fullText;
                        break;
                    case 'genai_search_label':
                        genai_search_label = data.fullText;
                        break;
                    case 'genai_audio_label':
                        genai_audio_label = data.fullText;
                        break;
                    case 'genai_autoprompt_label':
                        genai_autoprompt_label = data.fullText;
                        break;
                    case 'bedtime_stories':
                        story_teller_prompt = data.fullText;
                        break;
                    case 'quiz':
                        quizPrompt = data.fullText;
                        break;
                    case 'practice_questions':
                        intelligentQuestionsPrompt = data.fullText;
                        break;
                    case 'explain':
                        explainPrompt = data.fullText;
                        break;
                    case 'lyrics':
                        lyricsPrompt = data.fullText;
                        break;
                    case 'answer':
                        answerPrompt = data.fullText;
                        break;
                    case 'latest_info_label':
                        latest_info_label = data.fullText;
                        break;
                    case 'Search-GenAI':
                        googleSearchPromptText = data.fullText;
                        break;
                    case 'USA_News':
                        usaNewsPrompt = data.fullText;
                        break;
                    case 'Tech_News':
                        techNewsPrompt = data.fullText;
                        break;
                    case 'newsSource':
                        newsSource = data.fullText;
                        break;
                    case 'searchSource':
                        searchSource = data.fullText;
                        break;
                    case 'reviews':
                        reviewsPrompt = data.fullText;
                        break;
                    case 'fastGenAI':
                        vertexAIModelName = data.fullText;
                        break;
                    case 'voice_instructions':
                        voiceInstructions = data.fullText;
                        break;
                    default:
                        break;
                }
            });
        } catch (error) {
            console.error("Error fetching texts: ", error);
        }
    };

    // Add handler function after handlehomeWork
    const handleExplain = async (message) => {
        if (!message.trim()) {
            alert('Please enter content to explain.');
            return;
        }
        setIsExplain(true);
        setTemperature(0.7);
        setTop_p(0.8);
        // Need to wait for state updates to be applied
        await new Promise(resolve => setTimeout(resolve, 500));
        // Append the prompt to promptInput
        explainInput = message + explainPrompt;
        await callAPI(modelExplain, 'explain');
        updateConfiguration();
        setIsExplain(false);
    };

    // New handler function for "Answer with Steps"
    const handleAnswer = async (message) => {
        if (!message.trim()) {
            alert('Please enter content to answer.');
            return;
        }
        setIsAnswer(true);
        setTemperature(0.2);
        setTop_p(0.3);
        // Need to wait for state updates to be applied
        await new Promise(resolve => setTimeout(resolve, 500));
        // Append the prompt to promptInput
        answerInput = message + answerPrompt;
        await callAPI(modelAnswer, 'answer');
        updateConfiguration();
        setIsAnswer(false);
    };

    // Add handler function after handlehomeWork
    const handleLyrics = async (message) => {
        if (!message.trim()) {
            alert('Please enter content to lyrics.');
            return;
        }
        setIsLyrics(true);
        setTemperature(1);
        setTop_p(1);
        // Need to wait for state updates to be applied
        await new Promise(resolve => setTimeout(resolve, 500));
        // Append the prompt to promptInput
        lyricsInput = message + lyricsPrompt;
        await callAPI(modelGemini, 'lyrics');
        await callAPI(modelo, 'lyrics');
        await callAPI(modeloMini, 'lyrics');
        updateConfiguration();
        setIsLyrics(false);
    };

    return (
        <div>
            <div className={`main-content ${showEditPopup ? 'dimmed' : ''}`}>
                <div>
                    {email === 'erpgenai@gmail.com' &&
                        (<h3>This site is created by Sharath K for Demo purpose only.</h3>)
                    }
                    <textarea
                        className="promptInput"
                        value={promptInput}
                        onChange={(e) => setPromptInput(e.target.value)}
                        placeholder={placeholderText || 'Enter your topics here...'}
                    />
                </div>
                <div style={{ marginBottom: '20px' }}>
                    {showChatGPT && (
                        <button className={isChatGPT ? 'llm_button_selected' : 'button'}
                            onClick={() => handleLLMChange(setIsChatGPT, !isChatGPT)}>
                            <label className={isGeneratingChatGPT ? 'flashing' : ''}>{labelChatGPT}</label>
                        </button>
                    )}
                    {showAnthropic && (
                        <button className={isAnthropic ? 'llm_button_selected' : 'button'}
                            onClick={() => handleLLMChange(setIsAnthropic, !isAnthropic)}>
                            <label className={isGeneratingAnthropic ? 'flashing' : ''}>{labelAnthropic}</label>
                        </button>
                    )}
                    {showGemini && (
                        <button className={isGemini ? 'llm_button_selected' : 'button'}
                            onClick={() => handleLLMChange(setIsGemini, !isGemini)}>
                            <label className={isGeneratingGemini ? 'flashing' : ''}>{labelGemini}</label>
                        </button>
                    )}
                    {showNova && (
                        <button className={isNova ? 'llm_button_selected' : 'button'}
                            onClick={() => handleLLMChange(setIsNova, !isNova)}>
                            <label className={isGeneratingNova ? 'flashing' : ''}>{labelNova}</label>
                        </button>
                    )}
                    {showGpt && (
                        <button className={isOpenAI ? 'llm_button_selected' : 'button'}
                            onClick={() => handleLLMChange(setIsOpenAI, !isOpenAI)}>
                            <label className={isGenerating ? 'flashing' : ''}>{labelGpt}</label>
                        </button>
                    )}

                    {showCerebras && (
                        <button
                            className={isCerebras ? 'llm_button_selected' : 'button'}
                            onClick={() => handleLLMChange(setIsCerebras, !isCerebras)}
                        >
                            <label className={isGeneratingCerebras ? 'flashing' : ''}>
                                {labelCerebras}
                            </label>
                        </button>
                    )}
                    {showMistral && (
                        <button className={isMistral ? 'llm_button_selected' : 'button'}
                            onClick={() => handleLLMChange(setIsMistral, !isMistral)}>
                            <label className={isGeneratingMistral ? 'flashing' : ''}>{labelMistral}</label>
                        </button>
                    )}
                    {showLlama && (
                        <button className={isLlama ? 'llm_button_selected' : 'button'}
                            onClick={() => handleLLMChange(setIsLlama, !isLlama)}>
                            <label className={isGeneratingLlama ? 'flashing' : ''}>{labelLlama}</label>
                        </button>
                    )}
                    {showGptTurbo && (
                        <button className={isGptTurbo ? 'llm_button_selected' : 'button'}
                            onClick={() => handleLLMChange(setIsGptTurbo, !isGptTurbo)}>
                            <label className={isGeneratingGptTurbo ? 'flashing' : ''}>{labelGptTurbo}</label>
                        </button>
                    )}
                    {showGeminiSearch && (
                        <button className={isGeminiSearch ? 'llm_button_selected' : 'button'}
                            onClick={() => handleLLMChange(setIsGeminiSearch, !isGeminiSearch)}>
                            <label className={isGeneratingGeminiSearch ? 'flashing' : ''}>{labelGeminiSearch}</label>
                        </button>
                    )}
                    {showPerplexity && (
                        <button className={isPerplexity ? 'llm_button_selected' : 'button'}
                            onClick={() => handleLLMChange(setIsPerplexity, !isPerplexity)}>
                            <label className={isGeneratingPerplexity ? 'flashing' : ''}>{labelPerplexity}</label>
                        </button>
                    )}
                    {showCodeStral && (
                        <button className={isCodestral ? 'llm_button_selected' : 'button'}
                            onClick={() => handleLLMChange(setIsCodestral, !isCodestral)}>
                            <label className={isGeneratingCodeStral ? 'flashing' : ''}>{labelCodestral}</label>
                        </button>
                    )}
                    {showDeepSeekChat && (
                        <button className={isDeepSeekChat ? 'llm_button_selected' : 'button'}
                            onClick={() => handleLLMChange(setIsDeepSeekChat, !isDeepSeekChat)}>
                            <label className={isGeneratingDeepSeekChat ? 'flashing' : ''}>{labelDeepSeekChat}</label>
                        </button>
                    )}
                    {showGroq && (
                        <button className={isGroq ? 'llm_button_selected' : 'button'} onClick={() => handleLLMChange(setIsGroq, !isGroq)}>
                            <label className={isGeneratingGroq ? 'flashing' : ''}>{labelGroq}</label>
                        </button>
                    )}
                    {showDeepSeek && (
                        <button
                            className={isDeepSeek ? 'llm_button_selected' : 'button'}
                            onClick={() => handleLLMChange(setIsDeepSeek, !isDeepSeek)}
                        >
                            <label className={isGeneratingDeepSeek ? 'flashing' : ''}>
                                {labelDeepSeek}
                            </label>
                        </button>
                    )}
                    {showGeminiFlashFast && (
                        <button
                            className={isGeminiFlashFast ? 'llm_button_selected' : 'button'}
                            onClick={() => handleLLMChange(setIsGeminiFlashFast, !isGeminiFlashFast)}
                        >
                            <label className={isGeneratingGeminiFlashFast ? 'flashing' : ''}>
                                {labelGeminiFlashFast}
                            </label>
                        </button>
                    )}
                    <div className="button-section" data-title="Thinking & Reasoning Models">
                        {showGeminiFlash && (
                            <button
                                className={isGeminiFlash ? 'llm_button_selected' : 'button'}
                                onClick={() => handleLLMChange(setIsGeminiFlash, !isGeminiFlash)}
                            >
                                <label className={isGeneratingGeminiFlash ? 'flashing' : ''}>
                                    {labelGeminiFlash}
                                </label>
                            </button>
                        )}
                        {showo && (
                            <button className={iso1 ? 'llm_button_selected' : 'button'}
                                onClick={() => handleLLMChange(setIso1, !iso1)}>
                                <label className={isGeneratingo ? 'flashing' : ''}>{labelo}</label>
                            </button>
                        )}
                        {showPerplexityFast && (
                            <button className={isPerplexityFast ? 'llm_button_selected' : 'button'}
                                onClick={() => handleLLMChange(setIsPerplexityFast, !isPerplexityFast)}>
                                <label className={isGeneratingPerplexityFast ? 'flashing' : ''}>{labelPerplexityFast}</label>
                            </button>
                        )}
                        {showClaudeThinking && (
                            <button
                                className={isClaudeThinking ? 'llm_button_selected' : 'button'}
                                onClick={() => handleLLMChange(setIsClaudeThinking, !isClaudeThinking)}
                            >
                                <label className={isGeneratingClaudeThinking ? 'flashing' : ''}>
                                    {labelClaudeThinking}
                                </label>
                            </button>
                        )}
                        {showoMini && (
                            <button className={isoMini ? 'llm_button_selected' : 'button'}
                                onClick={() => handleLLMChange(setIsoMini, !isoMini)}>
                                <label className={isGeneratingoMini ? 'flashing' : ''}>{labeloMini}</label>
                            </button>
                        )}
                        {showDeepSeekThink && (
                            <button className={isDeepSeekThink ? 'llm_button_selected' : 'button'} onClick={() => handleLLMChange(setIsDeepSeekThink, !isDeepSeekThink)}>
                                <label className={isGeneratingDeepSeekThink ? 'flashing' : ''}>{labelDeepSeekThink}</label>
                            </button>
                        )}
                    </div>
                    <div className="button-section" data-title="Predefined Prompts">

                        {/* Add radio buttons for different options */}
                        <div className="radio-options">
                            <label className="radio-label">
                                <input
                                    type="radio"
                                    name="contentType"
                                    value="explain with examples"
                                    onChange={() => {
                                        promptName = 'explain';
                                    }}
                                />
                                Explain with Examples
                            </label>
                            <label className="radio-label">
                                <input
                                    type="radio"
                                    name="contentType"
                                    value="answer with steps"
                                    onChange={() => {
                                        promptName = 'answer';
                                    }}
                                />
                                Answer with Steps
                            </label>
                            <label className="radio-label">
                                <input
                                    type="radio"
                                    name="contentType"
                                    value="diagrams geometry trigonometry graphs..etc"
                                    onChange={() => {
                                        promptName = 'svg';
                                    }}
                                />
                                Diagrams & Graphs
                            </label>
                            <label className="radio-label">
                                <input
                                    type="radio"
                                    name="contentType"
                                    value="3D Models"
                                    onChange={() => {
                                        promptName = '3D_Model';
                                    }}
                                />
                                3D Model
                            </label>
                            <label className="radio-label">
                                <input
                                    type="radio"
                                    name="contentType"
                                    value="questions"
                                    onChange={() => {
                                        promptName = 'practice_questions';
                                    }}
                                />
                                Questions
                            </label>
                            <label className="radio-label">
                                <input
                                    type="radio"
                                    name="contentType"
                                    value="quiz"
                                    onChange={() => {
                                        promptName = 'quiz';
                                    }}
                                />
                                Quiz
                            </label>
                            <label className="radio-label">
                                <input
                                    type="radio"
                                    name="contentType"
                                    value="quiz_with_choices"
                                    onChange={() => {
                                        promptName = 'quiz_with_choices';
                                    }}
                                />
                                Quiz(Choices)
                            </label>
                            <label className="radio-label">
                                <input
                                    type="radio"
                                    name="contentType"
                                    value="mom"
                                    onChange={() => {
                                        promptName = 'mom';
                                    }}
                                />
                                Minutes Of Meeting
                            </label>
                            <label className="radio-label">
                                <input
                                    type="radio"
                                    name="contentType"
                                    value="search"
                                    onChange={() => {
                                        promptName = '';
                                    }}
                                    defaultChecked // Add this to make it default
                                />
                                No Prompt
                            </label>

                        </div>
                    </div>
                    {showPrint && (<div className="button-section" data-title="Generative AI">
                        {showTemp && (
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
                        )}
                        {showTop_p && (
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
                        )}
                        {showPromptsDropDown && (
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
                        {showEditPromptButton && (
                            <button
                                className="action_button"
                                onClick={() => handleEditPrompt()}
                                style={{ background: 'lightblue', fontSize: '16px' }}
                            >
                                <FaEdit />
                            </button>
                        )}
                        {showAutoPrompt && (
                            <button className={autoPrompt ? 'llm_button_selected' : 'button'} onClick={() => setAutoPrompt(!autoPrompt)}>
                                {genai_autoprompt_label || 'AutoPrompt'}
                            </button>
                        )}
                        {!isAISearch && !ishomeWork && !isQuiz && showGenAIButton && (
                            <button
                                onClick={handleGenerate}
                                className={
                                    isGenerating ||
                                        isGeneratingGemini ||
                                        isGeneratingAnthropic ||
                                        isGeneratingoMini ||
                                        isGeneratingo ||
                                        isGeneratingImage_Dall_e_3 ||
                                        isGeneratingTTS ||
                                        isGeneratingMistral ||
                                        isGeneratingLlama ||
                                        isGeneratingGptTurbo ||
                                        isGeneratingGeminiSearch ||
                                        isGeneratingGeminiFlash ||
                                        isGeneratingPerplexity ||
                                        isGeneratingPerplexityFast ||
                                        isGeneratingCodeStral ||
                                        isGeneratingChatGPT ||
                                        isGeneratingDeepSeekChat ||
                                        isGeneratingDeepSeekThink ||
                                        isGeneratingGroq ||
                                        isGeneratingNova ||
                                        isGeneratingCerebras ||
                                        isGeneratingDeepSeek ||
                                        isExplain || isLyrics || isGeneratingGeminiFlashFast || isGeneratingClaudeThinking ? 'action_button_flashing' : 'action_button'
                                }
                                style={{ backgroundColor: 'lightblue' }}
                                disabled={
                                    isGenerating ||
                                    isGeneratingGemini ||
                                    isGeneratingAnthropic ||
                                    isGeneratingoMini ||
                                    isGeneratingo ||
                                    isGeneratingImage_Dall_e_3 ||
                                    isGeneratingTTS ||
                                    isGeneratingMistral ||
                                    isGeneratingLlama ||
                                    isGeneratingGptTurbo ||
                                    isGeneratingGeminiSearch ||
                                    isGeneratingGeminiFlash ||
                                    isGeneratingPerplexity ||
                                    isGeneratingPerplexityFast ||
                                    isGeneratingCodeStral ||
                                    isGeneratingChatGPT ||
                                    isGeneratingDeepSeekChat ||
                                    isGeneratingDeepSeekThink ||
                                    isGeneratingGroq ||
                                    isGeneratingNova ||
                                    isGeneratingCerebras ||
                                    isGeneratingDeepSeek ||
                                    isExplain ||
                                    isLyrics ||
                                    isGeneratingGeminiFlashFast ||
                                    isGeneratingClaudeThinking
                                }
                            >
                                <strong>GenAI</strong>
                            </button>
                        )}
                        <button
                            onClick={async () => {
                                setIsGeneratingGeminiFast(true);
                                firebaseAPI = true;
                                await callAPI(vertexAIModelName);
                                setIsGeneratingGeminiFast(false);
                                firebaseAPI = false;
                            }}
                            className={
                                (isGeneratingGeminiFast) ?
                                    'action_button_flashing' : 'action_button'
                            }
                        >
                            Fast GenAI
                        </button>
                        <button
                            className={(isGeneratingGeminiSearch || isGeneratingPerplexity) ? 'action_button_flashing' : 'action_button'}
                            onClick={async () => {
                                if (promptInput === undefined || promptInput.length < 5) {
                                    alert('ERROR: prompt is blank.');
                                    return;
                                }
                                setTemperature(0.2);
                                setTop_p(0.2);
                                // Need to wait for state updates to be applied
                                await new Promise(resolve => setTimeout(resolve, 500));
                                googleSearchPromptInput = promptInput + googleSearchPromptText;
                                setIsGeneratingGeminiSearch(true);
                                setIsGeneratingPerplexity(true);
                                try {
                                    // Call Gemini Search first
                                    if (searchSource === 'gemini' || searchSource === 'both') {
                                        await callAPI(modelGeminiSearch, 'google-search');
                                    }
                                    if (searchSource !== 'gemini') {
                                        // Then call Perplexity
                                        await callAPI(modelPerplexity, 'google-search');
                                    }
                                }
                                catch (error) {
                                    console.error("Error fetching data:", error);
                                }
                                finally {
                                    setIsGeneratingGeminiSearch(false);
                                    setIsGeneratingPerplexity(false);
                                }
                            }}>
                            {latest_info_label || 'RealTime GenAI'}
                        </button>
                        <button
                            className={(isGeneratingGeminiSearch || isGeneratingPerplexity) ? 'action_button_flashing' : 'action_button'}
                            onClick={async () => {
                                setTemperature(0.2);
                                setTop_p(0.2);
                                reviewsPromptInput = promptInput + reviewsPrompt;
                                // Need to wait for state updates to be applied
                                await new Promise(resolve => setTimeout(resolve, 500));
                                try {
                                    if (newsSource === 'perplexity') {
                                        setIsGeneratingPerplexity(true);
                                        await callAPI(modelPerplexity, 'reviews');
                                    }
                                    else {
                                        setIsGeneratingGeminiSearch(true);
                                        await callAPI(modelGeminiSearch, 'reviews');
                                    }
                                }
                                catch (error) {
                                    console.error("Error fetching reviews:", error);
                                    alert('Error generating reviews content');
                                }
                                finally {
                                    setIsGeneratingPerplexity(false);
                                    setIsGeneratingGeminiSearch(false);
                                }
                            }}>
                            GenAI Reviews
                        </button>
                    </div>
                    )}
                    <div className="button-section" data-title="Gen AI Agents">
                        {(showhomeWorkButton && !isAISearch &&
                            <>

                                {showSimpleAIAgents && (<button
                                    onClick={() => handleExplain(promptInput)}
                                    className={
                                        (isExplain) ?
                                            'action_button_flashing' : 'action_button'
                                    }
                                >
                                    Explain with Examples
                                </button>)}
                                {showSimpleAIAgents && (<button
                                    onClick={() => handleAnswer(promptInput)}
                                    className={
                                        (isAnswer) ?
                                            'action_button_flashing' : 'action_button'
                                    }
                                >
                                    Answer with Steps
                                </button>)}
                                {showSimpleAIAgents && (<button
                                    onClick={() => handlehomeWork(promptInput)}
                                    className={
                                        (ishomeWork) ?
                                            'action_button_flashing' : 'action_button'
                                    }
                                >
                                    {practiceButtonLabel || 'Practice Questions'}
                                </button>)}
                                {showSimpleAIAgents && (<button
                                    onClick={() => handleQuiz(promptInput)}
                                    className={
                                        (isQuiz) ?
                                            'action_button_flashing' : 'action_button'
                                    }
                                >
                                    {quizButtonLabel || 'Trivia/Quiz'}
                                </button>)}
                                {showSimpleAIAgents && (<button
                                    onClick={() => handleMultipleChoiceQuiz(promptInput)}
                                    className={
                                        (isQuizMultipleChoice) ?
                                            'action_button_flashing' : 'action_button'
                                    }
                                >
                                    {quiz_Multiple_Choices_Label || 'Quiz-Choices'}
                                </button>)}
                                {
                                    (showPrint && showYouTubeButton && <button
                                        className={
                                            (isGeneratingYouTubeAudioTitlePrompt) ?
                                                'action_button_flashing' : 'action_button'
                                        }
                                        onClick={async () => {
                                            //console.log('youtube prompt:', YouTubePrompt);
                                            if (YouTubePrompt === undefined || YouTubePrompt.length < 5) {
                                                alert('ERROR: YouTubePrompt is blank.');
                                                return;
                                            }
                                            setTemperature(0.8);
                                            setTop_p(0.8);
                                            setIsGeneratingYouTubeAudioTitlePrompt(true);
                                            await new Promise(resolve => setTimeout(resolve, 500));
                                            youtubeContentInput = promptInput + YouTubePrompt;
                                            await callAPI(modelo, 'youtube');
                                            //console.log(' generatedDocID', generatedDocID);
                                            if (!generatedDocID || generatedDocID.length < 5) {
                                                alert('ERROR: generatedDocID is not set.');
                                                return;
                                            }
                                            try {
                                                const docRef = doc(db, 'genai', user.uid, 'MyGenAI', generatedDocID);
                                                const docSnap = await getDoc(docRef);

                                                if (docSnap.exists()) {
                                                    const firestoreResponseData = docSnap.data().answer;
                                                    //  console.log('First fetched data from Firestore:', firestoreResponseData);
                                                    if (firestoreResponseData === undefined || firestoreResponseData.length < 100) {
                                                        alert('ERROR: Prompt response is not generated.');
                                                        return;
                                                    }
                                                    setSpeechRate(youtubeSpeecRate);
                                                    setSpeechSilence(youtubeSpeechSilence);
                                                    // Need to wait for state updates to be applied
                                                    await new Promise(resolve => setTimeout(resolve, 500));

                                                    generateYouTubeUploadInformation(firestoreResponseData);
                                                }
                                                return null;
                                            }
                                            catch (error) {
                                                console.error("Error fetching questions from Firestore:", error);
                                                return null;
                                            }

                                        }}>
                                        <label>
                                            {genai_youtube_label || 'YouTube'}
                                        </label>
                                    </button>
                                    )
                                }
                                {showPrint && (
                                    <button
                                        onClick={() => handleLyrics(promptInput)}
                                        className={isLyrics ? 'action_button_flashing' : 'action_button'}
                                    >
                                        Lyrics
                                    </button>
                                )}
                                {
                                    (showPrint && showYouTubeButton &&
                                        <button
                                            className={isGeneratingYouTubeBedtimeStory ? 'action_button_flashing' : 'action_button'}
                                            onClick={async () => {
                                                // console.log('Story Teller prompt:', story_teller_prompt);
                                                if (story_teller_prompt === undefined || story_teller_prompt.length < 5) {
                                                    alert('ERROR: story_teller_prompt is blank.');
                                                    return;
                                                }
                                                bedtime_stories_content_input = promptInput + story_teller_prompt;
                                                setTemperature(1);
                                                setTop_p(1);
                                                setSpeechRate(storyTellingSpeechRate);
                                                setSpeechSilence(storyTellingSpeechSilence);
                                                // Need to wait for state updates to be applied
                                                await new Promise(resolve => setTimeout(resolve, 500));

                                                setIsGeneratingYouTubeBedtimeStory(true);
                                                //console.log('bedtime_stories_content_input:', bedtime_stories_content_input);
                                                await callAPI(modelo, 'bedtime_stories');
                                                // console.log(' generatedDocID', generatedDocID);
                                                if (!generatedDocID || generatedDocID.length < 5) {
                                                    alert('ERROR: generatedDocID is not set.');
                                                    return;
                                                }
                                                try {
                                                    const docRef = doc(db, 'genai', user.uid, 'MyGenAI', generatedDocID);
                                                    const docSnap = await getDoc(docRef);

                                                    if (docSnap.exists()) {
                                                        const firestoreResponseData = docSnap.data().answer;
                                                        console.log('First fetched data from Firestore:', firestoreResponseData);
                                                        if (firestoreResponseData === undefined || firestoreResponseData.length < 100) {
                                                            alert('ERROR: Prompt response is not generated.');
                                                            return;
                                                        }
                                                        generateYouTubeUploadInformation(firestoreResponseData, 'stories');
                                                    }
                                                    return null;
                                                }
                                                catch (error) {
                                                    console.error("Error fetching questions from Firestore:", error);
                                                    return null;
                                                }
                                            }}
                                        >
                                            {genai_stories_label || 'Bedtime Stories'}
                                        </button>
                                    )
                                }
                                <button
                                    className={isGeneratingYouTubeMusic ? 'action_button_flashing' : 'action_button'}
                                    onClick={async () => {
                                        if (promptInput === undefined || promptInput.length < 5) {
                                            alert('ERROR: prompt is blank.');
                                            return;
                                        }
                                        setTemperature(1);
                                        setTop_p(1);
                                        // Need to wait for state updates to be applied
                                        await new Promise(resolve => setTimeout(resolve, 500));

                                        setIsGeneratingYouTubeMusic(true);
                                        try {
                                            await generateYouTubeUploadInformation(promptInput, 'youtube_own_content');
                                            setIsGeneratingYouTubeMusic(false);
                                        }
                                        catch (error) {
                                            console.error("Error fetching questions from Firestore:", error);
                                            return null;
                                        }
                                    }}
                                >
                                    Title/Audio/Images
                                </button>
                            </>
                        )}
                        {showImageDallE3 &&
                            <button
                                className={isGeneratingImages ? 'action_button_flashing' : 'action_button'}
                                onClick={async () => {
                                    if (promptInput === undefined || promptInput.length < 5) {
                                        alert('ERROR: prompt is blank.');
                                        return;
                                    }
                                    setTemperature(1);
                                    setTop_p(1);
                                    // Need to wait for state updates to be applied
                                    await new Promise(resolve => setTimeout(resolve, 500));
                                    setIsGeneratingImages(true);
                                    try {
                                        imageGenerationPromptInput = promptInput;
                                        if (generateDalleImage === true) {
                                            await callAPI(modelImageDallE3, 'image_ai_agent');
                                        }
                                        if (generateGeminiImage === true) {
                                            await callAPI(modelGeminiImage, 'image_ai_agent');
                                        }
                                        setIsGeneratingImages(false);
                                    }
                                    catch (error) {
                                        console.error("Error fetching questions from Firestore:", error);
                                        setIsGeneratingImages(false);
                                        return null;
                                    }
                                }}>
                                {genai_image_label || 'GenAI Image'}
                            </button>
                        }
                        <button
                            className={(isGeneratingGeminiSearch || isGeneratingPerplexity) ? 'action_button_flashing' : 'action_button'}
                            onClick={async () => {
                                setTemperature(0.2);
                                setTop_p(0.2);
                                setPromptInput(usaNewsPrompt);
                                // Need to wait for state updates to be applied
                                await new Promise(resolve => setTimeout(resolve, 500));
                                try {
                                    if (newsSource === 'perplexity') {
                                        setIsGeneratingPerplexity(true);
                                        await callAPI(modelPerplexity, 'usa-news');
                                    }
                                    else {
                                        setIsGeneratingGeminiSearch(true);
                                        await callAPI(modelGeminiSearch, 'usa-news');
                                    }
                                    // Get the generated news from Firestore
                                    const docRef = doc(db, 'genai', user.uid, 'MyGenAI', generatedDocID);
                                    const docSnap = await getDoc(docRef);
                                    if (docSnap.exists()) {
                                        const newsContent = docSnap.data().answer;
                                        // Generate audio for the news
                                        await callTTSAPI(newsContent, process.env.REACT_APP_TTS_SSML_API_URL);
                                    }
                                }
                                catch (error) {
                                    console.error("Error fetching news:", error);
                                    alert('Error generating news content');
                                }
                                finally {
                                    setIsGeneratingPerplexity(false);
                                    setIsGeneratingGeminiSearch(false);
                                }
                            }}>
                            USA News
                        </button>

                        <button
                            className={(isGeneratingGeminiSearch || isGeneratingPerplexity) ? 'action_button_flashing' : 'action_button'}
                            onClick={async () => {
                                setTemperature(0.2);
                                setTop_p(0.2);
                                setPromptInput(techNewsPrompt);
                                // Need to wait for state updates to be applied
                                await new Promise(resolve => setTimeout(resolve, 500));
                                try {
                                    if (newsSource === 'perplexity') {
                                        setIsGeneratingPerplexity(true);
                                        await callAPI(modelPerplexity, 'tech-news');
                                    }
                                    else {
                                        setIsGeneratingGeminiSearch(true);
                                        await callAPI(modelGeminiSearch, 'tech-news');
                                    }
                                    // Get the generated news from Firestore
                                    const docRef = doc(db, 'genai', user.uid, 'MyGenAI', generatedDocID);
                                    const docSnap = await getDoc(docRef);
                                    if (docSnap.exists()) {
                                        const newsContent = docSnap.data().answer;
                                        // Generate audio for the news
                                        await callTTSAPI(newsContent, process.env.REACT_APP_TTS_SSML_API_URL);
                                    }
                                }
                                catch (error) {
                                    console.error("Error fetching news:", error);
                                    alert('Error generating news content');
                                }
                                finally {
                                    setIsGeneratingPerplexity(false);
                                    setIsGeneratingGeminiSearch(false);
                                }
                            }}>
                            Tech News
                        </button>
                    </div>
                    {showPrint && (
                        <div className="button-section" data-title="Gen AI Audio - Text to Speech">
                            {showVoiceSelect && (
                                <VoiceSelect
                                    selectedVoice={voiceName} // Current selected voice
                                    onVoiceChange={setVoiceName} // Handler to update selected voice
                                />
                            )}
                            {showPrint && (
                                <button
                                    className={isLiveAudioPlayingPrompt ? 'action_button_flashing' : 'action_button'}
                                    onClick={async () => {
                                        try {
                                            setIsLiveAudioPlayingPrompt(true);
                                            await synthesizeSpeech(promptInput, "English");
                                        } catch (error) {
                                            console.error('Error playing audio:', error);
                                        }
                                        finally {
                                            setIsLiveAudioPlayingPrompt(false);
                                        }
                                    }}
                                >
                                    <FaPlay /> Speak
                                </button>
                            )
                            }
                            {showTTS &&
                                <label style={{ marginLeft: '8px' }}>
                                    Speech Rate:
                                    <input
                                        type="text"
                                        maxLength="5"
                                        value={speechRate}
                                        onChange={(e) => setSpeechRate(e.target.value)}
                                        style={{ width: '50px', marginLeft: '5px' }}
                                    />
                                </label>
                            }
                            {showTTS &&
                                <label style={{ marginLeft: '8px' }}>
                                    Speech Silence:
                                    <input
                                        type="number"
                                        value={speechSilence}
                                        onChange={(e) => setSpeechSilence(parseInt(e.target.value))}
                                        style={{ width: '60px', marginLeft: '5px' }}
                                    />
                                </label>
                            }
                            {showPrint && showTTS &&
                                <button
                                    className={isGeneratingTTS ? 'action_button_flashing' : 'action_button'}
                                    onClick={() => handleTTSChange()}
                                >
                                    <FaCloudDownloadAlt /> {genai_audio_label || 'Audio'}
                                </button>
                            }
                            {showPrint && showTTS &&
                                <button
                                    className={isGeneratingTTS ? 'action_button_flashing' : 'action_button'}
                                    onClick={() => callGenAITTSAPI(promptInput)}
                                >
                                    <FaCloudDownloadAlt /> Gen AI Audio
                                </button>
                            }
                            {showPrint && showTTS &&
                                <button
                                    className={isGeneratingTTS ? 'action_button_flashing' : 'action_button'}
                                    onClick={() => { callTTSAPI(promptInput, process.env.REACT_APP_TTS_GEMINI_API_URL); }}
                                >
                                    <FaCloudDownloadAlt /> Gemini Audio
                                </button>
                            }
                        </div>
                    )}
                    <div className="button-section" data-title="Practice Questions - Explanation - All Grades">
                        &nbsp;&nbsp;
                        <button
                            className='action_button'
                            onClick={() => window.open('https://genai-all.com', '_blank')}
                        >
                            Public-HomeWork-All-Grades
                        </button>
                        &nbsp;&nbsp;&nbsp;&nbsp;
                        <button
                            className='action_button'
                            onClick={() => window.open('https://sharathck.github.io/edugenai', '_blank')}
                        >
                            Personal-HomeWork-All-Grades
                        </button>
                        &nbsp;&nbsp;&nbsp;&nbsp;
                        <button
                            className='action_button'
                            onClick={() => window.open('https://sharathck.github.io/kidswork/', '_blank')}
                        >
                            Calculations + - x / %
                        </button>
                    </div>
                    {autoPrompt && selectedPrompt && showSourceDocument && (
                        <div style={{ marginTop: '10px', fontSize: '16px' }}>
                            Source document(s): <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleEditSource();
                                }}
                                className="action_button"
                            >
                                {selectedPrompt}
                            </button>
                        </div>
                    )}
                    <br />
                    <br />
                    <button
                        className={isRefreshing ? 'action_button_flashing' : 'action_button'}
                        onClick={async () => {
                            const currentUser = auth.currentUser;
                            if (currentUser) {
                                setIsRefreshing(true);
                                await fetchData(currentUser.uid);
                                await fetchPrompts(currentUser.uid);
                                await fetchGenAIParameters(currentUser.uid);
                                await fetchTexts();
                                setIsRefreshing(false);
                            } else {
                                alert('No user is signed in');
                            }
                        }}
                    >
                        <FaSyncAlt /> Refresh
                    </button>
                    &nbsp;&nbsp;
                    {!GenAIParameter ? (
                        showBackToAppButton && (
                            <button className='action_button' onClick={() => setShowMainApp(!showMainApp)}>
                                <img src={tasksIcon} alt={genai_tasks_label || 'Tasks'} height="26px" style={{ marginRight: '4px' }} />
                            </button>
                        )
                    ) : (
                        <button className='action_button' onClick={handleSignOut}><FaSignOutAlt /> </button>
                    )}
                    <button className='action_button' onClick={handleSignOut}><FaSignOutAlt /> </button>
                    {user && <span style={{ marginLeft: '5px' }}> {user.email}
                    </span>
                    }
                    <br />
                    <div className="info-text" style={{
                        fontSize: '14px',
                        color: '#666',
                    }}>
                    </div>
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
                    placeholder={semanticSearchPlaceholder || "Semantic or Vector Search"}
                />
                <input
                    className="searchInput"
                    type="text"
                    onKeyDown={(event) => (event.key === "Enter" || event.key === "Tab") && handleSearchChange(event)}
                    placeholder={keywordSearchPlaceholder || "Keyword Search"}
                />
                <select
                    className="searchInput"
                    onChange={(event) => handleInvocationChange(event)}
                    defaultValue=""
                    style={{ marginLeft: '2px', padding: '2px', fontSize: '16px' }}
                >
                    <option value="">Select Invocation Type</option>
                    <option value="homeWork">Practice Questions</option>
                    <option value="quiz">Trivia / Quiz</option>
                    <option value="image">Image</option>
                    <option value="youtube">YouTube Content</option>
                    <option value="youtubeTitle">YouTube Title</option>
                    <option value="youtubeDescription">YouTube Description</option>
                    <option value="imagesSearchWords">Google Image Search</option>
                    <option value="bedtime_stories">Bedtime Stories</option>
                    <option value="quiz_with_choices">Multiple Choice Quiz</option>
                    <option value="explain">Explain</option>
                    <option value="lyrics">Lyrics</option>
                    <option value="google-search">Google Search</option>
                    <option value="image_ai_agent">Image AI Agent</option>
                    <option value="imageGeneration">Image Generation Prompts</option>
                    <option value="GenAI">Gen AI Button</option>
                </select>
                {showPromptsDropDownAfterSearch && showBigQueryModelSearch && (<select
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
                    <option value="azure-tts">Audio</option>
                    <option value="dall-e-3">Image</option>
                    <option value="Mistral-large-2407">Mistral</option>
                    <option value="meta-llama-3.1-405b-instruct">Llama</option>
                    <option value="gpt-4-turbo">GptTurbo</option>
                    <option value="gpt-4o-mini">ChatGPT</option>
                    <option value="gemini-search">GeminiSearch</option>
                    <option value="gemini-flash">Gemini Flash</option>
                    <option value="perplexity-fast">PerplexityFast</option>
                    <option value="perplexity">Perplexity</option>
                    <option value="codestral">CodeStral</option>
                    <option value="Claude-Haiku">Claude-Haiku</option>
                    <option value="DeepSeekThink-1">DeepSeekThink</option>
                    <option value="groq-mixtral">Groq</option>
                    <option value="nova">Nova</option>
                    <option value="cerebras">Cerebras</option>
                    <option value="DeepSeek">DeepSeek</option>
                    <option value="gemini-flash-fast">Gemini Flash Fast</option>
                    <option value="claude-thinking">Claude-Thinking</option>
                </select>
                )}
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
                                config={{ view: { menu: true, md: true, html: true } }}
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

                <div>
                    {isLoading && <p> Loading Data...</p>}
                    {!isLoading && <div>
                        {genaiData.map((item) => (
                            <div className="outputDetailsFormat" key={item.createdDateTime}>
                                <div className="responseFormat">
                                    <h4 style={{ color: "brown" }}>

                                        <span style={{ color: "#a3780a", fontWeight: "bold" }}> Response </span>
                                        {item.llm && item.llm !== 'default' && item.llm !== '' && (
                                            <span style={{ color: "blue", fontSize: "16px" }}>({item.llm})</span>
                                        )}
                                        @ <span style={{ color: "black", fontSize: "16px" }}>{new Date(item.createdDateTime).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })}</span>
                                        &nbsp;
                                        on <span style={{ color: "grey", fontSize: "16px" }}>{new Date(item.createdDateTime).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                        &nbsp;&nbsp;
                                        {showPrint && (<span style={{ color: "blue", fontSize: "16px" }}>{item.model}</span>
                                        )}
                                        &nbsp;
                                        {showPrint && (<button onClick={() => {
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
                                        )}
                                        &nbsp; &nbsp;
                                        {showPrint && (<span style={{ color: "black", fontSize: "12px" }}>  #Char(Q): </span>
                                        )}                                     {showPrint && (<span style={{ color: "darkblue", fontSize: "16px" }}> {item.question?.length || 0}
                                        </span>)}
                                    </h4>
                                    <div style={{ fontSize: '16px' }}>
                                        {item.showRawQuestion ? item.question : (showFullQuestion[item.id] ? <ReactMarkdown>{item.question}</ReactMarkdown> : <ReactMarkdown>{getQuestionSubstring(item.question)}</ReactMarkdown>)}
                                    </div>
                                    {showPrint && (<button onClick={() => {
                                        setShowFullQuestion(prev => ({
                                            ...prev,
                                            [item.id]: !prev[item.id]
                                        }));
                                    }}>            {showFullQuestion[item.id] ? 'Less' : 'More'}
                                    </button>
                                    )}

                                </div>
                                <div style={{ border: "1px solid black" }}>
                                    <div style={{ color: "green", fontWeight: "bold" }}>
                                        {item.model !== modelImageDallE3 && item.model !== modelGeminiImage && item.model !== 'azure-tts' && (
                                            <>
                                                {(!isiPhone && showPrint && (!item.voiceName || !item.voiceName?.length > 2) && 
                                                    <button
                                                        className={isLiveAudioPlaying[item.id] ? 'action_button_flashing' : 'action_button'}
                                                        onClick={async () => {
                                                            try {
                                                                setIsLiveAudioPlaying(prev => ({ ...prev, [item.id]: true }));
                                                                await synthesizeSpeech(item.answer, item.language || "English");

                                                            } catch (error) {
                                                                console.error('Error playing audio:', error);
                                                            }
                                                        }}
                                                    >
                                                        <label className={isLiveAudioPlaying[item.id] ? 'flashing' : ''}>
                                                            <FaPlay /> Speak
                                                        </label>
                                                    </button>
                                                )}

                                                {showPrint && (!item.voiceName || !item.voiceName?.length > 2) && (<button
                                                    className={isGeneratingDownloadableAudio[item.id] ? 'action_button_flashing' : 'action_button'}
                                                    onClick={async () => {
                                                        setIsGeneratingDownloadableAudio(prev => ({ ...prev, [item.id]: true }));
                                                        await callTTSAPI(item.answer, process.env.REACT_APP_TTS_SSML_API_URL)
                                                            .finally(() => setIsGeneratingDownloadableAudio(prev => ({ ...prev, [item.id]: false })));
                                                    }}
                                                >
                                                    <label className={isGeneratingDownloadableAudio[item.id] ? 'flashing' : ''}>
                                                        <FaCloudDownloadAlt /> Audio
                                                    </label>
                                                </button>
                                                )}
                                                {showPrint && (!item.voiceName || !item.voiceName?.length > 2) && (<button
                                                    className={isGeneratingTTS ? 'action_button_flashing' : 'action_button'}
                                                    onClick={() => callGenAITTSAPI(item.answer)}
                                                >
                                                    <FaCloudDownloadAlt /> Gen AI Audio
                                                </button>
                                                )}
                                                {showPrint && (!item.voiceName || !item.voiceName?.length > 2) && (<button
                                                    className={isGeneratingTTS ? 'action_button_flashing' : 'action_button'}
                                                    onClick={() => callTTSAPI(item.answer, process.env.REACT_APP_TTS_GEMINI_API_URL)}
                                                >
                                                    <FaCloudDownloadAlt /> Gemini Audio
                                                </button>
                                                )}
                                            </>
                                        )}
                                        &nbsp; &nbsp; &nbsp;
                                        {showPrint && (<button onClick={() => {
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
                                        )}
                                        &nbsp; &nbsp;
                                        {showPrint && (<span style={{ color: "black", fontSize: "12px" }}> #Char(Ans):</span>
                                        )}
                                        {showPrint && (<span style={{ color: "darkblue", fontSize: "16px" }}> {item.answer?.length || 0} </span>
                                        )}
                                        &nbsp; &nbsp;
                                        {showPrint && (!item.voiceName || (!item.voiceName || !item.voiceName?.length > 2)) && (
                                            <button
                                                edge="end"
                                                aria-label="print answer"
                                                className="action_button"
                                                onClick={() => {
                                                    const printWindow = window.open('', '', 'height=500,width=800');
                                                    const htmlContent = mdParser.render(item.answer);
                                                    printWindow.document.write('<html><head><title>Print</title>');
                                                    printWindow.document.write('<style>');
                                                    printWindow.document.write(`
                                                    body {
                                                        font-family: Arial, sans-serif;
                                                        margin: 20px;
                                                    }
                                                    table {
                                                        width: 100%;
                                                        border-collapse: collapse;
                                                        margin-bottom: 20px;
                                                    }
                                                    table, th, td {
                                                        border: 1px solid #ccc;
                                                    }
                                                    th, td {
                                                        padding: 8px;
                                                        text-align: left;
                                                    }
                                                    th {
                                                        background-color: #f2f2f2;
                                                    }
                                                    pre {
                                                        background-color: #f5f5f5;
                                                        padding: 10px;
                                                        overflow: auto;
                                                    }
                                                    code {
                                                        background-color: #f5f5f5;
                                                        padding: 2px 4px;
                                                    }
                                                `);
                                                    printWindow.document.write('</style></head><body>');
                                                    printWindow.document.write(htmlContent);
                                                    printWindow.document.write('</body></html>');
                                                    printWindow.document.close();
                                                    printWindow.print();
                                                }}
                                            >
                                                Print <FaPrint />
                                            </button>
                                        )}
                                    </div>
                                    <br />
                                    {(((['homeWork', 'quiz_with_choices', 'quiz'].includes(item.invocationType))) && item.answer) && (<button
                                        className="action_button"
                                        onClick={() => {
                                            setCurrentDocId(item.id);
                                            setShowhomeWorkApp(true);
                                        }}
                                    >
                                        {practicePageButtonLabel || 'Go to Questions/Quiz Page'}
                                    </button>
                                    )}
                                    {(showPrint || item.invocationType === 'explain') && (
                                        <div style={{ fontSize: '16px' }}>
                                            {isiPhone &&
                                                (item.model === modelImageDallE3 || item.model === modelGeminiImage || item.model === 'azure-tts') && (
                                                    <button
                                                        className="action_button"
                                                        onClick={() => handleDownload(item.answer, item.model)}
                                                    >
                                                        {isDownloading ? (
                                                            <FaSpinner className="spinning" />
                                                        ) : (
                                                            <>Download <FaCloudDownloadAlt size={28} /></>
                                                        )}
                                                    </button>
                                                )}
                                            {item.model === 'azure-tts' && <br />}
                                            {item.model === 'azure-tts' && <br />}
                                            {item.model === 'azure-tts' && item.answer?.match(/\(([^)]+)\)/g) && (
                                                <audio controls style={{ marginBottom: '10px' }}>
                                                    <source src={item.answer.match(/\(([^)]+)\)/g)[0].slice(1, -1)} type="audio/mpeg" />
                                                    Your browser does not support the audio element.
                                                </audio>
                                            )}
                                            &nbsp; &nbsp;
                                            {showPrint && (item.voiceName !== undefined && item.voiceName?.length > 2) && (
                                                <span style={{ color: "black", fontSize: "16px" }}> voice : <strong>{item.voiceName}</strong></span>
                                            )}
                                            &nbsp; &nbsp;
                                            {showPrint && (item.invocationType !== undefined && item.invocationType?.length > 2) && (
                                                <span style={{ color: "black", fontSize: "16px" }}> invocationType : <strong>{item.invocationType}</strong></span>
                                            )}
                                            &nbsp; &nbsp;
                                            {((!item.voiceName || !item.voiceName?.length > 2) && item.model !== modelImageDallE3 && item.model !== modelGeminiImage && item.model !== 'azure-tts') && (!['homeWork', 'quiz_with_choices', 'quiz'].includes(item.invocationType)) && showDownloadTextButton && (<button className="action_button"
                                                onClick={() => {
                                                    const plainText = (item.answer || '')
                                                        .replace(/[#*~`>-]/g, '')
                                                        .replace(/\r?\n/g, '\r\n');
                                                    const blob = new Blob([plainText], { type: 'text/plain' });
                                                    const link = document.createElement('a');
                                                    link.href = URL.createObjectURL(blob);
                                                    if (plainText.length > 105) {
                                                        link.download = 'description.txt';
                                                    } else {
                                                        link.download = 'title.txt';
                                                    }
                                                    link.click();
                                                }}
                                            >
                                                Download Text
                                            </button>
                                            )}
                                            <br />
                                            {item.showRawAnswer ? item.id : ''}
                                            {item.showRawAnswer ? item.id : ''}
                                            {item.voiceName?.length > 2 && (
                                                <audio src={item.answer.match(/\((https?:\/\/[^\s)]+)\)/)[1]} controls style={{ marginBottom: '10px' }} />
                                            )}
                                            {item.svg_url?.length > 10 && (
                                                <img src={item.svg_url} alt="Generated" />
                                            )}
                                            {(item.svg_url?.length < 10 || !item.svg_url) && (
                                                item.showRawAnswer ? ((!['homeWork', 'quiz_with_choices', 'quiz'].includes(item.invocationType)) && item.answer) : (
                                                    item.answer && (!['homeWork', 'quiz_with_choices', 'quiz'].includes(item.invocationType)) && (
                                                        <MdEditor
                                                            value={item.answer || ''} // Add default empty string
                                                            renderHTML={text => mdParser.render(text || '')} // Add default empty string
                                                            readOnly={true}
                                                            config={{
                                                                view: {
                                                                    menu: false,
                                                                    md: false,
                                                                    html: true
                                                                },
                                                                canView: {
                                                                    menu: false,
                                                                    md: false,
                                                                    html: true,
                                                                    fullScreen: false,
                                                                    hideMenu: true
                                                                }
                                                            }}
                                                        />
                                                    )
                                                )
                                            )}

                                        </div>

                                    )}
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
                        {genaiData.some(item => item.question && item.answer) && (
                            <button
                                className="fetchButton"
                                onClick={fetchMoreData}
                                style={{ marginTop: '20px', padding: '10px 20px', fontSize: '16px' }}
                            >
                                Show more information
                            </button>
                        )}
                    </div>}
                </div>
            </div>
        </div>
    );
};

export default GenAIApp;