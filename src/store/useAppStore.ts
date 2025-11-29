import { Chat, ChatMessage, User } from '@/types';
import { create } from 'zustand';

interface AppState {
  // User state
  user: User;
  setUser: (user: User) => void;
  
  // View state
  currentView: 'home' | 'chats' | 'chat';
  setCurrentView: (view: 'home' | 'chats' | 'chat') => void;
  
  // Search state
  isSearchOpen: boolean;
  setIsSearchOpen: (isOpen: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  // Chat search state
  chatSearchQuery: string;
  setChatSearchQuery: (query: string) => void;
  
  // Chat state
  chats: Chat[];
  currentChatId: string | null;
  setCurrentChatId: (id: string | null) => void;
  addChat: (chat: Chat) => void;
  updateChat: (id: string, chat: Partial<Chat>) => void;
  deleteChat: (id: string) => void;
  
  // Message state
  message: string;
  setMessage: (message: string) => void;
  
  // Loading state
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  
  // Feature cards
  featureCards: Array<{
    id: string;
    icon: 'projects' | 'skills' | 'experience';
    title: string;
    description: string;
    buttonText: string;
  }>;
  
  // Actions
  createNewChat: (title?: string) => string;
  sendMessage: () => void;
  handleCardAction: (cardId: string) => void;
  
  // Getters
  getCurrentChat: () => Chat | undefined;
  getFilteredChats: () => Chat[];
}

// Portfolio response templates for Dishant
const portfolioResponses: Record<string, string> = {
  projects: `## 🚀 Featured Projects

Here are some of my notable projects:

### 1. AI-Powered Chat Portfolio
A modern portfolio website with an AI chat interface where visitors can learn about me through conversation. Built with Next.js, Tailwind CSS, and Zustand.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Zustand

### 2. E-Commerce Platform
Full-stack e-commerce solution with real-time inventory management, payment processing, and admin dashboard.

**Tech Stack:** React, Node.js, PostgreSQL, Stripe

### 3. Real-Time Collaboration Tool
A collaborative workspace application with live editing, video conferencing, and project management features.

**Tech Stack:** Next.js, WebSockets, WebRTC, MongoDB

### 4. Mobile Fitness App
Cross-platform mobile app for workout tracking, nutrition planning, and progress visualization.

**Tech Stack:** React Native, Firebase, Redux

Would you like to know more about any specific project?`,

  skills: `## 💻 Technical Skills

### Frontend Development
- **Languages:** JavaScript, TypeScript, HTML5, CSS3
- **Frameworks:** React, Next.js, Vue.js
- **Styling:** Tailwind CSS, Styled Components, SASS
- **State Management:** Redux, Zustand, React Query

### Backend Development
- **Languages:** Node.js, Python, Go
- **Frameworks:** Express, NestJS, FastAPI
- **Databases:** PostgreSQL, MongoDB, Redis
- **APIs:** REST, GraphQL, WebSockets

### DevOps & Tools
- **Cloud:** AWS, Google Cloud, Vercel
- **CI/CD:** GitHub Actions, Docker
- **Version Control:** Git, GitHub
- **Testing:** Jest, Cypress, Playwright

### Other Skills
- UI/UX Design Principles
- Agile/Scrum Methodologies
- Technical Writing
- Team Leadership

What specific skills would you like to explore further?`,

  experience: `## 👨‍💻 Professional Experience

### Senior Software Engineer
**Tech Company** | 2022 - Present
- Lead development of customer-facing web applications
- Architected microservices handling 1M+ daily requests
- Mentored junior developers and conducted code reviews
- Reduced deployment time by 60% through CI/CD optimization

### Full Stack Developer
**Startup Inc.** | 2020 - 2022
- Built and launched 3 products from concept to production
- Implemented real-time features using WebSockets
- Collaborated with design team to improve UX
- Increased test coverage from 40% to 85%

### Frontend Developer
**Digital Agency** | 2018 - 2020
- Developed responsive web applications for various clients
- Created reusable component libraries
- Optimized performance achieving 95+ Lighthouse scores

### Education
**Bachelor's in Computer Science**
University | 2014 - 2018

Would you like to know more about any role or my educational background?`,

  default: `I'd be happy to help you learn more about Dishant! Here are some things I can tell you about:

📁 **Projects** - My featured work and side projects
💻 **Skills** - Technical expertise and tools I use
👨‍💻 **Experience** - Professional background and education
📫 **Contact** - How to get in touch

What would you like to know more about?`
};

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 15);

// Get greeting based on time of day
export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

// Format date helper
export const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
};

// Format relative time
export const formatRelativeTime = (date: Date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  
  return formatDate(date);
};

