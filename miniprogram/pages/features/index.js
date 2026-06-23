const app = getApp()

Page({
  data: {
    features: [], // 特色项目列表
    activeType: '全部', // 当前选中的分类
    // types: ['全部', '手工艺', '农产品', '民俗'], // 分类类型
    types: ['全部', '景色', '农产品', '民俗'], // 分类类型
    loading: true, // 加载状态
    currentFeature: null, // 当前查看的详情
    showDetail: false // 是否显示详情弹窗
  },

  onLoad() {
    this.loadFeatures()
  },

  // 从云数据库加载特色项目
  async loadFeatures() {
    try {
      wx.showLoading({
        title: '加载中...',
      })
      
      const res = await wx.cloud.database().collection('features')
        .get()
      
      this.setData({
        features: res.data,
        loading: false
      })
      
      wx.hideLoading()
    } catch (err) {
      console.error('加载特色项目失败:', err)
      wx.hideLoading()
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      })
      this.setData({ loading: false })
    }
  },

  // 切换分类
  switchType(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ activeType: type })
  },

  // 查看详情
  showFeatureDetail(e) {
    const id = e.currentTarget.dataset.id
    const feature = this.data.features.find(item => item._id === id)
    if (feature) {
      this.setData({ 
        currentFeature: feature,
        showDetail: true
      })
    }
  },

  // 关闭详情弹窗
  closeDetail() {
    this.setData({ showDetail: false })
  }
})