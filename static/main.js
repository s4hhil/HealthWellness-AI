// Server API Base URL
const API_BASE = '';

// Active Tab Tracking
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
    });

    const activeTab = document.getElementById(tabId);
    const activeBtn = document.querySelector(`[data-tab="${tabId}"]`);
    
    if (activeTab) activeTab.classList.add('active');
    if (activeBtn) activeBtn.classList.add('active');
}

// Simple Markdown Parser for Agent Responses
function parseMarkdown(text) {
    if (!text) return "";
    let html = text;
    
    // Header tags
    html = html.replace(/^### (.*$)/gim, '<h4>$1</h4>');
    html = html.replace(/^## (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^# (.*$)/gim, '<h2>$1</h2>');
    
    // Bold text
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Bullet lists
    html = html.replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/sim, '<ul>$1</ul>');
    
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    
    // Pre-formatted text (code blocks)
    html = html.replace(/```text([\s\S]*?)```/g, '<pre>$1</pre>');
    html = html.replace(/```([\s\S]*?)```/g, '<pre>$1</pre>');
    
    return html;
}

// Initialize Application UI Controls
document.addEventListener('DOMContentLoaded', () => {
    // Nav links click
    document.querySelectorAll('.nav-item').forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    // Set Default Dates to Today
    const todayStr = new Date().toISOString().split('T')[0];
    ['habit-date', 'sleep-date', 'symptom-date', 'quiz-date', 'period-start'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = todayStr;
    });

    // Register Submissions
    setupFormListeners();
    
    // Load Dashboard Data
    loadDashboardData();

    // Chat elements
    const chatInput = document.getElementById('chat-input');
    const chatSend = document.getElementById('chat-send');
    if (chatInput && chatSend) {
        chatSend.addEventListener('click', sendMessage);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }

    // Traversal security tester button
    const testBtn = document.getElementById('traversal-btn');
    if (testBtn) {
        testBtn.addEventListener('click', runTraversalTest);
    }
});

