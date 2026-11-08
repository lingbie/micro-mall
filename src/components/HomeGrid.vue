<template> 
  <div class="home-grid"> 
    <van-grid :column-num="5" square :gutter="5"> 
      <van-grid-item v-for="list in menulist" :key="list.text" @click="onMenuClick(list)"> 
       <van-image :src="list.url" /> 
        <span>{{ list.text }}</span> 
      </van-grid-item> 
    </van-grid> 
  </div> 
</template> 
 
<script setup> 
import { showToast } from 'vant'
import menu1 from '../assets/images/menu1.png' 
import menu2 from '../assets/images/menu2.png' 
import menu3 from '../assets/images/menu3.png' 
import menu4 from '../assets/images/menu4.png' 
import menu5 from '../assets/images/menu5.png' 
import menu6 from '../assets/images/menu6.png' 
import menu7 from '../assets/images/menu7.png' 
import menu8 from '../assets/images/menu8.png' 
import menu9 from '../assets/images/menu9.png' 
import menu10 from '../assets/images/menu10.png' 
 
const menulist = [ 
  { text: '今日爆款', url: menu1, comingSoon: true }, 
  { text: '好物分享', url: menu2, comingSoon: true }, 
  { text: '推荐购买', url: menu3, comingSoon: true }, 
  { text: '购物心得', url: menu4, comingSoon: true }, 
  { text: '直播专区', url: menu5, comingSoon: true }, 
  { text: '签到中心', url: menu6, comingSoon: true }, 
  { text: '值得购买', url: menu7, comingSoon: true }, 
  { text: '每日优惠', url: menu8, comingSoon: true }, 
  { text: '充值中心', url: menu9, comingSoon: true }, 
  { text: '我的客服', url: menu10, comingSoon: false } 
] 

const onMenuClick = item => {
  if (item.text === '我的客服') {
    // 唤起全局悬浮客服面板
    window.dispatchEvent(new Event('open-customer-service'))
  } else if (item.comingSoon) {
    showToast(item.text + ' 即将上线，敬请期待')
  }
}

</script> 
 
<style lang="less" scoped>  
.home-grid { 
  .van-image { 
    width: 55%; 
  } 
  span { 
    font-size: 12px; 
  } 
} 
</style>