import axios from 'axios'
import useToken from '../stores/tokens'
import config from '../config'
import router from '../router'
import { showLoadingToast, showToast, closeToast } from 'vant'

const baseURL = config.baseURL
const service = axios.create({ baseURL })

// 全局 loading 计数：并发请求只在第一个开始/最后一个结束时显示
let pending = 0
function showGlobalLoading() {
  if (pending === 0) {
    showLoadingToast({
      message: '加载中...',
      forbidClick: true,
      loadingType: 'spinner'
    })
  }
  pending++
}
function hideGlobalLoading() {
  pending = Math.max(0, pending - 1)
  if (pending === 0) {
    closeToast()
  }
}

// 请求拦截器
service.interceptors.request.use(config => {
  const { token } = useToken()
  showGlobalLoading()
  if (token) {
    config.headers.jwt = token
  }
  return config
})

// 响应拦截器
service.interceptors.response.use(
  response => {
    hideGlobalLoading()
    const { errno, data, errmsg } = response.data
    if (errno === 0) {
      if (errmsg !== '') {
        showToast({
          message: errmsg,
          type: 'success'
        })
      }
      return data || true
    }
    showToast({
      message: errmsg,
      type: 'error'
    })
    if (errno === 2) {
      router.push({ name: 'login' })
    }
    return false
  },
  error => {
    hideGlobalLoading()
    showToast({
      message: '请求失败',
      type: 'fail'
    })
    console.log(error)
    return false
  }
)

export default service
