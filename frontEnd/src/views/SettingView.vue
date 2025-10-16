<template>
  <!-- Main page container with gradient background -->
  <div class="zen-page-container">
    <!-- Content wrapper -->
    <div class="zen-content-wrapper">
      <!-- Hero section -->
      <div class="zen-hero-section zen-fade-in">
        <div class="zen-app-logo">
          <div class="zen-logo-circle">
            <span class="zen-logo-text">⚙️</span>
          </div>
        </div>
        <h1 class="zen-page-title">Settings</h1>
        <p class="zen-page-subtitle">配置你的ZenFlow体验</p>
        <p class="zen-page-subtitle">Customize and manage your ZenFlow experience</p>
      </div>

      <!-- General settings card -->
      <div class="zen-card">
        <div class="zen-card-header">
          <h2>🔧 General Settings</h2>
        </div>
        <div class="zen-card-content">
          <div class="zen-feature-list">
            <div class="zen-feature-item">
              <span class="zen-feature-icon">🌐</span>
              <span>Language / 语言</span>
            </div>
            <div class="zen-feature-item">
              <span class="zen-feature-icon">🎨</span>
              <span>Theme</span>
            </div>
            <div class="zen-feature-item">
              <span class="zen-feature-icon">🔔</span>
              <span>Notifications</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Account settings card -->
      <div class="zen-card">
        <div class="zen-card-header">
          <h2>👤 Account Settings</h2>
        </div>
        <div class="zen-card-content">
          <div class="zen-feature-list">
            <div class="zen-feature-item">
              <span class="zen-feature-icon">📧</span>
              <span>Email Configuration</span>
            </div>
            <div class="zen-feature-item">
              <span class="zen-feature-icon">🔐</span>
              <span>Privacy & Security</span>
            </div>
            <div class="zen-feature-item">
              <span class="zen-feature-icon">💾</span>
              <span>Data Management</span>
            </div>
          </div>
        </div>
      </div>

      <!-- About section -->
      <div class="zen-card">
        <div class="zen-card-header">
          <h2>ℹ️ About</h2>
        </div>
        <div class="zen-card-content">
          <p>ZenFlow Version 1.0.0</p>
          <button class="zen-btn zen-mt-20" href="###">
            <span class="zen-btn-icon">📋</span>
            <span>View Changelog</span>
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
import navBar from '@/components/navBar.vue';
</script>

<style scoped>
/* Page-specific styles can be added here if needed */
</style>
