const initializeUserPreferences = () => {
    const savedTheme = localStorage.getItem('chatbot-theme');
    const html = document.documentElement;
    
    if (savedTheme === 'dark') {
        html.classList.add('dark');
    } else if (savedTheme === 'light') {
        html.classList.remove('dark');
    } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
            html.classList.add('dark');
        }
    }
    
    const savedSidebarState = localStorage.getItem('chatbot-sidebar-collapsed');
    if (savedSidebarState === 'true' && window.innerWidth > 768) {
        isSidebarCollapsed = true;
        applySidebarState();
    }
};

const toggleTheme = () => {
    const html = document.documentElement;
    
    html.classList.toggle('dark');
    
    const isDark = html.classList.contains('dark');
    localStorage.setItem('chatbot-theme', isDark ? 'dark' : 'light');
    
    void html.offsetHeight;
};

const sidebar = document.getElementById('sidebar');
const menuBtn = document.getElementById('menu-btn');
const collapseBtn = document.getElementById('collapse-btn');
const sidebarTitle = document.getElementById('sidebar-title');
const searchContainer = document.getElementById('search-container');
const sidebarNav = document.getElementById('sidebar-nav');
const mainContent = document.querySelector('main');
let isSidebarCollapsed = false;

const applySidebarState = () => {
    if (isSidebarCollapsed) {
        sidebar.classList.add('collapsed');
        sidebarTitle.style.opacity = '0';
        searchContainer.style.opacity = '0';
        sidebarNav.style.opacity = '0';
        
        setTimeout(() => {
            if (isSidebarCollapsed) {
                sidebarTitle.style.display = 'none';
                searchContainer.style.display = 'none';
                sidebarNav.style.display = 'none';
            }
        }, 300);
        
        const collapseIcon = collapseBtn.querySelector('span');
        if (collapseIcon) {
            collapseIcon.textContent = 'chevron_right';
        }
    } else {
        sidebar.classList.remove('collapsed');
        sidebarTitle.style.display = 'block';
        searchContainer.style.display = 'block';
        sidebarNav.style.display = 'block';
        
        setTimeout(() => {
            sidebarTitle.style.opacity = '1';
            searchContainer.style.opacity = '1';
            sidebarNav.style.opacity = '1';
        }, 50);
        
        const collapseIcon = collapseBtn.querySelector('span');
        if (collapseIcon) {
            collapseIcon.textContent = 'chevron_left';
        }
    }
};

const toggleSidebar = () => {
    isSidebarCollapsed = !isSidebarCollapsed;
    
    if (window.innerWidth > 768) {
        localStorage.setItem('chatbot-sidebar-collapsed', isSidebarCollapsed.toString());
    }
    
    applySidebarState();
};

const toggleMobileSidebar = () => {
    if (window.innerWidth <= 768) {
        const overlay = document.getElementById('mobile-overlay');
        const isOpen = sidebar.classList.contains('mobile-open');
        
        if (isOpen) {
            closeMobileSidebar();
        } else {
            openMobileSidebar();
        }
    }
};

const openMobileSidebar = () => {
    const overlay = document.getElementById('mobile-overlay');
    sidebar.classList.add('mobile-open');
    sidebar.classList.remove('collapsed');
    
    const sidebarTitle = document.getElementById('sidebar-title');
    const searchContainer = document.getElementById('search-container');
    const sidebarNav = document.getElementById('sidebar-nav');
    
    if (sidebarTitle) {
        sidebarTitle.style.display = 'block';
        sidebarTitle.style.opacity = '1';
    }
    if (searchContainer) {
        searchContainer.style.display = 'block';
        searchContainer.style.opacity = '1';
    }
    if (sidebarNav) {
        sidebarNav.style.display = 'block';
        sidebarNav.style.opacity = '1';
    }
    
    if (overlay) {
        overlay.classList.add('active');
    }
    document.body.style.overflow = 'hidden';
};

const closeMobileSidebar = () => {
    const overlay = document.getElementById('mobile-overlay');
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
};

if (menuBtn) {
    menuBtn.addEventListener('click', toggleMobileSidebar);
}

if (collapseBtn) {
    collapseBtn.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            closeMobileSidebar();
        } else {
            toggleSidebar();
        }
    });
}