// Sample chats for portfolio
const sampleChats: Chat[] = [
  {
    id: 'sample-1',
    title: "Tell me about Dishant's projects",
    description: portfolioResponses.projects.substring(0, 200) + '...',
    createdAt: new Date(Date.now() - 86400000 * 2),
    updatedAt: new Date(Date.now() - 86400000 * 2),
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: "Tell me about Dishant's projects",
        timestamp: new Date(Date.now() - 86400000 * 2),
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: portfolioResponses.projects,
        timestamp: new Date(Date.now() - 86400000 * 2),
      },
    ],
  },
  {
    id: 'sample-2',
    title: 'What are your technical skills?',
    description: portfolioResponses.skills.substring(0, 150) + '...',
    createdAt: new Date(Date.now() - 86400000 * 5),
    updatedAt: new Date(Date.now() - 86400000 * 5),
    messages: [
      {
        id: 'msg-3',
        role: 'user',
        content: 'What are your technical skills?',
        timestamp: new Date(Date.now() - 86400000 * 5),
      },
      {
        id: 'msg-4',
        role: 'assistant',
        content: portfolioResponses.skills,
        timestamp: new Date(Date.now() - 86400000 * 5),
      },
    ],
  },
  {
    id: 'sample-3',
    title: "What's your professional background?",
    description: portfolioResponses.experience.substring(0, 150) + '...',
    createdAt: new Date(Date.now() - 86400000 * 10),
    updatedAt: new Date(Date.now() - 86400000 * 10),
    messages: [
      {
        id: 'msg-5',
        role: 'user',
        content: "What's your professional background?",
        timestamp: new Date(Date.now() - 86400000 * 10),
      },
      {
        id: 'msg-6',
        role: 'assistant',
        content: portfolioResponses.experience,
        timestamp: new Date(Date.now() - 86400000 * 10),
      },
    ],
  },
];

// Simulate streaming response for portfolio
const simulateStreamingResponse = (
  chatId: string,
  content: string,
  updateChat: (id: string, chat: Partial<Chat>) => void,
  setIsLoading: (isLoading: boolean) => void
) => {
  let currentContent = '';
  let index = 0;
  
  const messageId = generateId();
  const assistantMessage: ChatMessage = {
    id: messageId,
    role: 'assistant',
    content: '',
    timestamp: new Date(),
    isStreaming: true,
  };
  
  const interval = setInterval(() => {
    if (index < content.length) {
      currentContent += content[index];
      index++;
      
      // Update the message content
      assistantMessage.content = currentContent;
      
      // Get current chat and update
      const store = useAppStore.getState();
      const chat = store.chats.find(c => c.id === chatId);
      if (chat && chat.messages) {
        const updatedMessages = chat.messages.filter(m => m.id !== messageId);
        updateChat(chatId, {
          messages: [...updatedMessages, { ...assistantMessage }],
          description: currentContent.substring(0, 150) + '...',
        });
      }
    } else {
      clearInterval(interval);
      assistantMessage.isStreaming = false;
      
      const store = useAppStore.getState();
      const chat = store.chats.find(c => c.id === chatId);
      if (chat && chat.messages) {
        const updatedMessages = chat.messages.filter(m => m.id !== messageId);
        updateChat(chatId, {
          messages: [...updatedMessages, { ...assistantMessage }],
          updatedAt: new Date(),
        });
      }
      setIsLoading(false);
    }
  }, 10); // Fast streaming
};

// Get appropriate response based on question
const getPortfolioResponse = (question: string): string => {
  const q = question.toLowerCase();
  
  if (q.includes('project') || q.includes('work') || q.includes('built') || q.includes('portfolio')) {
    return portfolioResponses.projects;
  }
  if (q.includes('skill') || q.includes('tech') || q.includes('stack') || q.includes('language') || q.includes('framework')) {
    return portfolioResponses.skills;
  }
  if (q.includes('experience') || q.includes('job') || q.includes('career') || q.includes('background') || q.includes('education')) {
    return portfolioResponses.experience;
  }
  if (q.includes('contact') || q.includes('email') || q.includes('reach') || q.includes('hire')) {
    return `## 📫 Get In Touch

I'd love to hear from you! Here's how you can reach me:

**Email:** dishant@example.com
**LinkedIn:** linkedin.com/in/dishantsharma
**GitHub:** github.com/dishantsharma
**Twitter:** @dishantsharma

Feel free to reach out for:
- Job opportunities
- Freelance projects
- Collaborations
- Just to say hi!

I typically respond within 24-48 hours.`;
  }
  if (q.includes('about') || q.includes('who') || q.includes('introduce')) {
    return `## 👋 About Dishant Sharma

Hi! I'm Dishant, a passionate **Full Stack Developer** with a love for building beautiful, functional, and user-centric digital experiences.

### Quick Facts
- 🎯 **5+ years** of professional development experience
- 💼 Currently working as a **Senior Software Engineer**
- 🌍 Based in **India**
- 🎓 **B.Tech in Computer Science**

### What I Do
I specialize in building modern web applications using cutting-edge technologies. My passion lies in creating seamless user experiences backed by robust, scalable architectures.

### Beyond Code
When I'm not coding, you'll find me:
- 📚 Reading tech blogs and learning new skills
- 🎮 Gaming and unwinding
- ✍️ Writing technical articles
- 🏃 Staying active with fitness routines

What would you like to know more about?`;
  }
  
  return portfolioResponses.default;
};

