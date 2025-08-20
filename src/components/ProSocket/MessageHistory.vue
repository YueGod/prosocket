<template>
  <div class="message-history">
    <div class="history-header">
      <h3>消息历史</h3>
      <div class="header-actions">
        <el-badge :value="messages.length" :max="999" :hidden="messages.length === 0">
          <el-button size="small" circle @click="showFilter = !showFilter">
            <el-icon>
              <Filter/>
            </el-icon>
          </el-button>
        </el-badge>
        <el-button size="small" circle @click="showDecodeSettings = !showDecodeSettings" title="解码设置">
          <el-icon>
            <Setting/>
          </el-icon>
        </el-button>
        <el-button size="small" circle @click="exportHistory">
          <el-icon>
            <Download/>
          </el-icon>
        </el-button>
        <el-button size="small" circle @click="clearHistory">
          <el-icon>
            <Delete/>
          </el-icon>
        </el-button>
      </div>
    </div>

    <!-- 过滤器 -->
    <div v-if="showFilter" class="history-filter">
      <el-input
          v-model="filterText"
          placeholder="搜索消息内容..."
          clearable
          size="small"
          @clear="filterText = ''"
      >
        <template #prefix>
          <el-icon>
            <Search/>
          </el-icon>
        </template>
      </el-input>

      <el-select
          v-model="filterType"
          placeholder="消息类型"
          clearable
          size="small"
          style="width: 100%; margin-top: 10px"
      >
        <el-option label="全部" value=""/>
        <el-option label="发送" value="sent"/>
        <el-option label="接收" value="received"/>
      </el-select>

      <el-select
          v-model="filterMessageType"
          placeholder="Proto消息类型"
          clearable
          size="small"
          filterable
          style="width: 100%; margin-top: 10px"
      >
        <el-option label="全部" value=""/>
        <el-option
            v-for="type in uniqueMessageTypes"
            :key="type"
            :label="type"
            :value="type"
        />
      </el-select>
    </div>

    <!-- 解码设置 -->
    <div v-if="showDecodeSettings" class="decode-settings">
      <div class="settings-title">
        <el-icon>
          <Setting/>
        </el-icon>
        <span>接收消息解码设置</span>
      </div>

      <el-form size="small">
        <el-form-item label="自动解码">
          <el-switch v-model="autoDecodeEnabled"/>
          <span class="setting-hint">自动尝试解码接收的二进制消息</span>
        </el-form-item>

        <el-form-item label="默认消息类型">
          <el-select
              v-model="defaultReceiveType"
              placeholder="选择默认接收消息类型"
              clearable
              filterable
              style="width: 100%"
          >
            <el-option
                v-for="type in availableMessageTypes"
                :key="type.name"
                :label="type.name"
                :value="type.name"
            >
              <span style="float: left">{{ type.name }}</span>
              <span style="float: right; color: #8492a6; font-size: 13px">{{ type.fields.length }}个字段</span>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="备选消息类型">
          <el-select
              v-model="fallbackReceiveTypes"
              placeholder="选择备选消息类型（按顺序尝试）"
              multiple
              filterable
              style="width: 100%"
          >
            <el-option
                v-for="type in availableMessageTypes"
                :key="type.name"
                :label="type.name"
                :value="type.name"
                :disabled="type.name === defaultReceiveType"
            />
          </el-select>
        </el-form-item>
      </el-form>
    </div>

    <!-- 消息列表 -->
    <div class="history-content">
      <el-scrollbar>
        <div
            v-if="filteredMessages.length > 0"
            class="message-list"
            ref="messageListRef"
        >
          <div
              v-for="message in filteredMessages"
              :key="message.id"
              class="message-item"
              :class="`message-${message.type}`"
              @click="selectMessage(message)"
          >
            <div class="message-header">
              <div class="message-type">
                <el-icon :color="message.type === 'sent' ? '#67c23a' : '#409eff'">
                  <component :is="message.type === 'sent' ? 'Upload' : 'Download'"/>
                </el-icon>
                <span class="type-label">
                  {{ message.type === 'sent' ? '发送' : '接收' }}
                </span>
              </div>
              <span class="message-time">
                {{ formatTime(message.timestamp) }}
              </span>
            </div>

            <div class="message-info">
              <el-tag size="small" type="info">
                {{ message.messageName || '未知消息' }}
              </el-tag>
              <el-tag size="small">
                {{ message.size }} bytes
              </el-tag>
              <el-tag v-if="message.decodeError" size="small" type="danger">
                解码失败
              </el-tag>
              <el-tag v-if="message.hasNestedMessages" size="small" type="warning">
                包含嵌套消息
              </el-tag>
            </div>

            <div class="message-preview">
              {{ getMessagePreview(message.data) }}
            </div>

            <!-- 重新解码按钮（仅接收的消息） -->
            <div v-if="message.type === 'received' && message.binary" class="message-actions">
              <el-button
                  size="small"
                  @click.stop="redecodeMessage(message)"
              >
                <el-icon>
                  <Refresh/>
                </el-icon>
                重新解码
              </el-button>
            </div>
          </div>
        </div>

        <el-empty
            v-else
            description="暂无消息记录"
            :image-size="80"
        />
      </el-scrollbar>
    </div>

    <!-- 消息详情对话框 -->
    <el-dialog
        v-model="detailVisible"
        :title="`消息详情 - ${selectedMessage?.messageName || '未知'}`"
        width="800px"
    >
      <div v-if="selectedMessage" class="message-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="方向">
            <el-tag :type="selectedMessage.type === 'sent' ? 'success' : 'primary'">
              {{ selectedMessage.type === 'sent' ? '发送' : '接收' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="时间">
            {{ formatFullTime(selectedMessage.timestamp) }}
          </el-descriptions-item>
          <el-descriptions-item label="消息类型">
            {{ selectedMessage.messageName || '未知' }}
          </el-descriptions-item>
          <el-descriptions-item label="大小">
            {{ selectedMessage.size }} 字节
          </el-descriptions-item>
        </el-descriptions>

        <el-tabs v-model="detailTab" style="margin-top: 20px">
          <el-tab-pane label="JSON数据" name="json">
            <!-- 嵌套消息解码提示 -->
            <el-alert
                v-if="selectedMessage.hasNestedMessages && selectedMessage.data"
                title="此消息包含嵌套消息"
                type="info"
                :closable="false"
                show-icon
                style="margin-bottom: 10px"
            >
              <template #default>
                <div>检测到bytes字段可能包含其他Protobuf消息</div>
                <el-button
                    size="small"
                    @click="decodeNestedMessages"
                    style="margin-top: 5px"
                >
                  <el-icon>
                    <View/>
                  </el-icon>
                  解码嵌套消息
                </el-button>
              </template>
            </el-alert>

            <el-input
                :model-value="formatJson(detailMessageData)"
                type="textarea"
                :rows="12"
                readonly
            />
            <el-button
                size="small"
                @click="copyJson"
                style="margin-top: 10px"
            >
              <el-icon>
                <CopyDocument/>
              </el-icon>
              复制JSON
            </el-button>
          </el-tab-pane>

          <el-tab-pane label="二进制数据" name="binary">
            <div class="binary-tabs">
              <el-radio-group v-model="binaryFormat" size="small">
                <el-radio-button label="hex">十六进制</el-radio-button>
                <el-radio-button label="base64">Base64</el-radio-button>
                <el-radio-button label="bytes">字节数组</el-radio-button>
              </el-radio-group>
            </div>

            <el-input
                :model-value="getBinaryDisplay()"
                type="textarea"
                :rows="12"
                readonly
                style="margin-top: 10px"
            />

            <el-button
                size="small"
                @click="copyBinary"
                style="margin-top: 10px"
            >
              <el-icon>
                <CopyDocument/>
              </el-icon>
              复制数据
            </el-button>
          </el-tab-pane>

          <el-tab-pane label="原始数据" name="raw">
            <pre class="raw-data">{{ selectedMessage }}</pre>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-dialog>

    <!-- 嵌套消息解码对话框 -->
    <el-dialog
        v-model="nestedDecodeVisible"
        title="解码嵌套消息"
        width="600px"
    >
      <div v-if="nestedDecodeField">
        <el-form size="small">
          <el-form-item :label="`字段: ${nestedDecodeField}`">
            <el-select
                v-model="nestedDecodeType"
                placeholder="选择消息类型进行解码"
                filterable
                style="width: 100%"
            >
              <el-option
                  v-for="type in availableMessageTypes"
                  :key="type.name"
                  :label="type.name"
                  :value="type.name"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="解码结果" v-if="nestedDecodeResult">
            <el-input
                :model-value="formatJson(nestedDecodeResult)"
                type="textarea"
                :rows="10"
                readonly
            />
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <el-button @click="nestedDecodeVisible = false">关闭</el-button>
        <el-button type="primary" @click="applyNestedDecode" :disabled="!nestedDecodeResult">
          应用解码结果
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import {computed, nextTick, onMounted, onUnmounted, ref, watch} from 'vue'
import {ElMessage, ElMessageBox} from 'element-plus'
import wsManager from '@/utils/websocket'
import protoManager from '@/utils/protobuf'
import simpleProtoManager from '@/utils/protobuf-simple'

// 使用简化版protobuf管理器
const useSimpleManager = true
const activeProtoManager = useSimpleManager ? simpleProtoManager : protoManager

// 响应式数据
const messages = ref([])
const showFilter = ref(false)
const showDecodeSettings = ref(false)
const filterText = ref('')
const filterType = ref('')
const filterMessageType = ref('')
const selectedMessage = ref(null)
const detailVisible = ref(false)
const detailTab = ref('json')
const binaryFormat = ref('hex')
const messageListRef = ref(null)

// 解码设置
const autoDecodeEnabled = ref(true)
const defaultReceiveType = ref('')
const fallbackReceiveTypes = ref([])
const availableMessageTypes = ref([])

// 嵌套消息解码
const nestedDecodeVisible = ref(false)
const nestedDecodeField = ref('')
const nestedDecodeType = ref('')
const nestedDecodeResult = ref(null)
const detailMessageData = ref(null)

// 计算属性
const filteredMessages = computed(() => {
  return messages.value.filter(msg => {
    // 类型过滤
    if (filterType.value && msg.type !== filterType.value) {
      return false
    }

    // 消息类型过滤
    if (filterMessageType.value && msg.messageName !== filterMessageType.value) {
      return false
    }

    // 文本搜索
    if (filterText.value) {
      const searchText = filterText.value.toLowerCase()
      const dataStr = JSON.stringify(msg.data).toLowerCase()
      const nameStr = (msg.messageName || '').toLowerCase()

      if (!dataStr.includes(searchText) && !nameStr.includes(searchText)) {
        return false
      }
    }

    return true
  }).reverse() // 最新的消息在上面
})

// 获取所有唯一的消息类型
const uniqueMessageTypes = computed(() => {
  const types = new Set()
  messages.value.forEach(msg => {
    if (msg.messageName) {
      types.add(msg.messageName)
    }
  })
  return Array.from(types).sort()
})

// 格式化时间
const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}.${date.getMilliseconds().toString().padStart(3, '0')}`
}

// 格式化完整时间
const formatFullTime = (timestamp) => {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${formatTime(timestamp)}`
}

