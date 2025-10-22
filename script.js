// script.js - NIFAD Virtual Assistant
console.log('NIFAD script loaded successfully');

// DOM Elements
const talkBtn = document.getElementById('talkBtn');
const commandInput = document.getElementById('commandInput');
const listeningAnimation = document.getElementById('listeningAnimation');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const settingsToggle = document.getElementById('settingsToggle');
const settingsPanel = document.getElementById('settingsPanel');
const closeSettings = document.getElementById('closeSettings');
const speechRate = document.getElementById('speechRate');
const speechPitch = document.getElementById('speechPitch');
const autoListen = document.getElementById('autoListen');
const saveHistory = document.getElementById('saveHistory');
const resetSettings = document.getElementById('resetSettings');
const voiceSelect = document.getElementById('voiceSelect');
const currentTimeElement = document.getElementById('current-time');
const currentDateElement = document.getElementById('current-date');

// App State
let isListening = false;
let lastSpokenText = "";
let speechSynthesis = window.speechSynthesis;
let recognition;
let activationKeyword = "hey nifad";
let isAwake = false;
let isMicrophoneBlocked = false;

// For follow-up voice inputs when user says only "search for" or "set alarm"
let pendingCommand = null;

// Initialize the app
function init() {
    console.log('Initializing NIFAD...');
    loadSettings();
    setupSpeechRecognition();
    setupSpeechSynthesis();
    populateVoices();
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Event listeners for UI elements
    talkBtn.addEventListener('click', toggleListening);
    commandInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleCommand(commandInput.value);
            commandInput.value = '';
        }
    });
    
    clearHistoryBtn.addEventListener('click', () => {
        historyList.innerHTML = '';
        const systemItem = document.createElement('li');
        systemItem.className = 'history-item system';
        systemItem.innerHTML = '<span class="user-command"><i class="fas fa-server"></i> SYSTEM: HISTORY CLEARED</span>';
        historyList.appendChild(systemItem);
        speak("History cleared, Sir.");
    });
    
    settingsToggle.addEventListener('click', () => {
        settingsPanel.classList.add('open');
    });
    
    closeSettings.addEventListener('click', () => {
        settingsPanel.classList.remove('open');
    });
    
    speechRate.addEventListener('input', saveSettings);
    speechPitch.addEventListener('input', saveSettings);
    autoListen.addEventListener('change', saveSettings);
    saveHistory.addEventListener('change', saveSettings);
    
    resetSettings.addEventListener('click', () => {
        localStorage.removeItem('nifadSettings');
        loadSettings();
        speak("Settings restored to default values.");
    });
    
    // Populate voices when they are loaded
    if (speechSynthesis) {
        speechSynthesis.onvoiceschanged = populateVoices;
    }
    
    // Initial greeting
    setTimeout(() => {
        addToHistory('SYSTEM', 'N.I.F.A.D. INITIALIZED');
        speak("All systems operational. Ready for your command, Sir.");
    }, 1000);
}


// Update date and time in HUD
function updateDateTime() {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (currentTimeElement) currentTimeElement.textContent = time;
    const date = now.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    if (currentDateElement) currentDateElement.textContent = date;
}

// Show microphone error message
function showMicrophoneError() {
    addToHistory('SYSTEM', 'Microphone access is blocked. Please allow microphone permissions in your browser settings.');
    speak("Microphone access is blocked. Please allow microphone permissions to use voice commands.");
    isMicrophoneBlocked = true;
    talkBtn.disabled = true;
    talkBtn.title = "Microphone access blocked - click to enable";
    talkBtn.style.opacity = "0.5";
}

