# Sidebar Component Guide

## Overview
The sidebar component is a reusable navigation partial located in `views/partials/sidebar.ejs` that provides a consistent user navigation interface with hamburger menu support for mobile devices.

## Features
- ✅ Hamburger menu for mobile devices
- ✅ Responsive sidebar (fixed on desktop, slide-out on mobile)
- ✅ Auto-close on item click
- ✅ Overlay backdrop (mobile)
- ✅ Active tab highlighting
- ✅ Customizable title and icon
- ✅ Accessible markup with ARIA labels

## Usage

### Basic Implementation
Include the sidebar in your page by using the following include statement:

```ejs
<%- include('partials/sidebar', { activeTab: 'profile', sidebarData: { title: 'My Profile', icon: 'fas fa-user-circle' } }) %>
```

### Parameters

#### `activeTab` (Required)
Highlights the active navigation item. Options:
- `'profile'` - Profile Information
- `'orders'` - My Orders
- `'security'` - Security

```ejs
<%- include('partials/sidebar', { activeTab: 'profile', sidebarData: {...} }) %>
```

#### `sidebarData` (Optional)
Object containing:
- `title` - Sidebar heading (default: "Welcome Back!")
- `icon` - Font Awesome icon class (default: "fas fa-user")

```ejs
<%- include('partials/sidebar', { 
  activeTab: 'profile', 
  sidebarData: { 
    title: 'My Profile', 
    icon: 'fas fa-user-circle' 
  } 
}) %>
```

### Complete Example

```ejs
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- ... other head content ... -->
  <link rel="stylesheet" href="/css/profile.css">
</head>
<body>
  <%- include('partials/header') %>

  <section class="profile-hero">
    <!-- hero content -->
  </section>

  <main class="profile-container">
    <div class="profile-grid">
      <!-- Include the sidebar component -->
      <%- include('partials/sidebar', { 
        activeTab: 'profile', 
        sidebarData: { 
          title: 'My Profile', 
          icon: 'fas fa-user-circle' 
        } 
      }) %>

      <!-- Main content area -->
      <div class="profile-content">
        <!-- Your page content here -->
      </div>
    </div>
  </main>

  <%- include('partials/footer') %>
</body>
</html>
```

## Styling Requirements

Ensure the following CSS is linked in your page:
```html
<link rel="stylesheet" href="/css/profile.css">
```

The profile.css file contains all styles for:
- `.profile-container` - Main container
- `.profile-grid` - Grid layout with sidebar
- `.sidebar-hamburger` - Hamburger button
- `.user-sidebar` - Sidebar container
- `.sidebar-overlay` - Mobile overlay
- `.profile-nav` - Navigation menu

## JavaScript Behavior

The sidebar component includes built-in JavaScript that:
1. Toggles sidebar on hamburger click
2. Closes sidebar on item click
3. Closes sidebar on overlay click
4. Closes sidebar on outside click (except hamburger)
5. Manages active states and animations

**No additional JavaScript required!** All functionality is self-contained in the sidebar partial.

## Responsive Breakpoints

### Desktop (1024px and up)
- Sidebar: Fixed width (280px), positioned left of content
- Hamburger: Hidden
- Overlay: Hidden

### Tablet (768px - 1023px)
- Sidebar: Sticky positioned, full width stacked
- Hamburger: Visible
- Overlay: Visible when sidebar open

### Mobile (768px and below)
- Sidebar: Fixed position, slides in from left
- Hamburger: Visible and functional
- Overlay: Visible and clickable to close

## Navigation Links

The sidebar includes these default navigation items:
- Profile Information → `/profile`
- My Orders → `/orders`
- Security → `/security`
- Settings → `#` (placeholder)
- Help → `#` (placeholder)
- Logout → `/logout`

Update these links in `views/partials/sidebar.ejs` if your routes differ.

## Pages Currently Using Sidebar

1. **profile.ejs** - User profile page
2. **security.ejs** - Security/password page
3. **orders.ejs** - Orders management page

## Adding to New Pages

To add the sidebar to a new page:

1. **Include profile.css:**
   ```html
   <link rel="stylesheet" href="/css/profile.css">
   ```

2. **Use profile-container and profile-grid:**
   ```html
   <main class="profile-container">
     <div class="profile-grid">
       <!-- sidebar goes here -->
     </div>
   </main>
   ```

3. **Include the sidebar partial:**
   ```ejs
   <%- include('partials/sidebar', { activeTab: 'yourTab', sidebarData: {...} }) %>
   ```

## Customization

### Change Active Tab Color
Edit `.nav-item.active` in `public/css/profile.css`

### Change Sidebar Width (Desktop)
Edit `.profile-grid { grid-template-columns: 280px 1fr; }` width value

### Change Hamburger Position
Edit `.sidebar-hamburger` positioning in `public/css/profile.css`

### Change Sidebar Animation
Edit `transform: translateX(-100%)` and transition in `.user-sidebar`

## Accessibility Features

- ✅ `aria-label` on hamburger and close buttons
- ✅ `aria-controls` attribute for screen readers
- ✅ Semantic `<nav>` and `<aside>` elements
- ✅ Proper heading hierarchy
- ✅ Keyboard accessible links
- ✅ Focus visible states

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Troubleshooting

### Sidebar not showing hamburger on mobile
- ✅ Ensure viewport meta tag: `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
- ✅ Include profile.css: `<link rel="stylesheet" href="/css/profile.css">`

### Navigation links not working
- ✅ Check route paths in sidebar.ejs
- ✅ Ensure backend routes are defined

### Sidebar overlapping content
- ✅ Ensure profile-grid uses correct container structure
- ✅ Check CSS z-index values (sidebar: 999, overlay: 998)

## File Locations

- **Partial:** `views/partials/sidebar.ejs`
- **Styles:** `public/css/profile.css`
- **JavaScript:** Embedded in sidebar.ejs
