/**
 * Dropdown Menu Manager
 * Handles all dropdown functionality with accessibility features
 * Supports both desktop (hover) and mobile (click) interactions
 */

class DropdownManager {
  constructor() {
    this.activeDropdown = null;
    this.isTouch = this.detectTouchDevice();
    this.init();
  }

  /**
   * Detect if device supports touch
   */
  detectTouchDevice() {
    return (
      () =>
        (typeof window !== 'undefined' &&
          ('ontouchstart' in window ||
            (window.DocumentTouch &&
              typeof document !== 'undefined' &&
              document instanceof window.DocumentTouch))) ||
        (typeof navigator !== 'undefined' &&
          (navigator.maxTouchPoints > 0 ||
            navigator.msMaxTouchPoints > 0))
    )();
  }

  /**
   * Initialize dropdown manager
   */
  init() {
    this.setupDropdowns();
    this.attachEventListeners();
  }

  /**
   * Setup all dropdowns on the page
   */
  setupDropdowns() {
    const dropdowns = document.querySelectorAll('.account-dropdown');
    dropdowns.forEach((dropdown) => {
      const trigger = dropdown.querySelector('.account-trigger');
      if (trigger) {
        trigger.setAttribute('role', 'button');
        trigger.setAttribute('aria-haspopup', 'menu');
        trigger.setAttribute('aria-expanded', 'false');
      }

      const menu = dropdown.querySelector('.account-dropdown-menu');
      if (menu) {
        menu.setAttribute('role', 'menu');
        this.setupMenuItems(menu);
      }
    });
  }

  /**
   * Setup menu items with proper ARIA attributes
   */
  setupMenuItems(menu) {
    const items = menu.querySelectorAll('.account-dropdown-item');
    items.forEach((item, index) => {
      item.setAttribute('role', 'menuitem');
      item.setAttribute('tabindex', index === 0 ? '0' : '-1');
    });
  }

  /**
   * Attach event listeners to all interactable elements
   */
  attachEventListeners() {
    // Desktop: Hover support
    if (!this.isTouch) {
      document.querySelectorAll('.account-dropdown').forEach((dropdown) => {
        dropdown.addEventListener('mouseenter', () =>
          this.openDropdown(dropdown)
        );
        dropdown.addEventListener('mouseleave', () =>
          this.closeDropdown(dropdown)
        );
      });
    }

    // All devices: Click to toggle
    document.querySelectorAll('.account-trigger').forEach((trigger) => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const dropdown = trigger.closest('.account-dropdown');
        this.toggleDropdown(dropdown);
      });

      // Keyboard support
      trigger.addEventListener('keydown', (e) => {
        const dropdown = trigger.closest('.account-dropdown');
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.toggleDropdown(dropdown);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.openDropdown(dropdown);
          this.focusFirstMenuItem(dropdown);
        } else if (e.key === 'Escape') {
          this.closeDropdown(dropdown);
          trigger.focus();
        }
      });
    });

    // Menu items keyboard navigation
    document.querySelectorAll('.account-dropdown-item').forEach((item) => {
      item.addEventListener('keydown', (e) => {
        const menu = item.closest('.account-dropdown-menu');
        const items = Array.from(menu.querySelectorAll('.account-dropdown-item'));
        const currentIndex = items.indexOf(item);

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const nextItem = items[currentIndex + 1];
          if (nextItem) {
            nextItem.focus();
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prevItem = items[currentIndex - 1];
          if (prevItem) {
            prevItem.focus();
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          const dropdown = item.closest('.account-dropdown');
          this.closeDropdown(dropdown);
          dropdown.querySelector('.account-trigger').focus();
        } else if (e.key === 'Home') {
          e.preventDefault();
          items[0]?.focus();
        } else if (e.key === 'End') {
          e.preventDefault();
          items[items.length - 1]?.focus();
        }
      });

      // Close dropdown when item is clicked
      item.addEventListener('click', () => {
        const dropdown = item.closest('.account-dropdown');
        this.closeDropdown(dropdown);
      });
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.account-dropdown')) {
        document.querySelectorAll('.account-dropdown.active').forEach((dropdown) => {
          this.closeDropdown(dropdown);
        });
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.account-dropdown.active').forEach((dropdown) => {
          this.closeDropdown(dropdown);
        });
      }
    });
  }

  /**
   * Open a dropdown
   */
  openDropdown(dropdown) {
    if (!dropdown) return;

    // Close other dropdowns if any
    document.querySelectorAll('.account-dropdown.active').forEach((other) => {
      if (other !== dropdown) {
        this.closeDropdown(other);
      }
    });

    dropdown.classList.add('active');
    const trigger = dropdown.querySelector('.account-trigger');
    if (trigger) {
      trigger.setAttribute('aria-expanded', 'true');
    }
    this.activeDropdown = dropdown;
  }

  /**
   * Close a dropdown
   */
  closeDropdown(dropdown) {
    if (!dropdown) return;
    dropdown.classList.remove('active');
    const trigger = dropdown.querySelector('.account-trigger');
    if (trigger) {
      trigger.setAttribute('aria-expanded', 'false');
    }
    if (this.activeDropdown === dropdown) {
      this.activeDropdown = null;
    }
  }

  /**
   * Toggle dropdown open/closed
   */
  toggleDropdown(dropdown) {
    if (!dropdown) return;
    if (dropdown.classList.contains('active')) {
      this.closeDropdown(dropdown);
    } else {
      this.openDropdown(dropdown);
    }
  }

  /**
   * Focus first menu item
   */
  focusFirstMenuItem(dropdown) {
    const firstItem = dropdown.querySelector('.account-dropdown-item');
    if (firstItem) {
      firstItem.focus();
      firstItem.setAttribute('tabindex', '0');
    }
  }

  /**
   * Close all dropdowns
   */
  closeAll() {
    document.querySelectorAll('.account-dropdown.active').forEach((dropdown) => {
      this.closeDropdown(dropdown);
    });
  }
}

/**
 * Initialize the dropdown manager when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
  new DropdownManager();
});

// Export for use in other scripts if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DropdownManager;
}
