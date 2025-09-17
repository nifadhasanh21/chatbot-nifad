// script.js - concise-response version
const btn = document.querySelector('.talk');
const content = document.querySelector('.content');

let lastSpokenText = ""; // used to ignore assistant's own voice

// -------- SPEAK (short & single) --------
function speak(text) {
    // cancel any previous speech, remember what we say
    window.speechSynthesis.cancel();
    lastSpokenText = text.toLowerCase();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 1;
    utt.pitch = 1;
    utt.volume = 1;
    window.speechSynthesis.speak(utt);
}

// -------- Setup greeting (optional) --------
function wishMe() {
    const hour = new Date().getHours();
    if (hour < 12) speak("Good morning, sir.");
    else if (hour < 17) speak("Good afternoon, sir.");
    else speak("Good evening, sir.");
}

window.addEventListener('load', () => {
    // small greeting (remove if you don't want auto-speech on load)
    // speak("Initializing JARVIS.");
    // wishMe();
});

// -------- Speech Recognition --------
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
    content.textContent = "Speech Recognition not supported in this browser!";
    speak("Sorry, your browser does not support speech recognition.");
}

const recognition = new SpeechRecognition();
recognition.continuous = false;      // listen only while user clicks
recognition.interimResults = false;
recognition.lang = "en-US";

recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript.trim().toLowerCase();
    console.log("Heard:", transcript);
    content.textContent = transcript;

    // ignore if it contains what assistant just said
    if (lastSpokenText && transcript.includes(lastSpokenText)) {
        console.log("Ignored assistant's own voice.");
        return;
    }

    // stop recognition immediately to avoid hearing assistant speak
    try { recognition.stop(); } catch (e) { /* ignore */ }

    handleCommand(transcript);
};

recognition.onerror = (event) => {
    console.error("Recognition error:", event.error);
    content.textContent = "Microphone error";
    speak("Microphone error. Please check permissions.");
};

recognition.onend = () => {
    console.log("Recognition ended.");
    // do NOT restart automatically
};

// -------- Button click starts listening --------
btn.addEventListener('click', () => {
    content.textContent = "Listening...";
    try {
        recognition.start();
    } catch (e) {
        console.warn("Recognition start error:", e);
    }
});

// -------- Command handling (very short responses) --------
function handleCommand(message) {
    // exact short replies — change text if you want different wording
    if (message.includes("open google") || message === "google") {
        window.open("https://google.com", "_blank");
        speak("Here is Google, sir.");
        return;
    }

    if (message.includes("open youtube") || message.includes("youtube")) {
        window.open("https://youtube.com", "_blank");
        speak("Here is YouTube, sir.");
        return;
    }

    if (message.includes("open facebook") || message.includes("facebook")) {
        window.open("https://facebook.com", "_blank");
        speak("Here is Facebook, sir.");
        return;
    }

    if (message.startsWith("search for ") || message.startsWith("search ")) {
        const q = message.replace(/^search( for)? /, "").trim();
        if (q) {
            window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, "_blank");
            speak(`Searching for ${q}.`);
        } else {
            speak("What should I search for, sir?");
        }
        return;
    }

    if (message.includes("wikipedia")) {
        const q = message.replace("wikipedia", "").trim();
        const url = q ? `https://en.wikipedia.org/wiki/${encodeURIComponent(q)}` : "https://en.wikipedia.org";
        window.open(url, "_blank");
        speak(q ? `Opening Wikipedia for ${q}.` : "Opening Wikipedia, sir.");
        return;
    }

    if (message.includes("time") || message.includes("what time")) {
        const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        speak(`The time is ${time}.`);
        return;
    }

    if (message.includes("date") || message.includes("what date")) {
        const date = new Date().toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
        speak(`Today is ${date}.`);
        return;
    }

    if (message.includes("calculator")) {
        window.open("https://www.google.com/search?q=calculator", "_blank");
        speak("Opening calculator, sir.");
        return;
    }

    // Minimal fallback: only a short line & open search
    if (message.length > 0) {
        window.open(`https://www.google.com/search?q=${encodeURIComponent(message)}`, "_blank");
        speak(`Here is what I found for ${message}.`);
        return;
    }

    // no input
    speak("I didn't get that, sir.");
}
