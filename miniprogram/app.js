App({
    onLaunch() {
      // 初始化云开发
      wx.cloud.init({
        env: 'cloud1-3gi94hbh94329293',
        traceUser: true
      })
      
      this.getOpenId();
    },

    getOpenId: function() {
      wx.cloud.callFunction({
        name: 'login',
        success: res => {
          console.log('[云函数] [login] user openid: ', res.result.openid);
          this.globalData.openid = res.result.openid;
        },
        fail: err => {
          console.error('[云函数] [login] 调用失败', err);
        }
      });
    },

    // 添加全局数据
    globalData: {
        openid: null,
        village: {
        id: 'v001',
        name: "古村落",
        location: "上海市松江区",
        history: "胡家埭村位于松江区新浜镇东部，村域面积3.81平方公里，地理位置优越，交通往来便利，旅游资源丰富。近年来紧抓乡旅发展，借助荷花基地和生态涵养林，保持原生态风貌，打造纯天然氧吧，提升乡旅附加值，增加村民纯收入，努力创建“生态迷你”江南小村落。",
        honors: ["中国美丽休闲乡村", "第六届全国文明村镇"],
        images: [
            "http://image.thepaper.cn/www/image/29/97/525.jpg",
            "http://image.thepaper.cn/www/image/29/97/503.jpg",
            "https://sghimages.shobserver.com/img/catch/2020/08/05/3c27e55e-4cca-4856-acf2-99df43413186.jpg"
        ],
        video: "cloud://cloud1-3gi94hbh94329293.636c-cloud1-3gi94hbh94329293-1315078365/hujia.mp4"
        },
    }
  })