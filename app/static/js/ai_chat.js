// Markdown Configuration
marked.setOptions({
    breaks: true,
    gfm: true
});

// State Variables
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let userUsedVoice = false;
let isRecording = false;
let isVoiceEnabled = localStorage.getItem('aiVoiceEnabled') !== 'false';
let isSending = false;
let isHistoryLoading = false;


// DOM Elements
const chatModal = document.getElementById('aiChatModal');
const chatBody = document.getElementById('aiChatBody');
const chatMessagesContainer = document.getElementById('chatMessagesContainer');
const inputField = document.getElementById('aiChatInput');
const sendBtn = document.getElementById('sendAiMessage');
const voiceBtn = document.getElementById('startVoiceBtn');
const micIcon = document.getElementById('micIcon');
const speakBtn = document.getElementById('volume-toggle-btn');
const volumeIcon = document.getElementById('volume-icon');
const clearBtn = document.getElementById('clearChatBtn');
const typingIndicator = document.getElementById('aiTypingIndicator');

// --- 1. Speech Recognition Logic ---
if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        isRecording = true;
        voiceBtn.classList.replace('text-secondary', 'text-danger');
        micIcon.classList.add('animate__animated', 'animate__pulse', 'animate__infinite');
        inputField.placeholder = "Listening...";
    };

    recognition.onend = () => {
        isRecording = false;
        voiceBtn.classList.replace('text-danger', 'text-secondary');
        micIcon.classList.remove('animate__animated', 'animate__pulse', 'animate__infinite');
        inputField.placeholder = "Ask me anything...";
        
        if (inputField.value.trim().length > 2) {
            handleSendMessage();
        }
    };

    recognition.onresult = (event) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        inputField.value = transcript;
        // Trigger the input event manually to swap Mic to Send button
        inputField.dispatchEvent(new Event('input'));
    };

    recognition.onerror = (event) => {
        isRecording = false;
        recognition.stop();
        console.error("Speech Error:", event.error);
    };

    voiceBtn.addEventListener('click', () => {
        if (isRecording) {
            recognition.stop();
        } else {
            userUsedVoice = true;
            recognition.start();
        }
    });
} else {
    voiceBtn.style.display = 'none';
}

// --- 2. Voice Output (TTS) ---
function speak(text) {
    if (!isVoiceEnabled) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.lang = 'en-US';
    
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Female'));
    if (preferredVoice) utterance.voice = preferredVoice;

    window.speechSynthesis.speak(utterance);
}

// --- 3. UI Helpers ---
function scrollToBottom(instant=false) {
    if (!chatBody) return;

    setTimeout(() => {
        chatBody.scrollTo({
            top: chatBody.scrollHeight,
            behavior: instant ? 'auto' : 'smooth'
        });
    }, 150); 
}

function appendMessage(role, text, time) {
    if (!chatMessagesContainer || !text) return;

    const isUser = role === 'user';
    const bubbleClass = isUser ? 'chat-bubble-user' : 'chat-bubble-ai';
    const label = isUser ? 'You' : 'Learnova AI';
    
    const formattedText = isUser 
        ? text.replace(/</g, "&lt;").replace(/>/g, "&gt;") 
        : marked.parse(text);

    const messageHtml = `
        <div class="message-wrapper ${bubbleClass} animate__animated animate__fadeIn mb-3">
            <small class="d-block opacity-75 mb-1" style="font-size: 0.7rem;">${label}</small>
            <div class="message-content">${formattedText}</div>
            <small class="text-end d-block opacity-75 mt-1" style="font-size: 0.6rem;">${time}</small>
        </div>
    `;

    chatMessagesContainer.insertAdjacentHTML('beforeend', messageHtml);
    setTimeout(scrollToBottom, 10);
}