export const useAppStore = create<AppState>((set, get) => ({
  // Initial user state (visitor)
  user: {
    id: 'visitor',
    name: 'there',
    email: '',
    greeting: getGreeting(),
  },
  setUser: (user) => set({ user }),
  
  // View state
  currentView: 'home',
  setCurrentView: (view) => set({ currentView: view }),
  
  // Search state
  isSearchOpen: false,
  setIsSearchOpen: (isOpen) => set({ isSearchOpen: isOpen }),
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  // Chat search state
  chatSearchQuery: '',
  setChatSearchQuery: (query) => set({ chatSearchQuery: query }),
  
  // Chat state
  chats: sampleChats,
  currentChatId: null,
  setCurrentChatId: (id) => {
    set({ currentChatId: id });
    if (id) {
      set({ currentView: 'chat' });
    }
  },
  addChat: (chat) => set((state) => ({ chats: [chat, ...state.chats] })),
  updateChat: (id, updates) => set((state) => ({
    chats: state.chats.map((chat) =>
      chat.id === id ? { ...chat, ...updates } : chat
    ),
  })),
  deleteChat: (id) => set((state) => ({
    chats: state.chats.filter((chat) => chat.id !== id),
    currentChatId: state.currentChatId === id ? null : state.currentChatId,
  })),
  
  // Message state
  message: '',
  setMessage: (message) => set({ message }),
  
  // Loading state
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),
  
  // Feature cards for portfolio
  featureCards: [
    {
      id: 'projects',
      icon: 'projects',
      title: 'View my projects',
      description: "Explore my portfolio of web apps, mobile apps, and open-source contributions.",
      buttonText: 'See Projects',
    },
    {
      id: 'skills',
      icon: 'skills',
      title: 'Technical skills',
      description: 'Discover my tech stack, tools, and areas of expertise.',
      buttonText: 'View Skills',
    },
    {
      id: 'experience',
      icon: 'experience',
      title: 'My experience',
      description: 'Learn about my professional journey, roles, and achievements.',
      buttonText: 'Read More',
    },
  ],
  
  // Actions
  createNewChat: (title = 'New Conversation') => {
    const newChat: Chat = {
      id: generateId(),
      title,
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [],
    };
    get().addChat(newChat);
    return newChat.id;
  },
  
  sendMessage: () => {
    const { message, currentChatId, createNewChat, updateChat, setIsLoading, chats } = get();
    
    if (!message.trim()) return;
    
    let chatId = currentChatId;
    
    // Create new chat if none selected
    if (!chatId) {
      chatId = createNewChat(message.substring(0, 50));
      set({ currentChatId: chatId, currentView: 'chat' });
    }
    
    // Add user message
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      updateChat(chatId, {
        messages: [...chat.messages, userMessage],
        title: chat.messages.length === 0 ? message.substring(0, 50) : chat.title,
        updatedAt: new Date(),
      });
    }
    
    // Clear input and set loading
    set({ message: '', isLoading: true });
    
    // Simulate AI response
    setTimeout(() => {
      const responseContent = getPortfolioResponse(message);
      simulateStreamingResponse(chatId!, responseContent, updateChat, setIsLoading);
    }, 500);
  },
  
  handleCardAction: (cardId) => {
    const { updateChat, setIsLoading, setCurrentChatId, addChat } = get();
    
    const cardMessages: Record<string, string> = {
      projects: 'Tell me about your projects',
      skills: 'What are your technical skills?',
      experience: 'What is your professional experience?',
    };
    
    const userQuestion = cardMessages[cardId] || 'Tell me more';
    
    // Create user message
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: userQuestion,
      timestamp: new Date(),
    };
    
    // Create new chat with the user message already included
    const chatId = generateId();
    const newChat: Chat = {
      id: chatId,
      title: userQuestion,
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [userMessage],
    };
    
    addChat(newChat);
    setCurrentChatId(chatId);
    
    // Set loading and generate response
    setIsLoading(true);
    
    setTimeout(() => {
      const responseContent = getPortfolioResponse(userQuestion);
      simulateStreamingResponse(chatId, responseContent, updateChat, setIsLoading);
    }, 500);
  },
  
  // Getters
  getCurrentChat: () => {
    const { chats, currentChatId } = get();
    return chats.find((chat) => chat.id === currentChatId);
  },
  
  getFilteredChats: () => {
    const { chats, chatSearchQuery } = get();
    if (!chatSearchQuery.trim()) return chats;
    
    const query = chatSearchQuery.toLowerCase();
    return chats.filter(
      (chat) =>
        chat.title.toLowerCase().includes(query) ||
        chat.description?.toLowerCase().includes(query)
    );
  },
}));

export default useAppStore;