// Set up speech recognition
function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        addToHistory('SYSTEM', 'Speech recognition is not supported in this browser.');
        talkBtn.disabled = true;
        talkBtn.title = "Speech recognition not supported";
        talkBtn.style.opacity = "0.5";
        return null;
    }
    
    recognition = new SpeechRecognition();
    recognition.continuous = true; // KEEP listening until user stops
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
        isListening = true;
        talkBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        talkBtn.classList.add('listening');
        listeningAnimation.style.display = 'block';
    };
    
    recognition.onresult = (event) => {
        // pick the latest result (works well with continuous mode)
        const lastIndex = event.results.length - 1;
        const transcriptRaw = event.results[lastIndex][0].transcript.trim();
        const transcript = transcriptRaw.toLowerCase();
        console.log('Heard:', transcript);
        
        // If we are waiting for a follow-up, handle it
        if (pendingCommand) {
            handleFollowUp(transcriptRaw);
        } else if (transcript.includes(activationKeyword) || isAwake) {
            if (transcript.includes(activationKeyword)) {
                isAwake = true;
                const command = transcript.replace(activationKeyword, '').trim();
                if (command) {
                    handleCommand(command);
                } else {
                    speak("Yes, Sir. How may I assist you?");
                }
            } else {
                handleCommand(transcript);
            }
        }
    };
    
    recognition.onend = () => {
        isListening = false;
        talkBtn.innerHTML = '<i class="fas fa-microphone-alt"></i>';
        talkBtn.classList.remove('listening');
        listeningAnimation.style.display = 'none';
        // don't auto-restart here; speechSynthesis.onend will restart if autoListen is enabled
    };
    
    recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        isListening = false;
        talkBtn.innerHTML = '<i class="fas fa-microphone-alt"></i>';
        talkBtn.classList.remove('listening');
        listeningAnimation.style.display = 'none';
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            showMicrophoneError();
        }
    };
}

// Set up speech synthesis
function setupSpeechSynthesis() {
    if (!speechSynthesis) {
        addToHistory('SYSTEM', 'Speech synthesis is not supported in this browser.');
    }
}

// Populate voice selection dropdown
function populateVoices() {
    if (!speechSynthesis) return;
    const voices = speechSynthesis.getVoices();
    voiceSelect.innerHTML = '';
    const defaultOption = document.createElement('option');
    defaultOption.value = 'default';
    defaultOption.textContent = 'DEFAULT VOICE';
    voiceSelect.appendChild(defaultOption);
    voices.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.name;
        option.textContent = `${voice.name} (${voice.lang})`;
        if (voice.default) option.selected = true;
        voiceSelect.appendChild(option);
    });
}

// Toggle listening state
function toggleListening() {
    if (isMicrophoneBlocked) {
        speak("Please enable microphone permissions in your browser settings to use voice commands.");
        addToHistory('SYSTEM', 'Microphone access is blocked. Guide user to enable permissions.');
        return;
    }
    if (!recognition) {
        speak("Speech recognition is not available in your browser.");
        return;
    }
    if (isListening) {
        try { recognition.stop(); } catch (e) {}
        isListening = false;
    } else {
        try {
            recognition.start();
            isAwake = true;
        } catch (error) {
            console.error('Error starting recognition:', error);
            speak("I'm having trouble accessing the microphone. Please check your permissions.");
        }
    }
}