// 获取消息预览
const getMessagePreview = (data) => {
  if (!data) return '空消息'

  const str = JSON.stringify(data)
  if (str.length <= 100) {
    return str
  }

  return str.substring(0, 100) + '...'
}

// 格式化JSON
const formatJson = (data) => {
  if (!data) return '{}'
  try {
    return JSON.stringify(data, null, 2)
  } catch (error) {
    return JSON.stringify(data)
  }
}

// 获取二进制显示
const getBinaryDisplay = () => {
  if (!selectedMessage.value || !selectedMessage.value.binary) {
    return '无二进制数据'
  }

  const binary = selectedMessage.value.binary
  const bytes = new Uint8Array(binary)

  switch (binaryFormat.value) {
    case 'hex': {
      const hexArray = Array.from(bytes).map(b => b.toString(16).padStart(2, '0'))
      const lines = []
      for (let i = 0; i < hexArray.length; i += 16) {
        const line = hexArray.slice(i, i + 16).join(' ')
        const offset = i.toString(16).padStart(8, '0')
        lines.push(`${offset}: ${line}`)
      }
      return lines.join('\n')
    }

    case 'base64': {
      return btoa(String.fromCharCode(...bytes))
    }

    case 'bytes': {
      return `[${Array.from(bytes).join(', ')}]`
    }

    default:
      return ''
  }
}