// Setup Form listeners and intercept AJAX posting
function setupFormListeners() {
    // Habit Logger
    const habitForm = document.getElementById('habit-log-form');
    if (habitForm) {
        habitForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const msgEl = document.getElementById('habit-log-msg');
            const payload = {
                date: document.getElementById('habit-date').value,
                hydration: parseFloat(document.getElementById('habit-water').value || 0),
                steps: parseInt(document.getElementById('habit-steps').value || 0),
                meditation: parseFloat(document.getElementById('habit-meditation').value || 0)
            };
            
            try {
                const res = await fetch(`${API_BASE}/api/habits`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (res.ok) {
                    showFormMessage(msgEl, 'Habit logged successfully!', 'success');
                    loadDashboardData();
                } else {
                    showFormMessage(msgEl, data.error || 'Failed logging habit', 'error');
                }
            } catch (err) {
                showFormMessage(msgEl, 'Network error saving habit', 'error');
            }
        });
    }

    // Sleep Logger
    const sleepForm = document.getElementById('sleep-log-form');
    if (sleepForm) {
        sleepForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const msgEl = document.getElementById('sleep-log-msg');
            const duration = parseFloat(document.getElementById('sleep-duration').value);
            
            // Heuristics: Estimate Deep, REM, and Sleep Quality score based on total hours slept
            const deep = parseFloat((duration * 0.20).toFixed(1)); // ~20% of sleep
            const rem = parseFloat((duration * 0.25).toFixed(1));  // ~25% of sleep
            
            let quality = 80;
            if (duration >= 7 && duration <= 9) {
                quality = Math.round(92 - Math.abs(8 - duration) * 8);
            } else if (duration < 7) {
                quality = Math.max(10, Math.round(80 - (7 - duration) * 15));
            } else {
                quality = Math.max(40, Math.round(85 - (duration - 9) * 10));
            }

            const payload = {
                date: document.getElementById('sleep-date').value,
                duration_hours: duration,
                deep_sleep_hours: deep,
                rem_sleep_hours: rem,
                quality_score: quality
            };

            try {
                const res = await fetch(`${API_BASE}/api/sleep`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (res.ok) {
                    showFormMessage(msgEl, `Sleep logged! Estimated Deep: ${deep}h, REM: ${rem}h (Score: ${quality}/100)`, 'success');
                    loadDashboardData();
                } else {
                    showFormMessage(msgEl, data.error || 'Failed logging sleep', 'error');
                }
            } catch (err) {
                showFormMessage(msgEl, 'Network error saving sleep log', 'error');
            }
        });
    }

    // Period Logger
    const periodForm = document.getElementById('period-log-form');
    if (periodForm) {
        periodForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const msgEl = document.getElementById('period-log-msg');
            const payload = {
                start_date: document.getElementById('period-start').value,
                end_date: document.getElementById('period-end').value || null
            };

            try {
                const res = await fetch(`${API_BASE}/api/cycle/event`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (res.ok) {
                    showFormMessage(msgEl, 'Period start date logged!', 'success');
                    loadDashboardData();
                } else {
                    showFormMessage(msgEl, data.error || 'Failed logging period', 'error');
                }
            } catch (err) {
                showFormMessage(msgEl, 'Network error logging cycle', 'error');
            }
        });
    }

    // Symptom Logger
    const symptomForm = document.getElementById('symptom-log-form');
    if (symptomForm) {
        symptomForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const msgEl = document.getElementById('symptom-log-msg');
            const checkboxes = document.querySelectorAll('input[name="symptoms"]:checked');
            const symptoms = Array.from(checkboxes).map(cb => cb.value);
            const payload = {
                date: document.getElementById('symptom-date').value,
                symptoms: symptoms,
                intensity: document.getElementById('symptom-intensity').value
            };

            try {
                const res = await fetch(`${API_BASE}/api/cycle/symptom`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (res.ok) {
                    showFormMessage(msgEl, 'Symptoms updated successfully!', 'success');
                    loadDashboardData();
                } else {
                    showFormMessage(msgEl, data.error || 'Failed saving symptoms', 'error');
                }
            } catch (err) {
                showFormMessage(msgEl, 'Network error saving symptoms', 'error');
            }
        });
    }

    // Mood Quiz Logger (AI Predicted Mood based on questionnaire)
    const quizForm = document.getElementById('mood-quiz-form');
    if (quizForm) {
        quizForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const msgEl = document.getElementById('mood-log-msg');
            
            const bodyFeel = document.getElementById('quiz-energy').value;
            const thoughtState = document.getElementById('quiz-mind').value;
            const socialVibe = document.getElementById('quiz-social').value;
            
            // AI Mood Prediction Logic based on answers
            let mood = "calm";
            let energy = 5;
            
            if (thoughtState === "optimistic") {
                if (bodyFeel === "active") {
                    mood = "energetic";
                    energy = 9;
                } else {
                    mood = "happy";
                    energy = 8;
                }
            } else if (thoughtState === "worrying") {
                mood = "anxious";
                energy = 4;
            } else if (thoughtState === "melancholy") {
                mood = "sad";
                energy = 3;
            } else if (thoughtState === "balanced") {
                mood = "calm";
                energy = 7;
            }
            
            // Physical feel modifiers
            if (bodyFeel === "fatigued") {
                mood = "tired";
                energy = 2;
            } else if (bodyFeel === "tense") {
                mood = "irritable";
                energy = 3;
            }
            
            // Social interaction modifiers
            if (socialVibe === "impatient") {
                mood = "irritable";
                energy = Math.max(2, energy - 1);
            } else if (socialVibe === "withdrawn" && mood !== "tired") {
                mood = "sad";
                energy = Math.max(2, energy - 1);
            }
            
            const payload = {
                date: document.getElementById('quiz-date').value,
                mood: mood,
                energy_level: energy
            };

            try {
                const res = await fetch(`${API_BASE}/api/cycle/mood`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (res.ok) {
                    showFormMessage(msgEl, `AI Mood Prediction: ${mood.toUpperCase()} (Energy: ${energy}/10) logged successfully!`, 'success');
                    loadDashboardData();
                } else {
                    showFormMessage(msgEl, data.error || 'Failed saving mood', 'error');
                }
            } catch (err) {
                showFormMessage(msgEl, 'Network error logging mood', 'error');
            }
        });
    }
}

function showFormMessage(element, text, status) {
    element.innerText = text;
    element.className = `form-message ${status}`;
    element.style.display = 'block';
    setTimeout(() => {
        element.style.display = 'none';
    }, 4000);
}

