const initializeUserPreferences = () => {
    const savedTheme = localStorage.getItem('chatbot-theme');
    const html = document.documentElement;
    const themeIcon = document.getElementById('theme-icon');
    
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
    
    // Set the correct icon based on current theme
    if (themeIcon) {
        const isDark = html.classList.contains('dark');
        themeIcon.textContent = isDark ? 'light_mode' : 'dark_mode';
    }
    
    const savedSidebarState = localStorage.getItem('chatbot-sidebar-collapsed');
    if (savedSidebarState === 'true' && window.innerWidth > 768) {
        isSidebarCollapsed = true;
        applySidebarState();
    }
};

// ===== Chat Sessions State & Helpers =====
let chatSessions = [];
let currentSessionId = null;
let lastDeletedSessionCache = null; // for undo delete
let searchQuery = '';
// When true, after pressing New Chat, selecting a theme should create a NEW session for that theme
let freshModeActive = false;

// Centralized welcome texts per theme
const THEME_WELCOME_TEXT = {
    general: "Hi 👋 I’m here for anything on your mind. How can I support you today?",
    stress: "Take a breath 🌿 We can handle study stress together. What’s stressing you the most right now?",
    anxiety: "You’re safe here 💛 Anxiety can feel heavy. Want grounding tips or to share what’s been making you anxious?",
    relationships: "Relationships can be tricky 🤝 I’m here to listen and help with clear next steps. What’s going on?",
    depression: "Thanks for reaching out 💙 Small steps count. How have you been feeling lately?"
};

const THEME_TITLES = {
    general: 'General Chat',
    stress: 'Study Stress',
    anxiety: 'Anxiety Support',
    relationships: 'Relationships',
    depression: 'Mood Support'
};

const isWelcomeText = (text) => {
    const t = String(text || '');
    return Object.values(THEME_WELCOME_TEXT).includes(t);
};

const getOrCreateThemeSession = (theme) => {
    const t = (theme || 'general').toLowerCase();
    // Find the most recent non-archived session for this theme
    let s = chatSessions.find(x => x.theme === t && !x.archived);
    if (s) return s;
    // Create a new session for this theme with a welcome
    const title = THEME_TITLES[t] || 'New Chat';
    s = createNewSession(title);
    s.theme = t;
    // Ensure we're pointing at the new themed session BEFORE adding welcome
    setCurrentSession(s.id);
    const welcome = THEME_WELCOME_TEXT[t];
    if (welcome) {
        addMessageToCurrentSession('ai', welcome);
    }
    return s;
};

// Force-create a brand-new session for the given theme (used in fresh mode after New Chat)
const createNewThemeSession = (theme) => {
    const t = (theme || 'general').toLowerCase();
    const title = THEME_TITLES[t] || 'New Chat';
    const s = createNewSession(title);
    s.theme = t;
    setCurrentSession(s.id);
    const welcome = THEME_WELCOME_TEXT[t];
    if (welcome) addMessageToCurrentSession('ai', welcome);
    return s;
};

const SESSIONS_KEY = 'chat_sessions_v1';
const CURRENT_SESSION_KEY = 'current_session_id_v1';

const loadSessions = () => {
    try {
        chatSessions = JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]');
        currentSessionId = localStorage.getItem(CURRENT_SESSION_KEY);
    } catch (_) {
        chatSessions = [];
        currentSessionId = null;
    }
};

const saveSessions = () => {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(chatSessions));
    if (currentSessionId) localStorage.setItem(CURRENT_SESSION_KEY, currentSessionId);
};

const createNewSession = (title = 'New Chat') => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const nowIso = new Date().toISOString();
    const session = { id, title, createdAt: nowIso, updatedAt: nowIso, messages: [], pinned: false, archived: false, tags: [] };
    chatSessions.unshift(session);
    currentSessionId = id;
    saveSessions();
    renderChatHistory();
    return session;
};

const getCurrentSession = () => chatSessions.find(s => s.id === currentSessionId) || null;

const setCurrentSession = (id) => {
    if (!id) return;
    currentSessionId = id;
    saveSessions();
    renderChatHistory();
};

const updateSessionTitleIfNeeded = (session, candidateTitle) => {
    if (!session) return;
    if (!session.title || session.title === 'New Chat') {
        const t = (candidateTitle || '').trim().replace(/\s+/g, ' ');
        if (t) {
            session.title = t.slice(0, 40);
            saveSessions();
            renderChatHistory();
        }
    }
};

const addMessageToCurrentSession = (role, content, isoTime) => {
    const session = getCurrentSession();
    if (!session) return;
    const time = isoTime || new Date().toISOString();
    session.messages.push({ role, content, time });
    session.updatedAt = time;
    if (role === 'user') updateSessionTitleIfNeeded(session, content);
    saveSessions();
    renderChatHistory();
};

