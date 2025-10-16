const express = require('express');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
// docx is optional; we'll require when needed
const router = express.Router();

// Simple in-memory daily quota store (development only)
// key: `${googleId}:${YYYYMMDD}` -> count
const dailyUsage = new Map();
const DAILY_LIMIT = parseInt(process.env.DAILY_ANALYZE_LIMIT || '100', 10);

const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  next();
};

const todayKey = (googleId) => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${googleId}:${yyyy}${mm}${dd}`;
};

// Ensure tmp directory exists
const ensureTmpDir = () => {
  const tmpPath = path.join(process.cwd(), 'backEnd', 'tmp');
  if (!fs.existsSync(tmpPath)) {
    fs.mkdirSync(tmpPath, { recursive: true });
  }
  return tmpPath;
};

// Very lightweight heuristic task extractor
// In production, replace this with an LLM call
function extractTasksFromEmail({ id, from, subject, snippet, body }) {
  const tasks = [];
  const normalizedSubject = (subject || '').trim();
  const normalizedBody = (body || '').trim();

  // Heuristic: create one actionable item per email using subject as title
  const title = normalizedSubject || 'Follow up email';
  const description = (normalizedBody || snippet || '').slice(0, 500);

  tasks.push({
    title,
    description,
    due_date: null,
    priority: 'normal',
    source_email_id: id,
    sender: from || 'Unknown',
    confidence: 0.5,
    category: 'email'
  });

  return tasks;
}

// Build a strict JSON extraction instruction for models
function buildExtractionInstructions() {
  return `You are an assistant that extracts actionable TODO items from emails.
