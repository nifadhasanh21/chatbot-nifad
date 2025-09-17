const btn = document.querySelector('.talk');
const content = document.querySelector('.content');

let lastSpokenText = ""; // store last spoken text

// ----------- SPEAK FUNCTION -----------
function speak(text) {
    lastSpokenText = text.toLowerCase(); // remember what JARVIS said
    const text_speak = new SpeechSynthesisUtterance(text);

    text_speak.rate = 1;
    text_speak.volume = 1;
    text_speak.pitch = 1;

    window.speechSynthesis.speak(text_speak);
}

// ----------- GREETING -----------
function wishMe() {
    var day = new Date();
    var hour = day.getHours();

    if (hour >= 0 && hour < 12) {
        speak("Good Morning Boss...");
    } else if (hour >= 12 && hour < 17) {
        speak("Good Afternoon Master...");
    } else {
        speak("Good Evening Sir...");
    }
}

window.addEventListener('load', () => {
    speak("Initializing JARVIS...");
    wishMe();
});

// ----------- SPEECH RECOGNITION SETUP -----------
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
    content.textContent = "Speech Recognition not supported in this browser!";
    speak("Sorry, your browser does not support speech recognition.");
}

const recognition = new SpeechRecognition();
recognition.continuous = false; // ✅ only listens once per click
recognition.interimResults = false;
recognition.lang = "en-US";

recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript.toLowerCase();
    console.log("You said:", transcript);
    content.textContent = transcript;

    // ✅ ignore if JARVIS is hearing himself
    if (transcript.includes(lastSpokenText)) {
        console.log("Ignored self-voice:", transcript);
        return;
    }

    takeCommand(transcript);
};

recognition.onerror = (event) => {
    console.error("Speech Recognition Error:", event.error);
    content.textContent = "Microphone error!";
    speak("I couldn't hear you, please check microphone permissions.");
};

// ----------- BUTTON CLICK -----------
btn.addEventListener('click', () => {
    try {
        content.textContent = "Listening...";
        recognition.start();
        console.log("Recognition started");
    } catch (error) {
        console.warn("Recognition already started");
    }
});

// ----------- COMMANDS -----------
function takeCommand(message) {
    if (message.includes('hey') || message.includes('hello')) {
        speak("Hello Sir, How May I Help You?");
    } else if (message.includes("open google")) {
        window.open("https://google.com", "_blank");
        speak("Opening Google...");
    } else if (message.includes("open youtube")) {
        window.open("https://youtube.com", "_blank");
        speak("Opening Youtube...");
    } else if (message.includes("open facebook")) {
        window.open("https://facebook.com", "_blank");
        speak("Opening Facebook...");
    } else if (message.includes('what is') || message.includes('who is') || message.includes('what are')) {
        window.open(`https://www.google.com/search?q=${message.replace(/ /g, "+")}`, "_blank");
        speak("This is what I found on the internet regarding " + message);
    } else if (message.includes('wikipedia')) {
        window.open(`https://en.wikipedia.org/wiki/${message.replace("wikipedia", "").trim()}`, "_blank");
        speak("This is what I found on Wikipedia regarding " + message);
    } else if (message.includes('time')) {
        const time = new Date().toLocaleString(undefined, { hour: "numeric", minute: "numeric" });
        speak("The current time is " + time);
    } else if (message.includes('date')) {
        const date = new Date().toLocaleString(undefined, { month: "short", day: "numeric" });
        speak("Today's date is " + date);
    } else if (message.includes('calculator')) {
        speak("Opening Calculator");
        window.open("https://www.google.com/search?q=calculator", "_blank");
    } else {
        window.open(`https://www.google.com/search?q=${message.replace(/ /g, "+")}`, "_blank");
        speak("I found some information for " + message + " on Google");
    }
}
