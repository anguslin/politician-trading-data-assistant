// Configuration - Automatically detects local development vs production
// For local development: uses http://localhost:3000
// For production: uses your deployed backend URL
const isLocalDevelopment = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1' ||
                           window.location.hostname === '';

const API_BASE_URL = isLocalDevelopment 
    ? 'http://localhost:3000'  // Local backend
    : 'https://politician-trading-data-assistant.onrender.com'; // Production backend (update this to your deployed URL)

const API_KEY = 'VZnKldn7Gw0qm3vSyYTdyQfFoLEBwsjWrQm7famO'; // Must match your backend API_KEY
const USER_ID = 'github-pages-user-' + Math.random().toString(36).substring(7);

// Wait for DOM to be ready
let chatForm, messageInput, sendButton, chatMessages;

// Convert inline bullet points to markdown lists
function convertInlineBulletsToMarkdown(text) {
    // Check if text contains inline bullet points (• on same line)
    // Pattern: text with multiple • symbols on the same line
    const inlineBulletPattern = /([^\n]*•[^\n]*•[^\n]*)/;
    
    if (inlineBulletPattern.test(text)) {
        // Split by bullet points and convert to markdown list
        const lines = text.split('\n');
        const processedLines = lines.map(line => {
            // If line contains multiple bullet points, convert them
            if (line.includes('•') && (line.match(/•/g) || []).length > 1) {
                // Split by bullet point, filter empty, and format as markdown list
                const items = line.split(/•\s*/).filter(item => item.trim().length > 0);
                return items.map(item => `- ${item.trim()}`).join('\n');
            }
            return line;
        });
        return processedLines.join('\n');
    }
    
    return text;
}

// Add message to chat (with markdown support)
function addMessage(content, type = 'assistant') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    // Convert inline bullet points to markdown lists
    let processedContent = convertInlineBulletsToMarkdown(content);
    
    // Render markdown if available, otherwise use plain text
    if (typeof marked !== 'undefined') {
        const rendered = marked.parse(processedContent);
        messageDiv.innerHTML = rendered;
    } else {
        const p = document.createElement('p');
        p.textContent = processedContent;
        messageDiv.appendChild(p);
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return messageDiv;
}

// Add loading message with progress updates
function addLoadingMessage() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message loading';
    
    // Create progress bar container
    const progressBarContainer = document.createElement('div');
    progressBarContainer.className = 'progress-bar-container';
    
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    
    const progressBarFill = document.createElement('div');
    progressBarFill.className = 'progress-bar-fill';
    
    progressBar.appendChild(progressBarFill);
    progressBarContainer.appendChild(progressBar);
    
    // Create text span for status messages
    const textSpan = document.createElement('span');
    textSpan.className = 'loading-text';
    textSpan.textContent = 'Analyzing your question... (This may take up to 45 seconds)';
    
    // Create suggestion text
    const suggestionSpan = document.createElement('span');
    suggestionSpan.className = 'loading-suggestion';
    suggestionSpan.innerHTML = '💡 While waiting, check out <button class="how-it-works-link">How it works</button> to learn more!';
    
    messageDiv.innerHTML = `
        <div class="loading-dots">
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
        </div>
    `;
    messageDiv.appendChild(progressBarContainer);
    messageDiv.appendChild(textSpan);
    messageDiv.appendChild(suggestionSpan);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Animate progress bar over 45 seconds
    const totalDuration = 45000; // 45 seconds
    const startTime = Date.now();
    
    const animateProgress = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / totalDuration) * 100, 100);
        progressBarFill.style.width = `${progress}%`;
        
        if (progress < 100) {
            requestAnimationFrame(animateProgress);
        }
    };
    animateProgress();

    const progressStages = [
        { delay: 0, message: 'Analyzing your question... (This may take up to 45 seconds)' },
        { delay: 20000, message: 'Processing your request... (This may take up to 45 seconds)' }
    ];
    
    progressStages.forEach((stage) => {
        if (stage.delay > 0) {
            setTimeout(() => {
                if (textSpan && textSpan.parentNode) {
                    textSpan.textContent = stage.message;
                }
            }, stage.delay);
        }
    });
    
    // Add click handler for "How it works" button
    const howItWorksBtn = messageDiv.querySelector('.how-it-works-link');
    if (howItWorksBtn) {
        howItWorksBtn.addEventListener('click', () => {
            const architectureBtn = document.getElementById('architecture-btn');
            if (architectureBtn) {
                architectureBtn.click();
            }
        });
    }
    
    // Store reference to text span for easy updates
    messageDiv._textSpan = textSpan;
    messageDiv._progressBarFill = progressBarFill;
    return messageDiv;
}

