const express = require("express");
const path = require("path");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "../frontend")));

// Simple in-memory user storage (use database in production)
const users = new Map();
const sessions = new Map();

// Demo user
users.set("demo@example.com", {
  id: "demo-user",
  fullName: "Demo User",
  email: "demo@example.com",
  password: "demo123", // In production: hash passwords!
  plan: "free",
  createdAt: new Date()
});

// Helper function for AI generation (fallback when API fails)
function generateFallbackContent(type, topic, userLevel = 'beginner') {
  const content = {
    lesson: {
      'English Grammar': {
        beginner: "Welcome to English Grammar! Let's start with the basics. A sentence needs a subject (who or what) and a predicate (what they do). For example: 'The cat runs.' Here, 'cat' is the subject and 'runs' is the predicate. Practice identifying subjects and verbs in different sentences.",
        intermediate: "Let's explore complex sentence structures. Compound sentences join two independent clauses with conjunctions like 'and', 'but', or 'or'. Complex sentences have a main clause and subordinate clauses. Understanding these patterns will improve your writing flow.",
        advanced: "Master advanced grammar with subjunctive mood, conditional perfect tenses, and parallel structure. The subjunctive expresses hypothetical situations: 'If I were rich...' Parallel structure maintains consistency: 'I like reading, writing, and studying.'"
      },
      'Basic Coding': {
        beginner: "Programming is like giving instructions to a computer. We use variables to store information (like boxes with labels) and functions to perform actions. Think of a function as a recipe - it takes ingredients (inputs) and produces a dish (output).",
        intermediate: "Let's explore loops and conditionals. Loops repeat actions (like 'for each student, print their name'), while conditionals make decisions ('if temperature > 30, wear shorts'). These are the building blocks of complex programs.",
        advanced: "Dive into algorithms and data structures. Arrays store ordered lists, objects store key-value pairs. Algorithm efficiency matters - some solutions are faster than others. Think about how to solve problems step by step."
      },
      'Math Basics': {
        beginner: "Mathematics is about patterns and problem-solving. Start with order of operations (PEMDAS): Parentheses, Exponents, Multiplication/Division, Addition/Subtraction. Always work from left to right within each operation level.",
        intermediate: "Algebra introduces variables - letters that represent unknown numbers. Solving equations means finding what value makes the equation true. Think of it as a balance scale - what you do to one side, do to the other.",
        advanced: "Functions show relationships between inputs and outputs. f(x) = 2x + 1 means 'take a number, multiply by 2, add 1.' Functions help us model real-world situations and predict outcomes."
      }
    },
    quiz: {
      'English Grammar': [
        {
          question: "Which sentence is grammatically correct?",
          options: ["Me and John went to store", "John and I went to the store", "John and me went to store", "Me and John went to the store"],
          correct: 1
        },
        {
          question: "Choose the correct verb form:",
          options: ["She don't like pizza", "She doesn't likes pizza", "She doesn't like pizza", "She not like pizza"],
          correct: 2
        }
      ],
      'Basic Coding': [
        {
          question: "What does a variable store?",
          options: ["Functions only", "Data/information", "Code comments", "Error messages"],
          correct: 1
        },
        {
          question: "Which symbol assigns a value to a variable?",
          options: ["==", "=", "!=", ">="],
          correct: 1
        }
      ],
      'Math Basics': [
        {
          question: "What is 5 + 3 × 2?",
          options: ["16", "11", "13", "10"],
          correct: 1
        },
        {
          question: "Solve: 2x + 4 = 10",
          options: ["x = 2", "x = 3", "x = 4", "x = 6"],
          correct: 1
        }
      ]
    }
  };

  if (type === 'lesson') {
    return content.lesson[topic]?.[userLevel] || content.lesson[topic]?.beginner || `Here's your personalized lesson on ${topic}.`;
  }
  
  if (type === 'quiz') {
    return content.quiz[topic] || [
      {
        question: `What's the most important concept in ${topic}?`,
        options: ["Practice", "Understanding", "Application", "All of the above"],
        correct: 3
      }
    ];
  }
}

