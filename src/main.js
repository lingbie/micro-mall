import { createApp } from 'vue' 
import App from './App.vue' 
 
 
import Vant from 'vant' 
import 'vant/lib/index.css' 
import router from './router' 
import { createPinia } from 'pinia' 
import piniaPluginPersist from 'pinia-plugin-persist' 
import { showToast } from 'vant'

const pinia = createPinia() 
pinia.use(piniaPluginPersist) 
 
const app = createApp(App)

// 全局错误边界：捕获组件渲染错误，避免白屏
app.config.errorHandler = (err, vm, info) => {
  console.error('[Vue Error]', err, '\nInfo:', info)
  showToast({
    message: '页面出错了，请刷新重试',
    type: 'fail',
    duration: 3000
  })
}

app.use(Vant) 
app.use(pinia) 
app.use(router) 
app.mount('#app')