// Remove loading message
function removeLoadingMessage(loadingDiv) {
    if (loadingDiv && loadingDiv.parentNode) {
        loadingDiv.parentNode.removeChild(loadingDiv);
    }
}

// Send message to backend
async function sendMessage(message) {
    try {
        // Add user message to UI
        addMessage(message, 'user');
        
        // Show loading
        const loadingDiv = addLoadingMessage();
        
        // Make API request
        const response = await fetch(`${API_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY,
                'x-user-id': USER_ID,
            },
            body: JSON.stringify({ message }),
        });

        removeLoadingMessage(loadingDiv);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Display the final analyzed response
        if (data.reply) {
            addMessage(data.reply, 'assistant');
        } else if (data.llmReply) {
            // Fallback for old format
            addMessage(data.llmReply, 'assistant');
        } else {
            addMessage('No response received from the server.', 'assistant');
        }
        
    } catch (error) {
        console.error('Error sending message:', error);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'message error';
        errorDiv.innerHTML = `<p>❌ Error: ${error.message}</p><p style="font-size: 12px; margin-top: 8px;">Make sure your API_BASE_URL and API_KEY are configured correctly.</p>`;
        chatMessages.appendChild(errorDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    chatForm = document.getElementById('chat-form');
    messageInput = document.getElementById('message-input');
    sendButton = document.getElementById('send-button');
    chatMessages = document.getElementById('chat-messages');

    if (!chatForm || !messageInput || !sendButton || !chatMessages) {
        console.error('Failed to find required DOM elements');
        return;
    }

    // Handle form submission
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const message = messageInput.value.trim();
        if (!message) return;
        
        // Disable input while processing
        messageInput.disabled = true;
        sendButton.disabled = true;
        
        await sendMessage(message);
        
        // Re-enable input
        messageInput.disabled = false;
        sendButton.disabled = false;
        messageInput.value = '';
        messageInput.focus();
    });

    // Allow Enter to send (Shift+Enter for new line)
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            chatForm.dispatchEvent(new Event('submit'));
        }
    });

    // Handle clickable examples (works with both li and div elements)
    const exampleItems = document.querySelectorAll('.example-item');
    exampleItems.forEach(item => {
        item.addEventListener('click', () => {
            const exampleText = item.getAttribute('data-example');
            if (exampleText) {
                messageInput.value = exampleText;
                messageInput.focus();
            }
        });
    });

    // Architecture Modal functionality
    const architectureBtn = document.getElementById('architecture-btn');
    const architectureModal = document.getElementById('architecture-modal');
    const architectureClose = document.getElementById('architecture-close');
    const architectureOverlay = architectureModal?.querySelector('.architecture-modal-overlay');

    function openArchitectureModal() {
        if (architectureModal) {
            architectureModal.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        }
    }

    function closeArchitectureModal() {
        if (architectureModal) {
            architectureModal.classList.remove('active');
            document.body.style.overflow = ''; // Restore scrolling
        }
    }

    if (architectureBtn) {
        architectureBtn.addEventListener('click', openArchitectureModal);
    }

    if (architectureClose) {
        architectureClose.addEventListener('click', closeArchitectureModal);
    }

    if (architectureOverlay) {
        architectureOverlay.addEventListener('click', closeArchitectureModal);
    }

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && architectureModal?.classList.contains('active')) {
            closeArchitectureModal();
        }
    });
});