const deleteSession = (id) => {
    const idx = chatSessions.findIndex(s => s.id === id);
    if (idx === -1) return;
    lastDeletedSessionCache = chatSessions[idx];
    chatSessions.splice(idx, 1);
    if (currentSessionId === id) {
        currentSessionId = chatSessions[0]?.id || null;
    }
    saveSessions();
    renderChatHistory();
    showUndoToast();
};

const renameSession = (id, newTitle) => {
    const s = chatSessions.find(x => x.id === id);
    if (!s) return;
    const t = (newTitle || '').trim();
    if (!t) return;
    s.title = t.slice(0, 60);
    saveSessions();
    renderChatHistory();
};

const pinSession = (id, pinned) => {
    const s = chatSessions.find(x => x.id === id);
    if (!s) return;
    s.pinned = !!pinned;
    saveSessions();
    renderChatHistory();
};

const archiveSession = (id, archived) => {
    const s = chatSessions.find(x => x.id === id);
    if (!s) return;
    s.archived = !!archived;
    // If archiving current session, keep it open but it will appear under Archived
    saveSessions();
    renderChatHistory();
};

const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const renderChatHistory = () => {
    const todayList = document.getElementById('today-list');
    const yesterdayList = document.getElementById('yesterday-list');
    const previousList = document.getElementById('previous-list');
    const previous30List = document.getElementById('previous30-list');
    const olderList = document.getElementById('older-list');
    const pinnedList = document.getElementById('pinned-list');
    const archivedList = document.getElementById('archived-list');
    if (!todayList || !yesterdayList || !previousList) return;

    todayList.innerHTML = '';
    yesterdayList.innerHTML = '';
    previousList.innerHTML = '';
    if (previous30List) previous30List.innerHTML = '';
    if (olderList) olderList.innerHTML = '';
    if (pinnedList) pinnedList.innerHTML = '';
    if (archivedList) archivedList.innerHTML = '';

    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const normalizedQuery = (searchQuery || '').trim().toLowerCase();
    const filtered = chatSessions.filter(session => {
        if (session.archived) return true; // still render under archived
        if (!normalizedQuery) return true;
        const haystack = [session.title, ...(session.tags || [])].join(' ').toLowerCase();
        return haystack.includes(normalizedQuery);
    });

    // Pinned first (in pinned section), then others in date groups
    filtered.forEach(session => {
        const updated = new Date(session.updatedAt || session.createdAt);
        // Search filter: skip non-archived that don't match
        if (!session.archived && normalizedQuery) {
            const hay = [session.title, ...(session.tags || [])].join(' ').toLowerCase();
            if (!hay.includes(normalizedQuery)) return;
        }

        const item = document.createElement('div');
        item.className = 'flex items-center justify-between group';

        const isActive = session.id === currentSessionId;
        const baseClasses = 'block p-3 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-[var(--bg-tertiary)]';
        const textClasses = isActive
            ? 'bg-[var(--bg-tertiary)] dark:bg-[var(--accent-color)]/20 text-gray-900 dark:text-[var(--accent-color)] font-medium border-l-4 border-[var(--accent-color)]'
            : 'text-gray-600 dark:text-[var(--text-secondary)]';

        const titleText = session.title || 'New Chat';
        const openLink = document.createElement('a');
        openLink.href = '#';
        openLink.className = `${baseClasses} ${textClasses} flex-1 truncate`;
        openLink.title = `${titleText}`;
        openLink.textContent = titleText;
        openLink.addEventListener('click', (e) => {
            e.preventDefault();
            openSession(session.id);
        });

        const actions = document.createElement('div');
        actions.className = 'flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2';

        // Inline rename (turns title into input)
        const makeInlineRename = () => {
            const input = document.createElement('input');
            input.type = 'text';
            input.value = session.title || '';
            input.className = `${baseClasses} ${textClasses} flex-1 truncate bg-transparent border border-[var(--border-color)]`;
            input.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter') {
                    renameSession(session.id, input.value);
                } else if (ev.key === 'Escape') {
                    renderChatHistory();
                }
            });
            input.addEventListener('blur', () => renameSession(session.id, input.value));
            item.replaceChild(input, openLink);
            input.focus();
            input.select();
        };

        const pinBtn = document.createElement('button');
        pinBtn.className = 'w-6 h-6 flex items-center justify-center rounded-full text-gray-500 dark:text-[var(--text-secondary)] hover:bg-gray-200 dark:hover:bg-[var(--bg-tertiary)]';
        pinBtn.title = session.pinned ? 'Unpin' : 'Pin';
        pinBtn.innerHTML = `<span class="material-icons" style="font-size:16px;">${session.pinned ? 'push_pin' : 'push_pin'}</span>`;
        pinBtn.style.transform = session.pinned ? 'rotate(45deg)' : '';
        pinBtn.addEventListener('click', (e) => {
            e.stopPropagation(); e.preventDefault();
            pinSession(session.id, !session.pinned);
        });

        const renameBtn = document.createElement('button');
        renameBtn.className = 'w-6 h-6 flex items-center justify-center rounded-full text-gray-500 dark:text-[var(--text-secondary)] hover:bg-gray-200 dark:hover:bg-[var(--bg-tertiary)]';
        renameBtn.title = 'Rename';
        renameBtn.innerHTML = '<span class="material-icons" style="font-size:16px;">edit</span>';
        renameBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            makeInlineRename();
        });

        const archiveBtn = document.createElement('button');
        archiveBtn.className = 'w-6 h-6 flex items-center justify-center rounded-full text-gray-500 dark:text-[var(--text-secondary)] hover:bg-gray-200 dark:hover:bg-[var(--bg-tertiary)]';
        archiveBtn.title = session.archived ? 'Unarchive' : 'Archive';
        archiveBtn.innerHTML = `<span class="material-icons" style="font-size:16px;">inventory_2</span>`;
        archiveBtn.addEventListener('click', (e) => {
            e.stopPropagation(); e.preventDefault();
            archiveSession(session.id, !session.archived);
        });

        const delBtn = document.createElement('button');
        delBtn.className = 'w-6 h-6 flex items-center justify-center rounded-full text-gray-500 dark:text-[var(--text-secondary)] hover:bg-gray-200 dark:hover:bg-[var(--bg-tertiary)]';
        delBtn.title = 'Delete';
        delBtn.innerHTML = '<span class="material-icons" style="font-size:16px;">delete</span>';
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            if (confirm('Delete this chat?')) deleteSession(session.id);
        });

        actions.appendChild(pinBtn);
        actions.appendChild(renameBtn);
        actions.appendChild(archiveBtn);
        actions.appendChild(delBtn);
        item.appendChild(openLink);
        item.appendChild(actions);
        // Always show archived in archivedList if present
        if (session.archived && archivedList) {
            archivedList.appendChild(item);
            return;
        }

        if (session.pinned && pinnedList) {
            pinnedList.appendChild(item);
            return;
        }

        if (sameDay(updated, now)) {
            todayList.appendChild(item);
        } else if (sameDay(updated, yesterday)) {
            yesterdayList.appendChild(item);
        } else if (updated >= sevenDaysAgo) {
            previousList.appendChild(item);
        } else if (updated >= thirtyDaysAgo) {
            if (previous30List) previous30List.appendChild(item);
        } else {
            if (olderList) olderList.appendChild(item);
        }
    });
};

