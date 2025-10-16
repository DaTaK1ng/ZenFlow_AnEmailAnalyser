<template>
  <!-- Main page container with gradient background -->
  <div class="zen-page-container">
    <!-- Content wrapper -->
    <div class="zen-content-wrapper">
      <!-- Hero section -->
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

      <!-- Email input card -->
      <div class="zen-card">
        <div class="zen-card-header">
          <h2>📧 Email Management</h2>
        </div>
        <div class="zen-card-content">
          <p>Upload your emails and let ZenFlow organize them for you:</p>
          <button class="zen-btn" @click="goAnalyze">
            <span class="zen-btn-icon">⚡</span>
            <span>Analyze Emails</span>
            <span class="zen-btn-arrow">→</span>
          </button>
        </div>
      </div>

      <!-- Quick actions card -->
      <div class="zen-card">
        <div class="zen-card-header">
          <h2>🚀 What Can ZenFlow Do?</h2>
        </div>
        <div class="zen-card-content">
          <div class="zen-feature-list">
            <div class="zen-feature-item">
              <span class="zen-feature-icon">📊</span>
              <span>Analyze Emails</span>
            </div>

            <div class="zen-feature-item">
              <span class="zen-feature-icon">📋</span>
              <span>Make a Schedule</span>
            </div>
            
            <div class="zen-feature-item">
              <span class="zen-feature-icon">⚙️</span>
              <span>Analyze meeting</span>
            </div>

            <div class="zen-feature-item">
              <span class="zen-feature-icon">📱</span>
              <span>Mobile App</span>
            </div>
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
import navBar from '@/components/navBar.vue'

import { useRouter } from 'vue-router'

const router = useRouter()

const goAnalyze = () => {
  router.push('/analyze')
}
</script>

<style scoped>
/* Page-specific styles can be added here if needed */
</style>
