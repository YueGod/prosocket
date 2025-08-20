<template>
  <div class="home">
    <img alt="Vue logo" src="../assets/logo.png">
    <h1>ProSocket - WebSocket Protobuf调试工具</h1>
    <p>一个强大的WebSocket调试工具，支持Protobuf协议的消息编解码</p>

    <div class="features">
      <el-card shadow="hover">
        <h3>🔌 WebSocket连接管理</h3>
        <p>支持连接、断开、自动重连等功能</p>
      </el-card>

      <el-card shadow="hover">
        <h3>📄 Proto文件管理</h3>
        <p>批量导入.proto文件，自动解析消息类型</p>
      </el-card>

      <el-card shadow="hover">
        <h3>📝 消息编辑器</h3>
        <p>支持表单和JSON两种编辑模式</p>
      </el-card>

      <el-card shadow="hover">
        <h3>📊 消息历史</h3>
        <p>记录所有发送和接收的消息，支持导出</p>
      </el-card>
    </div>

    <div class="actions">
      <router-link to="/prosocket">
        <el-button type="primary" size="large">
          <el-icon class="el-icon--left">
            <Promotion/>
          </el-icon>
          立即使用
        </el-button>
      </router-link>

      <el-button size="large" @click="showGuide">
        <el-icon class="el-icon--left">
          <Document/>
        </el-icon>
        使用指南
      </el-button>
    </div>

    <!-- 使用指南对话框 -->
    <el-dialog
        v-model="guideVisible"
        title="使用指南"
        width="700px"
    >
      <div class="guide-content">
        <h4>1. 建立WebSocket连接</h4>
        <p>在顶部输入WebSocket服务器地址（如 ws://localhost:8080），点击连接按钮</p>

        <h4>2. 导入Proto文件</h4>
        <p>点击左侧"导入Proto"按钮，选择一个或多个.proto文件进行导入</p>

        <h4>3. 编辑消息</h4>
        <p>在中间区域选择消息类型，使用表单或JSON模式编辑消息内容</p>

        <h4>4. 发送消息</h4>
        <p>编辑完成后，点击"发送消息"按钮，消息将被编码为Protobuf二进制格式并发送</p>

        <h4>5. 查看历史</h4>
        <p>右侧显示所有发送和接收的消息历史，点击可查看详情</p>

        <h4>特性说明</h4>
        <ul>
          <li>支持自动重连机制</li>
          <li>支持批量导入多个proto文件</li>
          <li>自动生成消息模板</li>
          <li>支持消息验证</li>
          <li>支持导出消息历史为JSON文件</li>
          <li>支持二进制数据预览（十六进制、Base64等格式）</li>
        </ul>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import {ref} from 'vue'

const guideVisible = ref(false)

const showGuide = () => {
  guideVisible.value = true
}
</script>

<style scoped>
.home {
  text-align: center;
  padding: 50px 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.home img {
  width: 100px;
  margin-bottom: 20px;
}

.home h1 {
  font-size: 32px;
  color: #2c3e50;
  margin-bottom: 10px;
}

.home > p {
  font-size: 18px;
  color: #666;
  margin-bottom: 40px;
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.features .el-card {
  cursor: pointer;
  transition: transform 0.3s;
}

.features .el-card:hover {
  transform: translateY(-5px);
}

.features h3 {
  font-size: 18px;
  color: #409eff;
  margin-bottom: 10px;
}

.features p {
  color: #666;
  font-size: 14px;
}

.actions {
  display: flex;
  gap: 20px;
  justify-content: center;
}

.guide-content h4 {
  color: #303133;
  margin-top: 20px;
  margin-bottom: 10px;
}

.guide-content p {
  color: #606266;
  margin-bottom: 10px;
  line-height: 1.6;
}

.guide-content ul {
  list-style-type: disc;
  padding-left: 30px;
  color: #606266;
  line-height: 1.8;
}
</style>
