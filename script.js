// Enhanced AI Micro-Tutor JavaScript

// Debug helper function
function debugLog(message, data = null) {
  console.log(`[AI-Tutor Debug] ${message}`, data || '');
}

// Utility Functions
function getUser() {
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  debugLog("Getting user data:", user);
  return user;
}

function getProgress() {
  return JSON.parse(localStorage.getItem("userProgress") || "{}");
}

function saveProgress(progress) {
  localStorage.setItem("userProgress", JSON.stringify(progress));
}

function checkDailyLimit() {
  const user = getUser();
  if (user.plan === 'premium') return true;
  
  const progress = getProgress();
  const today = new Date().toDateString();
  const dailyCount = progress.dailyLessons?.[today] || 0;
  
  return dailyCount < 3;
}

// Topic Selection with Limit Checking
function selectTopic(topic) {
  const user = getUser();
  
  if (!user.email) {
    alert("Please log in to access lessons.");
    window.location.href = "login.html";
    return;
  }

  // Check premium features
  if (topic === 'Advanced Topics' && user.plan !== 'premium') {
    alert('🔒 This is a premium feature!\n\nUpgrade to Premium to access:\n• Advanced topics\n• Unlimited lessons\n• Detailed analytics');
    return;
  }

  // Check daily limits for free users
  if (!checkDailyLimit()) {
    alert('📚 Daily limit reached!\n\nFree users get 3 lessons per day.\nUpgrade to Premium for unlimited access!');
    return;
  }

  sessionStorage.setItem("selectedTopic", topic);
  window.location.href = "lesson.html";
}

// Enhanced Fetch Functions with Better Error Handling
async function fetchLesson(topic) {
  const container = document.getElementById("lesson-content-container");
  const content = document.getElementById("lesson-content");
  
  if (container) container.classList.add("loading");
  
  try {
    const response = await fetch("/api/lesson", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, userLevel: getUserLevel(topic) })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    document.getElementById("lesson-title").textContent = `${topic} - Personalized Lesson`;
    content.innerHTML = `
      <div style="line-height: 1.8; font-size: 16px;">
        ${data.lesson || "Welcome to your personalized lesson!"}
      </div>
    `;
    
    // Enable action buttons
    const quizBtn = document.getElementById("quiz-btn");
    const completeBtn = document.getElementById("complete-btn");
    if (quizBtn) quizBtn.disabled = false;
    if (completeBtn) completeBtn.disabled = false;
    
  } catch (error) {
    console.error("Error fetching lesson:", error);
    content.innerHTML = `
      <div style="color: #dc2626; text-align: center; padding: 2em;">
        <h4>⚠️ Unable to load lesson</h4>
        <p>Please check your internet connection and try again.</p>
        <button onclick="location.reload()" class="btn-primary">Retry</button>
        <br><br>
        <p><em>Or try our offline demo content below:</em></p>
        <div style="background: #f8f9fa; padding: 1.5em; border-radius: 8px; margin-top: 1em; text-align: left;">
          ${getOfflineContent(topic)}
        </div>
      </div>
    `;
    
    // Enable buttons even for offline content
    const quizBtn = document.getElementById("quiz-btn");
    const completeBtn = document.getElementById("complete-btn");
    if (quizBtn) quizBtn.disabled = false;
    if (completeBtn) completeBtn.disabled = false;
  } finally {
    if (container) container.classList.remove("loading");
  }
}

// Get user's current level for a topic
function getUserLevel(topic) {
  const progress = getProgress();
  const topicKey = topic.toLowerCase().replace(/\s+/g, '');
  const topicProgress = progress.topics?.[topicKey] || 0;
  
  if (topicProgress < 30) return 'beginner';
  if (topicProgress < 70) return 'intermediate';
  return 'advanced';
}

// Offline content fallback
function getOfflineContent(topic) {
  const content = {
    'English Grammar': `
      <h4>English Grammar Basics</h4>
      <p><strong>Parts of Speech:</strong> Every word in English belongs to one of eight parts of speech: nouns, pronouns, verbs, adjectives, adverbs, prepositions, conjunctions, and interjections.</p>
      <p><strong>Subject-Verb Agreement:</strong> The subject and verb in a sentence must agree in number. Singular subjects take singular verbs, and plural subjects take plural verbs.</p>
      <p><strong>Common Mistakes:</strong> Watch out for its/it's, there/their/they're, and affect/effect.</p>
    `,
    'Basic Coding': `
      <h4>Introduction to Programming</h4>
      <p><strong>What is Programming?</strong> Programming is giving instructions to a computer to solve problems or complete tasks.</p>
      <p><strong>Key Concepts:</strong> Variables store data, functions perform actions, and loops repeat actions.</p>
      <p><strong>First Steps:</strong> Start with understanding input, processing, and output. Every program follows this basic pattern.</p>
    `,
    'Math Basics': `
      <h4>Mathematical Foundations</h4>
      <p><strong>Order of Operations:</strong> Remember PEMDAS - Parentheses, Exponents, Multiplication/Division, Addition/Subtraction.</p>
      <p><strong>Fractions:</strong> To add fractions, find a common denominator. To multiply, multiply numerators and denominators.</p>
      <p><strong>Problem Solving:</strong> Read carefully, identify what you know, determine what you need to find, then plan your solution.</p>
    `
  };
  
  return content[topic] || `<p>Sample lesson content for ${topic} would appear here.</p>`;
}

