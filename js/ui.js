function fillExam(name) {
  document.getElementById('examInput').value = name;
}

function goBack() {
  STATE.isBuildingDashboard = false;
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('loader').style.display = 'none';
  document.getElementById('landing').style.display = 'flex';
  document.getElementById('examInput').value = STATE.exam;
  STATE.chatHistory = [];
  // Reset loader steps
  ['lstep0','lstep1','lstep2','lstep3'].forEach(id => {
    const el = document.getElementById(id);
    el.classList.remove('active','done');
    el.querySelector('.step-icon').textContent = ['🔍','📚','🎯','✅'][['lstep0','lstep1','lstep2','lstep3'].indexOf(id)];
  });
  document.getElementById('loaderBar').style.width = '0%';
}

/* ============================================================
   LANDING → LOADER → DASHBOARD
   ============================================================ */
async function startPrep() {
  console.log('Start Prep clicked');
  if (STATE.isBuildingDashboard) {
    console.log('startPrep blocked: dashboard build already in progress');
    return;
  }
  const exam = document.getElementById('examInput').value.trim();
  if (!exam) { alert('Please enter an exam name!'); return; }

  STATE.isBuildingDashboard = true;

  STATE.exam = exam;
  STATE.topics = [];
  STATE.questions = [];
  STATE.score = { total: 0, correct: 0 };
  STATE.topicStats = {};
  STATE.chatHistory = [];

  // Show loader
  document.getElementById('landing').style.display = 'none';
  const loader = document.getElementById('loader');
  loader.style.display = 'flex';
  document.getElementById('loaderExamName').textContent = exam;

  // Reset loader steps
  const emojis = ['🔍','📚','🎯','✅'];
  const steps = ['lstep0', 'lstep1', 'lstep2', 'lstep3'];
  steps.forEach((id, i) => {
    const el = document.getElementById(id);
    el.classList.remove('active','done');
    el.querySelector('.step-icon').textContent = emojis[i];
  });
  const bar = document.getElementById('loaderBar');
  bar.style.width = '0%';

  // Animate steps sequentially
  const stepDelay = [0, 900, 1800, 2600];
  steps.forEach((id, i) => {
    setTimeout(() => {
      if (i > 0) {
        const prev = document.getElementById(steps[i-1]);
        prev.classList.remove('active');
        prev.classList.add('done');
        prev.querySelector('.step-icon').textContent = '✅';
      }
      document.getElementById(id).classList.add('active');
      bar.style.width = ((i + 1) / steps.length * 100) + '%';
    }, stepDelay[i]);
  });

  // Fetch overview from Claude
  try {
    console.log('Calling API...', { exam, model: MODEL, api: API_BASE });
    const raw = await aiAPI([{
      role: 'user',
      content: `Give me a complete exam overview for "${exam}" in JSON format ONLY (no extra text, no markdown). JSON structure:
{
  "fullName": "full exam name",
  "conducting": "conducting body",
  "frequency": "once/twice a year etc",
  "duration": "exam duration",
  "totalMarks": "total marks",
  "difficulty": "Easy/Moderate/Hard",
  "topics": ["topic1", "topic2", ...up to 12 topics],
  "strategy": "3-4 sentences on the best preparation strategy",
  "timePlan": "Week-wise study plan covering major topics and revision in 4-6 bullet points separated by newlines",
  "importantPoints": ["key point 1", "key point 2", "key point 3"],
  "sectionWise": [{"section":"Section Name","marks":"XX","questions":"XX"}]
}`
    }], '', 1500);

    let overview;
    try {
      overview = extractJSON(raw);
    } catch(e) {
      // Fallback minimal overview
      overview = {
        fullName: exam,
        conducting: 'Various',
        frequency: 'Yearly',
        duration: '3 Hours',
        totalMarks: '100',
        difficulty: 'Moderate',
        topics: ['Quantitative Aptitude', 'Verbal Ability', 'Logical Reasoning', 'General Knowledge', 'Technical/Domain'],
        strategy: 'Focus on high-weightage topics first. Practice previous year papers regularly. Revise formulas and shortcuts daily.',
        timePlan: '• Week 1-2: Cover core topics\n• Week 3-4: Practice questions\n• Week 5-6: Mock tests\n• Week 7: Revision & weak areas\n• Week 8: Full mock tests & analysis',
        importantPoints: ['Regular mock tests are essential', 'Time management is key', 'Focus on accuracy first then speed'],
        sectionWise: []
      };
    }

    STATE.overview = overview;
    STATE.topics = overview.topics || [];
    STATE.selectedTopic = STATE.topics[0] || '';
    
    saveState();

    // Show dashboard after loading animation completes
    setTimeout(() => {
      loader.style.display = 'none';
      const dash = document.getElementById('dashboard');
      dash.style.display = 'flex';
      renderOverview(overview);
      renderPracticeTopics();
      renderTeachTopics();
      document.getElementById('topbarExam').textContent = '📝 ' + (overview.fullName || exam);
      document.getElementById('chatWelcomeMsg').textContent = `Hi! I'm your PrepMind AI tutor specialised in ${overview.fullName || exam}. Ask me anything — concepts, shortcuts, exam strategy, previous year patterns, or any doubts!`;
      renderProgress();
      switchTab(0);
      STATE.isBuildingDashboard = false;
    }, 3200);

  } catch(err) {
    STATE.isBuildingDashboard = false;
    setTimeout(() => {
      loader.style.display = 'none';
      document.getElementById('landing').style.display = 'flex';
      alert('Error: ' + err.message + '\n\nPlease check your API connection.');
      STATE.isBuildingDashboard = false;
    }, 3200);
  }
}