const handleResize = () => {
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('mobile-open', 'collapsed');
        const overlay = document.getElementById('mobile-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
        document.body.style.overflow = '';
    } else {
        sidebar.classList.remove('mobile-open');
        const overlay = document.getElementById('mobile-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
        document.body.style.overflow = '';
        
        const savedSidebarState = localStorage.getItem('chatbot-sidebar-collapsed');
        if (savedSidebarState === 'true') {
            isSidebarCollapsed = true;
        } else {
            isSidebarCollapsed = false;
        }
        
        applySidebarState();
    }
};

const initializeHistoryAccordion = () => {
    const historyButtons = document.querySelectorAll('aside nav button');
    historyButtons.forEach(button => {
        button.addEventListener('click', () => {
            const content = button.nextElementSibling;
            const icon = button.querySelector('.material-icons:last-child');
            
            historyButtons.forEach(otherButton => {
                if (otherButton !== button) {
                    const otherContent = otherButton.nextElementSibling;
                    const otherIcon = otherButton.querySelector('.material-icons:last-child');
                    if (otherContent && !otherContent.classList.contains('hidden')) {
                        otherContent.classList.add('hidden');
                        if (otherIcon) {
                            otherIcon.textContent = 'keyboard_arrow_down';
                            otherIcon.classList.remove('rotate-180');
                        }
                    }
                }
            });
            
            if (content && content.tagName === 'DIV') {
                const isHidden = content.classList.contains('hidden');
                content.classList.toggle('hidden');
                
                if (icon) {
                    if (isHidden) {
                        icon.textContent = 'keyboard_arrow_up';
                        icon.classList.add('rotate-180');
                    } else {
                        icon.textContent = 'keyboard_arrow_down';
                        icon.classList.remove('rotate-180');
                    }
                }
            }
        });
    });
};

const autoResizeTextarea = () => {
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const charCounter = document.getElementById('char-counter');
    
    if (!messageInput || !sendBtn || !charCounter) return;
    
    const adjustHeight = () => {
        messageInput.style.height = 'auto';
        const newHeight = Math.min(Math.max(messageInput.scrollHeight, 40), 128);
        messageInput.style.height = newHeight + 'px';
    };
    
    const updateCharCounter = () => {
        const currentLength = messageInput.value.length;
        const maxLength = messageInput.getAttribute('maxlength') || 2000;
        charCounter.textContent = `${currentLength}/${maxLength}`;
        
        if (currentLength > maxLength * 0.9) {
            charCounter.classList.add('text-red-500');
            charCounter.classList.remove('text-gray-400', 'dark:text-gray-500');
        } else if (currentLength > maxLength * 0.75) {
            charCounter.classList.add('text-yellow-500');
            charCounter.classList.remove('text-gray-400', 'dark:text-gray-500', 'text-red-500');
        } else {
            charCounter.classList.add('text-gray-400', 'dark:text-gray-500');
            charCounter.classList.remove('text-red-500', 'text-yellow-500');
        }
    };
    
    const updateSendButton = () => {
        const hasText = messageInput.value.trim().length > 0;
        sendBtn.disabled = !hasText;
        
        if (hasText) {
            sendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            sendBtn.classList.add('hover:bg-violet-700');
        } else {
            sendBtn.classList.add('opacity-50', 'cursor-not-allowed');
            sendBtn.classList.remove('hover:bg-violet-700');
        }
    };
    
    const handleInput = () => {
        adjustHeight();
        updateCharCounter();
        updateSendButton();
    };
    
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (messageInput.value.trim() && !sendBtn.disabled) {
                sendMessage();
            }
        }
    };
    
    const sendMessage = () => {
        const message = messageInput.value.trim();
        if (message) {
            addUserMessage(message);
            messageInput.value = '';
            handleInput();
            showTypingIndicator();
            setTimeout(() => {
                hideTypingIndicator();
                addAIResponse(message);
            }, 2000);
        }
    };
    
    messageInput.addEventListener('input', handleInput);
    messageInput.addEventListener('paste', () => setTimeout(handleInput, 0));
    messageInput.addEventListener('keydown', handleKeyDown);
    sendBtn.addEventListener('click', sendMessage);
    
    updateCharCounter();
    updateSendButton();
    adjustHeight();
};

const initializeNewChat = () => {
    const newChatBtn = document.getElementById('new-chat-btn');
    if (!newChatBtn) return;
    
    newChatBtn.addEventListener('click', () => {
        console.log('Starting new chat...');
        
        clearChatAndShowWelcome();
        
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            messageInput.value = '';
            messageInput.focus();
        }
        
        newChatBtn.classList.add('animate-pulse');
        setTimeout(() => {
            newChatBtn.classList.remove('animate-pulse');
        }, 1000);
    });
};