const openSession = (id) => {
    const session = chatSessions.find(s => s.id === id);
    if (!session) return;
    setCurrentSession(id);
    // Render messages from session
    const chatContainer = document.querySelector('.flex-1.overflow-y-auto.p-6.space-y-4.chat-container') || 
                          document.querySelector('.flex-1.overflow-y-auto.p-6.space-y-6') ||
                          document.querySelector('.flex-1.overflow-y-auto');
    if (!chatContainer) return;
    chatContainer.innerHTML = '';
    // Virtualized rendering for long chats
    renderVirtualizedMessages(session.messages);
    chatContainer.scrollTop = chatContainer.scrollHeight;
};

// Simple windowed virtualization: render a moving window of messages based on scroll
let virtualization = { start: 0, end: 0, chunk: 50, buffer: 20 };

// Shared sanitizer for AI markdown-like markers
const sanitizeMd = (s) => {
    if (!s) return '';
    return String(s)
        .replace(/\*\*(.*?)\*\*/g, '$1') // bold
        .replace(/\*(.*?)\*/g, '$1')     // italics
        .replace(/`([^`]+)`/g, '$1')      // inline code
        .replace(/^\s*[-*]\s+/gm, '• ')  // bullets to a simple dot
        ;
};

const renderVirtualizedMessages = (msgs) => {
    const container = document.querySelector('.flex-1.overflow-y-auto.p-6.space-y-4.chat-container') || 
                      document.querySelector('.flex-1.overflow-y-auto.p-6.space-y-6') ||
                      document.querySelector('.flex-1.overflow-y-auto');
    if (!container) return;
    container.innerHTML = '';

    const total = msgs.length;
    if (total <= virtualization.chunk + virtualization.buffer) {
        msgs.forEach(m => m.role === 'user' ? renderUserMessage(m.content, m.time) : renderAIMessage(m.content, m.time));
        return;
    }

    // Initial window: last chunk
    virtualization.end = total;
    virtualization.start = Math.max(0, total - virtualization.chunk);
    paintVirtualWindow(msgs);

    // Attach scroll listener once per open
    container.onscroll = () => {
        const nearTop = container.scrollTop < 100;
        const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        if (nearTop && virtualization.start > 0) {
            const add = virtualization.chunk;
            virtualization.start = Math.max(0, virtualization.start - add);
            paintVirtualWindow(msgs, true); // prepend
        } else if (nearBottom && virtualization.end < total) {
            const add = virtualization.chunk;
            virtualization.end = Math.min(total, virtualization.end + add);
            paintVirtualWindow(msgs, false); // append
        }
    };
};

const paintVirtualWindow = (msgs, prepend = false) => {
    const container = document.querySelector('.flex-1.overflow-y-auto.p-6.space-y-4.chat-container') || 
                      document.querySelector('.flex-1.overflow-y-auto.p-6.space-y-6') ||
                      document.querySelector('.flex-1.overflow-y-auto');
    if (!container) return;
    const slice = msgs.slice(virtualization.start, virtualization.end);
    const frag = document.createDocumentFragment();
    slice.forEach(m => {
        const wrapper = document.createElement('div');
    if (m.role === 'user') {
            // reuse renderer but into a temp wrapper to get DOM nodes
            wrapper.innerHTML = `
                <div class="flex items-start justify-end gap-4 message-slide-in">
                    <div class="bg-[var(--accent-color)] text-white rounded-2xl p-3 max-w-md order-1">
                        <p style="white-space: pre-wrap;">${(m.content || '').replace(/\n/g, '<br>')}</p>
                        <div class="text-xs text-white/70 mt-2 text-right">${formatTime(m.time)}</div>
                    </div>
                    <div class="w-10 h-10 rounded-full bg-[var(--accent-color)] flex items-center justify-center text-white font-bold shrink-0">
                        <span class="material-icons text-2xl">person</span>
                    </div>
                </div>`;
        } else {
            wrapper.innerHTML = `
                <div class="flex items-start gap-4 message-slide-in">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white font-bold shrink-0 shadow-lg">
                        <span class="material-icons text-2xl">psychology</span>
                    </div>
                    <div class="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-[var(--bg-secondary)] dark:to-[var(--bg-tertiary)] border border-violet-100 dark:border-[var(--border-color)] rounded-2xl p-3 max-w-md shadow-sm message-bubble">
                        <p class="text-gray-800 dark:text-[var(--text-primary)] leading-relaxed" style="white-space: pre-wrap;">${sanitizeMd(m.content || '').replace(/\n/g, '<br>')}</p>
                        <div class="text-xs text-gray-500 dark:text-gray-400 mt-2 text-right">${formatTime(m.time)}</div>
                        <div class="message-reactions">
                            <button class="reaction-btn" onclick="handleReaction(this, 'thumbs_up')"><span class="material-icons" style="font-size: 14px;">thumb_up</span></button>
                            <button class="reaction-btn" onclick="handleReaction(this, 'thumbs_down')"><span class="material-icons" style="font-size: 14px;">thumb_down</span></button>
                        </div>
                    </div>
                </div>`;
        }
        Array.from(wrapper.childNodes).forEach(n => frag.appendChild(n));
    });
    if (prepend) {
        container.prepend(frag);
    } else {
        container.append(frag);
    }
};

const formatTime = (iso) => {
    try {
        const d = iso ? new Date(iso) : new Date();
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch { return ''; }
};

const renderUserMessage = (message, iso) => {
    const chatContainer = document.querySelector('.flex-1.overflow-y-auto.p-6.space-y-4.chat-container') || 
                         document.querySelector('.flex-1.overflow-y-auto.p-6.space-y-6') ||
                         document.querySelector('.flex-1.overflow-y-auto');
    if (!chatContainer) return;

    const timestamp = formatTime(iso);
    const formattedMessage = (message || '').replace(/\n/g, '<br>');
    const userMessage = document.createElement('div');
    userMessage.className = 'flex items-start justify-end gap-4 message-slide-in';
    userMessage.innerHTML = `
        <div class="bg-[var(--accent-color)] text-white rounded-2xl p-3 max-w-md order-1">
            <p style="white-space: pre-wrap;">${formattedMessage}</p>
            <div class="text-xs text-white/70 mt-2 text-right">${timestamp}</div>
        </div>
        <div class="w-10 h-10 rounded-full bg-[var(--accent-color)] flex items-center justify-center text-white font-bold shrink-0">
            <span class="material-icons text-2xl">person</span>
        </div>
    `;
    chatContainer.appendChild(userMessage);
};

const renderAIMessage = (message, iso) => {
    const chatContainer = document.querySelector('.flex-1.overflow-y-auto.p-6.space-y-4.chat-container') || 
                         document.querySelector('.flex-1.overflow-y-auto.p-6.space-y-6') ||
                         document.querySelector('.flex-1.overflow-y-auto');
    if (!chatContainer) return;

    const timestamp = formatTime(iso);
    const formatted = sanitizeMd(message).replace(/\n/g, '<br>');
    const aiMessage = document.createElement('div');
    aiMessage.className = 'flex items-start gap-4 message-slide-in';
    aiMessage.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white font-bold shrink-0 shadow-lg">
            <span class="material-icons text-2xl">psychology</span>
        </div>
        <div class="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-[var(--bg-secondary)] dark:to-[var(--bg-tertiary)] border border-violet-100 dark:border-[var(--border-color)] rounded-2xl p-3 max-w-md shadow-sm message-bubble">
            <p class="text-gray-800 dark:text-[var(--text-primary)] leading-relaxed" style="white-space: pre-wrap;">${formatted}</p>
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
};

const bootstrapInitialSessionIfNeeded = () => {
    loadSessions();
    if (chatSessions.length > 0) {
        renderChatHistory();
        return;
    }
    // Capture existing DOM messages as the first session
    const chatContainer = document.querySelector('.flex-1.overflow-y-auto.p-6.space-y-4.chat-container') || 
                         document.querySelector('.flex-1.overflow-y-auto.p-6.space-y-6') ||
                         document.querySelector('.flex-1.overflow-y-auto');
    const messages = [];
    if (chatContainer) {
        const nodes = chatContainer.querySelectorAll('.message-slide-in, .animate-fade-in');
        nodes.forEach(el => {
            const textEl = el.querySelector('p');
            if (!textEl) return;
            // Determine user vs AI by bubble color
            const isUser = !!el.querySelector('.bg-\\[var\\(--accent-color\\)\\]');
            messages.push({
                role: isUser ? 'user' : 'ai',
                content: textEl.innerHTML.replace(/<br\s*\/?>(?=\n?)/g, '\n')
                    .replace(/\n\n/g, '\n')
                    .replace(/<[^>]*>/g, '') // strip tags for storage
                    ,
                time: new Date().toISOString()
            });
        });
    }
    const session = createNewSession('Welcome');
    session.messages = messages;
    session.updatedAt = new Date().toISOString();
    saveSessions();
    renderChatHistory();
};

const toggleTheme = () => {
    const html = document.documentElement;
    const themeIcon = document.getElementById('theme-icon');
    
    html.classList.toggle('dark');
    
    const isDark = html.classList.contains('dark');
    localStorage.setItem('chatbot-theme', isDark ? 'dark' : 'light');
    
    // Update the icon based on current theme
    if (themeIcon) {
        themeIcon.textContent = isDark ? 'light_mode' : 'dark_mode';
    }
    
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
    
    const sendMessage = async () => {
        const message = messageInput.value.trim();
        if (message) {
            addUserMessage(message);
            messageInput.value = '';
            handleInput();
            showTypingIndicator();
            try {
                await addAIResponse(message);
            } finally {
                hideTypingIndicator();
            }
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
        // Enter fresh mode: next theme selections create brand-new sessions per theme
        freshModeActive = true;
        // Create and switch to a brand new General-themed session
        const s = createNewSession(THEME_TITLES.general || 'New Chat');
        s.theme = 'general';
        saveSessions();
        // Reset the chat area to the new (empty) session
        if (typeof openSession === 'function' && s && s.id) {
            openSession(s.id);
        } else {
            const chatContainer = document.querySelector('.flex-1.overflow-y-auto.p-6.space-y-4.chat-container') || 
                                  document.querySelector('.flex-1.overflow-y-auto.p-6.space-y-6') ||
                                  document.querySelector('.flex-1.overflow-y-auto');
            if (chatContainer) chatContainer.innerHTML = '';
        }
        // Mark General as selected and show its welcome (session is empty)
        currentTheme = 'general';
        document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
        const generalBtn = document.querySelector('.theme-btn[data-theme="general"]');
        if (generalBtn) generalBtn.classList.add('active');
        showThemeWelcomeMessage('general');
        
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
            <p class="text-gray-800 dark:text-[var(--text-primary)] leading-relaxed" style="white-space: pre-wrap;">${randomMessage}</p>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-2 text-right">${timestamp}</div>
        </div>
    `;
    
    chatContainer.appendChild(welcomeMessage);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // Persist welcome AI message to the current session
    addMessageToCurrentSession('ai', randomMessage.replace(/<br\s*\/?>(?=\n?)/g, '\n'));
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
    
    // Convert newlines to HTML line breaks
    const formattedMessage = message.replace(/\n/g, '<br>');
    
    const userMessage = document.createElement('div');
    userMessage.className = 'flex items-start justify-end gap-4 message-slide-in';
    
    userMessage.innerHTML = `
        <div class="bg-[var(--accent-color)] text-white rounded-2xl p-3 max-w-md order-1">
            <p style="white-space: pre-wrap;">${formattedMessage}</p>
            <div class="text-xs text-white/70 mt-2 text-right">${timestamp}</div>
        </div>
        <div class="w-10 h-10 rounded-full bg-[var(--accent-color)] flex items-center justify-center text-white font-bold shrink-0">
            <span class="material-icons text-2xl">person</span>
        </div>
    `;
    
    chatContainer.appendChild(userMessage);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // Persist user message
    addMessageToCurrentSession('user', message);
    // Exit fresh mode once the user starts chatting
    freshModeActive = false;
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

