<template>
  <!-- Main page container with gradient background -->
  <div class="zen-page-container">
    <!-- Back button -->
    <button class="back-btn" @click="goBack">
      <span class="back-icon">←</span>
      <span class="back-text">Back</span>
    </button>
    
    <!-- Content wrapper -->
    <div class="zen-content-wrapper">
      <!-- Hero section -->
      <div class="zen-hero-section zen-fade-in">
        <div class="zen-app-logo">
          <div class="zen-logo-circle">
            <span class="zen-logo-text">📧</span>
          </div>
        </div>
        <h1 class="zen-page-title">Email Analysis</h1>
        <p class="zen-page-subtitle">Smart Email Analysis - Make Email Management Efficient</p>
      </div>

      <!-- Email analysis content -->
      <div class="zen-card">
        <div class="zen-card-header">
          <h2>📧 Email Analysis</h2>
        </div>
        <div class="zen-card-content">
          <p>Connect your email account and analyze your messages:</p>
          <button class="zen-btn" @click="connectGmail">
            <span class="zen-btn-icon">🔗</span>
            <span>Connect Gmail</span>
            <span class="zen-btn-arrow">→</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Bottom navigation bar -->
    <div class="zen-nav-container">
      <navBar />
    </div>
  </div>
</template>

<script setup lang="js">
// Import navigation bar component
import navBar from '@/components/navBar.vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const goBack = () => {
  router.push('/')
}

const connectGmail = async () => {
  try {
    // Check if user is already authenticated
    const statusResponse = await fetch('http://localhost:3000/api/auth/status', {
      credentials: 'include'
    })
    const statusData = await statusResponse.json()

    // Support both "isAuthenticated" (backend current) and "authenticated" (legacy) keys
    const isAuthed = !!(statusData.isAuthenticated ?? statusData.authenticated ?? statusData.user)

    if (isAuthed) {
      // User is already authenticated, navigate directly to email selection
      router.push('/emails')
    } else {
      // User not authenticated, redirect to Google OAuth
      // After successful authentication, backend will redirect to /emails
      window.location.href = 'http://localhost:3000/api/auth/google'
    }
  } catch (error) {
    console.error('Error checking authentication status:', error)
    // Fallback to OAuth redirect
    window.location.href = 'http://localhost:3000/api/auth/google'
  }
}

// Removed automatic authentication check to prevent page flashing
// Users will only navigate to emails page after clicking "Connect Gmail"
</script>

<style scoped>
/* Back button styles */
.back-btn {
  position: absolute;
  top: 20px;
  left: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  color: var(--zen-text-primary);
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  z-index: 100;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
}

.back-btn:active {
  transform: translateY(0);
}

.back-icon {
  font-size: 18px;
  font-weight: bold;
  transition: transform 0.3s ease;
}

.back-btn:hover .back-icon {
  transform: translateX(-2px);
}

.back-text {
  text-transform: uppercase;
}

/* Responsive design for back button */
@media (max-width: 768px) {
  .back-btn {
    top: 16px;
    left: 16px;
    padding: 10px 14px;
    font-size: 13px;
  }
  
  .back-icon {
    font-size: 16px;
  }
}

@media (max-width: 480px) {
  .back-btn {
    top: 12px;
    left: 12px;
    padding: 8px 12px;
    font-size: 12px;
  }
  
  .back-text {
    display: none; /* Hide text on very small screens, show only icon */
  }
}
</style>