const clearChatAndShowWelcome = () => {
    const chatContainer = document.querySelector('.flex-1.overflow-y-auto.p-6.space-y-4.chat-container') || 
                         document.querySelector('.flex-1.overflow-y-auto.p-6.space-y-6') ||
                         document.querySelector('.flex-1.overflow-y-auto');
    if (!chatContainer) return;
    
    chatContainer.innerHTML = '';
    
    const welcomeMessage = document.createElement('div');
    welcomeMessage.className = 'flex items-start gap-4 animate-fade-in message-container';
    
    const now = new Date();
    const timestamp = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    });
    
    const welcomeMessages = [
        "Hello there! 🌟<br><br>I'm here to support you through your academic journey. Whether you're feeling stressed, anxious, or just need someone to talk to, I'm here to listen and help. How are you feeling today?",
        "Hi! Welcome to your safe space. 💙<br><br>I'm your mental health support companion, designed specifically for students like you. Feel free to share what's on your mind - whether it's about studies, relationships, or just life in general. How can I support you today?",
        "Hey there! Good to see you. ✨<br><br>Taking the step to reach out shows real strength. I'm here to provide a judgment-free space where you can explore your thoughts and feelings. What would you like to talk about today?",
        "Hello! I'm glad you're here. 🤗<br><br>As your digital mental health companion, I'm here to offer support, resources, and a listening ear whenever you need it. Whether you're dealing with academic pressure, social anxiety, or just need to vent - I'm here for you. What's going on?"
    ];
    
    const randomMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
    
    welcomeMessage.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white font-bold shrink-0 shadow-lg">
            <span class="material-icons text-2xl">psychology</span>
        </div>
        <div class="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-[var(--bg-secondary)] dark:to-[var(--bg-tertiary)] border border-violet-100 dark:border-[var(--border-color)] rounded-2xl p-3 max-w-md shadow-sm message-bubble">
            <p class="text-gray-800 dark:text-[var(--text-primary)] leading-relaxed">${randomMessage}</p>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-2 text-right">${timestamp}</div>
        </div>
    `;
    
    chatContainer.appendChild(welcomeMessage);
    chatContainer.scrollTop = chatContainer.scrollHeight;
};

const addUserMessage = (message) => {
    const chatContainer = document.querySelector('.flex-1.overflow-y-auto.p-6.space-y-4.chat-container') || 
                         document.querySelector('.flex-1.overflow-y-auto.p-6.space-y-6') ||
                         document.querySelector('.flex-1.overflow-y-auto');
    if (!chatContainer) return;
    
    const timestamp = new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    });
    
    const userMessage = document.createElement('div');
    userMessage.className = 'flex items-start justify-end gap-4 message-slide-in';
    
    userMessage.innerHTML = `
        <div class="bg-[var(--accent-color)] text-white rounded-2xl p-3 max-w-md order-1">
            <p>${message}</p>
            <div class="text-xs text-white/70 mt-2 text-right">${timestamp}</div>
        </div>
        <div class="w-10 h-10 rounded-full bg-[var(--accent-color)] flex items-center justify-center text-white font-bold shrink-0">
            <span class="material-icons text-2xl">person</span>
        </div>
    `;
    
    chatContainer.appendChild(userMessage);
    chatContainer.scrollTop = chatContainer.scrollHeight;
};

const showTypingIndicator = () => {
    const chatContainer = document.querySelector('.flex-1.overflow-y-auto.p-6.space-y-4.chat-container') || 
                         document.querySelector('.flex-1.overflow-y-auto.p-6.space-y-6') ||
                         document.querySelector('.flex-1.overflow-y-auto');
    if (!chatContainer) return;
    
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'flex items-start gap-4 message-slide-in';
    typingIndicator.id = 'typing-indicator';
    
    typingIndicator.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white font-bold shrink-0 shadow-lg">
            <span class="material-icons text-2xl">psychology</span>
        </div>
        <div class="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-[var(--bg-secondary)] dark:to-[var(--bg-tertiary)] border border-violet-100 dark:border-[var(--border-color)] rounded-2xl shadow-sm">
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        </div>
    `;
    
    chatContainer.appendChild(typingIndicator);
    chatContainer.scrollTop = chatContainer.scrollHeight;
};

const hideTypingIndicator = () => {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
};