// Handle voice commands
function handleCommand(command) {
    if (!command) return;
    addToHistory('USER', command);
    const lowerCommand = command.toLowerCase();
    
    if (lowerCommand.includes('time')) {
        const now = new Date();
        const time = now.toLocaleTimeString();
        speak(`The current time is ${time}`);
        addToHistory('NIFAD', `The current time is ${time}`);
    } 
    else if (lowerCommand.includes('date')) {
        const now = new Date();
        const date = now.toLocaleDateString();
        speak(`Today's date is ${date}`);
        addToHistory('NIFAD', `Today's date is ${date}`);
    }
    else if (lowerCommand.includes('open google')) {
        speak("Opening Google");
        window.open('https://www.google.com', '_blank');
        addToHistory('NIFAD', 'Opening Google');
    }
    else if (lowerCommand.includes('open youtube')) {
        speak("Opening YouTube");
        window.open('https://www.youtube.com', '_blank');
        addToHistory('NIFAD', 'Opening YouTube');
    }
    else if (lowerCommand.includes('open facebook')) {
        speak("Opening Facebook");
        window.open('https://www.facebook.com', '_blank');
        addToHistory('NIFAD', 'Opening Facebook');
    }
    else if (lowerCommand.includes('open wikipedia')) {
        speak("Opening Wikipedia");
        window.open('https://www.wikipedia.org', '_blank');
        addToHistory('NIFAD', 'Opening Wikipedia');
    }
    else if (lowerCommand.startsWith('search for')) {
        const query = command.replace(/search for/i, '').trim();
        if (query) {
            speak(`Searching for ${query}`);
            window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
            addToHistory('NIFAD', `Searching for ${query}`);
        } else {
            speak("What would you like me to search for?");
            pendingCommand = 'search';
        }
    }
    else if (lowerCommand.includes('open calculator')) {
        speak("Opening calculator");
        window.open('https://www.google.com/search?q=calculator', '_blank');
        addToHistory('NIFAD', 'Opening calculator');
    }
    else if (lowerCommand.includes('clear history')) {
        historyList.innerHTML = '';
        const systemItem = document.createElement('li');
        systemItem.className = 'history-item system';
        systemItem.innerHTML = '<span class="user-command"><i class="fas fa-server"></i> SYSTEM: HISTORY CLEARED</span>';
        historyList.appendChild(systemItem);
        speak("History cleared, Sir.");
    }
    else if (lowerCommand.includes('go to sleep') || lowerCommand === 'sleep') {
        speak("Going to sleep. Say 'Hey Nifad' to wake me up.");
        isAwake = false;
        addToHistory('NIFAD', 'Going to sleep');
    }
    else if (lowerCommand.includes('play music')) {
        speak("Playing music");
        window.open('https://www.youtube.com/watch?v=jNQXAC9IVRw', '_blank');
        addToHistory('NIFAD', 'Playing music');
    }
    else if (lowerCommand.includes('joke')) {
    const jokes = [
        "Why don't scientists trust atoms? Because they make up everything!",
        "Why did the scarecrow win an award? Because he was outstanding in his field!",
        "What do you call a fake noodle? An impasta!",
        "Why couldn't the bicycle stand up by itself? It was two tired!",
        "What's the best thing about Switzerland? I don't know, but the flag is a big plus!",
        "Why did the math book look sad? Because it had too many problems.",
        "Why was the computer cold? It left its Windows open!",
        "Why did the golfer bring two pairs of pants? In case he got a hole in one.",
        "Why don't skeletons fight each other? They don't have the guts.",
        "What do you call cheese that isn't yours? Nacho cheese!",
        "Why can’t your nose be 12 inches long? Because then it would be a foot.",
        "What do you call an alligator in a vest? An investigator.",
        "Why did the tomato blush? Because it saw the salad dressing!",
        "Why was the math lecture so long? The professor kept going off on a tangent.",
        "What do you get if you cross a snowman with a vampire? Frostbite.",
        "What did the zero say to the eight? Nice belt!",
        "Why don't eggs tell jokes? They might crack up.",
        "How do you organize a space party? You planet.",
        "Why did the cookie go to the hospital? Because it felt crummy.",
        "Why was the broom late? It swept in.",
        "What do you call a bear with no teeth? A gummy bear.",
        "Why did the music teacher go to jail? Because she got caught with the wrong notes.",
        "What’s orange and sounds like a parrot? A carrot.",
        "Why did the bicycle fall over? It was two tired.",
        "Why can't you give Elsa a balloon? Because she will let it go.",
        "What did one wall say to the other wall? I'll meet you at the corner.",
        "Why was the belt arrested? For holding up a pair of pants.",
        "What do you call a boomerang that won’t come back? A stick.",
        "What do you call a pile of cats? A meowtain.",
        "Why did the banana go to the doctor? Because it wasn't peeling well.",
        "Why did the picture go to jail? Because it was framed.",
        "Why did the chicken go to the seance? To talk to the other side.",
        "Why can’t your hand be 12 inches long? Because then it would be a foot.",
        "Why do cows have hooves instead of feet? Because they lactose.",
        "Why did the computer go to the doctor? It had a virus.",
        "Why did the frog take the bus to work? His car got toad.",
        "Why was the stadium so cool? It was filled with fans.",
        "Why did the golfer bring an extra shirt? In case he got a hole in one.",
        "Why did the scarecrow get promoted? He was outstanding in his field.",
        "Why did the banker switch careers? He lost interest.",
        "Why did the coffee file a police report? It got mugged.",
        "Why was the belt so good at his job? He held everything up.",
        "Why did the man put his money in the blender? He wanted to make some liquid assets.",
        "Why don't some couples go to the gym? Because some relationships don’t work out.",
        "Why did the orange stop? It ran out of juice.",
        "Why did the music note get detention? For being too sharp.",
        "Why did the skeleton go to the party alone? He had no body to go with him.",
        "Why did the barber win the race? He knew all the shortcuts.",
        "Why did the tree get a computer? To log in.",
        "Why did the man run around his bed? Because he was trying to catch up on sleep.",
        "Why was the broom late? It overswept.",
        "Why did the tomato turn red? Because it saw the salad dressing.",
        "Why did the grape stop in the middle of the road? It ran out of juice.",
        "Why did the man stare at the can of orange juice? Because it said ‘concentrate’.",
        "Why did the bicycle fall over? Because it was two tired.",
        "Why did the book join the police? It wanted to go undercover.",
        "Why was the music class so noisy? There were too many notes.",
        "Why was the cookie sad? Because it felt crumby.",
        "Why don’t oysters share their pearls? Because they’re shellfish.",
        "Why did the cow go to outer space? To see the moooon.",
        "Why do bees have sticky hair? Because they use honeycombs.",
        "Why was the baby strawberry crying? Because its parents were in a jam.",
        "Why don’t you ever see elephants hiding in trees? Because they’re so good at it.",
        "Why was the clock always shy? It had too many hands pointing at it.",
        "Why did the pencil go to the principal’s office? It was a little sketchy.",
        "Why did the fisherman put peanut butter in the ocean? To go with the jellyfish.",
        "Why did the robber take a bath? He wanted a clean getaway.",
        "Why did the cat sit on the computer? To keep an eye on the mouse.",
        "Why did the calendar look popular? It had a lot of dates.",
        "Why did the banana go out with the prune? Because it couldn’t find a date.",
        "Why don’t seagulls fly over the bay? Because then they’d be bagels.",
        "Why did the phone go to school? To improve its reception.",
        "Why did the egg get thrown out of class? For cracking jokes.",
        "Why did the bee get married? Because he found his honey.",
        "Why was the broom so tired? It had a sweep-over.",
        "Why don’t sharks eat clowns? Because they taste funny.",
        "Why did the potato turn red? Because it saw the salad dressing.",
        "Why was the teacher wearing sunglasses? Because her students were so bright.",
        "Why was the mushroom invited to the party? Because he was a fungi.",
        "Why was the picture so good at talking? Because it had a great frame of reference.",
        "Why did the skeleton not fight? Because it didn’t have the guts.",
        "Why did the cookie go to the doctor? It felt crumby.",
        "Why was the broom tired? It swept all night.",
        "Why did the banana go to the party? Because it was a-peeling.",
        "Why did the cat go to medical school? To become a purr-amedic.",
        "Why did the tomato turn red? It saw the salad dressing.",
        "Why did the scarecrow win an award? He was outstanding in his field.",
        "Why did the man bring a ladder to the bar? He wanted to reach the high spirits.",
        "Why did the kid bring a ladder to school? He wanted to go to high school.",
        "Why don’t skeletons ever go out to parties? They have no body to dance with.",
        "Why did the picture get locked up? It was framed.",
        "Why did the spider go to the computer? To check its web site.",
        "Why did the grape stop rolling? It ran out of juice.",
        "Why did the notebook look so sad? Because it had too many issues.",
        "Why did the belt go to jail? It held up a pair of pants.",
        "Why did the bird go to the restaurant? To get a tweet.",
        "Why did the mirror go to school? To reflect on itself.",
        "Why did the snowman call his dog Frost? Because Frost bites."
    ];
}

        const joke = jokes[Math.floor(Math.random() * jokes.length)];
        speak(joke);
        addToHistory('NIFAD', joke);
    }
    else if (lowerCommand.includes('weather')) {
        speak("Checking weather forecast");
        window.open('https://www.google.com/search?q=weather', '_blank');
        addToHistory('NIFAD', 'Checking weather forecast');
    }
    else if (lowerCommand.includes('news')) {
        speak("Getting news updates");
        window.open('https://news.google.com', '_blank');
        addToHistory('NIFAD', 'Getting news updates');
    }
    else if (lowerCommand.includes('create note')) {
        speak("Creating a note");
        const note = prompt("What would you like to note down?");
        if (note) {
            speak(`Note created: ${note}`);
            addToHistory('NIFAD', `Created note: ${note}`);
        }
    }
    else if (lowerCommand.startsWith('set alarm')) {
        const time = command.replace(/set alarm/i, '').trim();
        if (time) {
            speak(`Alarm set for ${time}`);
            addToHistory('NIFAD', `Alarm set for ${time}`);
        } else {
            speak("Please tell me the time for the alarm.");
            pendingCommand = 'alarm';
        }
    }
    else if (lowerCommand.startsWith('set timer')) {
        const duration = command.replace(/set timer/i, '').trim();
        if (duration) {
            speak(`Timer set for ${duration}`);
            addToHistory('NIFAD', `Timer set for ${duration}`);
        } else {
            speak("Please tell me the duration for the timer.");
            pendingCommand = 'timer';
        }
    }
    else if (lowerCommand.startsWith('add to calendar') || lowerCommand.startsWith('set calendar')) {
        const event = command.replace(/(add to calendar|set calendar)/i, '').trim();
        if (event) {
            speak(`Added ${event} to calendar`);
            addToHistory('NIFAD', `Added ${event} to calendar`);
        } else {
            speak("Please tell me the event you want to add to the calendar.");
            pendingCommand = 'calendar';
        }
    }
    else if (lowerCommand.includes('hello') || lowerCommand.includes('hi')) {
        speak("Hello Sir. How may I assist you today?");
        addToHistory('NIFAD', 'Hello Sir. How may I assist you today?');
    }
    else if (lowerCommand.includes('thank')) {
        speak("You're welcome, Sir. Is there anything else I can help with?");
        addToHistory('NIFAD', "You're welcome, Sir. Is there anything else I can help with?");
    }
    else if (lowerCommand.includes('who are you')) {
        speak("I am NIFAD, Just A Rather Very Intelligent System. Your personal assistant.");
        addToHistory('NIFAD', "I am NIFAD, Just A Rather Very Intelligent System. Your personal assistant.");
    }
    else {
        speak("I'm sorry, I don't understand that command yet.");
        addToHistory('NIFAD', "I'm sorry, I don't understand that command yet.");
    }
}

