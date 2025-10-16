<template>
  <div class="zen-page-container">
    <!-- Navigation bar -->
    <navBar @back="goBack" />
    
    <!-- Main content -->
    <div class="zen-content-wrapper">
      <div class="zen-hero-section">
        <div class="zen-app-logo">
          <div class="zen-logo-circle">
            <span class="zen-logo-text">📧</span>
          </div>
        </div>
        <h1 class="zen-page-title">Gmail Messages</h1>
        <p class="zen-page-subtitle">Select emails to analyze</p>
      </div>

      <!-- User info -->
      <div class="zen-card" v-if="userInfo">
        <div class="zen-card-content">
          <div class="user-info">
            <img :src="userInfo.picture" :alt="userInfo.name" class="user-avatar">
            <div class="user-details">
              <h3>{{ userInfo.name }}</h3>
              <p>{{ userInfo.email }}</p>
            </div>
            <button class="zen-btn-secondary" @click="logout">Logout</button>
          </div>
        </div>
      </div>

      <!-- Email count selection -->
      <div class="zen-card" v-if="!emailsFetched && !loading">
        <div class="zen-card-content">
          <div class="email-selection">
            <h3>Select Number of Emails to Fetch</h3>
            <p>Choose how many recent emails you want to analyze:</p>
            
            <div class="email-count-options">
              <button 
                v-for="count in emailCountOptions" 
                :key="count"
                class="email-count-btn"
                :class="{ 'selected': selectedCount === count }"
                @click="selectedCount = count"
              >
                {{ count }} emails
              </button>
            </div>
            
            <div class="custom-count" v-if="selectedCount === 'custom'">
              <input 
                type="number" 
                v-model="customCount" 
                min="1" 
                max="100" 
                placeholder="Enter number (1-100)"
                class="custom-count-input"
              >
            </div>
            
            <button 
              class="zen-btn fetch-emails-btn" 
              @click="fetchEmailsWithCount"
              :disabled="!isValidSelection"
            >
              <span class="zen-btn-icon">📧</span>
              <span>Fetch Emails</span>
              <span class="zen-btn-arrow">→</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Error message -->
      <div class="zen-card error-card" v-if="showError">
        <div class="zen-card-content">
          <div class="error-state">
            <div class="error-icon">⚠️</div>
            <h3>Email Fetch Failed</h3>
            <p>{{ errorMessage }}</p>
            <div class="error-actions">
              <button class="zen-btn" @click="retryFetch">Retry</button>
              <button class="zen-btn-secondary" @click="resetToSelection">Choose Different Count</button>
              <button class="zen-btn-secondary" @click="goBack">Go Back</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading state -->
      <div class="zen-card" v-if="loading">
        <div class="zen-card-content">
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Fetching {{ getFinalCount() }} emails from your Gmail...</p>
          </div>
        </div>
      </div>

  <!-- Analyzing state -->
  <div class="zen-card" v-if="analyzing" ref="analyzingCard">
    <div class="zen-card-content">
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Analyzing selected emails and generating TODOs...</p>
      </div>
    </div>
  </div>

  <!-- Analysis results -->
  <div class="zen-card" v-if="!analyzing && (analysisTasks.length > 0 || analysisSummary)">
    <div class="zen-card-content">
      <div class="email-list-header">
        <h3>Analysis Results</h3>
        <div class="header-actions">
          <a v-if="analysisFile?.url" class="zen-btn" :href="analysisFile.url" target="_blank" rel="noopener">Download TODOs</a>
        </div>
      </div>

      <div v-if="analysisTasks.length > 0" class="email-list">
        <div v-for="(t, idx) in analysisTasks" :key="idx" class="email-item">
          <div class="email-content">
            <div class="email-header">
              <span class="email-from">{{ t.sender }} · {{ t.priority }}</span>
              <span class="email-date">{{ t.due_date ? formatDate(t.due_date) : 'No due date' }}</span>
            </div>
            <div class="email-subject">{{ t.title }}</div>
            <div class="email-snippet">{{ t.description }}</div>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <div class="empty-icon">📝</div>
        <h3>Summary</h3>
        <p style="white-space: pre-line">{{ analysisSummary }}</p>
      </div>
    </div>
  </div>

      <!-- Email list -->
      <div class="zen-card" v-if="!loading && emails.length > 0">
        <div class="zen-card-content">
          <div class="email-list-header">
            <h3>Recent Emails ({{ emails.length }})</h3>
            <div class="header-actions">
              <button class="zen-btn-secondary" @click="resetToSelection">Fetch Different Count</button>
              <button class="zen-btn-secondary" @click="refreshEmails">Refresh</button>
            </div>
          </div>
          
          <div class="email-list">
            <div 
              v-for="email in emails" 
              :key="email.id"
              class="email-item"
              :class="{ 'selected': selectedEmails.includes(email.id) }"
            >
              <div class="email-select">
                <select 
                  :value="selectedEmails.includes(email.id) ? 'selected' : 'not_selected'"
                  @change="onSelectChange($event, email.id)"
                >
                  <option value="not_selected">Not selected</option>
                  <option value="selected">Selected</option>
                </select>
              </div>
              <div class="email-content">
                <div class="email-header">
                  <span class="email-from">{{ email.from }}</span>
                  <span class="email-date">{{ formatDate(email.date) }}</span>
                </div>
                <div class="email-subject">{{ email.subject }}</div>
                <div class="email-snippet">{{ email.snippet }}</div>
              </div>
            </div>
          </div>

          <div class="email-list-footer">
            <button class="zen-btn-secondary" @click="selectAllEmails">Select All</button>
            <button class="zen-btn" @click="analyzeSelectedEmails" v-if="selectedEmails.length > 0">
              <span class="zen-btn-icon">🔍</span>
              <span>Analyze Selected ({{ selectedEmails.length }})</span>
              <span class="zen-btn-arrow">→</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div class="zen-card" v-if="!loading && emails.length === 0 && !showError && emailsFetched">
        <div class="zen-card-content">
          <div class="empty-state">
            <div class="empty-icon">📧</div>
            <h3>No emails found</h3>
            <p>We couldn't find any emails in your Gmail account.</p>
            <button class="zen-btn" @click="retryFetch">Try Again</button>
            <button class="zen-btn-secondary" @click="resetToSelection">Choose Different Count</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="js">
