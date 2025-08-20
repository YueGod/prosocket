<template>
  <div class="connection-panel">
    <el-row :gutter="20" align="middle">
      <el-col :span="2">
        <div class="status-indicator">
          <el-badge :is-dot="true" :type="statusType">
            <el-icon :size="20">
              <Connection/>
            </el-icon>
          </el-badge>
          <span class="status-text">{{ statusText }}</span>
        </div>
      </el-col>

      <el-col :span="14">
        <el-input
            v-model="wsUrl"
            placeholder="请输入WebSocket服务器地址 (如: ws://localhost:8080)"
            :disabled="isConnected"
            @keyup.enter="handleConnect"
        >
          <template #prepend>
            <el-select v-model="protocol" style="width: 80px" :disabled="isConnected">
              <el-option label="ws://" value="ws://"/>
              <el-option label="wss://" value="wss://"/>
            </el-select>
          </template>
        </el-input>
      </el-col>

      <el-col :span="4">
        <el-button-group>
          <el-button
              :type="isConnected ? 'danger' : 'primary'"
              @click="handleConnect"
              :loading="isConnecting"
          >
            <el-icon class="el-icon--left">
              <component :is="isConnected ? 'SwitchButton' : 'Link'"/>
            </el-icon>
            {{ isConnected ? '断开连接' : '连接' }}
          </el-button>
          <el-button
              :disabled="!isConnected"
              @click="handleReconnect"
          >
            <el-icon>
              <Refresh/>
            </el-icon>
          </el-button>
        </el-button-group>
      </el-col>

      <el-col :span="4">
        <div class="connection-info">
          <el-tooltip content="保存连接配置" placement="bottom">
            <el-button circle @click="saveConfig">
              <el-icon>
                <DocumentCopy/>
              </el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="加载连接配置" placement="bottom">
            <el-button circle @click="loadConfig">
              <el-icon>
                <FolderOpened/>
              </el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="连接设置" placement="bottom">
            <el-button circle @click="showSettings">
              <el-icon>
                <Setting/>
              </el-icon>
            </el-button>
          </el-tooltip>
        </div>
      </el-col>
    </el-row>

    <!-- 连接设置对话框 -->
    <el-dialog
        v-model="settingsVisible"
        title="连接设置"
        width="500px"
    >
      <el-form :model="settings" label-width="120px">
        <el-form-item label="自动重连">
          <el-switch v-model="settings.autoReconnect"/>
        </el-form-item>
        <el-form-item label="重连次数">
          <el-input-number
              v-model="settings.maxReconnectAttempts"
              :min="1"
              :max="10"
              :disabled="!settings.autoReconnect"
          />
        </el-form-item>
        <el-form-item label="心跳检测">
          <el-switch v-model="settings.enableHeartbeat"/>
        </el-form-item>
        <el-form-item label="心跳间隔(秒)">
          <el-input-number
              v-model="settings.heartbeatInterval"
              :min="5"
              :max="60"
              :disabled="!settings.enableHeartbeat"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="settingsVisible = false">取消</el-button>
        <el-button type="primary" @click="saveSettings">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import {computed, onMounted, onUnmounted, ref} from 'vue'
import {ElMessage, ElMessageBox} from 'element-plus'
import wsManager from '@/utils/websocket'

// 响应式数据
const protocol = ref('ws://')
const wsUrl = ref('localhost:8080')
const isConnected = ref(false)
const isConnecting = ref(false)
const connectionState = ref('DISCONNECTED')
const settingsVisible = ref(false)

// 连接设置
const settings = ref({
  autoReconnect: true,
  maxReconnectAttempts: 5,
  enableHeartbeat: false,
  heartbeatInterval: 30
})

// 心跳定时器
let heartbeatTimer = null

// 计算属性
const statusType = computed(() => {
  switch (connectionState.value) {
    case 'CONNECTED':
      return 'success'
    case 'CONNECTING':
      return 'warning'
    case 'DISCONNECTED':
      return 'danger'
    default:
      return 'info'
  }
})

const statusText = computed(() => {
  switch (connectionState.value) {
    case 'CONNECTED':
      return '已连接'
    case 'CONNECTING':
      return '连接中'
    case 'DISCONNECTED':
      return '未连接'
    case 'CLOSING':
      return '断开中'
    default:
      return '未知'
  }
})

const fullUrl = computed(() => {
  return `${protocol.value}${wsUrl.value}`
})

// 连接/断开
const handleConnect = async () => {
  if (isConnected.value) {
    // 断开连接
    ElMessageBox.confirm('确定要断开WebSocket连接吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      disconnect()
    }).catch(() => {
    })
  } else {
    // 建立连接
    connect()
  }
}