// Handle follow-ups (for search, alarm, timer, calendar)
function handleFollowUp(responseRaw) {
    const response = responseRaw.trim();
    if (!response) {
        speak("I didn't catch that. Please repeat.");
        return;
    }
    // Log user follow-up
    addToHistory('USER', response);
    
    if (pendingCommand === 'search') {
        speak(`Searching for ${response}`);
        window.open(`https://www.google.com/search?q=${encodeURIComponent(response)}`, '_blank');
        addToHistory('NIFAD', `Searching for ${response}`);
    } else if (pendingCommand === 'alarm') {
        speak(`Alarm set for ${response}`);
        addToHistory('NIFAD', `Alarm set for ${response}`);
    } else if (pendingCommand === 'timer') {
        speak(`Timer set for ${response}`);
        addToHistory('NIFAD', `Timer set for ${response}`);
    } else if (pendingCommand === 'calendar') {
        speak(`Added ${response} to calendar`);
        addToHistory('NIFAD', `Added ${response} to calendar`);
    } else {
        speak("Sorry, I couldn't handle that follow-up.");
    }
    
    pendingCommand = null;
}

// Add item to command history
function addToHistory(type, content) {
    const item = document.createElement('li');
    if (type === 'USER') {
        item.className = 'history-item user';
        item.innerHTML = `<span class="user-command"><i class="fas fa-user"></i> USER: ${content}</span>`;
    } 
    else if (type === 'JARVIS') {
        item.className = 'history-item jarvis';
        item.innerHTML = `
            <span class="user-command"><i class="fas fa-robot"></i> JARVIS:</span>
            <span class="assistant-response">${content}</span>
        `;
    }
    else if (type === 'SYSTEM') {
        item.className = 'history-item system';
        item.innerHTML = `<span class="user-command"><i class="fas fa-server"></i> SYSTEM: ${content}</span>`;
    }
    historyList.appendChild(item);
    historyList.scrollTop = historyList.scrollHeight;
}