import { ref, onMounted, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import navBar from '@/components/navBar.vue'

const router = useRouter()
const loading = ref(false)
const userInfo = ref(null)
const emails = ref([])
const selectedEmails = ref([])
const errorMessage = ref('')
const showError = ref(false)
const emailsFetched = ref(false)
const selectedCount = ref(20)
const customCount = ref(20)
const analyzing = ref(false)
const analysisTasks = ref([])
const analysisSummary = ref('')
const analysisFile = ref(null)
const analyzingCard = ref(null)

// Email count options for user selection
const emailCountOptions = ref([10, 20, 50, 100, 'custom'])

// Computed property to check if selection is valid
const isValidSelection = computed(() => {
  if (selectedCount.value === 'custom') {
    return customCount.value >= 1 && customCount.value <= 100
  }
  return selectedCount.value > 0
})

// Get the final count to fetch
const getFinalCount = () => {
  return selectedCount.value === 'custom' ? customCount.value : selectedCount.value
}

const goBack = () => {
  router.push('/analyze')
}

const logout = async () => {
  try {
    await fetch('http://localhost:3000/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    })
    router.push('/analyze')
  } catch (error) {
    console.error('Logout error:', error)
  }
}

const fetchUserInfo = async () => {
  try {
    console.log('Fetching user authentication status...')
    const response = await fetch('http://localhost:3000/api/auth/status', {
      credentials: 'include'
    })
    const data = await response.json()
    console.log('Auth status response:', data)

    // Support both "isAuthenticated" (backend current) and "authenticated" (legacy) keys
    const isAuthed = !!(data.isAuthenticated ?? data.authenticated ?? data.user)

    if (isAuthed) {
      userInfo.value = data.user
      console.log('User authenticated successfully:', data.user)
    } else {
      console.log('User not authenticated, redirecting to analyze page')
      router.push('/analyze')
    }
  } catch (error) {
    console.error('Error fetching user info:', error)
    console.log('Network error, redirecting to analyze page')
    router.push('/analyze')
  }
}

const fetchEmailsWithCount = async () => {
  const count = getFinalCount()
  try {
    loading.value = true
    showError.value = false
    const response = await fetch(`http://localhost:3000/api/gmail/emails?count=${count}`, {
      credentials: 'include'
    })
    const data = await response.json()
    if (data.success) {
      emails.value = data.emails
      emailsFetched.value = true
    } else {
      console.error('Error fetching emails:', data.error)
      errorMessage.value = data.error || 'Failed to fetch emails'
      showError.value = true
    }
  } catch (error) {
    console.error('Error fetching emails:', error)
    errorMessage.value = 'Network error occurred while fetching emails'
    showError.value = true
  } finally {
    loading.value = false
  }
}

const retryFetch = () => {
  fetchEmailsWithCount()
}

const resetToSelection = () => {
  emailsFetched.value = false
  emails.value = []
  selectedEmails.value = []
  showError.value = false
  errorMessage.value = ''
}

const refreshEmails = () => {
  selectedEmails.value = []
  fetchEmailsWithCount()
}

const onSelectChange = (event, emailId) => {
  const value = event.target.value
  if (value === 'selected') {
    if (!selectedEmails.value.includes(emailId)) {
      selectedEmails.value.push(emailId)
    }
  } else {
    const index = selectedEmails.value.indexOf(emailId)
    if (index > -1) {
      selectedEmails.value.splice(index, 1)
    }
  }
}

const selectAllEmails = () => {
  selectedEmails.value = emails.value.map(e => e.id)
}

const analyzeSelectedEmails = async () => {
  try {
    if (selectedEmails.value.length === 0) return
    analyzing.value = true
    await nextTick()
    analyzingCard.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    showError.value = false
    errorMessage.value = ''

    const response = await fetch('http://localhost:3000/api/analyze', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageIds: selectedEmails.value, outputFormat: 'docx' })
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      const msg = data.error || `Analyze failed (status ${response.status})`
      errorMessage.value = data.remaining !== undefined 
        ? `${msg}. Remaining today: ${data.remaining}` 
        : msg
      showError.value = true
      return
    }

    analysisTasks.value = Array.isArray(data.tasks) ? data.tasks : []
    analysisSummary.value = data.summary || ''
    analysisFile.value = data.file || null
  } catch (error) {
    console.error('Analyze error:', error)
    errorMessage.value = 'Network error occurred during analysis'
    showError.value = true
  } finally {
    analyzing.value = false
  }
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now - date)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 1) {
    return 'Today'
  } else if (diffDays === 2) {
    return 'Yesterday'
  } else if (diffDays <= 7) {
    return `${diffDays - 1} days ago`
  } else {
    return date.toLocaleDateString()
  }
}