const addAIResponse = (userMessage) => {
    const chatContainer = document.querySelector('.flex-1.overflow-y-auto.p-6.space-y-4.chat-container') || 
                         document.querySelector('.flex-1.overflow-y-auto.p-6.space-y-6') ||
                         document.querySelector('.flex-1.overflow-y-auto');
    if (!chatContainer) return;
    
    const timestamp = new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    });
    
    const aiResponse = generateAIResponse(userMessage);
    const quickReplies = generateQuickReplies(userMessage);
    
    const aiMessage = document.createElement('div');
    aiMessage.className = 'flex items-start gap-4 message-slide-in';
    
    aiMessage.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white font-bold shrink-0 shadow-lg">
            <span class="material-icons text-2xl">psychology</span>
        </div>
        <div class="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-[var(--bg-secondary)] dark:to-[var(--bg-tertiary)] border border-violet-100 dark:border-[var(--border-color)] rounded-2xl p-3 max-w-md shadow-sm message-bubble">
            <p class="text-gray-800 dark:text-[var(--text-primary)] leading-relaxed">${aiResponse}</p>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-2 text-right">${timestamp}</div>
            <div class="message-reactions">
                <button class="reaction-btn" onclick="handleReaction(this, 'thumbs_up')">
                    <span class="material-icons" style="font-size: 14px;">thumb_up</span>
                </button>
                <button class="reaction-btn" onclick="handleReaction(this, 'thumbs_down')">
                    <span class="material-icons" style="font-size: 14px;">thumb_down</span>
                </button>
            </div>
        </div>
    `;
    
    chatContainer.appendChild(aiMessage);
    
    if (quickReplies.length > 0) {
        const quickReplyContainer = document.createElement('div');
        quickReplyContainer.className = 'quick-replies px-14';
        
        quickReplies.forEach(reply => {
            const button = document.createElement('button');
            button.className = 'quick-reply-btn';
            button.textContent = reply;
            button.onclick = () => handleQuickReply(reply);
            quickReplyContainer.appendChild(button);
        });
        
        chatContainer.appendChild(quickReplyContainer);
    }
    
    chatContainer.scrollTop = chatContainer.scrollHeight;
};

const generateAIResponse = (userMessage) => {
    const message = userMessage.toLowerCase();
    
    if (message.includes('stress') || message.includes('stressed')) {
        return "I understand you're feeling stressed. That's completely normal, especially as a student. Stress can feel overwhelming, but there are ways to manage it. Would you like to talk about what's causing your stress, or would you prefer some immediate coping strategies?";
    } else if (message.includes('anxious') || message.includes('anxiety')) {
        return "Anxiety can be really challenging to deal with. Thank you for sharing that with me. Remember that anxiety is treatable and you're not alone in this. Would you like to explore some grounding techniques, or would you prefer to talk about what's triggering your anxiety?";
    } else if (message.includes('sad') || message.includes('depressed') || message.includes('down')) {
        return "I'm sorry you're feeling this way. Your feelings are valid, and it takes courage to reach out. Depression affects many students, and there's help available. Would you like to talk about what's been going on, or would you prefer some resources for support?";
    } else if (message.includes('exam') || message.includes('test') || message.includes('study')) {
        return "Academic pressure can be intense, and it's understandable that exams and studying can feel overwhelming. Many students experience this stress. Let's work together to find some strategies that can help you manage both your studies and your wellbeing.";
    } else if (message.includes('sleep') || message.includes('tired')) {
        return "Sleep issues are very common among students and can significantly impact your mental health and academic performance. Good sleep hygiene is crucial for wellbeing. Would you like some tips for better sleep, or would you like to discuss what might be affecting your sleep?";
    } else if (message.includes('lonely') || message.includes('alone')) {
        return "Feeling lonely, especially in a university environment, is more common than you might think. Many students struggle with loneliness. You've taken a positive step by reaching out. Would you like to talk about what's making you feel this way, or explore some ways to connect with others?";
    } else {
        return "Thank you for sharing that with me. I'm here to support you through whatever you're experiencing. Your mental health and wellbeing are important. How are you feeling right now, and what would be most helpful for you today?";
    }
};

const generateQuickReplies = (userMessage) => {
    const message = userMessage.toLowerCase();
    
    if (message.includes('stress') || message.includes('anxious')) {
        return ["Tell me more", "I need coping strategies", "Scale 1-10: 7", "Yes, that helps", "Not really"];
    } else if (message.includes('sad') || message.includes('depressed')) {
        return ["I want to talk more", "Show me resources", "Yes", "No", "Maybe later"];
    } else if (message.includes('exam') || message.includes('study')) {
        return ["Study tips please", "Time management help", "Yes, very stressed", "Somewhat manageable", "Need break strategies"];
    } else {
        return ["Yes", "No", "Tell me more", "That's helpful", "I'm not sure"];
    }
};

const handleReaction = (button, reaction) => {
    const messageReactions = button.parentElement;
    messageReactions.querySelectorAll('.reaction-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    button.classList.add('active');
    
    trackProgress('reaction', { reaction: reaction });
    
    showReactionFeedback(reaction);
};

const handleQuickReply = (reply) => {
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const charCounter = document.getElementById('char-counter');
    
    if (messageInput && sendBtn && charCounter) {
        messageInput.value = reply;
        
        const hasText = messageInput.value.trim().length > 0;
        sendBtn.disabled = !hasText;
        
        if (hasText) {
            sendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            sendBtn.classList.add('hover:bg-violet-700');
        } else {
            sendBtn.classList.add('opacity-50', 'cursor-not-allowed');
            sendBtn.classList.remove('hover:bg-violet-700');
        }
        
        const textLength = messageInput.value.length;
        charCounter.textContent = `${textLength}/2000`;
        
        messageInput.style.height = 'auto';
        const newHeight = Math.min(Math.max(messageInput.scrollHeight, 40), 128);
        messageInput.style.height = newHeight + 'px';
        
        messageInput.focus();
    }
};

const showReactionFeedback = (reaction) => {
    const feedback = reaction === 'thumbs_up' ? 
        "Thank you for the positive feedback! 😊" : 
        "Thank you for the feedback. I'll try to be more helpful.";
    
    console.log(feedback);
};

let currentTheme = 'general';

const toggleThemeSelector = () => {
    const themeSelector = document.getElementById('theme-selector');
    const toggleText = document.getElementById('theme-toggle-text');
    
    if (themeSelector.classList.contains('hidden')) {
        themeSelector.classList.remove('hidden');
        toggleText.textContent = 'Hide themes';
    } else {
        themeSelector.classList.add('hidden');
        toggleText.textContent = 'Show themes';
    }
};

const selectTheme = (theme) => {
    currentTheme = theme;
    
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-theme="${theme}"]`).classList.add('active');
    
    document.getElementById('theme-selector').classList.add('hidden');
    document.getElementById('theme-toggle-text').textContent = 'Show themes';
    
    showThemeWelcomeMessage(theme);
    
    trackProgress('theme_selected', { theme: theme });
};