/* ============================================================
   TABS
   ============================================================ */
function switchTab(idx) {
  document.querySelectorAll('.tab-btn').forEach((b, i) => b.classList.toggle('active', i === idx));
  document.querySelectorAll('.tab-panel').forEach((p, i) => p.classList.toggle('active', i === idx));
  if (idx === 4) renderProgress();
}

/* ============================================================
   TAB 1 - OVERVIEW
   ============================================================ */
function renderOverview(ov) {
  document.getElementById('overviewTitle').textContent = ov.fullName || STATE.exam;
  document.getElementById('overviewSub').textContent = ov.conducting ? `Conducted by ${ov.conducting}` : '';

  // Meta items
  const metaItems = [
    { val: ov.duration || '—', lbl: 'Duration' },
    { val: ov.totalMarks || '—', lbl: 'Total Marks' },
    { val: ov.difficulty || '—', lbl: 'Difficulty' },
    { val: ov.frequency || '—', lbl: 'Frequency' }
  ];
  document.getElementById('overviewMeta').innerHTML = metaItems.map(m =>
    `<div class="meta-item"><div class="meta-val">${escapeHtml(m.val)}</div><div class="meta-lbl">${escapeHtml(m.lbl)}</div></div>`
  ).join('');

  // Grid cards
  const grid = document.getElementById('overviewGrid');
  let gridHtml = '';

  if (ov.sectionWise && ov.sectionWise.length > 0) {
    gridHtml += `<div class="card" style="margin-bottom:0">
      <div class="card-title"><div class="icon">📊</div> Section Breakdown</div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr style="border-bottom:1px solid var(--border)">
          <th style="text-align:left;padding:6px 0;color:var(--text3);font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Section</th>
          <th style="text-align:center;padding:6px 0;color:var(--text3);font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Qs</th>
          <th style="text-align:center;padding:6px 0;color:var(--text3);font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Marks</th>
        </tr>
        ${ov.sectionWise.map(s => `
          <tr style="border-bottom:1px solid rgba(30,30,46,0.4)">
            <td style="padding:8px 0;color:var(--text2)">${s.section}</td>
            <td style="text-align:center;color:var(--accent);font-weight:600">${s.questions || '—'}</td>
            <td style="text-align:center;color:var(--text2)">${s.marks || '—'}</td>
          </tr>`).join('')}
      </table>
    </div>`;
  }

  if (ov.importantPoints && ov.importantPoints.length > 0) {
    gridHtml += `<div class="card" style="margin-bottom:0">
      <div class="card-title"><div class="icon">💡</div> Key Points</div>
      ${ov.importantPoints.map(p => `
        <div style="display:flex;gap:8px;margin-bottom:10px;font-size:13px;line-height:1.5;color:var(--text2)">
          <span style="color:var(--accent);flex-shrink:0;margin-top:1px">→</span> ${p}
        </div>`).join('')}
    </div>`;
  }

  grid.innerHTML = gridHtml;

  // Syllabus chips
  document.getElementById('syllabusChips').innerHTML = (ov.topics || []).map(t =>
    `<span class="chip" onclick="jumpToPractice('${t.replace(/'/g,"\\'")}')">📌 ${t}</span>`
  ).join('');

  document.getElementById('strategyText').textContent = ov.strategy || '';
  document.getElementById('timePlanText').textContent = ov.timePlan || '';
}

