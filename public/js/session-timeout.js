/**
 * Session Timeout Manager
 * Handles automatic logout after inactivity with user warning
 */

class SessionTimeoutManager {
  constructor() {
    this.inactivityTimeout = null;
    this.warningTimeout = null;
    this.countdownInterval = null;
    this.isWarningShown = false;
    this.statusCheckInterval = null;
    this.activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    this.init();
  }

  /**
   * Initialize session timeout manager
   */
  init() {
    // Check if user is authenticated
    const header = document.querySelector('header');
    if (!header || header.dataset.loggedIn !== 'true') {
      return;
    }

    console.log('[SESSION TIMEOUT] Initializing session timeout manager');

    // Fetch session config from server
    this.getSessionConfig();

    // Start periodic status checks
    this.startStatusCheck();

    // Attach activity listeners
    this.attachActivityListeners();
  }

  /**
   * Fetch session configuration from server
   */
  getSessionConfig() {
    fetch('/api/session/status')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          this.sessionTimeoutMs = data.timeoutMinutes * 60 * 1000;
          this.warningThresholdMs = data.sessionWarningThresholdMs;
          
          console.log('[SESSION TIMEOUT] Config loaded:', {
            timeoutMinutes: data.timeoutMinutes,
            warningMinutes: data.warningMinutes,
            remainingTimeMs: data.remainingTimeMs
          });

          // Start the inactivity timer
          this.resetInactivityTimer();
        }
      })
      .catch(err => console.error('[SESSION TIMEOUT] Error fetching config:', err));
  }

  /**
   * Attach activity event listeners
   */
  attachActivityListeners() {
    this.activityEvents.forEach(event => {
      document.addEventListener(event, () => {
        this.handleUserActivity();
      }, true); // Use capture phase for better detection
    });
  }

  /**
   * Handle user activity - reset inactivity timer
   */
  handleUserActivity() {
    // Clear existing timers
    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout);
    }
    if (this.warningTimeout) {
      clearTimeout(this.warningTimeout);
    }

    // Hide warning if shown
    if (this.isWarningShown) {
      this.hideWarning();
    }

    // Extend session on server
    this.extendSession();

    // Reset timers
    this.resetInactivityTimer();
  }

  /**
   * Reset inactivity timer
   */
  resetInactivityTimer() {
    // Timer for showing warning (timeout - warning threshold)
    const warningTriggerTime = Math.max(0, this.sessionTimeoutMs - this.warningThresholdMs);

    this.warningTimeout = setTimeout(() => {
      this.showWarning();
    }, warningTriggerTime);

    // Timer for actual logout
    this.inactivityTimeout = setTimeout(() => {
      this.handleSessionTimeout();
    }, this.sessionTimeoutMs);

    console.log('[SESSION TIMEOUT] Timer reset. Will show warning in:', warningTriggerTime / 1000, 'seconds');
  }

  /**
   * Show session timeout warning modal
   */
  showWarning() {
    console.log('[SESSION TIMEOUT] Showing warning modal');
    
    const modal = document.getElementById('sessionTimeoutModal');
    if (!modal) {
      console.warn('[SESSION TIMEOUT] Warning modal not found');
      return;
    }

    this.isWarningShown = true;
    modal.style.display = 'flex';

    // Calculate remaining time and start countdown
    const remainingMs = this.warningThresholdMs;
    this.startCountdown(remainingMs);

    // Add event listeners to modal buttons
    const continueBtn = modal.querySelector('[data-action="continue-session"]');
    const logoutBtn = modal.querySelector('[data-action="logout"]');

    if (continueBtn) {
      continueBtn.onclick = () => this.continueSession();
    }

    if (logoutBtn) {
      logoutBtn.onclick = () => this.handleSessionTimeout();
    }
  }

  /**
   * Start countdown timer in warning modal
   */
  startCountdown(remainingMs) {
    let secondsRemaining = Math.ceil(remainingMs / 1000);

    const countdownEl = document.getElementById('sessionCountdown');
    if (!countdownEl) return;

    // Clear any existing interval
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    const updateCountdown = () => {
      const minutes = Math.floor(secondsRemaining / 60);
      const seconds = secondsRemaining % 60;
      countdownEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      secondsRemaining--;

      if (secondsRemaining < 0) {
        clearInterval(this.countdownInterval);
      }
    };

    updateCountdown(); // Initial call
    this.countdownInterval = setInterval(updateCountdown, 1000);
  }

  /**
   * Hide warning modal
   */
  hideWarning() {
    console.log('[SESSION TIMEOUT] Hiding warning modal');
    
    const modal = document.getElementById('sessionTimeoutModal');
    if (modal) {
      modal.style.display = 'none';
    }

    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    this.isWarningShown = false;
  }

  /**
   * Continue session by extending it
   */
  continueSession() {
    console.log('[SESSION TIMEOUT] User clicked continue session');
    this.hideWarning();
    this.handleUserActivity(); // This will extend session and reset timers
  }

  /**
   * Extend session on server
   */
  extendSession() {
    fetch('/api/session/extend', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        console.log('[SESSION TIMEOUT] Session extended');
      })
      .catch(err => console.error('[SESSION TIMEOUT] Error extending session:', err));
  }

  /**
   * Handle session timeout - logout user
   */
  handleSessionTimeout() {
    console.log('[SESSION TIMEOUT] Session timeout - logging out');
    
    // Clear all timers
    if (this.inactivityTimeout) clearTimeout(this.inactivityTimeout);
    if (this.warningTimeout) clearTimeout(this.warningTimeout);
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    if (this.statusCheckInterval) clearInterval(this.statusCheckInterval);

    // Redirect to logout
    window.location.href = '/logout';
  }

  /**
   * Start periodic session status check
   */
  startStatusCheck() {
    // Check every 30 seconds
    this.statusCheckInterval = setInterval(() => {
      fetch('/api/session/status')
        .then(res => res.json())
        .then(data => {
          if (!data.authenticated) {
            console.log('[SESSION TIMEOUT] Session no longer valid - logging out');
            this.handleSessionTimeout();
          }
        })
        .catch(err => console.error('[SESSION TIMEOUT] Error checking status:', err));
    }, 30000);
  }

  /**
   * Cleanup - stop all timers and listeners
   */
  destroy() {
    console.log('[SESSION TIMEOUT] Destroying manager');
    
    if (this.inactivityTimeout) clearTimeout(this.inactivityTimeout);
    if (this.warningTimeout) clearTimeout(this.warningTimeout);
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    if (this.statusCheckInterval) clearInterval(this.statusCheckInterval);

    this.activityEvents.forEach(event => {
      document.removeEventListener(event, this.handleUserActivity);
    });
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.sessionTimeoutManager = new SessionTimeoutManager();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (window.sessionTimeoutManager) {
    window.sessionTimeoutManager.destroy();
  }
});