Return STRICT JSON ONLY, with no extra commentary.
Schema:
{
  "tasks": [
    {
      "title": string,
      "description": string,
      "due_date": string | null, // ISO 8601 if available
      "priority": "low" | "normal" | "high",
      "source_email_id": string,
      "sender": string,
      "confidence": number // 0-1
    }
  ],
  "summary": string // if there are no concrete actionable items, provide a concise summary
}
Rules:
- Only create tasks that are clearly actionable (e.g., requests, deadlines, approvals).
- If email is general info or unclear, leave tasks empty and provide a summary.
- Output MUST be a single JSON object matching the schema, no markdown.`;
}

// Simple sleep helper for backoff
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Global serialized rate gate to avoid thundering herd under concurrency
let RATE_CHAIN = Promise.resolve();
// Adaptive rate state: increases interval on 429, gently decreases on consistent success
const RATE_STATE = {
  intervalMs: parseInt(process.env.AI_MIN_INTERVAL_MS || '300', 10),
  minMs: parseInt(process.env.AI_MIN_INTERVAL_MIN_MS || process.env.AI_MIN_INTERVAL_MS || '300', 10),
  maxMs: parseInt(process.env.AI_MIN_INTERVAL_MAX_MS || '2000', 10),
  successesSinceAdjust: 0,
};
async function rateGate(minIntervalMs) {
  const prev = RATE_CHAIN;
  let release;
  RATE_CHAIN = new Promise((r) => (release = r));
  await prev; // ensure previous call's interval completed
  const ms = Math.max(0, RATE_STATE.intervalMs || minIntervalMs || 0);
  setTimeout(() => release(), ms);
  await RATE_CHAIN; // wait our own interval before proceeding
}

// Choose provider config from env
function getProvider() {
  const provider = (process.env.AI_PROVIDER || '').trim().toLowerCase();
  const endpoint = process.env.AI_ENDPOINT || '';
  const model = process.env.AI_MODEL || '';
  const apiKey = process.env.AI_API_KEY || '';
  return { provider, endpoint, model, apiKey };
}

// Call model to extract tasks or summary for one email
async function extractWithModel(email) {
  const { provider, endpoint, model, apiKey } = getProvider();
  const maxRetries = parseInt(process.env.AI_RETRY_MAX || '3', 10);
  const baseDelayMs = parseInt(process.env.AI_RETRY_BASE_MS || '500', 10);
  const minIntervalMs = parseInt(process.env.AI_MIN_INTERVAL_MS || '300', 10);
  const instructions = buildExtractionInstructions();
  const cleanedBody = (email.body || '').replace(/\s+/g, ' ').slice(0, 8000);
  const userPayload = {
    email: {
      id: email.id,
      from: email.from,
      subject: email.subject,
      date: email.date,
      snippet: email.snippet,
      body: cleanedBody
    }
  };

  if (!provider || !model) {
    // Fallback: heuristic extraction only
    return { tasks: extractTasksFromEmail(email), summary: '' };
  }

  // Quick sanity hints for common misconfigurations
  if ((provider === 'groq') && model.includes('/')) {
    console.warn(`Model '${model}' looks like an OpenRouter id. Groq expects plain ids like 'llama-3.1-8b-instant'.`);
  }
  if (!apiKey) {
    console.warn('AI_API_KEY is empty; model calls will fail. Falling back to heuristic.');
  }

  // Provider-specific call with retry/backoff
  const tryCall = async () => {
    if (provider === 'ollama') {
      await rateGate(minIntervalMs);
      const url = `${endpoint || 'http://localhost:11434'}/api/chat`;
      const resp = await axios.post(url, {
        model,
        messages: [
          { role: 'system', content: instructions },
          { role: 'user', content: JSON.stringify(userPayload) }
        ],
        options: { temperature: 0 },
        format: 'json'
      }, { timeout: 30000 });
      const content = resp.data?.message?.content || resp.data?.choices?.[0]?.message?.content || '';
      const parsed = JSON.parse(content);
      return parsed;
    }

    if (provider === 'groq' || provider === 'openrouter') {
      await rateGate(minIntervalMs);
      const base = provider === 'groq'
        ? (endpoint || 'https://api.groq.com/openai/v1')
        : (endpoint || 'https://openrouter.ai/api/v1');
      const url = `${base}/chat/completions`;
      const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      };
      const resp = await axios.post(url, {
        model,
        messages: [
          { role: 'system', content: instructions },
          { role: 'user', content: JSON.stringify(userPayload) }
        ],
        temperature: 0,
        response_format: { type: 'json_object' }
      }, { headers, timeout: 30000 });
      const content = resp.data?.choices?.[0]?.message?.content || '';
      const parsed = JSON.parse(content);
      return parsed;
    }

    // Unsupported provider -> heuristic
    return { tasks: extractTasksFromEmail(email), summary: '' };
  };

  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const parsed = await tryCall();
      // Success: gently decrease interval toward min to improve throughput
      RATE_STATE.successesSinceAdjust += 1;
      if (RATE_STATE.successesSinceAdjust >= 5) {
        RATE_STATE.intervalMs = Math.max(
          RATE_STATE.minMs,
          Math.floor(RATE_STATE.intervalMs * 0.9)
        );
        RATE_STATE.successesSinceAdjust = 0;
      }
      return {
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks.map((t) => ({
          title: t.title || email.subject || 'Untitled',
          description: t.description || '',
          due_date: t.due_date || null,
          priority: t.priority || 'normal',
          source_email_id: t.source_email_id || email.id,
          sender: t.sender || email.from || 'Unknown',
          confidence: typeof t.confidence === 'number' ? t.confidence : 0.7,
          category: 'email'
        })) : [],
        summary: typeof parsed.summary === 'string' ? parsed.summary : ''
      };
    } catch (err) {
      lastErr = err;
      const status = err?.response?.status;
      const isRateLimited = status === 429;
      const isRetryable = isRateLimited || status === 503 || status === 500 || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT';
      if (isRetryable && attempt < maxRetries) {
        // Honor server-provided retry hints if present
        let serverDelayMs = 0;
        const h = err?.response?.headers || {};
        const retryAfter = h['retry-after'];
        const resetSec = h['x-ratelimit-reset-seconds'] || h['ratelimit-reset'] || h['x-ratelimit-reset'];
        if (retryAfter) {
          const sec = parseFloat(Array.isArray(retryAfter) ? retryAfter[0] : retryAfter);
          if (!isNaN(sec) && sec > 0) serverDelayMs = Math.ceil(sec * 1000);
        } else if (resetSec) {
          const sec = parseFloat(Array.isArray(resetSec) ? resetSec[0] : resetSec);
          if (!isNaN(sec) && sec > 0) serverDelayMs = Math.ceil(sec * 1000);
        }
        const jitter = Math.floor(Math.random() * 150);
        const delay = Math.max(serverDelayMs, baseDelayMs * Math.pow(2, attempt)) + jitter;
        // Adapt interval upward when rate-limited or server hints longer reset
        if (isRateLimited || serverDelayMs > 0) {
          const target = serverDelayMs > 0 ? serverDelayMs : Math.floor(RATE_STATE.intervalMs * 1.5) + jitter;
          RATE_STATE.intervalMs = Math.min(Math.max(target, RATE_STATE.intervalMs), RATE_STATE.maxMs);
          RATE_STATE.successesSinceAdjust = 0;
        }
        console.warn(`Model call attempt ${attempt + 1} failed (status ${status || 'unknown'}). Retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }
      break;
    }
  }

  console.error('Model extraction failed, falling back to heuristic:', lastErr?.message || 'Unknown error');
  return { tasks: extractTasksFromEmail(email), summary: '' };
}