// 建立连接
const connect = async () => {
  if (!wsUrl.value) {
    ElMessage.error('请输入WebSocket服务器地址')
    return
  }

  isConnecting.value = true
  connectionState.value = 'CONNECTING'

  try {
    await wsManager.connect(fullUrl.value)
    isConnected.value = true
    connectionState.value = 'CONNECTED'
    ElMessage.success('WebSocket连接成功')

    // 启动心跳检测
    if (settings.value.enableHeartbeat) {
      startHeartbeat()
    }
  } catch (error) {
    isConnected.value = false
    connectionState.value = 'DISCONNECTED'
    ElMessage.error(`连接失败: ${error.message}`)
  } finally {
    isConnecting.value = false
  }
}

// 断开连接
const disconnect = () => {
  stopHeartbeat()
  wsManager.disconnect()
  isConnected.value = false
  connectionState.value = 'DISCONNECTED'
  ElMessage.info('已断开连接')
}

// 重新连接
const handleReconnect = () => {
  disconnect()
  setTimeout(() => {
    connect()
  }, 500)
}

// 启动心跳
const startHeartbeat = () => {
  stopHeartbeat()
  heartbeatTimer = setInterval(() => {
    if (isConnected.value) {
      try {
        // 发送心跳消息（可以自定义心跳消息格式）
        wsManager.sendText('ping')
      } catch (error) {
        console.error('Heartbeat failed:', error)
      }
    }
  }, settings.value.heartbeatInterval * 1000)
}

// 停止心跳
const stopHeartbeat = () => {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
}

// 保存配置
const saveConfig = () => {
  const config = {
    url: fullUrl.value,
    settings: settings.value
  }

  localStorage.setItem('prosocket_config', JSON.stringify(config))
  ElMessage.success('配置已保存')
}

// 加载配置
const loadConfig = () => {
  const configStr = localStorage.getItem('prosocket_config')

  if (configStr) {
    try {
      const config = JSON.parse(configStr)

      // 解析URL
      if (config.url) {
        if (config.url.startsWith('wss://')) {
          protocol.value = 'wss://'
          wsUrl.value = config.url.substring(6)
        } else if (config.url.startsWith('ws://')) {
          protocol.value = 'ws://'
          wsUrl.value = config.url.substring(5)
        }
      }

      // 加载设置
      if (config.settings) {
        settings.value = {...settings.value, ...config.settings}
      }

      ElMessage.success('配置已加载')
    } catch (error) {
      ElMessage.error('加载配置失败')
    }
  } else {
    ElMessage.info('没有保存的配置')
  }
}

// 显示设置
const showSettings = () => {
  settingsVisible.value = true
}

// 保存设置
const saveSettings = () => {
  wsManager.maxReconnectAttempts = settings.value.maxReconnectAttempts
  settingsVisible.value = false
  ElMessage.success('设置已保存')

  // 如果已连接，更新心跳设置
  if (isConnected.value) {
    if (settings.value.enableHeartbeat) {
      startHeartbeat()
    } else {
      stopHeartbeat()
    }
  }
}

// 监听连接状态变化
const handleConnectionChange = (connected) => {
  isConnected.value = connected
  connectionState.value = connected ? 'CONNECTED' : 'DISCONNECTED'
}

// 监听错误
const handleError = (error) => {
  ElMessage.error(`WebSocket错误: ${error.message || error}`)
}

// 监听关闭
const handleClose = (event) => {
  isConnected.value = false
  connectionState.value = 'DISCONNECTED'

  if (event.code !== 1000) {
    ElMessage.warning(`连接异常关闭: ${event.reason || '未知原因'}`)
  }
}

// 生命周期
onMounted(() => {
  // 注册事件监听器
  wsManager.onConnectionChange(handleConnectionChange)
  wsManager.onError(handleError)
  wsManager.onClose(handleClose)

  // 尝试加载保存的配置
  const configStr = localStorage.getItem('prosocket_config')
  if (configStr) {
    try {
      const config = JSON.parse(configStr)
      if (config.settings) {
        settings.value = {...settings.value, ...config.settings}
      }
    } catch (error) {
      console.error('Failed to load config:', error)
    }
  }
})

onUnmounted(() => {
  stopHeartbeat()
})
</script>

<style scoped>
.connection-panel {
  padding: 15px 20px;
  background-color: #fff;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-text {
  font-size: 14px;
  font-weight: 500;
}

.connection-info {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.el-input-group__prepend {
  padding: 0 10px;
}
</style>
