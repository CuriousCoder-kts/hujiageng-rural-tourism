// pages/index/index.js
const app = getApp()

Page({
  data: {
    village: null
  },
  
  onLoad() {
    // 从全局数据获取村落信息
    this.setData({
      village: app.globalData.village
    })
    
    // 测试云函数调用（确保云环境正常）
    wx.cloud.callFunction({
      name: 'test',
      success: res => {
        console.log('云函数调用成功:', res.result)
      },
      fail: err => {
        console.error('云函数调用失败:', err)
      }
    })
  }
})