async function fetchFullEmail(oauth2Client, messageId) {
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const messageDetail = await gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' });
  const message = messageDetail.data;
  const headers = message.payload.headers || [];

  const getHeader = (name) => {
    const h = headers.find((x) => x.name === name);
    return h ? h.value : null;
  };

  const fromHeader = getHeader('From');
  const subjectHeader = getHeader('Subject');
  const dateHeader = getHeader('Date');

  // Extract text/plain body (fallback to text from html if needed)
  const decode = (data) => Buffer.from(data, 'base64').toString('utf-8');
  let bodyText = '';

  const traverse = (payload) => {
    if (!payload) return '';
    if (payload.body?.data) {
      return decode(payload.body.data);
    }
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return decode(part.body.data);
        }
      }
      // If no text/plain, look for nested parts
      for (const part of payload.parts) {
        const nested = traverse(part);
        if (nested) return nested;
      }
    }
    return '';
  };

  bodyText = traverse(message.payload) || message.snippet || '';

  return {
    id: message.id,
    from: fromHeader || 'Unknown',
    subject: subjectHeader || 'No Subject',
    date: dateHeader || new Date().toISOString(),
    snippet: message.snippet || '',
    body: bodyText
  };
}

// Simple promise pool runner with concurrency control
async function runWithPool(items, worker, concurrency) {
  const results = [];
  let index = 0;
  const runners = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (true) {
      let currentIndex;
      if (index >= items.length) break;
      currentIndex = index++;
      const item = items[currentIndex];
      try {
        const r = await worker(item);
        results[currentIndex] = r;
      } catch (e) {
        console.error('Worker error:', e.message);
        results[currentIndex] = null;
      }
    }
  });
  await Promise.all(runners);
  return results;
}

// Quota endpoint
router.get('/quota', requireAuth, (req, res) => {
  const user = req.session.user;
  const key = todayKey(user.googleId);
  const used = dailyUsage.get(key) || 0;
  return res.json({ success: true, limit: DAILY_LIMIT, used, remaining: Math.max(DAILY_LIMIT - used, 0) });
});

