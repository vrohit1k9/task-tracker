const auth = {
  getUser: () => {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch (e) {
      return null;
    }
  },

  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('accessToken');
  },

  isAdmin: () => {
    const user = auth.getUser();
    return user && user.role === 'admin';
  },

  // Protect current page from unauthorized visits
  protectPage: () => {
    const path = window.location.pathname;
    
    // Auth-only pages
    const isAuthPage = path.includes('dashboard.html') || 
                       path.includes('tasks.html') || 
                       path.includes('admin.html') || 
                       path.includes('profile.html');

    if (isAuthPage && !auth.isAuthenticated()) {
      window.location.href = '/index.html';
      return;
    }

    // Admin-only pages
    if (path.includes('admin.html') && !auth.isAdmin()) {
      window.location.href = '/dashboard.html';
    }
  },

  // Log in form submit
  login: async (email, password) => {
    try {
      const data = await api.post('/auth/login', { email, password });
      api.setTokens(data.accessToken, data.refreshToken);
      auth.setUser(data.user);
      showToast('Logged in successfully', 'success');
      setTimeout(() => {
        window.location.href = '/dashboard.html';
      }, 1000);
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  // Sign up form submit
  register: async (username, email, password, role = 'student') => {
    try {
      const data = await api.post('/auth/register', { username, email, password, role });
      api.setTokens(data.accessToken, data.refreshToken);
      auth.setUser(data.user);
      showToast('Account registered successfully', 'success');
      setTimeout(() => {
        window.location.href = '/dashboard.html';
      }, 1000);
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  // Open mock Google login chooser modal
  loginWithGoogle: () => {
    const modal = document.getElementById('googleModal');
    if (modal) {
      modal.style.display = 'flex';
    }
  },

  // Authenticate using chosen Google account
  loginWithGoogleUser: async (email, username) => {
    try {
      const modal = document.getElementById('googleModal');
      if (modal) modal.style.display = 'none';
      
      const data = await api.post('/auth/google', { email, username });
      api.setTokens(data.accessToken, data.refreshToken);
      auth.setUser(data.user);
      showToast('Logged in with Google Account successfully', 'success');
      setTimeout(() => {
        window.location.href = '/dashboard.html';
      }, 1000);
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  // Logout trigger
  logout: async () => {
    try {
      const tokens = api.getTokens();
      if (tokens.refreshToken) {
        await api.post('/auth/logout', { refreshToken: tokens.refreshToken });
      }
    } catch (err) {
      console.error('Logout API failed:', err);
    } finally {
      api.clearTokens();
      window.location.href = '/index.html';
    }
  }
};

// Auto check path guards on page load
auth.protectPage();
