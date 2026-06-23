const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    footprints: [],
    currentView: 'map',
    mapContext: null,
    markers: [],
    currentLocation: {
      latitude: 30.941568,
      longitude: 121.098121,
      scale: 15
    },
    selectedFootprint: null,
    showDetail: false,
    addingNew: false,
    villageIndex: 0,
    newFootprint: {
      landmark: null,
      visitDate: '',
      duration: 1,
      photos: [],
      note: ''
    },
    villages: [
        {_id: "v001", name: "胡家埭村", location: {latitude: 121.09169399999996, longitude: 30.93536300000002}}
    ],
    loading: true,
    windowHeight: 0,
    autoPlaySwiper: true,
    showAddForm: false,
    landmarks: [],
    selectedLandmarkIndex: 0,
    collections: [],
    showLandmarkDetail: false,
    selectedLandmark: null
  },

  onLoad(options) {
    this.setData({
      windowHeight: wx.getSystemInfoSync().windowHeight,
      landmarks: this.getHujiaDaiLandmarks()
    })
    this.initMap()
    this.loadInitialData().then(() => {
      // 如果是通过分享卡片带 footprintId 进入，自动弹出详情
      if (options && options.footprintId) {
        // 需要等 footprints 加载完毕再弹窗
        const tryShow = () => {
          const fp = this.data.footprints.find(f => f._id === options.footprintId)
          if (fp) {
            this.showFootprintDetail(options.footprintId)
          } else {
            // footprints 可能还没加载好，延迟重试
            setTimeout(tryShow, 300)
          }
        }
        tryShow()
      }
    })
    this.preloadImages()
  },

  // 初始化地图
  initMap() {
    this.setData({
      mapContext: wx.createMapContext('footprintMap', this)
    })
  },

  // 预加载图片
  preloadImages() {
    const images = [
      '/images/view1.jpeg',
      '/images/view2.jpeg',
      '/images/view3.jpeg',
      '/images/view4.jpeg',
      '/images/view5.jpeg'
    ]
    
    images.forEach(url => {
      wx.getImageInfo({
        src: url,
        success: () => console.log(`图片预加载成功: ${url}`),
        fail: (err) => console.error(`图片预加载失败: ${url}`, err)
      })
    })
  },

  //加载足迹数据
  loadInitialData() {
    this.setData({ loading: true })
    return this.loadUserFootprints().then(() => {
      this.updateMapMarkers()
      this.setData({ loading: false })
    }).catch(err => {
      this.setData({ loading: false })
      console.error("加载足迹失败", err)
      // 将错误继续抛出，让调用方也能捕获
      return Promise.reject(err)
    })
  },

  loadUserFootprints() {
    return new Promise((resolve, reject) => {
      if (!app.globalData.openid) {
        setTimeout(() => { this.loadUserFootprints().then(resolve).catch(reject); }, 500);
        return;
      }
      console.log("[调试] 正在尝试为用户加载足迹, OpenID:", app.globalData.openid);

      db.collection('footprints').where({ _openid: app.globalData.openid }).orderBy('createdAt', 'desc').get({
        success: res => {
          console.log("[调试] 云数据库查询成功，返回数据:", res.data);
          const footprints = res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          this.setData({
            footprints: footprints,
            markers: this.updateMarkersWithFootprints(footprints)
          })
          resolve(footprints)
        },
        fail: err => {
          console.error("[调试] 云数据库查询失败:", err);
          reject(err);
        },
        complete: () => {
          this.setData({ loading: false })
        }
      })
    })
  },

  loadUserCollections() {
    return new Promise((resolve, reject) => {
      if (!app.globalData.openid) {
        setTimeout(() => { this.loadUserCollections().then(resolve).catch(reject); }, 500);
        return;
      }
      console.log("[调试] 正在尝试为用户加载收藏, OpenID:", app.globalData.openid);

      db.collection('user_collections').where({ _openid: app.globalData.openid }).get({
        success: res => {
          console.log("[调试] 云数据库查询成功，返回数据:", res.data);
          const collections = res.data.map(item => item.landmark_id);
          this.setData({ collections });
          resolve(collections);
        },
        fail: err => {
          console.error("[调试] 云数据库查询失败:", err);
          reject(err);
        },
        complete: () => {
          this.setData({ loading: false })
        }
      })
    })
  },

  updateMapMarkers() {
    const baseLandmarks = this.getHujiaDaiLandmarks()
    const visitedIds = new Set(this.data.footprints.map(f => f.landmark.id))

    let markers = baseLandmarks.map(marker => {
      if (visitedIds.has(marker.id)) {
        marker.iconPath = '/images/footprint/yellow-star.png'
      } else {
        marker.iconPath = '/images/footprint/marker.png'
      }
      return marker
    })

    // 添加胡家埭村中心标记
    markers.push({
        id: 999, // 特殊ID
        latitude: 30.941568,
        longitude: 121.098121,
        title: '胡家埭村',
        iconPath: '/images/footprint/location-hjd.png', // **需要您准备一个醒目的新图标**
        width: 48,
        height: 48,
        anchor: { x: 0.5, y: 0.5 } // 中心点对准坐标
    })

    this.setData({ markers })
  },

  updateMarkersWithFootprints(footprints) {
    const visitedLandmarkIds = new Set(footprints.map(f => f.landmark.id))
    const baseLandmarks = this.getHujiaDaiLandmarks()

    const newMarkers = baseLandmarks.map(marker => {
      if (visitedLandmarkIds.has(marker.id)) {
        marker.iconPath = '/images/footprint/yellow-star.png'
      }
      return marker
    })

    this.setData({ markers: newMarkers })
    return newMarkers
  },

  // --- 新增：图片路径生成工具 ---
  getShowcaseImages(folder, count) {
    if (count === 0) return [];
    // 假设图片都放在 /images/footprint/landmarks/景点文件夹/ 下，并以 1.jpg, 2.jpg... 命名
    return Array.from({length: count}, (_, i) => `/images/footprint/landmarks/${folder}/${i + 1}.jpg`);
  },

  getHujiaDaiLandmarks() {
    const landmarks = [
      { 
        id: 1, 
        title: '新浜荷花园', 
        latitude: 30.932128, longitude: 121.092726, // 请替换为真实坐标
        description: '踏入新浜荷花园，仿佛步入梦幻的荷花仙境。这里是华东地区荷、莲品种的集大成之地，汇聚 300 余种荷花与睡莲 。每年 6 - 9 月，红、粉、白、黄等各色荷花在微风中摇曳生姿，与翠绿荷叶交织成绮丽画面。从美国、泰国、澳大利亚引进的 36 种睡莲，为荷花园增添异域风情。漫步其中，不仅能欣赏 "接天莲叶无穷碧，映日荷花别样红" 的盛景，还能参与挖睡莲、采莲子、挖藕等趣味活动，沉浸式感受荷文化魅力，留下美好乡村记忆。', 
        showcaseImages: this.getShowcaseImages('heyuan', 2) 
      },
      { 
        id: 2, 
        title: '乡村会客厅', 
        latitude: 30.935275, longitude: 121.091717, // 请替换为真实坐标
        description: '胡家埭村的乡村会客厅是多功能乡村体验场所。这里展示荷叶茶、莲藕酱等农副产品，游客能品尝购买。现场制作的荷花酥、荷花咖啡独具特色，满足味蕾。非遗体验区能让游客参与手工糕点制作、感受非遗竹编工艺魅力。荷花体验区、荷花产品展示交流区、荷花短视频与直播基地，为游客带来新奇体验，还能了解乡村发展成果，感受乡村振兴脉搏。', 
        showcaseImages: this.getShowcaseImages('huiketing', 1) 
      },
      { 
        id: 3, 
        title: '泥地足球场', 
        latitude: 30.9405, longitude: 121.0962, // 请替换为真实坐标
        description: '在乡间挥洒汗水，体验最纯粹的足球快乐。胡家埭村的泥地足球场，是华东地区独一无二的标准化泥地足球场地。这里举办过十三届松江荷花节和五届 "晋拓杯" 泥地足球赛 。比赛时，选手们在泥浆中奋力拼搏、激情角逐，溅起的泥浆为赛事增添别样乐趣。观赛游客也能被现场热烈氛围感染，欢呼呐喊。除专业赛事，还有泥地亲子运动、泥地拔河、泥地背媳妇等趣味活动，让人们在亲近泥土中释放压力、享受欢乐，感受乡村体育运动的独特魅力。', 
        showcaseImages: this.getShowcaseImages('zuqiuchang', 1) 
      },
      { id: 4, 
        title: '雪浪湖及新浜荷园度假区', 
        latitude: 30.927968, longitude: 121.085814, 
        description: '雪浪湖度假区的 "沪上芙蓉镇" 核心旅游区，融合自然美景与多元休闲。雪浪湖湖水澄澈，周边景色四季如画，春有百花绽放，夏有荷花映日，秋有金黄稻穗，冬有皑皑白雪。这里正打造新浜荷园度假区项目，一期规划荷文化餐饮、住宿、温泉、会务等功能 。建成后，游客既能欣赏湖光山色，又能享受舒适度假服务，沉浸在 "沪上芙蓉镇" 的独特韵味中，开启惬意的乡村度假之旅。', 
        showcaseImages: this.getShowcaseImages('xuelanghu', 1) },
      { id: 5, 
        title: '鲁家埭河', 
        latitude: 30.945493, longitude: 121.089429, 
        description: '宁静的河水缓缓流淌，见证了村庄的岁月变迁。鲁家埭河是胡家埭村的生态纽带，静静流淌的河水滋养着这片土地。河水清澈见底，鱼虾嬉戏其中，两岸绿树成荫，垂柳依依。清晨，阳光洒在河面，波光粼粼；傍晚，余晖映照，河水被染成金色。沿着河岸漫步，能感受乡村的宁静与美好。河边设有亲水平台，可供游客休憩、赏景，是放松身心、感受自然生态之美的好去处。', 
        showcaseImages: this.getShowcaseImages('lujiahe', 2) },
      { id: 6, 
        title: '葡萄庄园', 
        latitude: 30.929043, longitude: 121.091019, 
        description: '亲手采摘甜美的葡萄，品味丰收的喜悦。胡家埭村的葡萄庄园是甜蜜的水果乐园。园内种植巨峰、玫瑰香、夏黑等多种葡萄品种，从早熟到晚熟，采摘期较长。成熟季节，串串饱满的葡萄挂满枝头，紫的像玛瑙，绿的似翡翠，散发诱人果香。游客可入园亲手采摘，品尝新鲜甜美的葡萄，体验田园采摘乐趣。庄园还提供葡萄酿酒、葡萄制品加工体验，让游客感受葡萄文化的独特魅力。', 
        showcaseImages: this.getShowcaseImages('putao', 1) },
      { id: 7, 
        title: '美尚花卉基地', 
        latitude: 30.9451, longitude: 121.1018, 
        description: '五彩斑斓的花卉基地，一年四季都有不同的风景。美尚花卉基地是花卉的缤纷世界，培育众多花卉品种，四季鲜花不断。走进基地，五彩斑斓的花卉映入眼帘，花香弥漫。这里不仅是花卉培育地，也是游客打卡拍照的好去处。在花丛中穿梭，可欣赏不同花卉的娇艳姿态，感受大自然的色彩盛宴。花卉基地还能让游客了解花卉种植知识，参与花卉采摘、插花体验等活动，在花香中收获快乐与美好。', 
        showcaseImages: this.getShowcaseImages('meishang', 1) },
      { id: 8, 
        title: '荷花种苗基地', 
        latitude: 30.9410, longitude: 121.1030, 
        description: '了解荷花的生长过程，感受生命的奇迹。荷花种苗基地是胡家埭村 "荷经济" 的源头，也是科研与观赏的胜地。作为华东地区荷、莲品种最多的种苗基地，承担着荷花种苗研发、育苗重任。在这里，科研人员培育出许多珍稀荷花品种。游客能看到科研人员的辛勤工作，了解荷花培育过程。基地内，不同品种荷花争奇斗艳，为科研爱好者与游客带来知识与视觉的双重享受，感受荷花产业的蓬勃发展。', 
        showcaseImages: this.getShowcaseImages('zhongmiao', 1) },
      { id: 9, 
        title: '荷花木栈道', 
        latitude: 30.9415, longitude: 121.1035, 
        description: '蜿蜒于荷花种苗基地荷塘之上的木栈道，是赏荷的绝佳路线。行走其间，脚下是清澈荷塘水，身旁是绽放的荷花与舒展的荷叶，荷香扑鼻，令人心旷神怡。微风吹过，荷叶沙沙作响，荷花翩翩起舞，构成动静相宜的画面。白天，阳光洒下，光影在荷叶与水面跳跃；夜晚，月色笼罩，荷塘静谧而神秘。无论是漫步赏荷，还是驻足拍照，都能深度感受荷花之美与乡村宁静。', 
        showcaseImages: this.getShowcaseImages('muzhandao', 1) },
      { id: 10, 
        title: '综合文化活动中心', 
        latitude: 30.9420, longitude: 121.0970, 
        description: '胡家埭村综合文化活动中心是乡村文化的活力舞台。这里定期举办各类文化活动，如民俗展览展示传统技艺与文化，文艺演出丰富村民精神生活，科普讲座传授农业科技与生活知识。还设有图书阅览室，供村民与游客阅读充电；文化活动室开展书法、绘画、戏曲等活动，为文化爱好者提供交流平台，让人们感受乡村文化魅力，体验乡村生活的多彩。', 
        showcaseImages: this.getShowcaseImages('wenhua', 1) },
      { id: 11, 
        title: '党建服务点', 
        latitude: 30.9425, longitude: 121.0975, 
        description: '胡家埭村党群服务中心是乡村发展的红色引擎与温馨家园。它借助上海市第五批乡村振兴示范村创建契机，构建以党群阵地为基础的综合公共服务治理轴。在这里，"一格三长" 网格管理体系保障乡村有序运行，"家庭积分制" 激发村民参与村级事务热情，联合建设银行开发的线上管理平台方便又高效。智慧乡村综合指挥分中心，实现 "一屏统揽、一网统管"，守护乡村安全。而且，围绕 "荷" 字开发特色产品，带动 68 人次就业，助力村民增收，展现乡村发展活力。', 
        showcaseImages: this.getShowcaseImages('dangjian', 1) },
    ];

    return landmarks.map(lm => ({
      ...lm,
      // latitude 和 longitude 现在直接从上面读取，不再随机生成
      iconPath: '/images/footprint/marker.png', // 默认图标
      width: 30, height: 30,
      callout: {
        content: lm.title,
        color: '#ffffff',
        fontSize: 14,
        borderRadius: 10,
        bgColor: '#4CAF50',
        padding: 8,
        display: 'ALWAYS'
      }
    }));
  },

  // 切换视图
  switchView(e) {
    const view = e.currentTarget.dataset.view
    this.setData({
      currentView: view
    })

    // 如果切换到时间线视图，确保数据是最新的
    if (view === 'timeline') {
      this.loadUserFootprints()
    }
  },

  // 地图标记点点击
  markerTap(e) {
    const markerId = e.markerId;
    if (markerId === 999) return; // 胡家埭村中心点不响应

    // 找到地标的官方数据
    const landmarkOfficialData = this.data.landmarks.find(m => m.id === markerId);
    if (!landmarkOfficialData) return;

    // 查找用户关于此地的足迹
    const userFootprint = this.data.footprints.find(f => f.landmark.id === markerId);

    // 组合数据
    const landmarkDetail = {
      ...landmarkOfficialData,
      isVisited: !!userFootprint, // 布尔值，标记是否已点亮
      userFootprint: userFootprint || null // 用户的足迹记录，可能为 null
    };

    // 设置数据并打开弹窗
    this.setData({
      selectedLandmark: landmarkDetail,
      showLandmarkDetail: true
    });
  },

  // 足迹项点击
  footprintTap(e) {
    const footprintId = e.currentTarget.dataset.id
    this.showFootprintDetail(footprintId)
  },
  
  // 显示足迹详情
  showFootprintDetail(footprintId) {
    const footprint = this.data.footprints.find(f => f._id === footprintId)
    if (footprint) {
      this.setData({
        selectedFootprint: footprint,
        showDetail: true
      })
      // 优先用 footprint.location，否则用 footprint.landmark 的坐标兜底
      const loc = footprint.location || footprint.landmark
      if (loc && loc.latitude && loc.longitude) {
        this.setData({
          currentLocation: {
            latitude: loc.latitude,
            longitude: loc.longitude,
            scale: 14
          }
        })
      }
    }
  },

  // 关闭详情
  closeDetail() {
    this.setData({ showDetail: false })
  },

  // 预览图片
  previewImage(e) {
    const index = e.currentTarget.dataset.index
    const photos = this.data.selectedFootprint?.photos || []
    if (photos.length === 0) return
    
    wx.previewImage({
      current: photos[index],
      urls: photos
    })
  },

  // 打开添加模式
  openAddForm(landmarkToPreselect) {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    
    let preselectedIndex = 0;
    let preselectedLandmark = this.data.landmarks[0];

    // 检查 landmarkToPreselect 是否为有效的地标对象 (而不是一个点击事件)
    if (landmarkToPreselect && typeof landmarkToPreselect.id !== 'undefined') {
        const foundIndex = this.data.landmarks.findIndex(lm => lm.id === landmarkToPreselect.id);
        if (foundIndex !== -1) {
            preselectedIndex = foundIndex;
            preselectedLandmark = this.data.landmarks[foundIndex];
        }
    }

    this.setData({
      showAddForm: true,
      selectedLandmarkIndex: preselectedIndex,
      newFootprint: {
        landmark: preselectedLandmark,
        visitDate: dateStr,
        duration: 1,
        photos: [],
        note: ''
      }
    });
  },

  // 关闭添加模式
  closeAddForm() {
    this.setData({ showAddForm: false })
  },

  // 选择地标
  onLandmarkChange(e) {
    const index = e.detail.value
    this.setData({
      selectedLandmarkIndex: index,
      'newFootprint.landmark': this.data.landmarks[index]
    })
  },

  // 表单操作：选择日期
  selectDate(e) {
    this.setData({
      'newFootprint.visitDate': e.detail.value
    })
  },

  // 表单操作：设置停留天数
  setDuration(e) {
    this.setData({
      'newFootprint.duration': parseInt(e.detail.value) + 1
    })
  },

  // 表单操作：添加照片
  addPhoto() {
    wx.chooseMedia({
      count: 9 - this.data.newFootprint.photos.length,
      mediaType: ['image'],
      sizeType: ['compressed'],
      success: res => {
        const tempFiles = res.tempFiles
        const currentPhotos = this.data.newFootprint.photos
        const newPhotos = [...currentPhotos, ...tempFiles.map(f => f.tempFilePath)]
        
        this.setData({
          'newFootprint.photos': newPhotos
        })
      }
    })
  },

  // 表单操作：移除照片
  removePhoto(e) {
    const index = e.currentTarget.dataset.index
    const currentPhotos = this.data.newFootprint.photos
    currentPhotos.splice(index, 1)
    
    this.setData({
      'newFootprint.photos': currentPhotos
    })
  },

  // 表单操作：输入笔记
  inputNote(e) {
    this.setData({
      'newFootprint.note': e.detail.value
    })
  },

  // 图片加载错误处理
  handleImageError(e) {
    console.error("图片加载失败", e.detail.errMsg)
    const index = e.currentTarget.dataset.index
    // 可以在这里设置一个默认的失败图片
    if (this.data.selectedFootprint) {
      const key = `selectedFootprint.photos[${index}]`
      this.setData({
        [key]: '/images/footprint/load-error.png'
      })
    }
  },

  // 保存新足迹
  saveNewFootprint() {
    // 前置检查：确保 openid 已获取
    if (!app.globalData.openid) {
      wx.showToast({
        title: '用户信息加载中，请稍后重试',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '正在保存...' })

    const { newFootprint } = this.data
    
    // 1. 上传图片到云存储
    const uploadPromises = newFootprint.photos.map(photoPath => {
      return wx.cloud.uploadFile({
        cloudPath: `footprint_photos/${app.globalData.openid}_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`,
        filePath: photoPath,
      })
    })

    Promise.all(uploadPromises).then(uploadResults => {
      const photoFileIDs = uploadResults.map(result => result.fileID)

      // 2. 准备要存入数据库的数据
      const dataToSave = {
        landmark: newFootprint.landmark,
        visitDate: newFootprint.visitDate,
        duration: newFootprint.duration,
        note: newFootprint.note,
        photos: photoFileIDs, // 存储云文件ID
        favorite: false, // 默认未收藏
        createdAt: db.serverDate(), // 使用服务端时间
      }

      // 3. 存入数据库
      db.collection('footprints').add({
        data: dataToSave,
        success: res => {
          wx.hideLoading()
          wx.showToast({ title: '保存成功' })

          // 4. 更新本地数据，刷新界面
          this.setData({ showAddForm: false })
          this.loadInitialData() // 重新加载数据以获取最新列表和_id
        },
        fail: err => {
          wx.hideLoading()
          wx.showToast({ title: '数据库保存失败', icon: 'none' })
          console.error(err)
        }
      })
    }).catch(err => {
      wx.hideLoading()
      wx.showToast({ title: '图片上传失败', icon: 'none' })
      console.error(err)
    })
  },
  
  // 防止触摸穿透
  preventTouchMove() {},

  // 新增：关闭地标详情弹窗的函数
  closeLandmarkDetail: function() {
    this.setData({
      showLandmarkDetail: false,
      selectedLandmark: null
    });
  },

  onAddFromDetail: function() {
    const landmarkToPreselect = this.data.selectedLandmark;
    if (!landmarkToPreselect) return;

    // 1. 先关闭详情弹窗
    this.closeLandmarkDetail();

    // 2. 延迟一小段时间再打开添加表单，避免闪烁或渲染问题
    setTimeout(() => {
      this.openAddForm(landmarkToPreselect);
    }, 200); // 200毫秒延迟
  },

  // 标准微信右上角分享
  onShareAppMessage() {
    // 如果当前有足迹详情弹窗，分享该足迹
    if (this.data.showDetail && this.data.selectedFootprint) {
      const footprint = this.data.selectedFootprint
      return {
        title: `我在胡家埭村的足迹：${footprint.landmark.title}`,
        path: `/pages/footprint/index?footprintId=${footprint._id}`,
        imageUrl: footprint.photos.length > 0 ? footprint.photos[0] : ''
      }
    }
    // 否则分享通用页面
    return {
      title: '胡家埭村·地图概览',
      path: '/pages/footprint/index',
      imageUrl: '/images/footprint/map-view.png'
    }
  },
})