// ===== Gemini Integration =====
// Environment-aware API base with override support via URL (?api=...) or localStorage
const API_STORAGE_KEY = 'saathi_api_base';

function getApiBase() {
    try {
        // 1) URL override (?api=https://your-api)
        const url = new URL(window.location.href);
        const apiParam = url.searchParams.get('api');
        if (apiParam) {
            localStorage.setItem(API_STORAGE_KEY, apiParam);
            return apiParam;
        }
        // 2) Persisted override
        const stored = localStorage.getItem(API_STORAGE_KEY);
        if (stored) return stored;
        // 3) Default: localhost in dev
        const host = window.location.hostname;
        if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:3000';
        // 4) Always use Vercel backend in production
        return 'https://mental-health-chatbot-opal-three.vercel.app';
    } catch {
        return 'https://mental-health-chatbot-opal-three.vercel.app';
    }
}

async function callGemini(messages, theme) {
    try {
        const base = getApiBase();
        if (!base) {
            console.warn('[Saathi] No API endpoint configured. Using local fallback. Add ?api=https://your-api or set localStorage saathi_api_base');
            return null;
        }
        const res = await fetch(`${base}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ theme: theme || currentTheme || 'general', messages })
        });
        if (!res.ok) throw new Error('Network error');
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || 'AI error');
        return data.text || '';
    } catch (e) {
        console.error('AI request failed, using local fallback:', e);
        return null; // fallback to local heuristic
    }
}

const addAIResponse = async (userMessage) => {
    const chatContainer = document.querySelector('.flex-1.overflow-y-auto.p-6.space-y-4.chat-container') || 
                         document.querySelector('.flex-1.overflow-y-auto.p-6.space-y-6') ||
                         document.querySelector('.flex-1.overflow-y-auto');
    if (!chatContainer) return;

    // Prepare history (use current session messages for better context)
    const session = getCurrentSession();
    const all = (session?.messages || []).map(m => ({ role: m.role, content: m.content }));
    // Keep only the most recent messages to reduce payload
    const msgs = all.slice(-24).map(m => ({
        role: m.role,
        content: (m.content || '').slice(0, 1200)
    }));
    // Ensure latest user prompt present
    if (!msgs.length || msgs[msgs.length - 1].role !== 'user') {
        msgs.push({ role: 'user', content: userMessage });
    }

    let aiResponse = await callGemini(msgs, currentTheme);
    if (!aiResponse) {
        // Fallback to built-in heuristic if API failed
        aiResponse = generateAIResponse(userMessage);
    }

    const timestamp = new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    });
    const formattedAIResponse = (aiResponse || '').replace(/\n/g, '<br>');
    const aiMessage = document.createElement('div');
    aiMessage.className = 'flex items-start gap-4 message-slide-in';
    aiMessage.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white font-bold shrink-0 shadow-lg">
            <span class="material-icons text-2xl">psychology</span>
        </div>
        <div class="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-[var(--bg-secondary)] dark:to-[var(--bg-tertiary)] border border-violet-100 dark:border-[var(--border-color)] rounded-2xl p-3 max-w-md shadow-sm message-bubble">
            <p class="text-gray-800 dark:text-[var(--text-primary)] leading-relaxed" style="white-space: pre-wrap;">${formattedAIResponse}</p>
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

    // Quick replies (local heuristic)
    const quickReplies = generateQuickReplies(userMessage);
    if (quickReplies.length > 0) {
        const quickReplyContainer = document.createElement('div');
        quickReplyContainer.className = 'quick-replies';
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

    // Persist AI response (sanitized)
    addMessageToCurrentSession('ai', sanitizeMd(aiResponse));
};

// Search filtering
const initializeSearch = () => {
    const search = document.getElementById('search-input');
    if (!search) return;
    const handle = () => {
        searchQuery = search.value || '';
        renderChatHistory();
    };
    search.addEventListener('input', handle);
};

// Keyboard shortcuts
const initializeShortcuts = () => {
    document.addEventListener('keydown', (e) => {
        // Do not trigger global shortcuts while the user is typing
        // Use activeElement fallback to be robust across browsers
        const el = document.activeElement || e.target;
        const tag = el && el.tagName ? el.tagName.toLowerCase() : '';
        const type = tag === 'input' ? (el.getAttribute && (el.getAttribute('type') || '').toLowerCase()) : '';
        const nonTextInputTypes = ['button','submit','checkbox','radio','file','range','color','date','time','datetime-local','month','week','number'];
        const isTextInput = tag === 'textarea' || (tag === 'input' && !nonTextInputTypes.includes(type));
        const isTyping = isTextInput || (el && el.isContentEditable) || e.isComposing === true;

        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 'k') {
            if (isTyping) return; // avoid hijacking when user is typing
            e.preventDefault();
            const search = document.getElementById('search-input');
            if (search) search.focus();
        } else if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
            if (isTyping) return; // prevent starting new chat while typing
            e.preventDefault();
            const btn = document.getElementById('new-chat-btn');
            if (btn) btn.click();
        } else if (e.key === 'Escape') {
            // Close mobile sidebar if open
            if (sidebar && sidebar.classList.contains('mobile-open')) closeMobileSidebar();
        }
    });
};

// Undo toast
let undoToastTimer = null;
const showUndoToast = () => {
    // Create minimal toast without altering layout; disappears after a few seconds
    const existing = document.getElementById('undo-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'undo-toast';
    toast.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white dark:bg-[var(--bg-tertiary)] dark:text-[var(--text-primary)] rounded-lg px-4 py-2 shadow-lg z-[10000]';
    toast.innerHTML = 'Chat deleted. <button id="undo-btn" class="underline ml-2">Undo</button>';
    document.body.appendChild(toast);
    const undoBtn = document.getElementById('undo-btn');
    if (undoBtn) {
        undoBtn.addEventListener('click', () => {
            if (lastDeletedSessionCache) {
                chatSessions.unshift(lastDeletedSessionCache);
                currentSessionId = lastDeletedSessionCache.id;
                lastDeletedSessionCache = null;
                saveSessions();
                renderChatHistory();
            }
            toast.remove();
            if (undoToastTimer) clearTimeout(undoToastTimer);
        });
    }
    if (undoToastTimer) clearTimeout(undoToastTimer);
    undoToastTimer = setTimeout(() => toast.remove(), 5000);
};

// Export formats
const exportConversationAs = (format) => {
    const session = getCurrentSession();
    if (!session) return;
    const filenameBase = `conversation-${new Date().toISOString().split('T')[0]}`;
    if (format === 'txt' || format === 'md') {
        let out = '';
        session.messages.forEach(m => {
            const time = formatTime(m.time);
            const sender = m.role === 'user' ? 'You' : 'AI Assistant';
            const msg = m.content;
            if (format === 'md') {
                out += `- [${time}] **${sender}**: ${msg}\n`;
            } else {
                out += `[${time}] ${sender}: ${msg}\n\n`;
            }
        });
        const blob = new Blob([out], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${filenameBase}.${format}`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        return;
    }
    if (format === 'json') {
        const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${filenameBase}.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        return;
    }
    if (format === 'pdf') {
        // Lightweight PDF via print; generates a printable window and triggers print-to-PDF
        const w = window.open('', '_blank');
        if (!w) return;
        const html = `<!DOCTYPE html><html><head><title>${filenameBase}</title>
            <meta charset="utf-8"/></head><body style="font-family: Arial, sans-serif; padding: 24px;">
            <h2>${session.title || 'Conversation'}</h2>
            <div>` + session.messages.map(m => {
                const sender = m.role === 'user' ? 'You' : 'AI Assistant';
                return `<p><strong>[${formatTime(m.time)}] ${sender}:</strong> ${
                    (m.content || '').replace(/\n/g, '<br>')
                }</p>`;
            }).join('') + `</div></body></html>`;
        w.document.write(html);
        w.document.close();
        w.focus();
        w.print();
        return;
    }
};

// Export dropdown menu (replaces prompt UX)
let exportMenuEl = null;
let exportMenuOpen = false;

const buildExportMenu = () => {
    if (exportMenuEl) return exportMenuEl;
    const menu = document.createElement('div');
    menu.id = 'export-menu';
    menu.className = 'absolute bg-white dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-[var(--border-color)] rounded-lg shadow-lg py-1 z-[10000]';
    menu.style.minWidth = '160px';
    const mkItem = (label, fmt) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-[var(--text-secondary)] hover:bg-gray-100 dark:hover:bg-[var(--bg-tertiary)]';
        btn.textContent = label;
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            hideExportMenu();
            exportConversationAs(fmt);
        });
        return btn;
    };
    menu.appendChild(mkItem('TXT (.txt)', 'txt'));
    menu.appendChild(mkItem('Markdown (.md)', 'md'));
    menu.appendChild(mkItem('JSON (.json)', 'json'));
    menu.appendChild(mkItem('PDF (.pdf)', 'pdf'));
    document.body.appendChild(menu);
    exportMenuEl = menu;
    return menu;
};