// Only fetch user info on mount, not emails
onMounted(() => {
  fetchUserInfo()
})
</script>

<style scoped>
/* Use global sci-fi theme styles */

/* Email selection styles */
.email-selection {
  text-align: center;
  padding: 30px 20px;
}

.email-selection h3 {
  color: var(--text-primary);
  margin-bottom: 10px;
  font-weight: 300;
  letter-spacing: 0.5px;
  font-size: 1.4rem;
}

.email-selection p {
  color: var(--text-secondary);
  margin-bottom: 30px;
  font-size: 1rem;
}

.email-count-options {
  display: flex;
  gap: 15px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 25px;
}

.email-count-btn {
  padding: 12px 20px;
  border: 1px solid var(--card-border);
  background: var(--secondary-bg);
  color: var(--text-primary);
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: var(--transition);
  font-size: 0.95rem;
  font-weight: 300;
  letter-spacing: 0.3px;
  min-width: 100px;
}

.email-count-btn:hover {
  background: var(--tertiary-bg);
  border-color: var(--accent-color);
  box-shadow: var(--glow-effect);
}

.email-count-btn.selected {
  background: var(--accent-color);
  color: var(--primary-bg);
  border-color: var(--accent-color);
  box-shadow: var(--glow-effect);
}

.custom-count {
  margin-bottom: 25px;
}