// Enhanced Quiz Loading
async function loadQuiz() {
  const topic = sessionStorage.getItem("selectedTopic");
  const quizSection = document.getElementById("quiz-section");
  const quizContent = document.getElementById("quiz-content");

  try {
    const response = await fetch("/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, userLevel: getUserLevel(topic) })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    // Handle both structured and text responses
    currentQuizData = data.questions || parseQuizText(data.quiz) || getOfflineQuiz(topic);
    displayQuiz(currentQuizData);
    
  } catch (error) {
    console.error("Error fetching quiz:", error);
    // Use offline quiz as fallback
    currentQuizData = getOfflineQuiz(topic);
    displayQuiz(currentQuizData);
  }
}

// Display quiz questions
function displayQuiz(questions) {
  const quizContent = document.getElementById("quiz-content");
  const quizSection = document.getElementById("quiz-section");
  
  let quizHTML = "";
  questions.forEach((q, index) => {
    quizHTML += `
      <div class="quiz-question">
        <h4>Question ${index + 1}: ${q.question}</h4>
        <ul class="quiz-options">
          ${q.options.map((option, i) => 
            `<li onclick="selectAnswer(${index}, ${i})" data-question="${index}" data-option="${i}">
              ${String.fromCharCode(65 + i)}. ${option}
            </li>`
          ).join('')}
        </ul>
      </div>
    `;
  });
  
  quizContent.innerHTML = quizHTML;
  quizSection.classList.remove("hidden");
  document.getElementById("submit-quiz").style.display = "block";
}

// Offline quiz fallback
function getOfflineQuiz(topic) {
  const quizzes = {
    'English Grammar': [
      {
        question: "Which sentence uses correct subject-verb agreement?",
        options: ["The cats runs fast", "The cats run fast", "The cats running fast", "The cats is running fast"],
        correct: 1
      },
      {
        question: "Choose the correct form:",
        options: ["Its a beautiful day", "It's a beautiful day", "Its' a beautiful day", "It's' a beautiful day"],
        correct: 1
      }
    ],
    'Basic Coding': [
      {
        question: "What is a variable in programming?",
        options: ["A bug in code", "A storage location for data", "A type of loop", "An error message"],
        correct: 1
      },
      {
        question: "Which symbol is commonly used for assignment?",
        options: ["==", "=", "!=", "=>"],
        correct: 1
      }
    ],
    'Math Basics': [
      {
        question: "What is 2 + 3 × 4?",
        options: ["20", "14", "24", "10"],
        correct: 1
      },
      {
        question: "What is 1/2 + 1/4?",
        options: ["2/6", "3/4", "1/6", "2/4"],
        correct: 1
      }
    ]
  };
  
  return quizzes[topic] || [{
    question: `What interests you most about ${topic}?`,
    options: ["Theory", "Practice", "Applications", "All aspects"],
    correct: 3
  }];
}

// Progress tracking and user management
function updateUserProgress(type, score = null) {
  const progress = getProgress();
  const topic = sessionStorage.getItem("selectedTopic");
  const today = new Date().toDateString();

  // Initialize structure
  if (!progress.dailyLessons) progress.dailyLessons = {};
  if (!progress.topics) progress.topics = {};
  if (!progress.totalLessons) progress.totalLessons = 0;
  if (!progress.totalQuizzes) progress.totalQuizzes = 0;
  if (!progress.lastActivity) progress.lastActivity = {};

  // Update based on activity type
  if (type === 'lesson') {
    progress.dailyLessons[today] = (progress.dailyLessons[today] || 0) + 1;
    progress.totalLessons += 1;
    progress.lastActivity[topic] = new Date().toISOString();
    
    const topicKey = topic.toLowerCase().replace(/\s+/g, '');
    progress.topics[topicKey] = Math.min(100, (progress.topics[topicKey] || 0) + 10);
  }

  if (type === 'quiz') {
    progress.totalQuizzes += 1;
    if (score >= 80) {
      const topicKey = topic.toLowerCase().replace(/\s+/g, '');
      progress.topics[topicKey] = Math.min(100, (progress.topics[topicKey] || 0) + 15);
    }
  }

  // Calculate streak
  updateStreak(progress, today);
  
  saveProgress(progress);
  return progress;
}

function updateStreak(progress, today) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();
  
  if (progress.dailyLessons[today] && progress.dailyLessons[yesterdayStr]) {
    progress.currentStreak = (progress.currentStreak || 0) + 1;
  } else if (!progress.dailyLessons[yesterdayStr]) {
    progress.currentStreak = progress.dailyLessons[today] ? 1 : 0;
  }
}