const showExportMenu = (anchorBtn) => {
    const menu = buildExportMenu();
    const rect = anchorBtn.getBoundingClientRect();
    const top = window.scrollY + rect.bottom + 8; // below button
    const left = Math.min(window.scrollX + rect.left, window.scrollX + window.innerWidth - 180);
    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
    menu.style.display = 'block';
    exportMenuOpen = true;
    setTimeout(() => {
        document.addEventListener('click', handleExportOutsideClick, { once: true });
    }, 0);
};

const hideExportMenu = () => {
    if (exportMenuEl) exportMenuEl.style.display = 'none';
    exportMenuOpen = false;
};

const handleExportOutsideClick = (e) => {
    if (!exportMenuEl) return;
    if (!exportMenuEl.contains(e.target)) hideExportMenu();
};

const toggleExportMenu = (btn) => {
    if (exportMenuOpen) hideExportMenu(); else showExportMenu(btn);
};

const initializeExportMenu = () => {
    const btn = document.querySelector('button[onclick="exportConversation()"]');
    if (!btn) return;
    // Remove old inline handler to avoid double actions
    btn.removeAttribute('onclick');
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleExportMenu(btn);
    });
    window.addEventListener('resize', hideExportMenu);
    window.addEventListener('scroll', hideExportMenu, { passive: true });
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
    const currentSession = getCurrentSession();
    const currentThemeOfSession = currentSession?.theme;
    currentTheme = theme;
    // Update UI state
    document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
    const btn = document.querySelector(`[data-theme="${theme}"]`);
    if (btn) btn.classList.add('active');
    const selector = document.getElementById('theme-selector');
    if (selector) selector.classList.add('hidden');
    const toggleText = document.getElementById('theme-toggle-text');
    if (toggleText) toggleText.textContent = 'Show themes';

    let s;
    if (freshModeActive) {
        // In fresh mode, create a brand-new session when switching to a different theme
        if (!currentSession || currentThemeOfSession !== theme) {
            s = createNewThemeSession(theme);
        } else {
            // Already in the same theme's fresh session
            s = currentSession;
        }
    } else {
        // Normal behavior: resume existing or create one if missing (with welcome)
        s = getOrCreateThemeSession(theme);
    }

    if (s && s.id) openSession(s.id);

    trackProgress('theme_selected', { theme });
};

