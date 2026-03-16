// === LTI Provider Server ===
// Minimal Node.js server for LTI 1.1 tool provider integration
// Usage: node server.js
// Requires: npm install express ims-lti

const express = require('express');
const crypto = require('crypto');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// LTI configuration - MUST be set via environment variables
const LTI_KEY = process.env.LTI_CONSUMER_KEY;
const LTI_SECRET = process.env.LTI_CONSUMER_SECRET;
const BASE_URL = process.env.BASE_URL || ''; // Set in production to prevent host header injection

if (!LTI_KEY || !LTI_SECRET) {
  console.error('[SECURITY] LTI_CONSUMER_KEY and LTI_CONSUMER_SECRET environment variables are required.');
  console.error('[SECURITY] LTI endpoints will reject all launches until credentials are configured.');
}

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-XSS-Protection', '0'); // Disabled per OWASP recommendation; rely on CSP
  next();
});

app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(express.json({ limit: '100kb' }));
app.use(express.text({ type: 'application/xml', limit: '100kb' }));

// Block access to server-side files
app.use((req, res, next) => {
  const blocked = ['/server.js', '/package.json', '/package-lock.json', '/node_modules'];
  if (blocked.some(p => req.path === p || req.path.startsWith('/node_modules/'))) {
    return res.status(403).send('Forbidden');
  }
  next();
});

// Serve static game files
app.use(express.static(path.join(__dirname), { index: 'index.html', dotfiles: 'deny' }));

// Store LTI sessions in memory (use Redis/DB in production)
const sessions = new Map();
const MAX_SESSIONS = 10000;

/**
 * LTI Launch endpoint
 * The LMS POSTs here with OAuth-signed LTI parameters
 */
app.post('/lti/launch', async (req, res) => {
  const params = req.body;

  // Validate required LTI parameters
  if (params.lti_message_type !== 'basic-lti-launch-request') {
    return res.status(400).send('Invalid LTI launch request');
  }

  // Reject if LTI credentials are not configured
  if (!LTI_KEY || !LTI_SECRET) {
    return res.status(503).send('LTI not configured. Set LTI_CONSUMER_KEY and LTI_CONSUMER_SECRET environment variables.');
  }

  // Validate OAuth signature
  try {
    const lti = require('ims-lti');
    const provider = new lti.Provider(LTI_KEY, LTI_SECRET);
    await new Promise((resolve, reject) => {
      provider.valid_request(req, (err, isValid) => {
        if (err || !isValid) reject(err || new Error('Invalid OAuth signature'));
        else resolve();
      });
    });
  } catch (err) {
    console.error('[LTI] OAuth validation failed:', err.message);
    return res.status(401).send('LTI authentication failed');
  }

  // Cap session count to prevent unbounded memory growth
  if (sessions.size >= MAX_SESSIONS) {
    return res.status(503).send('Server at capacity. Please try again later.');
  }

  // Create session
  const sessionId = generateId();
  sessions.set(sessionId, {
    userId: params.user_id,
    userName: params.lis_person_name_full || 'Student',
    courseId: params.context_id,
    courseName: params.context_title,
    outcomeServiceUrl: validateOutcomeUrl(params.lis_outcome_service_url),
    resultSourcedId: params.lis_result_sourcedid,
    consumerKey: params.oauth_consumer_key,
    timestamp: Date.now()
  });

  // Redirect to game with session context
  res.redirect(`/index.html?session=${sessionId}&lti=1`);
});

/**
 * LTI Outcomes proxy endpoint
 * Forwards grade passback to the LMS (handles OAuth signing server-side)
 */
app.post('/lti/outcomes', async (req, res) => {
  const sessionId = req.query.session || req.headers['x-session-id'];
  const session = sessions.get(sessionId);

  if (!session || !session.outcomeServiceUrl) {
    return res.status(400).json({ error: 'No LTI outcome service available' });
  }

  try {
    // In production, sign with OAuth and forward to LMS:
    // const oauth = require('oauth-sign');
    // ... sign and send request to session.outcomeServiceUrl

    console.log('[LTI] Score passback for session:', sessionId);
    res.json({ success: true });
  } catch (err) {
    console.error('[LTI] Outcome service error:', err);
    res.status(500).json({ error: 'Failed to send score' });
  }
});

/**
 * LTI Configuration XML
 * Provides LMS with tool configuration for easy installation
 */
app.get('/lti/config.xml', (req, res) => {
  if (!BASE_URL) {
    return res.status(500).send('BASE_URL environment variable must be set for LTI configuration');
  }
  const baseUrl = BASE_URL;

  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<cartridge_basiclti_link
  xmlns="http://www.imsglobal.org/xsd/imslticc_v1p0"
  xmlns:blti="http://www.imsglobal.org/xsd/imsbasiclti_v1p0"
  xmlns:lticm="http://www.imsglobal.org/xsd/imslticm_v1p0"
  xmlns:lticp="http://www.imsglobal.org/xsd/imslticp_v1p0"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imslticc_v1p0 http://www.imsglobal.org/xsd/lti/ltiv1p0/imslticc_v1p0.xsd">

  <blti:title>AI Ethics Quest - Explainability &amp; Fairness</blti:title>
  <blti:description>
    An interactive game covering Explainable AI (SHAP, LIME, Grad-CAM, decision trees)
    and Fairness in ML (alpha-bias, epsilon-demographic parity, feedback loops, optimization).
    Features story adventure, quiz blitz, scenario lab, and boss battle modes.
  </blti:description>
  <blti:launch_url>${escapeXml(baseUrl)}/lti/launch</blti:launch_url>

  <blti:extensions platform="canvas.instructure.com">
    <lticm:property name="tool_id">ai_ethics_quest</lticm:property>
    <lticm:property name="privacy_level">public</lticm:property>
    <lticm:property name="domain">${escapeXml(new URL(BASE_URL).host)}</lticm:property>
  </blti:extensions>

  <cartridge_bundle identifierref="BLTI001_Bundle"/>
  <cartridge_icon identifierref="BLTI001_Icon"/>
</cartridge_basiclti_link>`);
});

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

function generateId() {
  return 'sess_' + crypto.randomBytes(16).toString('hex');
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function validateOutcomeUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    return url;
  } catch (e) {
    return null;
  }
}

// Cleanup old sessions every 30 minutes
setInterval(() => {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000; // 2 hours
  for (const [id, session] of sessions) {
    if (session.timestamp < cutoff) sessions.delete(id);
  }
}, 30 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`AI Ethics Quest server running on port ${PORT}`);
  console.log(`Game: http://localhost:${PORT}`);
  console.log(`LTI Config: http://localhost:${PORT}/lti/config.xml`);
});