// --- 4. Core Logic (History, Send, Clear) ---
async function loadChatHistory() {
    if (isHistoryLoading || chatMessagesContainer.children.length > 0) return;
    
    isHistoryLoading = true;
    const context = chatModal.getAttribute('data-bs-context');
    const chapterId = chatModal.getAttribute('data-bs-chapter-id');
    
    chatMessagesContainer.innerHTML = '';
    typingIndicator.classList.remove('d-none');

    try {
        const response = await fetch(`/api/chat?context=${context}&chapter_id=${chapterId}`);
        const data = await response.json();

        if (data.messages && data.messages.length > 0) {
            // Use a fragment or hidden batching to improve performance
            data.messages.forEach(msg => {
                const time = new Date(msg.time).toLocaleString([], {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                });
                appendMessage(msg.sender, msg.content, time);
            });
            
            // For history, we want to snap to the bottom immediately
            scrollToBottom(true); 
        } else {
            let welcomeNote = context === 'chapter' 
                ? "I'm your Chapter Tutor. Confused about any concept in this chapter? Ask away!"
                : "Hi! I'm your Learnova Mentor. How's your learning journey going today?";
            
            appendMessage('ai', welcomeNote, new Date().toLocaleString([], {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            }));
        }
    } catch (error) {
        appendMessage('ai', "Ready to start our conversation!", "Just now");
    } finally {
        typingIndicator.classList.add('d-none');
        isHistoryLoading = false;
        
        // Final safety scroll (smooth)
        scrollToBottom(false);
    }
}

async function handleSendMessage() {
    if (isSending) return;
    const query = inputField.value.trim();
    if (!query) return;

    isSending = true;
    sendBtn.disabled = true;
    
    const context = chatModal.getAttribute('data-bs-context');
    const chapterId = chatModal.getAttribute('data-bs-chapter-id');
    const query_time = new Date().toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'});

    appendMessage('user', query, query_time);
    inputField.value = '';
    // Reset UI swap
    sendBtn.classList.add('d-none');
    voiceBtn.classList.remove('d-none');
    
    typingIndicator.classList.remove('d-none');
    scrollToBottom();

    try {
        const apiUrl = chatModal.getAttribute('data-url');
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: query, context: context, chapter_id: chapterId })
        });
        
        const data = await response.json();
        typingIndicator.classList.add('d-none');
        
        const ai_time = new Date().toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'});
        appendMessage('ai', data.reply, ai_time);
        speak(data.reply);

    } catch (error) {
        typingIndicator.classList.add('d-none');
        appendMessage('ai', "I'm having a bit of trouble connecting. Try again?", "System");
    } finally {
        isSending = false;
        sendBtn.disabled = false;
        inputField.focus();
    }
}

// --- 5. Event Listeners ---
chatModal.addEventListener('show.bs.modal', loadChatHistory);
chatModal.addEventListener('shown.bs.modal', () => inputField.focus());

sendBtn.addEventListener('click', handleSendMessage);

inputField.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSendMessage();
});

// UI Swap Logic: Mic vs Send
inputField.addEventListener('input', () => {
    const hasInput = inputField.value.trim().length > 0;
    if (hasInput) {
        sendBtn.classList.remove('d-none');
        voiceBtn.classList.add('d-none');
    } else {
        sendBtn.classList.add('d-none');
        voiceBtn.classList.remove('d-none');
    }
});

// Function to sync UI with the current state
function syncVoiceUI() {
    if (isVoiceEnabled) {
        speakBtn.classList.replace('btn-light', 'btn-primary');
        volumeIcon.classList.replace('bi-volume-up', 'bi-volume-up-fill');
    } else {
        speakBtn.classList.replace('btn-primary', 'btn-light');
        volumeIcon.classList.replace('bi-volume-up-fill', 'bi-volume-up');
        window.speechSynthesis.cancel();
    }
}

syncVoiceUI();

// Updated Volume Toggle Listener
speakBtn.addEventListener('click', () => {
    isVoiceEnabled = !isVoiceEnabled;
    
    // Save to localStorage (stores as a string "true" or "false")
    localStorage.setItem('aiVoiceEnabled', isVoiceEnabled);
    
    syncVoiceUI();
});

clearBtn.addEventListener('click', async () => {
    if (!confirm("Clear this chat history?")) return;
    const context = chatModal.getAttribute('data-bs-context');
    const chapterId = chatModal.getAttribute('data-bs-chapter-id');

    try {
        const response = await fetch('/api/clear-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ context: context, chapter_id: chapterId })
        });
        if (response.ok) {
            chatMessagesContainer.innerHTML = '';
            appendMessage('ai', "History cleared. How can I help?", "System");
        }
    } catch (e) { console.error(e); }
});