// Enhanced AI function with fallback
async function generateContent(type, topic, userLevel = 'beginner', context = '') {
  // Try Hugging Face API first (if available)
  if (process.env.HUGGINGFACE_API_KEY) {
    try {
      const prompts = {
        lesson: `Create a concise 5-minute ${userLevel} level lesson on ${topic}. Make it engaging and educational. ${context}`,
        quiz: `Generate 3 multiple-choice questions for ${userLevel} level ${topic}. Return in JSON format with question, options array, and correct answer index.`,
        chat: `You are a helpful AI tutor. Answer this question about ${topic} at ${userLevel} level: ${context}`
      };

      const response = await fetch("https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          inputs: prompts[type],
          parameters: { max_length: type === 'lesson' ? 200 : 100 }
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data[0]?.generated_text) {
          return data[0].generated_text;
        }
      }
    } catch (error) {
      console.log("API unavailable, using fallback content");
    }
  }

  // Fallback to local content
  return generateFallbackContent(type, topic, userLevel);
}

// ======================
// Authentication Routes
// ======================

app.post("/api/signup", (req, res) => {
  try {
    console.log("Signup request:", req.body); // Debug log
    
    const { fullName, email, password, plan } = req.body;
    
    // Validation
    if (!fullName || !email || !password) {
      console.log("Missing required fields");
      return res.status(400).json({ error: "All fields are required" });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }
    
    if (users.has(email)) {
      console.log("Email already exists:", email);
      return res.status(400).json({ error: "Email already registered. Please use a different email or try logging in." });
    }
    
    // Create new user
    const user = {
      id: `user_${Date.now()}`,
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      password: password, // Hash in production!
      plan: plan || 'free',
      createdAt: new Date().toISOString()
    };
    
    users.set(user.email, user);
    console.log("User created:", { email: user.email, plan: user.plan }); // Debug log
    
    // Create session
    const sessionId = `session_${Date.now()}`;
    sessions.set(sessionId, user.id);
    
    // Return user without password
    const safeUser = { ...user };
    delete safeUser.password;
    
    res.json({ 
      success: true, 
      message: "Account created successfully!",
      user: safeUser,
      sessionId 
    });
    
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Server error during signup. Please try again." });
  }
});

app.post("/api/login", (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = users.get(email);
    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    
    // Create session
    const sessionId = Date.now().toString();
    sessions.set(sessionId, user.id);
    
    res.json({ 
      success: true, 
      user: { ...user, password: undefined },
      sessionId 
    });
    
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error during login" });
  }
});

// ======================
// AI Content Routes
// ======================

app.post("/api/lesson", async (req, res) => {
  try {
    const { topic, userLevel } = req.body;
    
    if (!topic) {
      return res.status(400).json({ error: "Topic is required" });
    }
    
    const lesson = await generateContent('lesson', topic, userLevel);
    res.json({ lesson });
    
  } catch (error) {
    console.error("Error generating lesson:", error);
    // Always provide fallback content
    const fallbackLesson = generateFallbackContent('lesson', topic, userLevel);
    res.json({ lesson: fallbackLesson });
  }
});