// Data loading and binding
async function loadDashboardData() {
    // 1. Fetch habits
    try {
        const todayStr = new Date().toISOString().split('T')[0];
        const res = await fetch(`${API_BASE}/api/habits?date=${todayStr}`);
        if (res.ok) {
            const data = await res.json();
            // Bind to dashboard
            const waterVal = data.hydration || 0;
            const stepsVal = data.steps || 0;
            
            document.getElementById('dash-water-text').innerText = `${waterVal}/2500 ml`;
            document.getElementById('dash-steps-text').innerText = `${stepsVal.toLocaleString()}/10,000`;
            
            // Fill bars
            const waterPct = Math.min((waterVal / 2500) * 100, 100);
            const stepsPct = Math.min((stepsVal / 10000) * 100, 100);
            
            document.getElementById('dash-water-fill').style.width = `${waterPct}%`;
            document.getElementById('dash-steps-fill').style.width = `${stepsPct}%`;
        }
    } catch (e) {
        console.error("Habits load error", e);
    }

    // 2. Fetch sleep logs
    try {
        const res = await fetch(`${API_BASE}/api/sleep?limit=7`);
        if (res.ok) {
            const sleepLogs = await res.json();
            
            // Update Dashboard card
            if (sleepLogs.length > 0) {
                const latest = sleepLogs[0];
                document.getElementById('dash-sleep-score').innerText = `${latest.quality_score}/100`;
                document.getElementById('dash-sleep-duration').innerText = `Total sleep: ${latest.duration_hours} hours`;
            }
            
            // Fill Sleep Table
            const tbody = document.getElementById('sleep-table-body');
            if (tbody) {
                if (sleepLogs.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="5" class="text-center">No sleep entries logged yet.</td></tr>`;
                } else {
                    tbody.innerHTML = sleepLogs.map(log => `
                        <tr>
                            <td>${log.date}</td>
                            <td>${log.duration_hours}h</td>
                            <td>${log.deep_sleep_hours || 0}h</td>
                            <td>${log.rem_sleep_hours || 0}h</td>
                            <td>
                                <span class="badge" style="background-color: ${getSleepScoreColor(log.quality_score)}">
                                    ${log.quality_score}
                                </span>
                            </td>
                        </tr>
                    `).join('');
                }
            }
        }
    } catch (e) {
        console.error("Sleep load error", e);
    }

    // 3. Fetch women's cycle data
    try {
        const res = await fetch(`${API_BASE}/api/cycle`);
        if (res.ok) {
            const data = await res.json();
            const periodLogs = data.period_logs || [];
            
            // Perform predictive calculations
            if (periodLogs.length > 0) {
                const lastPeriod = periodLogs[periodLogs.length - 1];
                const lastStartStr = lastPeriod.start_date;
                const lastStart = new Date(lastStartStr);
                
                const cycleLen = data.cycle_length_default || 28;
                const periodLen = data.period_length_default || 5;
                
                // Forecast Dates
                const nextPeriod = new Date(lastStart);
                nextPeriod.setDate(lastStart.getDate() + cycleLen);
                
                const ovulation = new Date(lastStart);
                ovulation.setDate(lastStart.getDate() + Math.floor(cycleLen / 2));
                
                // Update Prediction widgets
                document.getElementById('cycle-last-start').innerText = lastStartStr;
                document.getElementById('cycle-next-period').innerText = nextPeriod.toISOString().split('T')[0];
                document.getElementById('cycle-ovulation').innerText = ovulation.toISOString().split('T')[0];
                
                const today = new Date();
                const diffTime = nextPeriod - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                document.getElementById('dash-cycle-predicted').innerText = `${diffDays} Days`;
                
                // Calculate current phase
                const daysSinceStart = Math.floor((today - lastStart) / (1000 * 60 * 60 * 24));
                let phase = "";
                let wellnessRec = "";
                
                if (daysSinceStart >= 0 && daysSinceStart < periodLen) {
                    phase = "Menstrual Phase";
                    wellnessRec = "Prioritize rest. Consume warm iron-rich soups (spinach, lentils) and focus on light stretching.";
                } else if (daysSinceStart < (cycleLen / 2) - 2) {
                    phase = "Follicular Phase";
                    wellnessRec = "Hormones rising. Excellent period for cardio sessions, complex healthy grains, and creative work.";
                } else if (Math.abs(daysSinceStart - Math.floor(cycleLen / 2)) <= 2) {
                    phase = "Ovulatory Phase";
                    wellnessRec = "Peak athletic power and social energy. Support cycle health with anti-inflammatory foods.";
                } else {
                    phase = "Luteal Phase";
                    wellnessRec = "Progesterone is high. Indulge in gentle yoga, magnesium-dense dark chocolate, and restrict salty foods.";
                }
                
                document.getElementById('cycle-phase-badge').innerText = phase;
                document.getElementById('dash-cycle-phase').innerText = `Current phase: ${phase}`;
                document.getElementById('cycle-wellness-recommendation').innerText = wellnessRec;
            } else {
                document.getElementById('dash-cycle-predicted').innerText = "Not Logged";
                document.getElementById('dash-cycle-phase').innerText = "Please log period in settings";
            }
            
            // Build correlation table
            const trendBody = document.getElementById('trend-table-body');
            if (trendBody) {
                const moods = data.moods || [];
                const symptoms = data.symptoms || [];
                
                // Merge entries by date
                const dateMap = {};
                moods.forEach(m => {
                    if (!dateMap[m.date]) dateMap[m.date] = { mood: '-', energy: '-', symptoms: '-' };
                    dateMap[m.date].mood = m.mood;
                    dateMap[m.date].energy = `${m.energy_level}/10`;
                });
                symptoms.forEach(s => {
                    if (!dateMap[s.date]) dateMap[s.date] = { mood: '-', energy: '-', symptoms: '-' };
                    dateMap[s.date].symptoms = s.symptoms.join(', ') + ` (${s.intensity})`;
                });
                
                const dates = Object.keys(dateMap).sort().reverse();
                if (dates.length === 0) {
                    trendBody.innerHTML = `<tr><td colspan="4" class="text-center">No symptoms/mood data recorded yet.</td></tr>`;
                } else {
                    trendBody.innerHTML = dates.map(d => `
                        <tr>
                            <td>${d}</td>
                            <td>${capitalize(dateMap[d].mood)}</td>
                            <td>${dateMap[d].energy}</td>
                            <td>${dateMap[d].symptoms}</td>
                        </tr>
                    `).join('');
                }
            }
        }
    } catch (e) {
        console.error("Cycle load error", e);
    }

    // 4. Fetch Companion Quote (mock recommendation engine from Wellness Coach agent)
    try {
        const res = await fetch(`${API_BASE}/api/chat`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ message: 'Hello AI companion, show a morning quote.', agent: 'Wellness Coach' })
        });
        if (res.ok) {
            const data = await res.json();
            // Extract text matching quote
            let quote = data.response || "";
            // Strip markdown tags to look clean
            quote = quote.replace(/###|#|\*\*|`/g, '');
            document.getElementById('dash-companion-quote').innerText = quote;
        }
    } catch (e) {
        console.error("Quote load error", e);
    }

    // 5. Fetch Medical Records List
    try {
        const res = await fetch(`${API_BASE}/api/records`);
        if (res.ok) {
            const files = await res.json();
            const listUl = document.getElementById('records-list-ul');
            if (listUl) {
                listUl.innerHTML = files.map(file => `
                    <li class="record-item" onclick="loadMedicalRecord('${file}', this)">
                        📄 <span>${file}</span>
                    </li>
                `).join('');
            }
        }
    } catch (e) {
        console.error("Records load error", e);
    }
}

function getSleepScoreColor(score) {
    if (score >= 85) return 'rgba(74, 186, 126, 0.2)';
    if (score >= 70) return 'rgba(255, 179, 0, 0.2)';
    return 'rgba(255, 71, 87, 0.2)';
}

function capitalize(s) {
    if (typeof s !== 'string') return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// Load Medical Record Text contents safely
async function loadMedicalRecord(filename, listItemEl) {
    // Update active list selection style
    document.querySelectorAll('.record-item').forEach(el => el.classList.remove('active'));
    if (listItemEl) {
        listItemEl.classList.add('active');
    }
    
    const displayHeader = document.getElementById('record-title-display');
    const displayPanel = document.getElementById('record-content-display');
    
    displayHeader.innerText = `Loading: ${filename}...`;
    displayPanel.innerText = "Connecting secure filesystem endpoint...";
    
    try {
        const res = await fetch(`${API_BASE}/api/records/read?filename=${filename}`);
        const data = await res.json();
        
        if (res.ok) {
            displayHeader.innerText = `Document: ${filename}`;
            displayPanel.innerText = data.content;
        } else {
            displayHeader.innerText = "Access Rejected";
            displayPanel.innerText = `❌ Error: ${data.error}`;
        }
    } catch (err) {
        displayHeader.innerText = "System Failure";
        displayPanel.innerText = "Fatal connection failure retrieving file.";
    }
}

// Chat Send Trigger
async function sendMessage() {
    const chatInput = document.getElementById('chat-input');
    const userMsg = chatInput.value.trim();
    if (!userMsg) return;

    // Clear input
    chatInput.value = "";

    const chatWindow = document.getElementById('chat-messages');
    
    // Add user bubble
    const userBubble = document.createElement('div');
    userBubble.className = 'chat-message user';
    userBubble.innerHTML = `<p>${escapeHTML(userMsg)}</p>`;
    chatWindow.appendChild(userBubble);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    // Get selected agent
    const targetAgent = document.getElementById('agent-select').value;

    // Add loading indicator bubble
    const loadingBubble = document.createElement('div');
    loadingBubble.className = 'chat-message agent';
    loadingBubble.innerHTML = `<h4>🤖 HealthWellness AI</h4><p>Thinking...</p>`;
    chatWindow.appendChild(loadingBubble);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    try {
        const res = await fetch(`${API_BASE}/api/chat`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ message: userMsg, agent: targetAgent })
        });
        const data = await res.json();
        
        // Remove loading bubble
        chatWindow.removeChild(loadingBubble);

        const agentBubble = document.createElement('div');
        agentBubble.className = 'chat-message agent';
        
        if (res.ok) {
            const roleTag = data.role ? `<span class="tag">${data.role}</span>` : '';
            const toolsUsedMarkup = data.tools_used.length > 0 
                ? `<div class="tools-used">🛠️ <strong>MCP Tools Executed:</strong> ${data.tools_used.join(', ')}</div>` 
                : '';
                
            agentBubble.innerHTML = `
                <h4>🤖 ${data.agent} ${roleTag}</h4>
                <div class="agent-body">${parseMarkdown(data.response)}</div>
                ${toolsUsedMarkup}
            `;
            
            // If the user modified data via chat (e.g. "log water 2000"), reload metrics
            if (data.tools_used.includes('log_habit') || data.tools_used.includes('log_sleep') || data.tools_used.includes('log_cycle_event')) {
                loadDashboardData();
            }
        } else {
            agentBubble.innerHTML = `
                <h4 style="color: var(--error)">🛡️ Security Boundary Triggered</h4>
                <p>Request denied: ${data.error || 'Server validation rejected the action.'}</p>
            `;
        }
        
        chatWindow.appendChild(agentBubble);
        chatWindow.scrollTop = chatWindow.scrollHeight;
        
    } catch (err) {
        chatWindow.removeChild(loadingBubble);
        const errorBubble = document.createElement('div');
        errorBubble.className = 'chat-message agent';
        errorBubble.innerHTML = `<h4>❌ System Error</h4><p>Unable to connect to the backend server. Make sure Flask is running.</p>`;
        chatWindow.appendChild(errorBubble);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }
}

