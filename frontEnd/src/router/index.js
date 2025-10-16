import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import AboutView from '@/views/AboutView.vue'
import SettingView from '@/views/SettingView.vue'
import AnalyzeView from '@/views/AnalyzeView.vue'
import EmailListView from '@/views/EmailListView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [

    {
      path:'/',
      name:'Home',
      component:HomeView,
    },

    {
      path:'/about',
      name:'About',
      component:AboutView,
    },

    {
      path:'/setting',
      name:'Setting',
      component:SettingView,
    },

    {
      path:'/analyze',
      name:'Analyze',
      component:AnalyzeView,
    },

    {
      path:'/emails',
      name:'EmailList',
      component:EmailListView,
    },
  ],
})

export default router