.custom-count-input {
  padding: 12px 15px;
  border: 1px solid var(--card-border);
  background: var(--secondary-bg);
  color: var(--text-primary);
  border-radius: var(--border-radius);
  font-size: 1rem;
  width: 200px;
  text-align: center;
}

.custom-count-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: var(--glow-effect);
}

.fetch-emails-btn {
  margin-top: 10px;
}

.fetch-emails-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.user-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--card-border);
}

.user-details {
  flex: 1;
}

.user-details h3 {
  margin: 0 0 5px 0;
  font-size: 1.2rem;
  color: var(--text-primary);
  font-weight: 300;
  letter-spacing: 0.5px;
}

.user-details p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.loading-state {
  text-align: center;
  padding: 40px 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 2px solid var(--card-border);
  border-top: 2px solid var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-state {
  text-align: center;
  padding: 40px 20px;
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 20px;
}

.error-state h3 {
  color: var(--text-primary);
  margin-bottom: 10px;
  font-weight: 300;
  letter-spacing: 0.5px;
}

.error-state p {
  color: var(--text-secondary);
  margin-bottom: 30px;
}

.error-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
  flex-wrap: wrap;
}

.email-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--card-border);
}

.email-list-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.3rem;
  font-weight: 300;
  letter-spacing: 0.5px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.email-list {
  max-height: 600px;
  overflow-y: auto;
}

.email-item {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  padding: 15px;
  border: 1px solid var(--card-border);
  border-radius: var(--border-radius);
  margin-bottom: 10px;
  cursor: pointer;
  transition: var(--transition);
  background: var(--secondary-bg);
}

.email-item:hover {
  background: var(--tertiary-bg);
  border-color: var(--accent-color);
  box-shadow: var(--glow-effect);
}

.email-item.selected {
  background: var(--tertiary-bg);
  border-color: var(--accent-color);
  box-shadow: var(--glow-effect);
}

.email-select select {
  padding: 8px 10px;
  border: 1px solid var(--card-border);
  background: var(--secondary-bg);
  color: var(--text-primary);
  border-radius: var(--border-radius);
  font-size: 0.9rem;
}

.email-content {
  flex: 1;
  min-width: 0;
}

.email-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.email-from {
  font-weight: 400;
  color: var(--text-primary);
  font-size: 0.95rem;
  letter-spacing: 0.3px;
}

.email-date {
  color: var(--text-muted);
  font-size: 0.85rem;
}

.email-subject {
  font-weight: 400;
  color: var(--text-primary);
  margin-bottom: 5px;
  font-size: 1rem;
  letter-spacing: 0.3px;
}

.email-snippet {
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.4;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.email-list-footer {
  margin-top: 25px;
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid var(--card-border);
  display: flex;
  gap: 12px;
  justify-content: center;
}

.email-actions {
  margin-top: 25px;
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid var(--card-border);
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 20px;
  opacity: 0.6;
}

.empty-state h3 {
  color: var(--text-primary);
  margin-bottom: 10px;
  font-weight: 300;
  letter-spacing: 0.5px;
}

.empty-state p {
  color: var(--text-secondary);
  margin-bottom: 30px;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .email-count-options {
    flex-direction: column;
    align-items: center;
  }
  
  .email-count-btn {
    width: 200px;
  }
  
  .header-actions {
    flex-direction: column;
    gap: 8px;
  }
  
  .error-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .email-item {
    flex-direction: column;
    gap: 10px;
  }
  
  .email-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
}
</style>