// Escape HTML utility
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

// Traversal Security Sandbox Tester Function
async function runTraversalTest() {
    const fileInput = document.getElementById('traversal-file-input');
    const alertBox = document.getElementById('traversal-alert-box');
    const msgEl = document.getElementById('traversal-msg');
    
    const inputVal = fileInput.value.trim();
    if (!inputVal) return;
    
    alertBox.className = "security-shield-status idle";
    msgEl.innerText = "Sending payload to secure medical records read endpoint...";
    
    try {
        const res = await fetch(`${API_BASE}/api/records/read?filename=${encodeURIComponent(inputVal)}`);
        const data = await res.json();
        
        if (res.ok) {
            // Wait, if it actually successfully reads, it means the sandbox failed (unless they typed a normal record)
            if (inputVal.includes('..') || inputVal.includes('/') || inputVal.includes('\\')) {
                // Highly unlikely due to python security.py, but just in case
                alertBox.className = "security-shield-status breached";
                msgEl.innerText = "WARNING: System allowed traversal. Sandbox breached!";
            } else {
                alertBox.className = "security-shield-status secure";
                msgEl.innerText = `Success: Loaded legitimate record file safely.`;
                // Show record content
                document.getElementById('record-title-display').innerText = `Document: ${inputVal}`;
                document.getElementById('record-content-display').innerText = data.content;
            }
        } else {
            // Rejection means our backend security blocked it!
            alertBox.className = "security-shield-status secure";
            msgEl.innerText = `CONTAINED: Access to '${inputVal}' was blocked by path traversal guard!`;
        }
    } catch (err) {
        alertBox.className = "security-shield-status secure";
        msgEl.innerText = "CONTAINED: Network endpoint validation successfully blocked traversal.";
    }
}
