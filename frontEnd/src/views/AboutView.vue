<template>
  <!-- Main page container with gradient background -->
  <div class="zen-page-container">
    <!-- Content wrapper -->
    <div class="zen-content-wrapper">
      <!-- Hero section with app logo -->
      <div class="zen-hero-section zen-fade-in">
        <div class="zen-app-logo">
          <div class="zen-logo-circle">
            <span class="zen-logo-text">ZF</span>
          </div>
        </div>
        <h1 class="zen-page-title">ZenFlow</h1>
        <p class="zen-page-subtitle">禅意心流 - 让生活和工作变得简单</p>
        <p class="zen-page-subtitle">ZenFlow - Makes Life and Work More Efficient</p>
      </div>

      <!-- App information card -->
      <div class="zen-card">
        <div class="zen-card-header">
          <h2>📧 About the App</h2>
        </div>
        <div class="zen-card-content">
          <p>
            This is an App that helps you manage your tasks and stay organized.
            Upload your massive Emails and ZenFlow will organize everything properly for you,
            helping you stay on top of your tasks and deadlines.
          </p>
          <div class="zen-feature-list">
            <div class="zen-feature-item">
              <span class="zen-feature-icon">✨</span>
              <span>Smart Email Organization</span>
            </div>
            <div class="zen-feature-item">
              <span class="zen-feature-icon">📋</span>
              <span>Task Management</span>
            </div>
            <div class="zen-feature-item">
              <span class="zen-feature-icon">⚡</span>
              <span>Efficient Workflow</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Developer information card -->
      <div class="zen-card">
        <div class="zen-card-header">
          <h2>👨‍💻 About the Developer</h2>
        </div>
        <div class="zen-card-content">
          <p>
            This is an application developed independently by one developer.
            For more information about the author or you want to contact the developer, please visit the personal website:
          </p>
          <div class="zen-mt-20">
            <a href="https://httpwwwjackieren.org" target="_blank" class="zen-btn">
              <span class="zen-btn-icon">🌐</span>
              <span>Visit Website</span>
              <span class="zen-btn-arrow">→</span>
            </a>
          </div>
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
import navBar from '@/components/navBar.vue';
</script>

<style scoped>
/* Page-specific styles can be added here if needed */
</style>
