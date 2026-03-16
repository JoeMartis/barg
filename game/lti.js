// === LTI (Learning Tools Interoperability) Integration ===
// Supports LTI 1.1 and LTI 1.3 grade passback

const LTI = {
  config: null,
  trustedOrigin: null, // Set during LTI launch to restrict postMessage

  /**
   * Check if the game was launched via an LTI context.
   * LTI parameters are typically passed via POST and stored server-side,
   * or via query parameters / postMessage from the LMS.
   */
  isLTIContext() {
    // Check for LTI launch parameters in the URL or window
    return !!(
      this.getParam('lis_outcome_service_url') ||
      this.getParam('lti_message_type') ||
      window.ltiConfig ||
      this.config
    );
  },

  /**
   * Initialize LTI from server-provided config or URL params.
   * Call this on page load if LTI context is expected.
   */
  init(config) {
    if (config) {
      this.config = config;
      return;
    }

    // Try to read from a global config object set by the server
    if (window.ltiConfig) {
      this.config = window.ltiConfig;
      return;
    }

    // LTI config should come from server-injected window.ltiConfig or postMessage
    // URL parameters are not used to avoid leaking credentials in browser history/logs

    // LTI 1.3: Listen for postMessage from LMS platform
    // Store the parent origin from the referrer for validation
    if (window.parent !== window && document.referrer) {
      try { this.trustedOrigin = new URL(document.referrer).origin; } catch (e) {}
    }
    window.addEventListener('message', (event) => {
      // Validate origin: only accept config from the trusted LMS parent
      if (this.trustedOrigin && event.origin !== this.trustedOrigin) {
        console.warn('[LTI] Rejected postMessage from untrusted origin:', event.origin);
        return;
      }
      if (!this.trustedOrigin) {
        // No referrer available - reject messages when we can't verify origin
        console.warn('[LTI] Rejected postMessage: no trusted origin established. Set origin via server config.');
        return;
      }
      if (event.data && event.data.type === 'lti-config') {
        this.config = event.data.config;
      }
    });
  },

  /**
   * Send a score back to the LMS.
   * @param {number} score - Normalized score between 0.0 and 1.0
   */
  async sendScore(score) {
    const normalizedScore = Math.max(0, Math.min(1, score));

    if (!this.config) {
      console.log('[LTI] No LTI context - score not sent. Score:', normalizedScore);
      return false;
    }

    try {
      if (this.config.version === '1.3') {
        return await this.sendScoreLTI13(normalizedScore);
      } else {
        return await this.sendScoreLTI11(normalizedScore);
      }
    } catch (err) {
      console.error('[LTI] Error sending score:', err);
      return false;
    }
  },

  /**
   * LTI 1.1 - Send score via Basic Outcomes Service (server-side proxy required)
   */
  async sendScoreLTI11(score) {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<imsx_POXEnvelopeRequest xmlns="http://www.imsglobal.org/services/ltiv1p1/xsd/imsoms_v1p0">
  <imsx_POXHeader>
    <imsx_POXRequestHeaderInfo>
      <imsx_version>V1.0</imsx_version>
      <imsx_messageIdentifier>${Date.now()}</imsx_messageIdentifier>
    </imsx_POXRequestHeaderInfo>
  </imsx_POXHeader>
  <imsx_POXBody>
    <replaceResultRequest>
      <resultRecord>
        <sourcedGUID>
          <sourcedId>${this.escapeXml(this.config.resultSourcedId)}</sourcedId>
        </sourcedGUID>
        <result>
          <resultScore>
            <language>en</language>
            <textString>${score.toFixed(4)}</textString>
          </resultScore>
        </result>
      </resultRecord>
    </replaceResultRequest>
  </imsx_POXBody>
</imsx_POXEnvelopeRequest>`;

    // Send via server-side proxy to handle OAuth signing
    const response = await fetch('/lti/outcomes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml' },
      body: xml
    });

    if (response.ok) {
      console.log('[LTI 1.1] Score sent successfully:', score);
      return true;
    }

    console.error('[LTI 1.1] Failed to send score:', response.status);
    return false;
  },

  /**
   * LTI 1.3 - Send score via Assignment and Grade Services (AGS)
   */
  async sendScoreLTI13(score) {
    if (!this.config.lineItemUrl || !this.config.accessToken) {
      // Use postMessage to request the platform send the score
      if (window.parent !== window && this.trustedOrigin) {
        window.parent.postMessage({
          type: 'lti-score',
          score: score,
          activityProgress: 'Completed',
          gradingProgress: 'FullyGraded'
        }, this.trustedOrigin);
        console.log('[LTI 1.3] Score sent via postMessage:', score);
        return true;
      }
      console.warn('[LTI 1.3] No line item URL or access token available');
      return false;
    }

    // Validate lineItemUrl scheme
    try {
      const parsed = new URL(this.config.lineItemUrl);
      if (parsed.protocol !== 'https:') {
        console.error('[LTI 1.3] lineItemUrl must use HTTPS');
        return false;
      }
    } catch (e) {
      console.error('[LTI 1.3] Invalid lineItemUrl');
      return false;
    }

    const scorePayload = {
      scoreGiven: score * 100,
      scoreMaximum: 100,
      activityProgress: 'Completed',
      gradingProgress: 'FullyGraded',
      userId: this.config.userId,
      timestamp: new Date().toISOString()
    };

    const response = await fetch(`${this.config.lineItemUrl}/scores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.ims.lis.v1.score+json',
        'Authorization': `Bearer ${this.config.accessToken}`
      },
      body: JSON.stringify(scorePayload)
    });

    if (response.ok) {
      console.log('[LTI 1.3] Score sent successfully:', score);
      return true;
    }

    console.error('[LTI 1.3] Failed to send score:', response.status);
    return false;
  },

  // Utility helpers
  getParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  },

  escapeXml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
};

// Auto-initialize on load
document.addEventListener('DOMContentLoaded', () => LTI.init());