// Speak text using speech synthesis
function speak(text) {
    if (!speechSynthesis) {
        console.log("Speech synthesis not available:", text);
        return;
    }
    // stop recognition before speaking to avoid capturing JARVIS' own speech
    try {
        if (recognition && isListening) recognition.stop();
    } catch (e) {}
    
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = parseFloat(speechRate.value) || 1;
    utterance.pitch = parseFloat(speechPitch.value) || 1;
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0 && voiceSelect.value !== 'default') {
        utterance.voice = voices.find(voice => voice.name === voiceSelect.value) || voices[0];
    }
    utterance.onend = () => {
        // After speaking, if autoListen is enabled and assistant is awake, restart recognition automatically
        if (autoListen.checked && isAwake && recognition) {
            setTimeout(() => {
                try {
                    recognition.start();
                } catch (error) {
                    console.error('Error restarting recognition after speech:', error);
                }
            }, 250);
        }
    };
    try {
        speechSynthesis.speak(utterance);
        lastSpokenText = text;
    } catch (error) {
        console.error('Error with speech synthesis:', error);
    }
}

// Load settings
function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('jarvisSettings')) || {};
    if (speechRate) speechRate.value = settings.speechRate || 1;
    if (speechPitch) speechPitch.value = settings.speechPitch || 1;
    if (autoListen) autoListen.checked = settings.autoListen !== undefined ? settings.autoListen : true;
    if (saveHistory) saveHistory.checked = settings.saveHistory !== undefined ? settings.saveHistory : true;
}

// Save settings
function saveSettings() {
    const settings = {
        speechRate: parseFloat(speechRate.value),
        speechPitch: parseFloat(speechPitch.value),
        autoListen: autoListen.checked,
        saveHistory: saveHistory.checked
    };
    localStorage.setItem('jarvisSettings', JSON.stringify(settings));
}

// Initialize the app when the window loads
window.addEventListener('load', init);

// Fallback for speech recognition errors
window.addEventListener('click', function() {
    if (isMicrophoneBlocked) {
        try {
            setupSpeechRecognition();
            isMicrophoneBlocked = false;
            talkBtn.disabled = false;
            talkBtn.style.opacity = "1";
            talkBtn.title = "";
            addToHistory('SYSTEM', 'Microphone access reinitialized. Please try again.');
        } catch (error) {
            console.error('Failed to reinitialize recognition:', error);
        }
    }
});

