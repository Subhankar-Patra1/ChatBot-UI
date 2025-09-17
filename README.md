# 🧠 Digital Mental Health Support System for Students

A modern web chatbot for student mental wellness with per-theme chat sessions, searchable history, and an optional Gemini-powered backend.

![ChatBot Preview](https://img.shields.io/badge/Status-Active-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)

## 🌟 Features

### 💬 **Advanced Chat Interface**

- Real-time messaging with typing indicators
- Message reactions (thumbs up/down)
- Quick reply suggestions for faster interaction
- Smooth message animations and transitions
- Virtualized rendering for long conversations (faster scrolling)

### 🎨 **Therapeutic Design**

- **Dark/Light Mode**: Automatic theme persistence across sessions
- **Soft Color Palette**: Calming lavender accents (#8b5cf6) for mental wellness
- **Student-Focused UI**: Designed specifically for higher education environments
- **Responsive Design**: Fully optimized for mobile, tablet, and desktop

### 🧭 **Smart Navigation & Sessions**

- Collapsible sidebar with date-grouped conversation history (Today, Yesterday, Previous 7/30 days, Older)
- Per-theme sessions: General, Study Stress, Anxiety Support, Relationships, Mood Support
- Rename, delete (with Undo), pin, and archive sessions
- Search sessions by title/tags
- Keyboard shortcuts: Ctrl/Cmd + K to focus search, N to start a new chat (ignored while typing)

### 🎯 **Mental Health Features**

- **Context-Aware Responses**: AI responses tailored to mental health topics
- **Conversation Themes**: Stress, Anxiety, Depression, Relationships, General
- **Theme Welcome Messages**: Friendly, theme-specific welcomes in new sessions (no spam mid-conversation)
- **Progress Tracking**: Monitor usage patterns and engagement
- **Conversation Export**: Export current session as TXT, Markdown, JSON, or print-to-PDF

### 📱 **Mobile Responsiveness**

- **Mobile-First Design**: Optimized for smartphones and tablets
- **Touch-Friendly Interface**: 44px minimum touch targets
- **Gesture Support**: Swipe navigation for mobile users
- **Responsive Breakpoints**: 768px (mobile), 480px (small mobile)

### 💾 **Data Persistence**

- **LocalStorage Integration**: Saves theme preferences and sidebar state
- **Session Continuity**: Maintains user preferences across browser sessions
- **Progress Data**: Tracks conversation metrics and themes

## 🚀 Live Demo

Visit the live application: [Mental Health Chatbot](https://subhankar-patra1.github.io/ChatBot-UI/)

Note: For AI responses on GitHub Pages, you must provide a publicly accessible HTTPS API endpoint via a query param `?api=...` (see Backend below). Otherwise, the app will fall back to a simple local heuristic.

## 📋 Installation

1. **Clone the repository**
   
   ```bash
   git clone https://github.com/Subhankar-Patra1/ChatBot-UI.git
   cd ChatBot-UI
   ```

2. **Optional Backend (Gemini via Node/Express)**

   - Requirements: Node.js 18+
     - Copy the environment template and set your Google API key

         ```powershell
         Copy-Item .env.example .env
         # then edit .env and set GOOGLE_API_KEY=your_api_key
         ```

     - Install dependencies and run the server

         ```powershell
         npm install
         npm run dev   # or: npm start
         ```

    - Server will default to `http://localhost:3000`.

3. **Serve the frontend**

     - You can open `index.html` directly, but using a local server is recommended:

         ```powershell
         npx http-server . -p 8000
         ```

     - Open the UI: `http://localhost:8000`
     - API endpoint config (auto + manual):
         - On localhost, the app automatically uses `http://localhost:3000` if the backend is running.
         - Anywhere else (e.g., GitHub Pages), set the API base via URL:

             `https://your-site/ChatBot-UI/index.html?api=https://your-api.example.com`

         - Or persist it in localStorage with key `saathi_api_base`.

## 🛠️ Technologies Used

- **HTML5**: Semantic structure and accessibility
- **CSS3**: Modern styling with CSS Grid and Flexbox
- **Vanilla JavaScript**: No dependencies, pure JS implementation
- **Tailwind CSS**: Utility-first CSS framework for rapid styling
- **Material Icons**: Google's icon font for consistent iconography
- **LocalStorage API**: Client-side data persistence
- **Node.js + Express (optional)**: Backend proxy to Google Gemini
- **@google/generative-ai**: Gemini 1.5 Flash client

## 📁 Project Structure

```text
ChatBot-UI/
├── index.html          # Main HTML structure
├── styles.css          # Custom CSS and responsive design
├── script.js           # Core JavaScript: sessions, UI, API calls
├── server.js           # Node/Express backend: /api/chat (Gemini) & /api/health
├── package.json        # Backend manifest (ESM)
├── .env.example        # Template for GOOGLE_API_KEY and PORT
├── README.md           # Project documentation
└── test-linebreaks.html# Small test page (line breaks/sanitization)
```

## 🎨 Design Principles

### **Therapeutic Color Scheme**

- **Primary Accent**: Soft Lavender (#8b5cf6) - calming and professional
- **Background**: Light/Dark mode support for user comfort
- **Text**: High contrast ratios for accessibility

### **User Experience**

- **Minimalist Interface**: Reduces cognitive load for stressed users
- **Intuitive Navigation**: Clear visual hierarchy and familiar patterns
- **Accessibility**: Keyboard navigation and screen reader support

## 🧠 Mental Health Context

This chatbot is specifically designed for students facing:

- **Academic Stress**: Exam anxiety, study pressure, time management
- **Social Anxiety**: Interpersonal challenges, social situations
- **Depression**: Mood management, motivation, daily activities
- **General Wellness**: Overall mental health maintenance

### **Response Categories**

- Contextual AI responses based on detected keywords
- Appropriate quick replies for different mental health topics
- Encouraging and supportive language throughout

### **Theme Welcome Behavior**

- New Chat always starts in General with a single General welcome
- Switching to a theme opens that theme’s dedicated session and shows its welcome only the first time
- After you start chatting, switching themes does not add extra welcomes to the middle of conversations

## 📱 Mobile Features

### **Responsive Breakpoints**

- **Desktop**: > 768px - Full sidebar and all features
- **Tablet**: 481px - 768px - Collapsible sidebar
- **Mobile**: ≤ 480px - Overlay sidebar with touch gestures

### **Touch Optimizations**

- Minimum 44px touch targets for accessibility
- Swipe gestures for sidebar control
- Mobile-optimized input controls

## 🔧 Customization

### **Themes**

Modify the CSS custom properties in `styles.css`:

```css
:root {
    --accent-color: #8b5cf6;        /* Primary accent */
    --bg-primary: #ffffff;          /* Light background */
    --text-primary: #111827;        /* Primary text */
}
```

### **AI Responses**

Customize local fallback responses in `script.js` in the `generateAIResponse()` function:

```javascript
const generateAIResponse = (userMessage) => {
    // Add your custom response logic here
};
```

Server-side system instructions and theme guidance live in `server.js` (see `getSystemInstruction(theme)`).

### **API endpoint**

The frontend discovers the API base in this order:

- URL query `?api=...`
- localStorage `saathi_api_base`
- Defaults to `http://localhost:3000` when running on `localhost`
- Otherwise no API (frontend falls back to local heuristic)

To persist an API for hosted builds, set localStorage in DevTools:

```js
localStorage.setItem('saathi_api_base', 'https://your-api.example.com');
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

### Subhankar Patra

- GitHub: [@Subhankar-Patra1](https://github.com/Subhankar-Patra1)
- Email: [subhankarpatra258@gmail.com](mailto:subhankarpatra258@gmail.com)

## 🙏 Acknowledgments

- Mental health professionals who provided insights into student needs
- Open source community for inspiration and tools
- Students who provided feedback during development

## 📊 Statistics

- **Lines of Code**: ~1,600+
- **Files**: 3 core files (HTML, CSS, JS)
- **Features**: 15+ advanced features
- **Responsive Breakpoints**: 3 device categories
- **Mental Health Contexts**: 5 specialized themes

---

**⚠️ Important Notice**: This chatbot is designed for support and educational purposes. It is not a replacement for professional mental health services. If you're experiencing a mental health crisis, please contact a qualified mental health professional or emergency services immediately.

**🔗 Mental Health Resources**:

- National Suicide Prevention Lifeline: 988
- Crisis Text Line: Text HOME to 741741
- International Association for Suicide Prevention: <https://www.iasp.info/>
