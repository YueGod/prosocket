<template>
  <div class="prosocket-container">
    <el-container>
      <!-- 顶部连接管理栏 -->
      <el-header height="auto" class="header-bar">
        <ConnectionPanel/>
      </el-header>

      <el-container class="main-container">
        <!-- 左侧Proto文件管理 -->
        <el-aside width="300px" class="proto-aside">
          <ProtoManager
              @select-type="handleSelectType"
              @use-template="handleUseTemplate"
              @proto-loaded="handleProtoLoaded"
          />
        </el-aside>

        <!-- 中间消息编辑区域 -->
        <el-main class="message-main">
          <MessageSender
              ref="messageSenderRef"
              @message-sent="handleMessageSent"
          />
        </el-main>

        <!-- 右侧消息历史记录 -->
        <el-aside width="350px" class="history-aside">
          <MessageHistory ref="messageHistoryRef"/>
        </el-aside>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import {nextTick, onMounted, onUnmounted, ref} from 'vue'
import ConnectionPanel from '@/components/ProSocket/ConnectionPanel.vue'
import ProtoManager from '@/components/ProSocket/ProtoManager.vue'
import MessageSender from '@/components/ProSocket/MessageSender.vue'
import MessageHistory from '@/components/ProSocket/MessageHistory.vue'
import wsManager from '@/utils/websocket'
import protoManager from '@/utils/protobuf'
import simpleProtoManager from '@/utils/protobuf-simple'

// 使用简化版protobuf管理器
const useSimpleManager = true
const activeProtoManager = useSimpleManager ? simpleProtoManager : protoManager

// 组件引用
const messageSenderRef = ref(null)
const messageHistoryRef = ref(null)

// 处理选择消息类型
const handleSelectType = (data) => {
  console.log('Selected message type:', data.name)
}

// 处理使用模板
const handleUseTemplate = (data) => {
  if (messageSenderRef.value) {
    messageSenderRef.value.useMessageTemplate(data)
  }
}

// 处理Proto文件加载完成
const handleProtoLoaded = () => {
  console.log('Proto file loaded, refreshing message types...')
  if (messageSenderRef.value) {
    messageSenderRef.value.loadMessageTypes()
  }
}

// 处理消息发送
const handleMessageSent = (message) => {
  if (messageHistoryRef.value) {
    messageHistoryRef.value.addSentMessage(message)
  }
}

// 组件挂载时初始化
onMounted(() => {
  console.log('ProSocket Tool initialized')

  // 使用nextTick确保组件已完全挂载
  nextTick(() => {
    if (messageSenderRef.value) {
      console.log('Loading message types initially...')
      messageSenderRef.value.loadMessageTypes()
    }
  })

  // 定期更新消息类型列表（作为备用）
  const updateInterval = setInterval(() => {
    if (messageSenderRef.value) {
      messageSenderRef.value.loadMessageTypes()
    }
  }, 10000)

  // 保存定时器ID以便清理
  window.__prosocketUpdateInterval = updateInterval
})

// 组件卸载时清理
onUnmounted(() => {
  // 清理定时器
  if (window.__prosocketUpdateInterval) {
    clearInterval(window.__prosocketUpdateInterval)
  }

  // 断开WebSocket连接
  wsManager.disconnect()
  // 清理proto数据
  activeProtoManager.clear()
})
</script>

<style scoped>
.prosocket-container {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.el-container {
  height: 100%;
}

.header-bar {
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  padding: 0;
}

.main-container {
  height: calc(100vh - 60px);
  overflow: hidden;
}

.proto-aside {
  background-color: #fafafa;
  border-right: 1px solid #e4e7ed;
  overflow-y: auto;
}

.message-main {
  background-color: #fff;
  padding: 20px;
  overflow-y: auto;
}

.history-aside {
  background-color: #fafafa;
  border-left: 1px solid #e4e7ed;
  overflow-y: auto;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>