// Analyze selected emails and generate a tasks file
router.post('/', requireAuth, async (req, res) => {
  try {
    const { messageIds = [], outputFormat = 'markdown' } = req.body || {};
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ success: false, error: 'No messageIds provided' });
    }

    const user = req.session.user;
    const key = todayKey(user.googleId);
    const used = dailyUsage.get(key) || 0;
    const toAnalyze = messageIds.length;

    if (used + toAnalyze > DAILY_LIMIT) {
      return res.status(429).json({
        success: false,
        error: 'Daily analysis limit exceeded',
        limit: DAILY_LIMIT,
        used,
        remaining: Math.max(DAILY_LIMIT - used, 0)
      });
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: user.accessToken,
      refresh_token: user.refreshToken
    });

    const allTasks = [];
    const summaries = [];
    const batchSize = parseInt(process.env.ANALYZE_BATCH_SIZE || '10', 10);
    const gmailConcurrency = parseInt(process.env.GMAIL_MAX_CONCURRENCY || '6', 10);
    const modelConcurrency = parseInt(process.env.AI_MAX_CONCURRENCY || '3', 10);
    const batchPauseMs = parseInt(process.env.BATCH_PAUSE_MS || '800', 10);

    const chunk = (arr, size) => {
      const out = [];
      for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
      return out;
    };

    const batches = chunk(messageIds, Math.max(1, batchSize));
    for (let i = 0; i < batches.length; i++) {
      const ids = batches[i];
      // Stage 1: fetch emails with higher concurrency
      const emailsBatch = await runWithPool(ids, async (id) => {
        try {
          return await fetchFullEmail(oauth2Client, id);
        } catch (e) {
          console.error('Fetch email error:', id, e.message);
          return null;
        }
      }, gmailConcurrency);

      const validEmails = emailsBatch.filter(Boolean);

      // Stage 2: model extraction with tighter concurrency (rate-gated internally)
      const outputs = await runWithPool(validEmails, async (email) => {
        try {
          return await extractWithModel(email);
        } catch (e) {
          console.error('Extract error for message:', email?.id, e.message);
          return null;
        }
      }, modelConcurrency);

      outputs.forEach((out) => {
        if (!out) return;
        const { tasks, summary } = out;
        if (Array.isArray(tasks) && tasks.length > 0) {
          allTasks.push(...tasks);
        } else if (summary) {
          summaries.push(`- ${summary}`);
        }
      });

      // Small pause between batches to avoid minute-level throttles
      if (i < batches.length - 1 && batchPauseMs > 0) {
        await sleep(batchPauseMs);
      }
    }

    // Update quota usage
    dailyUsage.set(key, used + toAnalyze);

    // Generate output file
    const tmpDir = ensureTmpDir();
    const ts = Date.now();
    const safeName = `${user.googleId || 'user'}-${ts}`;
    const ext = outputFormat === 'json' ? 'json' : outputFormat === 'ics' ? 'ics' : outputFormat === 'docx' ? 'docx' : 'md';
    const fileName = `todos-${safeName}.${ext}`;
    const filePath = path.join(tmpDir, fileName);

    const combinedSummary = summaries.length > 0 ? summaries.join('\n') : '';
    if (ext === 'json') {
      fs.writeFileSync(filePath, JSON.stringify({ tasks: allTasks, summary: combinedSummary }, null, 2), 'utf-8');
    } else if (ext === 'md') {
      const lines = ['# Email-derived TODOs', '', `Generated: ${new Date().toISOString()}`, ''];
      allTasks.forEach((t, idx) => {
        lines.push(`- [ ] ${t.title}`);
        if (t.description) lines.push(`  - ${t.description}`);
        lines.push(`  - Source: ${t.sender} | Email ID: ${t.source_email_id}`);
        lines.push('');
      });
      if (combinedSummary && allTasks.length === 0) {
        lines.push('## Summary');
        lines.push('');
        lines.push(combinedSummary);
        lines.push('');
      }
      fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
    } else if (ext === 'ics') {
      // Minimal ICS skeleton (no actual due dates by default)
      const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0'];
      allTasks.forEach((t, idx) => {
        lines.push('BEGIN:VTODO');
        lines.push(`SUMMARY:${t.title}`);
        lines.push(`DESCRIPTION:${(t.description || '').replace(/\n/g, ' ')}`);
        lines.push('STATUS:NEEDS-ACTION');
        lines.push('END:VTODO');
      });
      lines.push('END:VCALENDAR');
      fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
    } else if (ext === 'docx') {
      try {
        const { Document, Packer, Paragraph, TextRun } = require('docx');
        const doc = new Document({
          sections: [
            {
              properties: {},
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'Email-derived TODOs', bold: true, size: 28 }),
                  ],
                }),
                new Paragraph({ children: [ new TextRun({ text: `Generated: ${new Date().toISOString()}`, italics: true, size: 20 }) ] }),
                ...(
                  allTasks.length > 0
                    ? allTasks.flatMap((t) => [
                        new Paragraph({ children: [ new TextRun({ text: `• ${t.title}`, size: 24 }) ] }),
                        ...(t.description ? [ new Paragraph({ children: [ new TextRun({ text: `   - ${t.description}`, size: 22 }) ] }) ] : []),
                        new Paragraph({ children: [ new TextRun({ text: `   - Source: ${t.sender} | Email ID: ${t.source_email_id}`, size: 20 }) ] }),
                        new Paragraph({ children: [ new TextRun({ text: '' }) ] }),
                      ])
                    : [
                        new Paragraph({ children: [ new TextRun({ text: 'Summary', bold: true, size: 26 }) ] }),
                        new Paragraph({ children: [ new TextRun({ text: combinedSummary || 'No actionable items extracted.', size: 22 }) ] }),
                      ]
                )
              ]
            }
          ]
        });
        const buffer = await Packer.toBuffer(doc);
        fs.writeFileSync(filePath, buffer);
      } catch (e) {
        console.error('DOCX generation failed, falling back to markdown:', e.message);
        const fallback = filePath.replace(/\.docx$/, '.md');
        const lines = ['# Email-derived TODOs', '', `Generated: ${new Date().toISOString()}`, ''];
        allTasks.forEach((t, idx) => {
          lines.push(`- [ ] ${t.title}`);
          if (t.description) lines.push(`  - ${t.description}`);
          lines.push(`  - Source: ${t.sender} | Email ID: ${t.source_email_id}`);
          lines.push('');
        });
        if (combinedSummary && allTasks.length === 0) {
          lines.push('## Summary');
          lines.push('');
          lines.push(combinedSummary);
          lines.push('');
        }
        fs.writeFileSync(fallback, lines.join('\n'), 'utf-8');
        // point download to fallback
        const backendBase = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;
        const downloadUrl = `${backendBase}/api/analyze/files/${path.basename(fallback)}`;
        return res.json({
          success: true,
          tasks: allTasks,
          summary: combinedSummary,
          file: { name: path.basename(fallback), url: downloadUrl },
          quota: { limit: DAILY_LIMIT, used: used + toAnalyze }
        });
      }
    }

    const backendBase = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;
    const downloadUrl = `${backendBase}/api/analyze/files/${fileName}`;

    return res.json({
      success: true,
      tasks: allTasks,
      summary: combinedSummary,
      file: { name: fileName, url: downloadUrl },
      quota: { limit: DAILY_LIMIT, used: used + toAnalyze }
    });
  } catch (error) {
    console.error('Analyze route error:', error);
    if (error.code === 401) {
      return res.status(401).json({ success: false, error: 'Authentication token expired', needReauth: true });
    }
    return res.status(500).json({ success: false, error: 'Failed to analyze emails', details: error.message });
  }
});

// Serve generated files
router.get('/files/:fileName', requireAuth, (req, res) => {
  try {
    const tmpDir = ensureTmpDir();
    const fileName = req.params.fileName;
    const filePath = path.join(tmpDir, fileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    const ext = path.extname(fileName).toLowerCase();
    if (ext === '.docx') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    }
    return res.sendFile(filePath);
  } catch (error) {
    console.error('Download file error:', error);
    return res.status(500).json({ success: false, error: 'Failed to download file' });
  }
});

module.exports = router;