// NIFAD Virtual Assistant - Complete Fixed Version
console.log('NIFAD Virtual Assistant loading...');

class NIFADAssistant {
    constructor() {
        this.isListening = false;
        this.isAwake = true;
        this.pendingCommand = null;
        this.activationKeyword = "hey nifad";
        this.speechSynthesis = window.speechSynthesis;
        this.recognition = null;
        this.currentCommandSource = null; // 'voice' or 'text'
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupSpeechRecognition();
        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 1000);
        
        setTimeout(() => {
            this.addToHistory('SYSTEM', 'N.I.F.A.D. INITIALIZED');
            this.speak("All systems operational. Ready for your command, Sir.");
        }, 1000);
    }

    initializeElements() {
        // Get all DOM elements
        this.talkBtn = document.getElementById('talkBtn');
        this.commandInput = document.getElementById('commandInput');
        this.listeningAnimation = document.getElementById('listeningAnimation');
        this.historyList = document.getElementById('historyList');
        this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
        this.currentTimeElement = document.getElementById('current-time');
        this.currentDateElement = document.getElementById('current-date');
        
        // Settings elements
        this.settingsToggle = document.getElementById('settingsToggle');
        this.settingsPanel = document.getElementById('settingsPanel');
        this.closeSettings = document.getElementById('closeSettings');
        this.voiceSelect = document.getElementById('voiceSelect');
        this.speechRate = document.getElementById('speechRate');
        this.speechPitch = document.getElementById('speechPitch');
        this.autoListen = document.getElementById('autoListen');
        this.saveHistory = document.getElementById('saveHistory');
        this.resetSettings = document.getElementById('resetSettings');
    }

    setupEventListeners() {
        // Main controls
        this.talkBtn.addEventListener('click', () => {
            this.currentCommandSource = 'voice';
            this.toggleListening();
        });
        
        this.commandInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.currentCommandSource = 'text';
                this.handleCommand(this.commandInput.value);
                this.commandInput.value = '';
            }
        });

        this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());

        // Settings
        this.settingsToggle.addEventListener('click', () => {
            this.settingsPanel.classList.add('open');
        });

        this.closeSettings.addEventListener('click', () => {
            this.settingsPanel.classList.remove('open');
        });

        // Settings changes
        this.speechRate?.addEventListener('input', () => this.saveSettings());
        this.speechPitch?.addEventListener('input', () => this.saveSettings());
        this.autoListen?.addEventListener('change', () => this.saveSettings());
        this.saveHistory?.addEventListener('change', () => this.saveSettings());
        this.resetSettings?.addEventListener('click', () => this.resetSettingsToDefault());

        // Voice selection
        if (this.speechSynthesis) {
            this.speechSynthesis.onvoiceschanged = () => this.populateVoices();
            this.populateVoices();
        }
    }

    setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            this.addToHistory('SYSTEM', 'Speech recognition is not supported in this browser.');
            this.talkBtn.disabled = true;
            this.talkBtn.style.opacity = "0.5";
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
            this.isListening = true;
            this.talkBtn.classList.add('listening');
            this.listeningAnimation.style.display = 'block';
        };

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.toLowerCase();
            console.log('Heard:', transcript);
            
            if (this.pendingCommand) {
                this.handleFollowUp(transcript);
            } else if (transcript.includes(this.activationKeyword) || this.isAwake) {
                const command = transcript.replace(this.activationKeyword, '').trim();
                if (command) {
                    this.currentCommandSource = 'voice';
                    this.handleCommand(command);
                } else if (transcript.includes(this.activationKeyword)) {
                    this.speak("Yes, Sir. How may I assist you?");
                }
            }
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.talkBtn.classList.remove('listening');
            this.listeningAnimation.style.display = 'none';
            
            // Only restart listening if it was a voice command and auto-listen is enabled
            if (this.currentCommandSource === 'voice' && this.autoListen?.checked && this.isAwake && !this.pendingCommand) {
                setTimeout(() => {
                    try {
                        this.recognition.start();
                    } catch (e) {
                        console.log('Could not restart recognition:', e);
                    }
                }, 1000);
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.isListening = false;
            this.talkBtn.classList.remove('listening');
            this.listeningAnimation.style.display = 'none';
            
            if (event.error === 'not-allowed') {
                this.addToHistory('SYSTEM', 'Microphone access denied. Please allow microphone permissions.');
                this.speak("Microphone access is blocked. Please allow permissions to use voice commands.");
            }
        };
    }

    toggleListening() {
        if (!this.recognition) {
            this.speak("Speech recognition is not available in your browser.");
            return;
        }

        if (this.isListening) {
            this.recognition.stop();
        } else {
            try {
                this.recognition.start();
                this.isAwake = true;
                this.currentCommandSource = 'voice';
            } catch (error) {
                console.error('Error starting recognition:', error);
                this.speak("I'm having trouble accessing the microphone. Please check your permissions.");
            }
        }
    }

    handleCommand(command) {
        if (!command.trim()) return;
        
        this.addToHistory('USER', command);
        const lowerCommand = command.toLowerCase();

        // Time commands
        if (lowerCommand.includes('time')) {
            const time = new Date().toLocaleTimeString();
            this.speak(`The current time is ${time}`);
            this.addToHistory('NIFAD', `The current time is ${time}`);
        }
        // Date commands
        else if (lowerCommand.includes('date')) {
            const date = new Date().toLocaleDateString();
            this.speak(`Today's date is ${date}`);
            this.addToHistory('NIFAD', `Today's date is ${date}`);
        }
        // Web navigation
        else if (lowerCommand.includes('open google')) {
            this.speak("Opening Google");
            window.open('https://www.google.com', '_blank');
            this.addToHistory('NIFAD', 'Opening Google');
        }
        else if (lowerCommand.includes('open youtube')) {
            this.speak("Opening YouTube");
            window.open('https://www.youtube.com', '_blank');
            this.addToHistory('NIFAD', 'Opening YouTube');
        }
        else if (lowerCommand.includes('open wikipedia')) {
            this.speak("Opening Wikipedia");
            window.open('https://www.wikipedia.org', '_blank');
            this.addToHistory('NIFAD', 'Opening Wikipedia');
        }
        // Search commands
        else if (lowerCommand.startsWith('search for')) {
            const query = command.replace(/search for/i, '').trim();
            if (query) {
                this.speak(`Searching for ${query}`);
                window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
                this.addToHistory('NIFAD', `Searching for ${query}`);
            } else {
                this.speak("What would you like me to search for?");
                this.pendingCommand = 'search';
            }
        }
        // System commands
        else if (lowerCommand.includes('clear history')) {
            this.clearHistory();
        }
        else if (lowerCommand.includes('go to sleep')) {
            this.speak("Going to sleep. Say 'Hey Nifad' to wake me up.");
            this.isAwake = false;
            this.addToHistory('NIFAD', 'Going to sleep');
        }
        // Entertainment
        else if (lowerCommand.includes('joke')) {
            const jokes = [
                "Why don't scientists trust atoms? Because they make up everything!",
                "Why did the scarecrow win an award? Because he was outstanding in his field!",
                "What do you call a fake noodle? An impasta!",
                "Why couldn't the bicycle stand up by itself? It was two tired!"
            ];
            const joke = jokes[Math.floor(Math.random() * jokes.length)];
            this.speak(joke);
            this.addToHistory('NIFAD', joke);
        }
        else if (lowerCommand.includes('weather')) {
            this.speak("Checking weather forecast");
            window.open('https://www.google.com/search?q=weather', '_blank');
            this.addToHistory('NIFAD', 'Checking weather forecast');
        }
        // Greetings
        else if (lowerCommand.includes('hello') || lowerCommand.includes('hi')) {
            this.speak("Hello Sir. How may I assist you today?");
            this.addToHistory('NIFAD', 'Hello Sir. How may I assist you today?');
        }
        else if (lowerCommand.includes('thank')) {
            this.speak("You're welcome, Sir. Is there anything else I can help with?");
            this.addToHistory('NIFAD', "You're welcome, Sir. Is there anything else I can help with?");
        }
        else if (lowerCommand.includes('who are you')) {
            this.speak("I am NIFAD, your personal virtual assistant.");
            this.addToHistory('NIFAD', "I am NIFAD, your personal virtual assistant.");
        }
        // Default response
        else {
            this.speak("I'm sorry, I don't understand that command yet.");
            this.addToHistory('NIFAD', "I'm sorry, I don't understand that command yet.");
        }
    }

    handleFollowUp(response) {
        if (!response.trim()) {
            this.speak("I didn't catch that. Please repeat.");
            return;
        }

        this.addToHistory('USER', response);

        if (this.pendingCommand === 'search') {
            this.speak(`Searching for ${response}`);
            window.open(`https://www.google.com/search?q=${encodeURIComponent(response)}`, '_blank');
            this.addToHistory('NIFAD', `Searching for ${response}`);
        }

        this.pendingCommand = null;
    }

    speak(text) {
        if (!this.speechSynthesis) {
            console.log("Speech synthesis not available");
            return;
        }

        // Stop any ongoing speech
        this.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = parseFloat(this.speechRate?.value) || 1;
        utterance.pitch = parseFloat(this.speechPitch?.value) || 1;

        // Set voice if available
        if (this.voiceSelect && this.voiceSelect.value !== 'default') {
            const voices = this.speechSynthesis.getVoices();
            const selectedVoice = voices.find(voice => voice.name === this.voiceSelect.value);
            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }
        }

        utterance.onend = () => {
            // Only restart listening for voice commands when auto-listen is enabled
            if (this.currentCommandSource === 'voice' && this.autoListen?.checked && this.isAwake && this.recognition && !this.pendingCommand) {
                setTimeout(() => {
                    try {
                        this.recognition.start();
                    } catch (e) {
                        console.log('Could not restart recognition after speech');
                    }
                }, 500);
            }
        };

        try {
            this.speechSynthesis.speak(utterance);
        } catch (error) {
            console.error('Speech synthesis error:', error);
        }
    }

    addToHistory(type, content) {
        const item = document.createElement('li');
        
        if (type === 'USER') {
            item.className = 'history-item user';
            item.innerHTML = `<span class="user-command"><i class="fas fa-user"></i> USER: ${content}</span>`;
        }
        else if (type === 'NIFAD') {
            item.className = 'history-item jarvis';
            item.innerHTML = `
                <span class="user-command"><i class="fas fa-robot"></i> NIFAD:</span>
                <span class="assistant-response">${content}</span>
            `;
        }
        else if (type === 'SYSTEM') {
            item.className = 'history-item system';
            item.innerHTML = `<span class="user-command"><i class="fas fa-server"></i> SYSTEM: ${content}</span>`;
        }

        this.historyList.appendChild(item);
        this.historyList.scrollTop = this.historyList.scrollHeight;
    }

    clearHistory() {
        this.historyList.innerHTML = '';
        const systemItem = document.createElement('li');
        systemItem.className = 'history-item system';
        systemItem.innerHTML = '<span class="user-command"><i class="fas fa-server"></i> SYSTEM: HISTORY CLEARED</span>';
        this.historyList.appendChild(systemItem);
        this.speak("History cleared, Sir.");
    }

    updateDateTime() {
        const now = new Date();
        const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const date = now.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
        
        if (this.currentTimeElement) this.currentTimeElement.textContent = time;
        if (this.currentDateElement) this.currentDateElement.textContent = date;
    }

    populateVoices() {
        if (!this.speechSynthesis || !this.voiceSelect) return;
        
        const voices = this.speechSynthesis.getVoices();
        this.voiceSelect.innerHTML = '<option value="default">DEFAULT VOICE</option>';
        
        voices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.name;
            option.textContent = `${voice.name} (${voice.lang})`;
            this.voiceSelect.appendChild(option);
        });
    }

    saveSettings() {
        const settings = {
            speechRate: this.speechRate?.value || 1,
            speechPitch: this.speechPitch?.value || 1,
            autoListen: this.autoListen?.checked || true,
            saveHistory: this.saveHistory?.checked || true
        };
        localStorage.setItem('nifadSettings', JSON.stringify(settings));
    }

    loadSettings() {
        const settings = JSON.parse(localStorage.getItem('nifadSettings')) || {};
        if (this.speechRate) this.speechRate.value = settings.speechRate || 1;
        if (this.speechPitch) this.speechPitch.value = settings.speechPitch || 1;
        if (this.autoListen) this.autoListen.checked = settings.autoListen !== undefined ? settings.autoListen : true;
        if (this.saveHistory) this.saveHistory.checked = settings.saveHistory !== undefined ? settings.saveHistory : true;
    }

    resetSettingsToDefault() {
        localStorage.removeItem('nifadSettings');
        this.loadSettings();
        this.speak("Settings restored to default values.");
    }
}

// Initialize the assistant when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const assistant = new NIFADAssistant();
    assistant.loadSettings();
});