const showThemeWelcomeMessage = (theme) => {
    const messages = {
        general: "I'm here to chat about anything that's on your mind. How can I support you today?",
        stress: "Let's talk about managing study stress together. Remember, it's normal to feel overwhelmed sometimes. What's been causing you the most stress lately?",
        anxiety: "You're in a safe space here. Anxiety can feel overwhelming, but you're not alone. Would you like to talk about what's been making you feel anxious, or would you prefer some calming techniques?",
        relationships: "Relationships can be complex, especially during university years. Whether it's friendships, family, or romantic relationships, I'm here to listen and help you work through any challenges.",
        depression: "Thank you for being here. It takes strength to reach out when you're struggling with your mood. I'm here to support you through this. How have you been feeling lately?"
    };
    
    const chatContainer = document.querySelector('.flex-1.overflow-y-auto.p-6.space-y-4.chat-container') || 
                         document.querySelector('.flex-1.overflow-y-auto.p-6.space-y-6') ||
                         document.querySelector('.flex-1.overflow-y-auto');
    if (!chatContainer) return;
    
    chatContainer.innerHTML = '';
    
    const timestamp = new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    });
    
    const themeMessage = document.createElement('div');
    themeMessage.className = 'flex items-start gap-4 message-slide-in';
    
    themeMessage.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white font-bold shrink-0 shadow-lg">
            <span class="material-icons text-2xl">psychology</span>
        </div>
        <div class="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-[var(--bg-secondary)] dark:to-[var(--bg-tertiary)] border border-violet-100 dark:border-[var(--border-color)] rounded-2xl p-3 max-w-md shadow-sm message-bubble">
            <p class="text-gray-800 dark:text-[var(--text-primary)] leading-relaxed">${messages[theme]}</p>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-2 text-right">${timestamp}</div>
        </div>
    `;
    
    chatContainer.appendChild(themeMessage);
    
    const quickReplies = getThemeQuickReplies(theme);
    if (quickReplies.length > 0) {
        const quickReplyContainer = document.createElement('div');
        quickReplyContainer.className = 'quick-replies px-14';
        
        quickReplies.forEach(reply => {
            const button = document.createElement('button');
            button.className = 'quick-reply-btn';
            button.textContent = reply;
            button.onclick = () => handleQuickReply(reply);
            quickReplyContainer.appendChild(button);
        });
        
        chatContainer.appendChild(quickReplyContainer);
    }
    
    chatContainer.scrollTop = chatContainer.scrollHeight;
};

const getThemeQuickReplies = (theme) => {
    const replies = {
        general: ["How are you?", "Tell me more", "I'm feeling good", "I'm struggling", "What can you help with?"],
        stress: ["Very stressed", "Somewhat stressed", "Exam anxiety", "Time management", "Need study break"],
        anxiety: ["Social anxiety", "Performance anxiety", "General worry", "Panic attacks", "Breathing exercises"],
        relationships: ["Friend troubles", "Family issues", "Dating concerns", "Loneliness", "Social skills"],
        depression: ["Feeling down", "No motivation", "Sleep issues", "Hopelessness", "Need support"]
    };
    
    return replies[theme] || [];
};

const progressData = {
    conversations: 0,
    themes: {},
    reactions: { positive: 0, negative: 0 },
    lastActive: null
};

const trackProgress = (action, data = {}) => {
    const today = new Date().toDateString();
    
    switch (action) {
        case 'conversation_started':
            progressData.conversations++;
            progressData.lastActive = today;
            break;
        case 'theme_selected':
            if (!progressData.themes[data.theme]) {
                progressData.themes[data.theme] = 0;
            }
            progressData.themes[data.theme]++;
            break;
        case 'reaction':
            if (data.reaction === 'thumbs_up') {
                progressData.reactions.positive++;
            } else {
                progressData.reactions.negative++;
            }
            break;
    }
    
    localStorage.setItem('mentalHealthProgress', JSON.stringify(progressData));
    console.log('Progress tracked:', action, data);
};

const loadProgress = () => {
    const saved = localStorage.getItem('mentalHealthProgress');
    if (saved) {
        Object.assign(progressData, JSON.parse(saved));
    }
};

const exportConversation = () => {
    const chatContainer = document.querySelector('.flex-1.overflow-y-auto.p-6.space-y-4.chat-container') || 
                         document.querySelector('.flex-1.overflow-y-auto.p-6.space-y-6') ||
                         document.querySelector('.flex-1.overflow-y-auto');
    if (!chatContainer) return;
    
    const messages = [];
    const messageElements = chatContainer.querySelectorAll('.message-slide-in, .animate-fade-in');
    
    messageElements.forEach(element => {
        const text = element.querySelector('p');
        const timestamp = element.querySelector('.text-xs');
        const isUser = element.querySelector('.bg-\\[var\\(--accent-color\\)\\]');
        
        if (text && timestamp) {
            messages.push({
                sender: isUser ? 'You' : 'AI Assistant',
                message: text.textContent,
                time: timestamp.textContent
            });
        }
    });
    
    let exportText = "Mental Health Conversation Export\\n";
    exportText += `Exported on: ${new Date().toLocaleString()}\\n`;
    exportText += `Theme: ${currentTheme}\\n\\n`;
    
    messages.forEach(msg => {
        exportText += `[${msg.time}] ${msg.sender}: ${msg.message}\\n\\n`;
    });
    
    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mental-health-conversation-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('Conversation exported');
};

document.addEventListener('DOMContentLoaded', () => {
    handleResize();
    initializeHistoryAccordion();
    autoResizeTextarea();
    initializeNewChat();
    loadProgress();
    
    trackProgress('conversation_started');
    
    const overlay = document.getElementById('mobile-overlay');
    if (overlay) {
        overlay.addEventListener('click', closeMobileSidebar);
    }
    
    window.addEventListener('resize', handleResize);
    
    handleResize();
    
    let startX = 0;
    let startY = 0;
    
    document.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    });
    
    document.addEventListener('touchmove', (e) => {
        if (!startX || !startY) return;
        
        const diffX = e.touches[0].clientX - startX;
        const diffY = e.touches[0].clientY - startY;
        
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
            if (window.innerWidth <= 768) {
                if (diffX > 0 && startX < 20) {
                    openMobileSidebar();
                } else if (diffX < 0 && sidebar.classList.contains('mobile-open')) {
                    closeMobileSidebar();
                }
            }
        }
        
        startX = 0;
        startY = 0;
    });
    
    document.addEventListener('DOMContentLoaded', () => {
        initializeUserPreferences();
    });
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeUserPreferences);
    } else {
        initializeUserPreferences();
    }
});