// 选择消息
const selectMessage = (message) => {
  selectedMessage.value = message
  detailMessageData.value = message.data
  detailVisible.value = true
  detailTab.value = 'json'
}

// 解码嵌套消息
const decodeNestedMessages = async () => {
  if (!selectedMessage.value || !selectedMessage.value.data) return

  const data = selectedMessage.value.data
  const decodedData = {...data}
  let hasDecoded = false

  // 遍历所有字段
  for (const [fieldName, fieldValue] of Object.entries(data)) {
    // 检查bytes字段
    if (fieldValue && (fieldValue instanceof Uint8Array || Array.isArray(fieldValue))) {
      try {
        // 尝试自动推断消息类型
        const inferredType = activeProtoManager.inferMessageTypeFromFieldName?.(fieldName)
        if (inferredType) {
          // 尝试解码
          const bytes = fieldValue instanceof Uint8Array ? fieldValue : new Uint8Array(fieldValue)
          try {
            const decoded = activeProtoManager.decodeMessage(inferredType, bytes)
            decodedData[fieldName] = {
              _type: inferredType,
              _decoded: decoded,
              _raw: fieldValue
            }
            hasDecoded = true
          } catch (error) {
            console.log(`Failed to decode ${fieldName} as ${inferredType}:`, error.message)
          }
        }

        // 如果自动推断失败，显示选择对话框
        if (!hasDecoded && fieldValue.length > 0) {
          nestedDecodeField.value = fieldName
          nestedDecodeType.value = ''
          nestedDecodeResult.value = null
          nestedDecodeVisible.value = true

          // 监听类型选择
          const stopWatch = watch(nestedDecodeType, (newType) => {
            if (newType) {
              try {
                const bytes = fieldValue instanceof Uint8Array ? fieldValue : new Uint8Array(fieldValue)
                const decoded = activeProtoManager.decodeMessage(newType, bytes)
                nestedDecodeResult.value = decoded
              } catch (error) {
                nestedDecodeResult.value = null
                ElMessage.error(`解码失败: ${error.message}`)
              }
            }
          })

          // 清理监听器
          watch(nestedDecodeVisible, (visible) => {
            if (!visible) {
              stopWatch()
            }
          })

          return // 一次只处理一个字段
        }
      } catch (error) {
        console.error(`Error processing field ${fieldName}:`, error)
      }
    }
  }

  if (hasDecoded) {
    detailMessageData.value = decodedData
    ElMessage.success('嵌套消息已解码')
  } else {
    ElMessage.info('未找到可解码的嵌套消息')
  }
}

