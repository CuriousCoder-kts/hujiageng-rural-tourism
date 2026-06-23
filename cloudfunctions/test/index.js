// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()

// 云函数入口函数
exports.main = async () => {
  return {
    message: "云开发环境连接成功！",
    time: new Date()
  }
}