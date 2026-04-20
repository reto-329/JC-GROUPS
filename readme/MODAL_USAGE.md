<!-- Modal Example Component -->
<!-- Add this to your EJS files to create a modal -->

<!-- Login Modal -->
<div class="modal-wrapper" data-modal="loginModal">
  <div class="modal-backdrop"></div>
  <div class="modal-container">
    <div class="modal-header">
      <h2>Sign In</h2>
      <button class="modal-close" data-modal-close="loginModal" aria-label="Close">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <div class="modal-body">
      <form data-modal-form method="POST" action="/login">
        <div class="form-group">
          <label for="loginEmail">Email</label>
          <input type="email" id="loginEmail" name="email" required>
        </div>

        <div class="form-group">
          <label for="loginPassword">Password</label>
          <input type="password" id="loginPassword" name="password" required>
        </div>

        <div class="form-group">
          <label class="remember-me">
            <input type="checkbox" name="remember">
            Remember me
          </label>
        </div>
      </form>
    </div>

    <div class="modal-footer">
      <button type="button" class="btn-secondary" data-modal-close="loginModal">
        Cancel
      </button>
      <button type="submit" class="btn-primary" form="loginForm">
        Sign In
      </button>
    </div>
  </div>
</div>

<!-- Register Modal -->
<div class="modal-wrapper" data-modal="registerModal">
  <div class="modal-backdrop"></div>
  <div class="modal-container">
    <div class="modal-header">
      <h2>Create Account</h2>
      <button class="modal-close" data-modal-close="registerModal" aria-label="Close">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <div class="modal-body">
      <form id="registerForm" data-modal-form method="POST" action="/register">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div class="form-group">
            <label for="regFirstName">First Name</label>
            <input type="text" id="regFirstName" name="firstName" required>
          </div>

          <div class="form-group">
            <label for="regLastName">Last Name</label>
            <input type="text" id="regLastName" name="lastName" required>
          </div>
        </div>

        <div class="form-group">
          <label for="regEmail">Email</label>
          <input type="email" id="regEmail" name="email" required>
        </div>

        <div class="form-group">
          <label for="regPassword">Password</label>
          <input type="password" id="regPassword" name="password" required minlength="6">
        </div>

        <div class="form-group">
          <label for="regConfirmPassword">Confirm Password</label>
          <input type="password" id="regConfirmPassword" name="confirmPassword" required minlength="6">
        </div>
      </form>
    </div>

    <div class="modal-footer">
      <button type="button" class="btn-secondary" data-modal-close="registerModal">
        Cancel
      </button>
      <button type="submit" class="btn-primary" form="registerForm">
        Create Account
      </button>
    </div>
  </div>
</div>

<!-- Usage Documentation -->
<!-- 
  To use modals in your views:

  1. Include the modal CSS and JS in the head:
     <link rel="stylesheet" href="/css/modal.css">
     <script src="/js/modal.js"></script>

  2. Open a modal with button:
     <button data-modal-open="loginModal">Open Login</button>

  3. Close a modal with button:
     <button data-modal-close="loginModal">Close</button>

  4. Access from JavaScript:
     window.modalManager.open('loginModal');
     window.modalManager.close('loginModal');
     window.modalManager.toggle('loginModal');
     window.modalManager.clearForm('loginModal');
     window.modalManager.showError('loginModal', 'Error message');

  5. Form data:
     - Forms with data-modal-form attribute auto-submit
     - Use form attribute="formId" on submit buttons to link to forms
     - Form actions determine where data is posted

  6. Keyboard shortcuts:
     - Escape key closes all open modals
     - Clicking backdrop closes modal
     - Tab navigation supported through form
 -->