// 应用嵌套解码结果
const applyNestedDecode = () => {
  if (!nestedDecodeResult.value || !nestedDecodeField.value) return

  const decodedData = {...detailMessageData.value}
  decodedData[nestedDecodeField.value] = {
    _type: nestedDecodeType.value,
    _decoded: nestedDecodeResult.value,
    _raw: detailMessageData.value[nestedDecodeField.value]
  }

  detailMessageData.value = decodedData
  nestedDecodeVisible.value = false
  ElMessage.success(`字段 ${nestedDecodeField.value} 已解码为 ${nestedDecodeType.value}`)
}

// 复制JSON
const copyJson = () => {
  if (!selectedMessage.value) return

  const text = formatJson(detailMessageData.value || selectedMessage.value.data)
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

// 复制二进制
const copyBinary = () => {
  const text = getBinaryDisplay()
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

// 导出历史
const exportHistory = () => {
  if (messages.value.length === 0) {
    ElMessage.warning('没有消息记录可导出')
    return
  }

  const exportData = {
    exportTime: new Date().toISOString(),
    messageCount: messages.value.length,
    messages: messages.value.map(msg => ({
      ...msg,
      binary: msg.binary ? Array.from(new Uint8Array(msg.binary)) : null
    }))
  }

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json'
  })

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `prosocket_history_${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)

  ElMessage.success(`已导出 ${messages.value.length} 条消息记录`)
}

// 清空历史
const clearHistory = async () => {
  if (messages.value.length === 0) {
    ElMessage.info('没有消息记录')
    return
  }

  try {
    await ElMessageBox.confirm(
        `确定要清空所有消息记录吗？共 ${messages.value.length} 条`,
        '提示',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
    )

    messages.value = []
    ElMessage.success('已清空消息记录')
  } catch (error) {
    // 用户取消
  }
}

// 添加发送的消息
const addSentMessage = (message) => {
  messages.value.push({
    ...message,
    id: Date.now() + Math.random(),
    type: 'sent'
  })

  // 自动滚动到底部
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight
    }
  })
}

// 解码二进制消息
const decodeBinaryMessage = (data, preferredType = null) => {
  let messageData = null
  let messageName = '未知消息'
  let decodeError = false
  let hasNestedMessages = false

  // 如果指定了首选类型，先尝试它
  if (preferredType) {
    try {
      messageData = activeProtoManager.decodeMessage(preferredType, data)
      messageName = preferredType
      hasNestedMessages = checkForNestedMessages(messageData, preferredType)
      return {messageData, messageName, decodeError, hasNestedMessages}
    } catch (error) {
      console.log(`Failed to decode as ${preferredType}:`, error.message)
    }
  }

  // 尝试默认类型
  if (defaultReceiveType.value && defaultReceiveType.value !== preferredType) {
    try {
      messageData = activeProtoManager.decodeMessage(defaultReceiveType.value, data)
      messageName = defaultReceiveType.value
      hasNestedMessages = checkForNestedMessages(messageData, defaultReceiveType.value)
      return {messageData, messageName, decodeError, hasNestedMessages}
    } catch (error) {
      console.log(`Failed to decode as default type ${defaultReceiveType.value}:`, error.message)
    }
  }

  // 尝试备选类型
  for (const typeName of fallbackReceiveTypes.value) {
    if (typeName === preferredType || typeName === defaultReceiveType.value) continue
    try {
      messageData = activeProtoManager.decodeMessage(typeName, data)
      messageName = typeName
      hasNestedMessages = checkForNestedMessages(messageData, typeName)
      return {messageData, messageName, decodeError, hasNestedMessages}
    } catch (error) {
      console.log(`Failed to decode as ${typeName}:`, error.message)
    }
  }

  // 如果启用了自动解码，尝试所有已知类型
  if (autoDecodeEnabled.value) {
    const types = activeProtoManager.getMessageTypes()
    for (const type of types) {
      if (type.name === preferredType ||
          type.name === defaultReceiveType.value ||
          fallbackReceiveTypes.value.includes(type.name)) {
        continue // 已经尝试过了
      }

      try {
        messageData = activeProtoManager.decodeMessage(type.name, data)
        messageName = type.name
        hasNestedMessages = checkForNestedMessages(messageData, type.name)
        return {messageData, messageName, decodeError, hasNestedMessages}
      } catch (error) {
        // 继续尝试其他类型
      }
    }
  }

  // 无法解码，返回原始数据
  decodeError = true
  messageData = {
    _raw: Array.from(new Uint8Array(data)),
    _hex: Array.from(new Uint8Array(data)).map(b => b.toString(16).padStart(2, '0')).join(' ')
  }

  return {messageData, messageName, decodeError, hasNestedMessages}
}

// 检查是否包含嵌套消息
const checkForNestedMessages = (data, typeName) => {
  if (!data || typeof data !== 'object') return false

  try {
    const messageType = activeProtoManager.lookupType(typeName)
    if (!messageType) return false

    // 检查是否有bytes字段可能包含嵌套消息
    for (const [fieldName, fieldValue] of Object.entries(data)) {
      const field = messageType.fields[fieldName]
      if (!field) continue

      // 检查bytes字段
      if (field.type === 'bytes' && fieldValue && fieldValue.length > 0) {
        // 尝试推断可能的嵌套消息类型
        const possibleType = activeProtoManager.inferMessageTypeFromFieldName?.(fieldName)
        if (possibleType) return true
      }

      // 检查直接的消息类型字段
      if (activeProtoManager.isMessageType?.(field.type)) {
        return true
      }
    }
  } catch (error) {
    console.error('Error checking for nested messages:', error)
  }

  return false
}

// 处理接收到的消息
const handleReceivedMessage = async (data) => {
  try {
    let messageData = null
    let messageName = '未知消息'
    let decodeError = false
    let hasNestedMessages = false

    // 尝试解码消息
    if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
      // 二进制消息
      const result = decodeBinaryMessage(data)
      messageData = result.messageData
      messageName = result.messageName
      decodeError = result.decodeError
      hasNestedMessages = result.hasNestedMessages
    } else {
      // 文本消息
      try {
        messageData = JSON.parse(data)
        messageName = '文本消息(JSON)'
      } catch (error) {
        messageData = {text: data}
        messageName = '文本消息'
      }
    }

    // 添加到消息历史
    const receivedMessage = {
      id: Date.now() + Math.random(),
      type: 'received',
      messageName,
      data: messageData,
      binary: data instanceof ArrayBuffer ? data : null,
      timestamp: new Date(),
      size: data instanceof ArrayBuffer ? data.byteLength : new Blob([data]).size,
      decodeError,
      hasNestedMessages
    }

    messages.value.push(receivedMessage)

    // 显示通知
    if (decodeError) {
      ElMessage.warning({
        message: '收到消息但无法解码，请选择正确的消息类型',
        duration: 3000
      })
    } else {
      ElMessage.info({
        message: `收到消息: ${messageName}${hasNestedMessages ? ' (含嵌套消息)' : ''}`,
        duration: 2000
      })
    }

    // 自动滚动
    nextTick(() => {
      if (messageListRef.value) {
        messageListRef.value.scrollTop = messageListRef.value.scrollHeight
      }
    })
  } catch (error) {
    console.error('Failed to handle received message:', error)
  }
}

// 重新解码消息  
const redecodeMessage = async (message) => {
  if (!message.binary) {
    ElMessage.warning('该消息没有二进制数据')
    return
  }

  // 显示选择对话框
  const types = activeProtoManager.getMessageTypes()
  if (types.length === 0) {
    ElMessage.warning('没有可用的消息类型，请先导入Proto文件')
    return
  }

  // 创建一个临时的选择对话框
  const typeNames = types.map(t => t.name).join('\n')

  try {
    const result = await ElMessageBox.prompt(
        `请输入消息类型名称进行解码。\n\n可用的消息类型：\n${typeNames.length > 500 ? typeNames.substring(0, 500) + '...' : typeNames}`,
        '重新解码消息',
        {
          confirmButtonText: '解码',
          cancelButtonText: '取消',
          inputPlaceholder: '输入消息类型名称',
          inputValue: message.messageName !== '未知消息' ? message.messageName : defaultReceiveType.value || ''
        }
    )

    if (result.value) {
      // 验证输入的类型是否存在
      const typeExists = types.some(t => t.name === result.value)
      if (!typeExists) {
        ElMessage.error(`消息类型 "${result.value}" 不存在`)
        return
      }

      // 尝试用选择的类型重新解码
      const decoded = decodeBinaryMessage(message.binary, result.value)

      // 更新消息
      message.messageName = decoded.messageName
      message.data = decoded.messageData
      message.decodeError = decoded.decodeError
      message.hasNestedMessages = decoded.hasNestedMessages
      detailMessageData.value = decoded.messageData

      if (decoded.decodeError) {
        ElMessage.error('解码失败，请检查消息类型是否正确')
      } else {
        ElMessage.success(`成功解码为: ${decoded.messageName}`)
      }
    }
  } catch (error) {
    // 用户取消
  }
}

// 更新可用消息类型列表
const updateAvailableTypes = () => {
  availableMessageTypes.value = activeProtoManager.getMessageTypes()
}

// 暴露方法给父组件
// eslint-disable-next-line no-undef
defineExpose({
  addSentMessage
})

// 生命周期
onMounted(() => {
  // 注册消息接收处理器
  wsManager.onMessage(handleReceivedMessage)

  // 更新可用消息类型
  updateAvailableTypes()

  // 定期更新可用类型
  const intervalId = setInterval(() => {
    updateAvailableTypes()
  }, 5000) // 5秒更新一次

  onUnmounted(() => {
    clearInterval(intervalId)
  })
})
</script>

<style scoped>
.message-history {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.history-header {
  padding: 15px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-header h3 {
  margin: 0;
  font-size: 16px;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.history-filter {
  padding: 15px;
  border-bottom: 1px solid #e4e7ed;
  background-color: #f5f7fa;
}

.decode-settings {
  padding: 15px;
  border-bottom: 1px solid #e4e7ed;
  background-color: #f9fafc;
}

.settings-title {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  font-weight: 500;
  color: #606266;
  margin-bottom: 15px;
}

.setting-hint {
  margin-left: 10px;
  font-size: 12px;
  color: #909399;
}

.history-content {
  flex: 1;
  overflow: hidden;
}

.message-list {
  padding: 15px;
}

.message-item {
  padding: 12px;
  margin-bottom: 10px;
  background-color: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.message-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.message-sent {
  border-left: 3px solid #67c23a;
}

.message-received {
  border-left: 3px solid #409eff;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.message-type {
  display: flex;
  align-items: center;
  gap: 5px;
}

.type-label {
  font-weight: 500;
  font-size: 14px;
}

.message-time {
  font-size: 12px;
  color: #909399;
}

.message-info {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.message-preview {
  font-size: 12px;
  color: #606266;
  line-height: 1.5;
  word-break: break-all;
  font-family: 'Courier New', monospace;
  background-color: #f5f7fa;
  padding: 8px;
  border-radius: 4px;
  max-height: 60px;
  overflow: hidden;
}

.message-actions {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}

.message-detail {
  max-height: 500px;
  overflow-y: auto;
}

.binary-tabs {
  margin-bottom: 10px;
}

.raw-data {
  background-color: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
  font-size: 12px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

:deep(.el-scrollbar__wrap) {
  overflow-x: hidden;
}

:deep(.el-textarea__inner) {
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

:deep(.el-descriptions__label) {
  font-weight: 500;
}
</style>