app.post("/api/quiz", async (req, res) => {
  try {
    const { topic, userLevel } = req.body;
    
    if (!topic) {
      return res.status(400).json({ error: "Topic is required" });
    }
    
    // Try to generate via API, fallback to local content
    let questions;
    try {
      const aiResponse = await generateContent('quiz', topic, userLevel);
      // Try parsing as JSON first
      questions = JSON.parse(aiResponse);
    } catch {
      // Use fallback questions
      questions = generateFallbackContent('quiz', topic, userLevel);
    }
    
    res.json({ questions });
    
  } catch (error) {
    console.error("Error generating quiz:", error);
    const fallbackQuiz = generateFallbackContent('quiz', topic, userLevel);
    res.json({ questions: fallbackQuiz });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    console.log("Chat request received:", req.body); // Debug log
    
    const { message, topic, userLevel, context } = req.body;
    
    if (!message) {
      console.log("No message provided");
      return res.status(400).json({ error: "Message is required" });
    }
    
    // Generate response
    let reply;
    
    // Try AI generation if available
    if (process.env.HUGGINGFACE_API_KEY) {
      try {
        reply = await generateContent('chat', topic, userLevel, message);
      } catch (error) {
        console.log("AI generation failed, using fallback");
        reply = null;
      }
    }
    
    // Use fallback response
    if (!reply) {
      reply = generateChatFallback(message, topic, userLevel);
    }
    
    console.log("Sending reply:", reply); // Debug log
    res.json({ reply });
    
  } catch (error) {
    console.error("Error in AI chat:", error);
    
    // Always provide a fallback response
    const fallbackReply = "I'm having some technical difficulties right now, but I'm here to help! Could you rephrase your question or try asking something else about the topic?";
    res.json({ reply: fallbackReply });
  }
});

// Enhanced chat fallback function
function generateChatFallback(message, topic, userLevel) {
  const msg = message.toLowerCase();
  
  // Question-specific responses
  if (msg.includes('what') || msg.includes('how') || msg.includes('why')) {
    const responses = {
      'English Grammar': {
        beginner: "Great question! Grammar is about understanding how words work together. Start with identifying subjects (who/what) and verbs (actions) in sentences.",
        intermediate: "Good thinking! Focus on sentence types: simple (one idea), compound (two ideas joined), and complex (main idea + supporting details).",
        advanced: "Excellent inquiry! Consider the nuances of syntax, semantics, and pragmatics in your analysis."
      },
      'Basic Coding': {
        beginner: "Coding questions are the best kind! Remember: computers follow exact instructions. Break your problem into small, clear steps.",
        intermediate: "That's a solid programming question! Think about algorithms (step-by-step solutions) and data structures (how to organize information).",
        advanced: "Great technical question! Consider efficiency, readability, and maintainability in your solutions."
      },
      'Math Basics': {
        beginner: "Math questions show you're thinking! Remember to work step by step and check your answers by substituting back into the original problem.",
        intermediate: "Good mathematical thinking! Look for patterns and relationships between numbers. Practice with similar problems to build confidence.",
        advanced: "Excellent mathematical inquiry! Consider multiple approaches and think about why methods work, not just how to apply them."
      }
    };
    
    return responses[topic]?.[userLevel] || responses[topic]?.beginner || `That's a thoughtful question about ${topic}! Keep exploring and practicing - every question brings you closer to understanding.`;
  }
  
  // Encouragement for other types of input
  if (msg.includes('help') || msg.includes('stuck') || msg.includes('difficult')) {
    return `I understand ${topic} can be challenging! Break it down into smaller parts, practice regularly, and don't hesitate to review the lesson material. You're doing great by asking questions!`;
  }
  
  if (msg.includes('example') || msg.includes('show')) {
    return `Examples are a great way to learn ${topic}! Try working through the lesson content step by step, and practice with different scenarios to build your understanding.`;
  }
  
  // Default encouraging response
  return `Thanks for your question about ${topic}! I encourage you to explore the lesson material and keep practicing. Learning is a journey, and every question you ask shows you're actively engaged!`;
}

// ======================
// Utility Routes
// ======================

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "healthy", 
    timestamp: new Date(),
    users: users.size,
    sessions: sessions.size
  });
});

// Serve frontend files
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Server error:", error);
  res.status(500).json({ error: "Internal server error" });
});

// ======================
// Start Server
// ======================
app.listen(PORT, () => {
  console.log(`🚀 AI Micro-Tutor Server running at http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`👤 Demo login: demo@example.com / demo123`);
  
  if (!process.env.HUGGINGFACE_API_KEY) {
    console.log("⚠️  No Hugging Face API key found. Using fallback content.");
    console.log("   Add HUGGINGFACE_API_KEY to .env file for AI features.");
  }
});