// Quiz answer selection
let currentQuizAnswers = {};
let currentQuizData = {};

function selectAnswer(questionIndex, optionIndex) {
  document.querySelectorAll(`[data-question="${questionIndex}"]`).forEach(el => {
    el.classList.remove("selected");
  });
  
  document.querySelector(`[data-question="${questionIndex}"][data-option="${optionIndex}"]`)
    .classList.add("selected");
  
  currentQuizAnswers[questionIndex] = optionIndex;
}

function submitQuiz() {
  let correct = 0;
  const totalQuestions = currentQuizData.length;
  
  currentQuizData.forEach((q, index) => {
    const userAnswer = currentQuizAnswers[index];
    const correctAnswer = q.correct || 0;
    
    const options = document.querySelectorAll(`[data-question="${index}"]`);
    options.forEach((option, i) => {
      if (i === correctAnswer) {
        option.classList.add("correct");
      } else if (i === userAnswer && i !== correctAnswer) {
        option.classList.add("incorrect");
      }
    });
    
    if (userAnswer === correctAnswer) correct++;
  });

  const score = Math.round((correct / totalQuestions) * 100);
  
  const resultsHTML = `
    <div style="text-align: center; padding: 1.5em; background: ${score >= 80 ? '#dcfce7' : score >= 60 ? '#fef3c7' : '#fef2f2'}; border-radius: 8px;">
      <h4>Quiz Complete! 🎯</h4>
      <p style="font-size: 1.2em; margin: 1em 0;"><strong>${correct}/${totalQuestions} correct (${score}%)</strong></p>
      <p style="margin-bottom: 1em;">
        ${score >= 80 ? "Excellent work! 🌟 You've mastered this topic!" : 
          score >= 60 ? "Good job! 👍 Keep practicing to improve." : 
          "Keep studying! 📚 Review the lesson and try again."}
      </p>
      <button onclick="retakeQuiz()" class="btn" style="margin-right: 10px;">Retake Quiz</button>
      <button onclick="window.location.href='dashboard.html'" class="btn-primary">Continue Learning</button>
    </div>
  `;
  
  document.getElementById("quiz-results").innerHTML = resultsHTML;
  document.getElementById("quiz-results").classList.remove("hidden");
  document.getElementById("submit-quiz").style.display = "none";

  updateUserProgress('quiz', score);
}

function retakeQuiz() {
  currentQuizAnswers = {};
  document.querySelectorAll('.quiz-options li').forEach(el => {
    el.classList.remove('selected', 'correct', 'incorrect');
  });
  document.getElementById("quiz-results").classList.add("hidden");
  document.getElementById("submit-quiz").style.display = "block";
}

// AI Chat with Context
async function askTutor() {
  const question = document.getElementById("question").value;
  const responseBox = document.getElementById("chat-response");

  if (!question.trim()) return;

  const userMessageHTML = `<div class="chat-message user-message"><strong>You:</strong> ${question}</div>`;
  responseBox.innerHTML += userMessageHTML;
  document.getElementById("question").value = "";
  responseBox.scrollTop = responseBox.scrollHeight;

  // Show typing indicator
  const typingHTML = `<div class="chat-message tutor-message" id="typing-indicator"><strong>AI Tutor:</strong> <em>Typing...</em></div>`;
  responseBox.innerHTML += typingHTML;
  responseBox.scrollTop = responseBox.scrollHeight;

  try {
    const topic = sessionStorage.getItem("selectedTopic");
    const userLevel = getUserLevel(topic);
    
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        message: question, 
        topic,
        userLevel,
        context: `User is learning ${topic} at ${userLevel} level.`
      })
    });

    // Remove typing indicator
    document.getElementById("typing-indicator").remove();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const tutorMessageHTML = `<div class="chat-message tutor-message"><strong>AI Tutor:</strong> ${data.reply}</div>`;
    responseBox.innerHTML += tutorMessageHTML;
    
  } catch (error) {
    console.error("Error contacting tutor:", error);
    document.getElementById("typing-indicator").remove();
    
    // Provide helpful offline response
    const offlineResponse = getOfflineTutorResponse(question, sessionStorage.getItem("selectedTopic"));
    const errorMessageHTML = `<div class="chat-message tutor-message"><strong>AI Tutor:</strong> ${offlineResponse}</div>`;
    responseBox.innerHTML += errorMessageHTML;
  }
  
  responseBox.scrollTop = responseBox.scrollHeight;
}

