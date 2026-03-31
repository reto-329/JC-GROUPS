/**
 * Modal Manager
 * Handles all modal functionality - opening, closing, form submission
 */
class ModalManager {
  constructor() {
    this.modals = new Map();
    this.init();
  }

  /**
   * Initialize modal manager
   */
  init() {
    this.setupModals();
    this.attachEventListeners();
  }

  /**
   * Setup all modals on the page
   */
  setupModals() {
    const modalElements = document.querySelectorAll('[data-modal]');
    modalElements.forEach((modalEl) => {
      const modalId = modalEl.getAttribute('data-modal');
      this.modals.set(modalId, {
        element: modalEl,
        isOpen: false
      });
    });
  }

  /**
   * Attach event listeners to modal triggers and close buttons
   */
  attachEventListeners() {
    // Modal open buttons
    document.querySelectorAll('[data-modal-open]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const modalId = btn.getAttribute('data-modal-open');
        this.open(modalId);
      });
    });

    // Modal close buttons
    document.querySelectorAll('[data-modal-close]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const modalId = btn.getAttribute('data-modal-close');
        this.close(modalId);
      });
    });

    // Close on backdrop click
    document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          const modal = backdrop.closest('[data-modal]');
          const modalId = modal.getAttribute('data-modal');
          this.close(modalId);
        }
      });
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.modals.forEach((modal, modalId) => {
          if (modal.isOpen) {
            this.close(modalId);
          }
        });
      }
    });

    // Form submission handling
    document.querySelectorAll('[data-modal-form]').forEach((form) => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleFormSubmit(form);
      });
    });
  }

  /**
   * Open a modal
   */
  open(modalId) {
    const modal = this.modals.get(modalId);
    if (!modal) return;

    modal.element.classList.add('modal-open');
    modal.isOpen = true;
    document.body.style.overflow = 'hidden';

    // Trigger animation
    setTimeout(() => {
      modal.element.classList.add('modal-visible');
    }, 10);
  }

  /**
   * Close a modal
   */
  close(modalId) {
    const modal = this.modals.get(modalId);
    if (!modal) return;

    modal.element.classList.remove('modal-visible');
    
    setTimeout(() => {
      modal.element.classList.remove('modal-open');
      modal.isOpen = false;
      document.body.style.overflow = 'auto';
    }, 300);
  }

  /**
   * Handle form submission within modal
   */
  handleFormSubmit(form) {
    const formData = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';

    // Submit form normally for page reload
    setTimeout(() => {
      form.submit();
    }, 500);
  }

  /**
   * Show error message in modal
   */
  showError(modalId, message) {
    const modal = this.modals.get(modalId);
    if (!modal) return;

    const alertEl = document.createElement('div');
    alertEl.className = 'alert alert-error';
    alertEl.innerHTML = `
      <i class="fas fa-exclamation-circle"></i>
      ${message}
    `;

    const form = modal.element.querySelector('form');
    if (form) {
      form.insertBefore(alertEl, form.firstChild);
    }

    // Auto-remove after 5 seconds
    setTimeout(() => {
      alertEl.remove();
    }, 5000);
  }

  /**
   * Clear form in modal
   */
  clearForm(modalId) {
    const modal = this.modals.get(modalId);
    if (!modal) return;

    const form = modal.element.querySelector('form');
    if (form) {
      form.reset();
    }
  }

  /**
   * Toggle modal
   */
  toggle(modalId) {
    const modal = this.modals.get(modalId);
    if (!modal) return;

    if (modal.isOpen) {
      this.close(modalId);
    } else {
      this.open(modalId);
    }
  }

  /**
   * Check if modal is open
   */
  isOpen(modalId) {
    const modal = this.modals.get(modalId);
    return modal ? modal.isOpen : false;
  }
}

/**
 * Initialize modal manager when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
  window.modalManager = new ModalManager();
});

// Export for use in other scripts if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ModalManager;
}