function jumpToPractice(topic) {
  STATE.selectedTopic = topic;
  switchTab(1);
  // Highlight chip in practice tab
  setTimeout(() => {
    document.querySelectorAll('#practiceTopicChips .chip').forEach(c => {
      c.classList.toggle('active', c.textContent.trim() === topic);
    });
  }, 100);
}

/* ============================================================
   TAB 2 - PRACTICE
   ============================================================ */
function renderPracticeTopics() {
  const wrap = document.getElementById('practiceTopicChips');
  wrap.innerHTML = STATE.topics.map(t =>
    `<span class="chip${t === STATE.selectedTopic ? ' active' : ''}" onclick="selectTopic(this,'${t.replace(/'/g,"\\'")}')">
      ${t}
    </span>`
  ).join('');
}

function selectTopic(el, topic) {
  STATE.selectedTopic = topic;
  document.querySelectorAll('#practiceTopicChips .chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

function setDiff(diff, el) {
  STATE.selectedDiff = diff;
  document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

async function generateQuestions() {
  console.log('Generate Questions clicked');
  if (STATE.generatingQ) return;
  if (!STATE.selectedTopic) { alert('Please select a topic first!'); return; }

  STATE.generatingQ = true;
  const btn = document.getElementById('genBtn');
  btn.disabled = true;
  btn.innerHTML = '<div class="ai-dots"><span></span><span></span><span></span></div> Generating…';

  const container = document.getElementById('questionsContainer');
  container.innerHTML = `<div class="ai-loading"><div class="ai-dots"><span></span><span></span><span></span></div> AI is crafting ${STATE.selectedDiff} questions on "${STATE.selectedTopic}"…</div>`;

  try {
    console.log('Calling API for questions...', { topic: STATE.selectedTopic, diff: STATE.selectedDiff, model: MODEL });
    const raw = await aiAPI([{
      role: 'user',
      content: `Generate exactly 3 multiple-choice questions for ${STATE.exam} exam.
Topic: ${STATE.selectedTopic}
Difficulty: ${STATE.selectedDiff}

Return ONLY valid JSON array (no markdown, no extra text):
[
  {
    "question": "full question text",
    "options": ["A option text", "B option text", "C option text", "D option text"],
    "correct": 0,
    "explanation": "Detailed explanation of why the correct answer is right",
    "trick": "Memory shortcut or quick trick to solve this type of question"
  }
]`
    }], '', 1800);

    let qs;
    try {
      qs = extractJSON(raw);
    } catch(e) {
      throw new Error('Could not parse questions from AI response. Try again.');
    }

    STATE.questions = qs;
    renderQuestions(qs);
  } catch(err) {
    container.innerHTML = `<div class="card" style="border-color:var(--red);text-align:center;padding:30px;color:var(--red)">
      ⚠️ ${err.message}<br><br><button class="next-q-btn" onclick="generateQuestions()" style="margin:0 auto">Retry</button>
    </div>`;
  }

  STATE.generatingQ = false;
  btn.disabled = false;
  btn.innerHTML = '⚡ Generate Questions';
}

function renderQuestions(qs) {
  const diffLabel = STATE.selectedDiff;
  const container = document.getElementById('questionsContainer');
  container.innerHTML = qs.map((q, i) => buildMCQCard(q, i, diffLabel)).join('');
}

function buildMCQCard(q, idx, diff) {
  const letters = ['A', 'B', 'C', 'D'];
  const question = escapeHtml(q.question || '');
  const opts = (q.options || []).map(o => escapeHtml(o || ''));
  const expl = escapeHtml(q.explanation || '');
  const trick = escapeHtml(q.trick || '');
  return `
  <div class="mcq-card" id="mcq-${idx}">
    <div class="mcq-meta">
      <span class="mcq-badge ${diff}">${diff.charAt(0).toUpperCase()+diff.slice(1)}</span>
      <span style="background:var(--accent-dim);border:1px solid rgba(232,255,90,0.15);border-radius:100px;padding:2px 10px;font-size:11px;color:var(--accent);font-weight:600">${STATE.selectedTopic}</span>
      <span class="mcq-num">Q${idx + 1}</span>
    </div>
    <div class="mcq-q">${question}</div>
    <div class="options-grid">
      ${opts.map((opt, oi) => `
        <button class="option-btn" id="opt-${idx}-${oi}" onclick="selectOption(${idx}, ${oi})">
          <span class="opt-letter">${letters[oi]}</span>
          <span>${opt}</span>
        </button>
      `).join('')}
    </div>
    <div id="expl-${idx}" style="display:none">
      <div class="explanation-box">📚 ${expl}</div>
      <div class="trick-box"><div class="trick-label">⚡ Quick Trick</div>${trick}</div>
      <button class="next-q-btn" onclick="nextQuestion(${idx})">Next Question →</button>
    </div>
  </div>`;
}

function selectOption(qIdx, optIdx) {
  const q = STATE.questions[qIdx];
  if (!q) return;

  // Disable all options
  for (let i = 0; i < q.options.length; i++) {
    const btn = document.getElementById(`opt-${qIdx}-${i}`);
    if (btn) {
      btn.disabled = true;
      if (i === q.correct) btn.classList.add('correct');
      else if (i === optIdx && i !== q.correct) btn.classList.add('wrong');
    }
  }

  // Show explanation
  document.getElementById(`expl-${qIdx}`).style.display = 'block';

  // Update stats
  STATE.score.total++;
  const isCorrect = optIdx === q.correct;
  if (isCorrect) STATE.score.correct++;

  const topic = STATE.selectedTopic;
  if (!STATE.topicStats[topic]) STATE.topicStats[topic] = { total: 0, correct: 0 };
  STATE.topicStats[topic].total++;
  if (isCorrect) STATE.topicStats[topic].correct++;
  
  saveState();
}

function nextQuestion(currentIdx) {
  const mcq = document.getElementById(`mcq-${currentIdx}`);
  if (mcq) mcq.style.opacity = '0.5';
  // If last question, generate more
  if (currentIdx === STATE.questions.length - 1) {
    generateQuestions();
  }
}

/* ============================================================
   TAB 3 - TEACH ME
   ============================================================ */
function renderTeachTopics() {
  const wrap = document.getElementById('teachTopics');
  wrap.innerHTML = STATE.topics.map((topic, i) => `
    <div class="topic-accordion" id="tacc-${i}">
      <div class="topic-header" onclick="toggleTeach(${i},'${topic.replace(/'/g,"\\'")}')">
        <div class="topic-name">
          <span style="font-size:18px">${getTopicEmoji(topic)}</span> ${topic}
        </div>
        <span class="topic-arrow">▶</span>
      </div>
      <div class="topic-body">
        <div class="topic-content" id="tcontent-${i}">
          <button class="topic-learn-btn" id="tlearnbtn-${i}" onclick="learnTopic(${i},'${topic.replace(/'/g,"\\'")}')">
            🧠 Learn ${topic}
          </button>
          <div id="ttext-${i}"></div>
        </div>
      </div>
    </div>
  `).join('');
}

function getTopicEmoji(topic) {
  const map = {
    'math':'🔢','quant':'🔢','aptitude':'🔢','numerical':'🔢',
    'verbal':'📝','english':'📝','grammar':'📝','vocabulary':'📝','reading':'📝',
    'logic':'🧩','reasoning':'🧩','analytical':'🧩',
    'general':'🌍','gk':'🌍','awareness':'🌍','current':'🌍',
    'physics':'⚛️','chemistry':'🧪','biology':'🧬',
    'data':'📊','statistics':'📊','probability':'📊',
    'programming':'💻','coding':'💻','computer':'💻','algorithm':'💻',
    'history':'🏛️','geography':'🗺️','polity':'⚖️','economy':'💰',
    'finance':'💰','banking':'🏦','investment':'💰',
    'network':'🌐','os':'💾','database':'🗄️',
    'circuits':'⚡','electronics':'⚡','electrical':'⚡',
    'default':'📌'
  };
  const tl = topic.toLowerCase();
  for (const [k, v] of Object.entries(map)) {
    if (tl.includes(k)) return v;
  }
  return map.default;
}

function toggleTeach(idx, topic) {
  const acc = document.getElementById(`tacc-${idx}`);
  const isOpen = acc.classList.contains('open');
  // Close all
  document.querySelectorAll('.topic-accordion').forEach(a => a.classList.remove('open'));
  if (!isOpen) acc.classList.add('open');
}

async function learnTopic(idx, topic) {
  if (STATE.generatingTeach[idx]) return;
  STATE.generatingTeach[idx] = true;

  const btn = document.getElementById(`tlearnbtn-${idx}`);
  const textDiv = document.getElementById(`ttext-${idx}`);

  btn.disabled = true;
  btn.innerHTML = '<div class="ai-dots" style="display:inline-flex"><span></span><span></span><span></span></div> Generating…';
  textDiv.innerHTML = '';

  try {
    const content = await aiAPI([{
      role: 'user',
      content: `Teach the topic "${topic}" for the ${STATE.exam} exam comprehensively.

Include:
1. Core concepts and theory (2-3 paragraphs)
2. Key formulas or rules (list them clearly)
3. Worked examples (2-3 step-by-step)
4. Memory shortcuts and tricks
5. Common exam traps to avoid

Write in a clear, exam-focused style. Use plain text with clear structure using dashes and bullet points. Keep it practical and exam-ready.`
    }], '', 2000);

    textDiv.innerHTML = `<div class="prose">${escapeHtml(content)}</div>`;
    btn.style.display = 'none';
  } catch(err) {
    textDiv.innerHTML = `<p style="color:var(--red);font-size:13px">⚠️ ${err.message}</p>`;
    btn.disabled = false;
    btn.innerHTML = `🔄 Retry`;
  }

  STATE.generatingTeach[idx] = false;
}

function escapeHtml(text) {
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ============================================================
   TAB 4 - ASK DOUBT
   ============================================================ */
function chatKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChat();
  }
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function sendQuickQ(btn) {
  document.getElementById('chatInput').value = btn.textContent;
  sendChat();
}

function refreshNotesStats() {
  const statsEl = document.getElementById('notesStats');
  if (!statsEl) return;

  const chars = STATE.notesText.length;
  const chunks = STATE.notesChunks.length;
  if (!chars) {
    statsEl.textContent = 'No notes added yet.';
    return;
  }

  statsEl.textContent = `${chars.toLocaleString()} chars • ${chunks} chunks`;
}

function setRagStatus(text) {
  const el = document.getElementById('ragStatus');
  if (el) el.textContent = text;
}

function rebuildNotesChunks() {
  STATE.notesChunks = chunkText(STATE.notesText, STATE.notesMeta.chunkSize, STATE.notesMeta.overlap);
  STATE.notesMeta.lastUpdated = new Date().toISOString();
  STATE.notesMeta.totalChars = STATE.notesText.length;
}

function chunkTextBasic(text, size = 500) {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

async function extractPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let text = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(' ') + '\n';
  }

  return { text, pages: pdf.numPages };
}

async function handlePdfUpload(e) {
  const file = e.target.files?.[0];
  const statusEl = document.getElementById('pdfStatus');
  if (!file) return;

  if (statusEl) statusEl.textContent = 'Loading PDF…';

  try {
    if (typeof pdfjsLib === 'undefined') {
      throw new Error('PDF engine not loaded yet. Please retry in a second.');
    }

    if (pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    const { text, pages } = await extractPDF(file);
    const cleaned = text.trim();

    localStorage.setItem('prepmind_notes', cleaned);
    localStorage.setItem('prepmind_notes_chunks', JSON.stringify(chunkTextBasic(cleaned)));

    STATE.notesText = cleaned;
    STATE.notesMeta.chunkSize = 500;
    STATE.notesMeta.overlap = 0;
    rebuildNotesChunks();
    saveState();
    refreshNotesStats();

    const notesInput = document.getElementById('notesInput');
    if (notesInput) notesInput.value = cleaned;

    setRagStatus(`📄 PDF loaded successfully (${pages} pages). Retrieval ready with ${STATE.notesChunks.length} chunk(s).`);
    if (statusEl) statusEl.textContent = `📄 PDF loaded successfully (${pages} pages)`;
    alert(`PDF converted to notes successfully! (${pages} pages)`);
  } catch (err) {
    console.error('PDF upload failed', err);
    setRagStatus('Failed to parse PDF. Please try another file.');
    if (statusEl) statusEl.textContent = 'Failed to parse PDF. Try again.';
    alert('Error reading PDF: ' + err.message);
  } finally {
    e.target.value = '';
  }
}

function saveNotesFromUI() {
  const input = document.getElementById('notesInput');
  if (!input) return;

  STATE.notesText = input.value.trim();
  rebuildNotesChunks();
  saveState();
  refreshNotesStats();

  if (!STATE.notesText) {
    setRagStatus('Notes are empty. Chat will use regular tutor mode.');
    return;
  }

  setRagStatus(`Notes saved. Retrieval ready with ${STATE.notesChunks.length} chunk(s).`);
}

function clearNotesFromUI() {
  STATE.notesText = '';
  STATE.notesChunks = [];
  STATE.notesMeta.lastUpdated = new Date().toISOString();
  STATE.notesMeta.totalChars = 0;
  STATE.lastRetrieval = { query: '', matches: 0, topScore: 0 };

  const input = document.getElementById('notesInput');
  if (input) input.value = '';

  saveState();
  refreshNotesStats();
  setRagStatus('Notes cleared. Chat will use regular tutor mode.');
}

function toggleRag(enabled) {
  STATE.rag.enabled = !!enabled;
  saveState();

  if (!STATE.rag.enabled) {
    setRagStatus('Notes retrieval is turned off.');
  } else if (!STATE.notesChunks.length) {
    setRagStatus('RAG is on. Add notes to enable retrieval.');
  } else {
    setRagStatus(`RAG is on. ${STATE.notesChunks.length} chunk(s) available.`);
  }
}

function initNotesUI() {
  const input = document.getElementById('notesInput');
  const toggle = document.getElementById('ragToggle');
  if (!input || !toggle) return;

   const storedPdfNotes = localStorage.getItem('prepmind_notes');
   if (!STATE.notesText && storedPdfNotes) {
     STATE.notesText = storedPdfNotes;
     STATE.notesMeta.chunkSize = 500;
     STATE.notesMeta.overlap = 0;
     rebuildNotesChunks();
     saveState();
   }

  input.value = STATE.notesText || '';
  toggle.checked = !!STATE.rag.enabled;

  if (STATE.notesText && (!STATE.notesChunks || STATE.notesChunks.length === 0)) {
    rebuildNotesChunks();
    saveState();
  }

  refreshNotesStats();

  if (!STATE.rag.enabled) {
    setRagStatus('Notes retrieval is turned off.');
  } else if (!STATE.notesChunks.length) {
    setRagStatus('RAG is on. Add notes to enable retrieval.');
  } else {
    setRagStatus(`RAG is on. ${STATE.notesChunks.length} chunk(s) available.`);
  }
}

async function sendChat() {
  console.log('Chat send clicked');
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if (!msg) return;

  const btn = document.getElementById('chatSendBtn');
  input.value = '';
  input.style.height = 'auto';
  btn.disabled = true;

  appendChatMsg('user', msg);

  STATE.chatHistory.push({ role: 'user', content: msg });
  saveState();

  // Typing indicator
  const typingId = 'typing-' + Date.now();
  const msgDiv = document.createElement('div');
  msgDiv.className = 'msg ai';
  msgDiv.id = typingId;
  msgDiv.innerHTML = `<div class="msg-bubble"><div class="ai-dots"><span></span><span></span><span></span></div></div>`;
  document.getElementById('chatMessages').appendChild(msgDiv);
  scrollChat();

  try {
    const ragResult = buildRagContext(msg);
    STATE.lastRetrieval = {
      query: msg,
      matches: ragResult.matches.length,
      topScore: ragResult.topScore || 0
    };
    saveState();

    if (!STATE.rag.enabled) {
      setRagStatus('Notes retrieval is turned off.');
    } else if (!STATE.notesChunks.length) {
      setRagStatus('No notes found. Add notes to enable context retrieval.');
    } else if (!ragResult.matches.length) {
      setRagStatus('No strong note match found for this question. Used normal tutor reasoning.');
    } else {
      setRagStatus(`Used ${ragResult.matches.length} note chunk(s), top score ${ragResult.topScore.toFixed(2)}.`);
    }

    const notesGuardrail = ragResult.contextText
      ? `\n\nUse this notes context if relevant. If notes conflict with known facts, clearly mention uncertainty and advise verification:\n\n${ragResult.contextText}`
      : '\n\nNo relevant notes context was retrieved for this query. Answer using your normal exam tutoring knowledge.';

    const systemPrompt = `You are an expert AI tutor specialised in ${STATE.exam} exam preparation. 
You know the complete syllabus, exam pattern, previous year questions, and preparation strategies for ${STATE.exam}.
Give concise, practical answers focused on helping the student prepare effectively.
Use examples when explaining concepts. Mention shortcuts and tricks where applicable.${notesGuardrail}`;

    const reply = await aiAPI(STATE.chatHistory.slice(-6), systemPrompt, 1000);

    document.getElementById(typingId)?.remove();
    STATE.chatHistory.push({ role: 'assistant', content: reply });
    appendChatMsg('ai', reply);
    saveState();
  } catch(err) {
    document.getElementById(typingId)?.remove();
    appendChatMsg('ai', '⚠️ Error: ' + err.message);
  }

  btn.disabled = false;
}

function appendChatMsg(role, text) {
  const wrap = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.innerHTML = `
    <div class="msg-bubble">${escapeHtml(text)}</div>
    <div class="msg-time">${now()}</div>
  `;
  wrap.appendChild(div);
  scrollChat();
}

function scrollChat() {
  const c = document.getElementById('chatMessages');
  c.scrollTop = c.scrollHeight;
}

/* ============================================================
   TAB 5 - PROGRESS
   ============================================================ */
function renderProgress() {
  const el = document.getElementById('progressContent');
  const { total, correct } = STATE.score;

  if (total === 0) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📊</div>
        <p>No questions attempted yet.<br>Head to the <strong style="color:var(--accent)">Practice</strong> tab to start solving questions!</p>
      </div>`;
    return;
  }

  const acc = Math.round((correct / total) * 100);
  const wrong = total - correct;

  // Ring
  const r = 54, circ = 2 * Math.PI * r;
  const dash = circ * (acc / 100);

  let statsHtml = `
  <div class="grid-3">
    <div class="stat-card">
      <div class="stat-label">Total Attempted</div>
      <div class="stat-value">${total}</div>
      <div class="stat-delta">📝 Questions</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Correct</div>
      <div class="stat-value" style="color:var(--green)">${correct}</div>
      <div class="stat-delta" style="color:var(--green)">✅ Right answers</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Wrong</div>
      <div class="stat-value" style="color:var(--red)">${wrong}</div>
      <div class="stat-delta" style="color:var(--red)">❌ Incorrect</div>
    </div>
  </div>

  <div class="card mt-16">
    <div class="card-title"><div class="icon">🎯</div> Overall Accuracy</div>
    <div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap">
      <svg width="130" height="130" viewBox="0 0 130 130">
        <circle class="ring-bg" cx="65" cy="65" r="${r}" />
        <circle class="ring-fill" cx="65" cy="65" r="${r}"
          stroke-dasharray="${circ}"
          stroke-dashoffset="${circ - dash}"
          transform="rotate(-90 65 65)"
        />
        <text class="ring-val" x="65" y="62" text-anchor="middle" dominant-baseline="middle">${acc}%</text>
        <text class="ring-sub" x="65" y="78" text-anchor="middle">Accuracy</text>
      </svg>
      <div style="flex:1;min-width:140px">
        ${acc >= 80 ? '<p style="color:var(--green);font-size:15px;font-weight:600;margin-bottom:6px">🏆 Excellent Performance!</p><p style="font-size:13px;color:var(--text2)">You\'re well above the passing threshold. Keep maintaining this accuracy.</p>'
          : acc >= 60 ? '<p style="color:var(--orange);font-size:15px;font-weight:600;margin-bottom:6px">📈 Good Progress!</p><p style="font-size:13px;color:var(--text2)">You\'re getting there. Focus on weak topics to push accuracy above 80%.</p>'
          : '<p style="color:var(--red);font-size:15px;font-weight:600;margin-bottom:6px">📚 Keep Practising!</p><p style="font-size:13px;color:var(--text2)">Accuracy needs improvement. Review explanations carefully after each wrong answer.</p>'}
      </div>
    </div>
  </div>`;

  // Topic-wise
  if (Object.keys(STATE.topicStats).length > 0) {
    statsHtml += `
    <div class="card">
      <div class="card-title"><div class="icon">📚</div> Topic-wise Performance</div>
      <table class="perf-table">
        <tr>
          <th>Topic</th>
          <th>Attempted</th>
          <th>Accuracy</th>
          <th>Progress</th>
        </tr>
        ${Object.entries(STATE.topicStats).map(([topic, stat]) => {
          const ta = Math.round((stat.correct / stat.total) * 100);
          const badgeCls = ta >= 75 ? 'acc-high' : ta >= 50 ? 'acc-mid' : 'acc-low';
          return `
          <tr>
            <td style="color:var(--text);font-weight:500;font-size:13px">${topic}</td>
            <td style="text-align:center">${stat.total}</td>
            <td><span class="acc-badge ${badgeCls}">${ta}%</span></td>
            <td>
              <div class="topic-bar-wrap">
                <div class="topic-bar"><div class="topic-bar-fill" style="width:${ta}%"></div></div>
                <span style="font-size:12px;color:var(--text3);width:28px;text-align:right">${ta}%</span>
              </div>
            </td>
          </tr>`;
        }).join('')}
      </table>
    </div>`;
  }

  el.innerHTML = statsHtml;
}

/* ============================================================
   INIT
   ============================================================ */
function applyTheme(theme) {
  const body = document.body;
  body.classList.toggle('theme-light', theme === 'light');
  body.classList.toggle('theme-dark', theme === 'dark');
  try { localStorage.setItem('prepmind_theme', theme); } catch(_) {}
  const toggle = document.getElementById('themeToggle');
  if (toggle) toggle.textContent = theme === 'light' ? '🌞' : '🌙';
}

function loadTheme() {
  const saved = localStorage.getItem('prepmind_theme');
  const theme = saved === 'light' ? 'light' : 'dark';
  applyTheme(theme);
}

function toggleTheme() {
  const isLight = document.body.classList.contains('theme-light');
  applyTheme(isLight ? 'dark' : 'light');
}

loadTheme();

initNotesUI();

function initInteractions() {
  const examInput = document.getElementById('examInput');
  const startBtn = document.querySelector('.exam-submit-btn');
  const genBtn = document.getElementById('genBtn');
  const chatBtn = document.getElementById('chatSendBtn');
  const pdfInput = document.getElementById('pdfUpload');

  if (examInput) {
    examInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        startPrep();
      }
    });
  }

  if (startBtn) {
    startBtn.addEventListener('click', startPrep);
  }

  if (genBtn) {
    genBtn.addEventListener('click', generateQuestions);
  }

  if (chatBtn) {
    chatBtn.addEventListener('click', sendChat);
  }

  if (pdfInput) {
    pdfInput.addEventListener('change', handlePdfUpload);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initInteractions();

  // Restore session if exists
  if (STATE.overview) {
    document.getElementById('landing').style.display = 'none';
    document.getElementById('dashboard').style.display = 'flex';
    renderOverview(STATE.overview);
    renderPracticeTopics();
    renderTeachTopics();
    document.getElementById('topbarExam').textContent = '📝 ' + (STATE.overview.fullName || STATE.exam);
    
    if (STATE.chatHistory.length > 0) {
      const wrap = document.getElementById('chatMessages');
      wrap.innerHTML = `<div class="msg ai"><div class="msg-bubble" id="chatWelcomeMsg">Hi! I'm your PrepMind AI tutor. Ask me anything about your exam!</div><div class="msg-time">Just now</div></div>`;
      STATE.chatHistory.forEach(msg => {
        appendChatMsg(msg.role === 'user' ? 'user' : 'ai', msg.content);
      });
    } else {
      document.getElementById('chatWelcomeMsg').textContent = `Hi! I'm your PrepMind AI tutor specialised in ${STATE.overview.fullName || STATE.exam}. Ask me anything — concepts, shortcuts, exam strategy, previous year patterns, or any doubts!`;
    }
    
    renderProgress();
    switchTab(0);
    initNotesUI();
  } else {
    document.getElementById('landing').style.display = 'flex';
  }
});