function getOfflineTutorResponse(question, topic) {
  const responses = {
    'English Grammar': "For grammar questions, I recommend focusing on sentence structure and parts of speech. Practice identifying subjects and verbs in sentences!",
    'Basic Coding': "Great question about coding! Start with understanding variables and functions. Try writing small programs to practice the concepts.",
    'Math Basics': "Math is all about practice! Break down complex problems into smaller steps and don't be afraid to work through examples multiple times."
  };
  
  return responses[topic] || "I'm having trouble connecting right now, but keep asking questions - curiosity is key to learning! Try refreshing the page or contact support if the issue persists.";
}

// Mark lesson as complete
function markComplete() {
  const progress = updateUserProgress('lesson');
  const topic = sessionStorage.getItem("selectedTopic");
  
  // Show completion message with progress
  const completionMessage = `
    🎉 Lesson Complete!
    
    Topic: ${topic}
    Total Lessons: ${progress.totalLessons}
    Current Streak: ${progress.currentStreak} days
    
    Keep up the great work!
  `;
  
  alert(completionMessage);
  window.location.href = "dashboard.html";
}

// Parse quiz text (fallback for unstructured responses)
function parseQuizText(quizText) {
  if (!quizText) return [];
  
  const questions = [];
  const lines = quizText.split('\n').filter(line => line.trim());
  
  // Try to parse structured quiz format
  let currentQuestion = null;
  let currentOptions = [];
  
  lines.forEach(line => {
    line = line.trim();
    if (line.includes('?') && !line.startsWith('A.') && !line.startsWith('B.')) {
      if (currentQuestion && currentOptions.length >= 2) {
        questions.push({
          question: currentQuestion,
          options: currentOptions,
          correct: 0 // Default - should be improved with better parsing
        });
      }
      currentQuestion = line;
      currentOptions = [];
    } else if (line.match(/^[A-D]\./) && currentQuestion) {
      currentOptions.push(line.substring(2).trim());
    }
  });
  
  // Add the last question if exists
  if (currentQuestion && currentOptions.length >= 2) {
    questions.push({
      question: currentQuestion,
      options: currentOptions,
      correct: 0
    });
  }
  
  return questions.length > 0 ? questions : [];
}

// Reminder functionality
function setReminder() {
  const time = document.getElementById("reminder-time").value;
  if (!time) {
    alert("Please select a time for your reminder.");
    return;
  }
  
  localStorage.setItem("reminderTime", time);
  document.getElementById("reminder-status").textContent = `✅ Daily reminder set for ${time}`;
  
  // Request notification permission
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        new Notification("Reminder Set!", {
          body: `You'll receive daily study reminders at ${time}`,
          icon: "/favicon.ico"
        });
      }
    });
  }
  
  // Set up daily reminder (simplified version)
  scheduleReminder(time);
}

function scheduleReminder(time) {
  const [hours, minutes] = time.split(':');
  const now = new Date();
  const reminderTime = new Date();
  reminderTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  // If time has passed today, schedule for tomorrow
  if (reminderTime <= now) {
    reminderTime.setDate(reminderTime.getDate() + 1);
  }
  
  const timeUntilReminder = reminderTime - now;
  
  setTimeout(() => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("📚 Study Time!", {
        body: "Time for your daily learning session with AI Micro-Tutor!",
        icon: "/favicon.ico"
      });
    }
    
    // Schedule next day's reminder
    scheduleReminder(time);
  }, timeUntilReminder);
}

// Initialize reminders on load
function initializeReminders() {
  const savedTime = localStorage.getItem("reminderTime");
  if (savedTime) {
    document.getElementById("reminder-time").value = savedTime;
    document.getElementById("reminder-status").textContent = `✅ Daily reminder set for ${savedTime}`;
    scheduleReminder(savedTime);
  }
}

// Enhanced initialization
window.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  
  if (path.includes("lesson.html")) {
    const topic = sessionStorage.getItem("selectedTopic");
    if (topic) {
      fetchLesson(topic);
    } else {
      window.location.href = "dashboard.html";
    }
    
    // Enable Enter key for chat
    const questionInput = document.getElementById("question");
    if (questionInput) {
      questionInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          askTutor();
        }
      });
    }
  }
  
  if (path.includes("dashboard.html")) {
    initializeReminders();
  }
});