const showThemeWelcomeMessage = (theme, options = {}) => {
    const messages = THEME_WELCOME_TEXT;
    
    const chatContainer = document.querySelector('.flex-1.overflow-y-auto.p-6.space-y-4.chat-container') || 
                         document.querySelector('.flex-1.overflow-y-auto.p-6.space-y-6') ||
                         document.querySelector('.flex-1.overflow-y-auto');
    if (!chatContainer) return;
    // Do NOT clear existing chat history. Only append welcome when session is empty.
    
    const timestamp = new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    });
    
    const themeMessage = document.createElement('div');
    themeMessage.className = 'flex items-start gap-4 message-slide-in';
    
    // Format theme message to handle potential line breaks
    const formattedThemeMessage = messages[theme].replace(/\n/g, '<br>');
    
    themeMessage.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white font-bold shrink-0 shadow-lg">
            <span class="material-icons text-2xl">psychology</span>
        </div>
        <div class="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-[var(--bg-secondary)] dark:to-[var(--bg-tertiary)] border border-violet-100 dark:border-[var(--border-color)] rounded-2xl p-3 max-w-md shadow-sm message-bubble">
            <p class="text-gray-800 dark:text-[var(--text-primary)] leading-relaxed" style="white-space: pre-wrap;">${formattedThemeMessage}</p>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-2 text-right">${timestamp}</div>
        </div>
    `;
    
    chatContainer.appendChild(themeMessage);
    
    const quickReplies = getThemeQuickReplies(theme);
    if (quickReplies.length > 0) {
        const quickReplyContainer = document.createElement('div');
        quickReplyContainer.className = 'quick-replies';
        
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

    // Persist the theme welcome according to mode
    try {
        const s = getCurrentSession();
        const plain = messages[theme] || '';
        const count = (s && Array.isArray(s.messages)) ? s.messages.length : 0;
        if (!plain) return;
        const mode = options.persistMode || 'empty-only';
        if (mode === 'always') {
            addMessageToCurrentSession('ai', plain);
        } else if (count === 0) {
            addMessageToCurrentSession('ai', plain);
        }
    } catch {}
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
    const ensureDefaultThemeOnLoad = () => {
        // Set General as the default selected theme without clearing messages
        currentTheme = 'general';
        document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
        const generalBtn = document.querySelector('.theme-btn[data-theme="general"]');
        if (generalBtn) generalBtn.classList.add('active');
        const sel = document.getElementById('theme-selector');
        if (sel) sel.classList.add('hidden');
        const toggleText = document.getElementById('theme-toggle-text');
        if (toggleText) toggleText.textContent = 'Show themes';
    };

    handleResize();
    initializeHistoryAccordion();
    autoResizeTextarea();
    initializeNewChat();
    loadProgress();
    bootstrapInitialSessionIfNeeded();
    renderChatHistory();
    initializeSearch();
    initializeShortcuts();
    initializeExportMenu();
    ensureDefaultThemeOnLoad();
    
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