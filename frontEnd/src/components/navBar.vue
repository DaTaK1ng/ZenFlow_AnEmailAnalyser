<template>
  <van-tabbar 
    v-model="activeTab" 
    @change="onTabChange"
    :fixed="true"
    :placeholder="true"
    :safe-area-inset-bottom="true"
  >
    <van-tabbar-item 
      name="home" 
      icon="home-o"
      @click="goHome"
    >
      Home
    </van-tabbar-item>
    
    <van-tabbar-item 
      name="about" 
      icon="info-o"
      @click="goAbout"
    >
      About
    </van-tabbar-item>
    
    <van-tabbar-item 
      name="setting" 
      icon="setting-o"
      @click="goSetting"
    >
      Settings
    </van-tabbar-item>
  </van-tabbar>
</template>

<script setup lang="js">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const activeTab = ref('home')

// 根据当前路由设置活跃标签
onMounted(() => {
  const path = route.path
  if (path === '/') {
    activeTab.value = 'home'
  } else if (path === '/about') {
    activeTab.value = 'about'
  } else if (path === '/setting') {
    activeTab.value = 'setting'
  }
})

const goHome = () => {
  router.push('/')
  activeTab.value = 'home'
}

const goAbout = () => {
  router.push('/about')
  activeTab.value = 'about'
}

const goSetting = () => {
  router.push('/setting')
  activeTab.value = 'setting'
}

const onTabChange = (name) => {
  switch (name) {
    case 'home':
      goHome()
      break
    case 'about':
      goAbout()
      break
    case 'setting':
      goSetting()
      break
  }
}
</script>

<style scoped>
/* 自定义底部导航栏样式 - 融入界面的科幻风格 */
:deep(.van-tabbar) {
  background: transparent !important;
  backdrop-filter: blur(20px);
  box-shadow: none !important;
  border-top: none !important;
  z-index: 1000;
  position: relative;
}

:deep(.van-tabbar)::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(10, 10, 10, 0.8);
  backdrop-filter: blur(20px);
  z-index: -1;
}

:deep(.van-tabbar-item) {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  color: rgba(255, 255, 255, 0.7) !important;
  position: relative;
  overflow: hidden;
}

:deep(.van-tabbar-item)::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, transparent, rgba(255, 255, 255, 0.05), transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
}

:deep(.van-tabbar-item:hover)::before {
  opacity: 1;
}

:deep(.van-tabbar-item--active) {
  color: #ffffff !important;
  background: transparent !important;
}

:deep(.van-tabbar-item--active)::after {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 2px;
  height: 3px;
  background: #ffffff;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
}

:deep(.van-tabbar-item__text) {
  color: inherit !important;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace !important;
  font-weight: 300 !important;
  letter-spacing: 0.5px !important;
  text-transform: uppercase !important;
  font-size: 11px !important;
}

:deep(.van-tabbar-item__icon) {
  color: inherit !important;
  margin-bottom: 2px !important;
}

/* 悬停效果 */
:deep(.van-tabbar-item:hover) {
  color: rgba(255, 255, 255, 0.9) !important;
  transform: translateY(-1px);
}

:deep(.van-tabbar-item--active:hover) {
  color: #ffffff !important;
}

/* 响应式调整 */
@media (max-width: 480px) {
  :deep(.van-tabbar-item__text) {
    font-size: 10px !important;
  }
}

@media (min-width: 769px) {
  :deep(.van-tabbar) {
    max-width: 768px;
    left: 50%;
    transform: translateX(-50%);
    border-radius: 0 !important;
  }
}

/* 扫描线效果 */
:deep(.van-tabbar)::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: scan 3s linear infinite;
}

@keyframes scan {
  0% { left: -100%; }
  100% { left: 100%; }
}
</style>
