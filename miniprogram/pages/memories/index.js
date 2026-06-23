const app = getApp()

Page({
  data: {
    stories: [],          // 故事列表
    playingAudioId: null, // 当前播放音频的ID
    audioContext: null,   // 音频上下文
    loading: true,        // 加载状态
    showScanTip: false    // 是否显示扫码提示
  },

  onLoad() {
    this.loadStories()
    // 创建音频上下文
    this.setData({ audioContext: wx.createInnerAudioContext() })
  },

  // 加载故事列表
  async loadStories() {
    try {
      wx.showLoading({ title: '加载故事中...' })
      
      const res = await wx.cloud.database().collection('stories')
        .where({ villageId: 'v001' })
        .orderBy('createdAt', 'desc')
        .get()
      
      this.setData({
        stories: res.data,
        loading: false
      })
      wx.hideLoading()
    } catch (err) {
      console.error('加载故事失败:', err)
      wx.hideLoading()
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      })
      this.setData({ loading: false })
    }
  },

  // 扫码听故事
  scanQRCode() {
    wx.scanCode({
      onlyFromCamera: true,
      success: res => {
        console.log('扫码结果:', res)
        const storyId = res.path.split('=')[1] // 解析出故事ID
        this.playStory(storyId)
      },
      fail: err => {
        console.error('扫码失败:', err)
        wx.showToast({
          title: '扫码失败，请重试',
          icon: 'none'
        })
      }
    })
  },

  // 显示扫码提示
  showScanGuide() {
    this.setData({ showScanTip: true })
    setTimeout(() => {
      this.setData({ showScanTip: false })
    }, 3000)
  },

  // 播放故事
  playStory(storyId) {
    const story = this.data.stories.find(s => s._id === storyId)
    if (!story) {
      wx.showToast({
        title: '未找到故事',
        icon: 'none'
      })
      return
    }

    const audioContext = this.data.audioContext
    
    // 停止当前播放
    if (this.data.playingAudioId) {
      audioContext.stop()
    }

    // 播放新故事
    audioContext.src = story.audio
    audioContext.title = story.title
    audioContext.play()

    this.setData({ playingAudioId: storyId })

    // 监听播放结束
    audioContext.onEnded(() => {
      this.setData({ playingAudioId: null })
    })
  },

  // 手动播放/暂停
  togglePlay(e) {
    const storyId = e.currentTarget.dataset.id
    const story = this.data.stories.find(s => s._id === storyId)

    const audioContext = this.data.audioContext
    if (this.data.playingAudioId === storyId) {
      // 当前正在播放此故事，则暂停
      audioContext.pause()
      this.setData({ playingAudioId: null })
    } else {
      // 否则播放此故事
      this.playStory(storyId)
    }
  },

  // 点赞故事
  likeStory(e) {
    const storyId = e.currentTarget.dataset.id
    const index = this.data.stories.findIndex(s => s._id === storyId)
    if (index === -1) return

    // 更新本地数据
    const newStories = [...this.data.stories]
    newStories[index].likes = (newStories[index].likes || 0) + 1
    
    this.setData({ stories: newStories })

    // 更新数据库
    wx.cloud.database().collection('stories')
      .doc(storyId)
      .update({
        data: {
          likes: newStories[index].likes
        }
      })
  },

  // 跳转到评论页面
  goToComments(e) {
    const storyId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/comments/index?storyId=${storyId}`
    })
  },

  // 收藏故事
  collectStory(e) {
    const storyId = e.currentTarget.dataset.id
    wx.showToast({
      title: '已收藏',
      icon: 'success'
    })
    // 实际项目中这里应该调用云函数更新用户收藏列表
  },

  onUnload() {
    // 页面卸载时停止播放
    if (this.data.audioContext) {
      this.data.audioContext.stop()
      this.data.audioContext.destroy()
    }
  }
})