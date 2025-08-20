<template>
  <div class="message-sender">
    <div class="sender-header">
      <h3>消息编辑器</h3>
      <div class="header-controls">
        <el-tag
            :type="wsConnected ? 'success' : 'danger'"
            size="small"
            style="margin-right: 10px"
        >
          <el-icon>
            <Connection/>
          </el-icon>
          {{ wsConnected ? '已连接' : '未连接' }}
        </el-tag>
        <el-button
            size="small"
            circle
            @click="refreshMessageTypes"
            title="刷新消息类型"
        >
          <el-icon>
            <Refresh/>
          </el-icon>
        </el-button>
        <el-radio-group v-model="editMode" size="small">
          <el-radio-button label="form">
            <el-icon>
              <Edit/>
            </el-icon>
            表单模式
          </el-radio-button>
          <el-radio-button label="json">
            <el-icon>
              <DocumentCopy/>
            </el-icon>
            JSON模式
          </el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <div class="sender-content">
      <!-- WebSocket未连接提示 -->
      <el-alert
          v-if="!wsConnected"
          title="WebSocket未连接"
          type="warning"
          :closable="false"
          show-icon
          style="margin-bottom: 20px"
      >
        请先在顶部连接栏输入WebSocket服务器地址（如：localhost:8080）并点击连接按钮
      </el-alert>

      <!-- 消息类型选择 -->
      <div class="type-selector">
        <el-select
            v-model="selectedMessageType"
            placeholder="请选择消息类型"
            filterable
            clearable
            @change="onTypeChange"
            style="width: 100%"
            :disabled="messageTypes.length === 0"
        >
          <el-option
              v-for="type in messageTypes"
              :key="type.name"
              :label="type.name"
              :value="type.name"
          >
            <div class="option-content">
              <span>{{ type.name }}</span>
              <el-tag size="small">{{ type.fields.length }} 字段</el-tag>
            </div>
          </el-option>
        </el-select>

        <!-- 无消息类型提示 -->
        <div v-if="messageTypes.length === 0" class="no-types-hint">
          <el-alert
              title="暂无消息类型"
              type="info"
              :closable="false"
              show-icon
          >
            <template #default>
              <div>
                请先在左侧导入Proto文件，然后点击
                <el-button
                    size="small"
                    @click="refreshMessageTypes"
                    style="margin: 0 5px;"
                >
                  <el-icon>
                    <Refresh/>
                  </el-icon>
                  刷新
                </el-button>
                按钮加载消息类型
              </div>
            </template>
          </el-alert>
        </div>
      </div>

      <!-- 表单模式 -->
      <div v-if="editMode === 'form'" class="form-mode">
        <el-form
            v-if="selectedMessageType && currentFields.length > 0"
            :model="formData"
            label-width="120px"
            label-position="left"
        >
          <el-form-item
              v-for="field in currentFields"
              :key="field.name"
              :label="field.name"
              :required="field.required"
          >
            <!-- bytes类型（可能包含消息） -->
            <div v-if="field.type === 'bytes'" class="bytes-field">
              <el-radio-group v-model="bytesFieldMode[field.name]" size="small" style="margin-bottom: 10px">
                <el-radio-button label="raw">原始字节</el-radio-button>
                <el-radio-button label="message">消息类型</el-radio-button>
                <el-radio-button label="base64">Base64</el-radio-button>
              </el-radio-group>

              <!-- 消息类型模式 -->
              <div v-if="bytesFieldMode[field.name] === 'message'" class="nested-message">
                <el-select
                    v-model="nestedMessageTypes[field.name]"
                    placeholder="选择消息类型"
                    filterable
                    style="width: 100%; margin-bottom: 10px"
                    @change="onNestedTypeChange(field.name, $event)"
                >
                  <el-option
                      v-for="type in messageTypes"
                      :key="type.name"
                      :label="type.name"
                      :value="type.name"
                  />
                </el-select>

                <!-- 嵌套消息编辑器 -->
                <div v-if="nestedMessageTypes[field.name]" class="nested-editor">
                  <el-button size="small" @click="editNestedMessage(field.name)">
                    <el-icon>
                      <Edit/>
                    </el-icon>
                    编辑嵌套消息
                  </el-button>
                  <el-tag v-if="nestedMessageData[field.name]" type="success" style="margin-left: 10px">
                    已设置
                  </el-tag>
                </div>
              </div>

              <!-- Base64模式 -->
              <el-input
                  v-else-if="bytesFieldMode[field.name] === 'base64'"
                  v-model="formData[field.name]"
                  placeholder="输入Base64编码的数据"
              />

              <!-- 原始字节模式 -->
              <el-input
                  v-else
                  v-model="formData[field.name]"
                  placeholder="输入十六进制字节 (如: 0x12 0x34)"
              />
            </div>

            <!-- 消息类型字段 -->
            <div v-else-if="isMessageType(field.type)" class="message-type-field">
              <el-button size="small" @click="editNestedMessage(field.name, field.type)">
                <el-icon>
                  <Edit/>
                </el-icon>
                编辑 {{ field.type }}
              </el-button>
              <el-tag v-if="formData[field.name]" type="success" style="margin-left: 10px">
                已设置
              </el-tag>
            </div>

            <!-- 布尔类型 -->
            <el-switch
                v-else-if="field.type === 'bool'"
                v-model="formData[field.name]"
            />

            <!-- 数字类型 -->
            <el-input-number
                v-else-if="isNumberType(field.type)"
                v-model="formData[field.name]"
                :precision="isFloatType(field.type) ? 2 : 0"
                style="width: 100%"
            />

            <!-- 数组类型 -->
            <div v-else-if="field.repeated" class="array-field">
              <el-tag
                  v-for="(item, index) in (formData[field.name] || [])"
                  :key="index"
                  closable
                  @close="removeArrayItem(field.name, index)"
                  style="margin-right: 5px; margin-bottom: 5px"
              >
                {{ item }}
              </el-tag>
              <el-input
                  v-model="arrayInputs[field.name]"
                  size="small"
                  placeholder="输入值后按回车添加"
                  @keyup.enter="addArrayItem(field.name)"
                  style="width: 150px"
              />
            </div>

            <!-- 字符串类型 -->
            <el-input
                v-else
                v-model="formData[field.name]"
                :placeholder="`请输入${field.name}`"
            />

            <!-- 字段信息 -->
            <div class="field-info">
              <el-tag size="small" type="info">{{ field.type }}</el-tag>
              <el-tag v-if="field.repeated" size="small" type="warning">数组</el-tag>
              <el-tag v-if="isMessageType(field.type)" size="small" type="success">消息</el-tag>
              <span v-if="field.defaultValue !== undefined" class="default-value">
                默认: {{ field.defaultValue }}
              </span>
            </div>
          </el-form-item>
        </el-form>

        <el-empty
            v-else-if="!selectedMessageType"
            description="请先选择消息类型"
            :image-size="80"
        />

        <el-empty
            v-else
            description="该消息类型没有字段"
            :image-size="80"
        />
      </div>

      <!-- JSON模式 -->
      <div v-else class="json-mode">
        <div class="json-toolbar">
          <el-button size="small" @click="formatJson">
            <el-icon>
              <Refresh/>
            </el-icon>
            格式化
          </el-button>
          <el-button size="small" @click="validateJson">
            <el-icon>
              <CircleCheck/>
            </el-icon>
            验证
          </el-button>
          <el-button size="small" @click="clearJson">
            <el-icon>
              <Delete/>
            </el-icon>
            清空
          </el-button>
        </div>

        <el-input
            v-model="jsonContent"
            type="textarea"
            :rows="15"
            placeholder="请输入JSON格式的消息内容"
            @blur="validateJson"
        />

        <div v-if="jsonError" class="json-error">
          <el-alert
              :title="jsonError"
              type="error"
              :closable="false"
              show-icon
          />
        </div>
      </div>
    </div>

    <!-- 发送按钮区域 -->
    <div class="sender-footer">
      <div class="send-options">
        <el-checkbox v-model="sendOptions.showBinary">显示二进制</el-checkbox>
        <el-checkbox v-model="sendOptions.autoFormat">自动格式化</el-checkbox>
      </div>

      <div class="send-actions">
        <el-button @click="clearMessage">
          <el-icon>
            <Delete/>
          </el-icon>
          清空
        </el-button>
        <el-tooltip
            :content="sendButtonTooltip"
            placement="top"
            :disabled="canSend"
        >
          <el-button
              type="primary"
              @click="sendMessage"
              :disabled="!canSend"
              :loading="sending"
          >
            <el-icon>
              <Promotion/>
            </el-icon>
            发送消息
          </el-button>
        </el-tooltip>
      </div>
    </div>

    <!-- 二进制预览对话框 -->
    <el-dialog
        v-model="binaryPreviewVisible"
        title="二进制数据预览"
        width="600px"
    >
      <div class="binary-preview">
        <div class="preview-section">
          <h4>十六进制</h4>
          <el-input
              v-model="binaryHex"
              type="textarea"
              :rows="6"
              readonly
          />
        </div>

        <div class="preview-section">
          <h4>Base64</h4>
          <el-input
              v-model="binaryBase64"
              type="textarea"
              :rows="4"
              readonly
          />
        </div>

        <div class="preview-info">
          <span>大小: {{ binarySize }} 字节</span>
        </div>
      </div>

      <template #footer>
        <el-button @click="binaryPreviewVisible = false">关闭</el-button>
        <el-button type="primary" @click="confirmSend">确认发送</el-button>
      </template>
    </el-dialog>

    <!-- 嵌套消息编辑对话框 -->
    <el-dialog
        v-model="nestedEditDialogVisible"
        :title="`编辑嵌套消息 - ${currentEditingType || '未知类型'}`"
        width="700px"
    >
      <div class="nested-message-editor">
        <el-alert
            v-if="currentEditingField && bytesFieldMode[currentEditingField] === 'message'"
            title="提示"
            type="info"
            :closable="false"
            show-icon
            style="margin-bottom: 10px"
        >
          此字段为bytes类型，编辑的消息将被自动编码为二进制数据
        </el-alert>

        <el-input
            v-model="nestedJsonContent"
            type="textarea"
            :rows="15"
            placeholder="输入嵌套消息的JSON内容"
        />
      </div>

      <template #footer>
        <el-button @click="nestedEditDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveNestedMessage">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import {computed, onMounted, onUnmounted, ref, watch} from 'vue'
import {ElMessage} from 'element-plus'
import protoManager from '@/utils/protobuf'
import simpleProtoManager from '@/utils/protobuf-simple'
import wsManager from '@/utils/websocket'

// 使用简化版protobuf管理器作为后备
const useSimpleManager = true // 可以切换使用哪个管理器
const activeProtoManager = useSimpleManager ? simpleProtoManager : protoManager

// 事件定义
// eslint-disable-next-line no-undef
const emit = defineEmits(['message-sent'])

// 响应式数据
const editMode = ref('form')
const selectedMessageType = ref('')
const messageTypes = ref([])
const currentFields = ref([])
const formData = ref({})
const jsonContent = ref('')
const jsonError = ref('')
const sending = ref(false)
const arrayInputs = ref({})
const wsConnected = ref(wsManager.isConnected) // WebSocket连接状态

// 嵌套消息相关
const bytesFieldMode = ref({}) // bytes字段的输入模式
const nestedMessageTypes = ref({}) // 嵌套消息的类型
const nestedMessageData = ref({}) // 嵌套消息的数据
const nestedEditDialogVisible = ref(false) // 嵌套消息编辑对话框
const currentEditingField = ref('') // 当前编辑的字段
const currentEditingType = ref('') // 当前编辑的类型
const nestedJsonContent = ref('') // 嵌套消息的JSON内容

// 发送选项
const sendOptions = ref({
  showBinary: false,
  autoFormat: true
})

// 二进制预览
const binaryPreviewVisible = ref(false)
const binaryHex = ref('')
const binaryBase64 = ref('')
const binarySize = ref(0)
const pendingBinaryData = ref(null)

// 计算属性
const canSend = computed(() => {
  if (!selectedMessageType.value) return false
  if (!wsConnected.value) return false

  if (editMode.value === 'json') {
    return jsonContent.value && !jsonError.value
  }

  return true
})

// 发送按钮提示信息
const sendButtonTooltip = computed(() => {
  if (!selectedMessageType.value) {
    return '请先选择消息类型'
  }
  if (!wsConnected.value) {
    return '请先连接WebSocket服务器（在顶部连接栏输入地址并点击连接）'
  }
  if (editMode.value === 'json') {
    if (!jsonContent.value) {
      return '请输入JSON内容'
    }
    if (jsonError.value) {
      return 'JSON格式错误'
    }
  }
  return '点击发送消息'
})

// 监听消息类型变化
watch(selectedMessageType, (newType) => {
  if (newType) {
    loadMessageFields(newType)
    generateTemplate(newType)
    // 重置嵌套消息相关数据
    bytesFieldMode.value = {}
    nestedMessageTypes.value = {}
    nestedMessageData.value = {}

    // 为bytes字段设置默认模式
    const type = messageTypes.value.find(t => t.name === newType)
    if (type && type.fields) {
      type.fields.forEach(field => {
        if (field.type === 'bytes') {
          bytesFieldMode.value[field.name] = 'raw' // 默认使用原始字节模式
        }
      })
    }
  } else {
    currentFields.value = []
    formData.value = {}
    jsonContent.value = ''
    bytesFieldMode.value = {}
    nestedMessageTypes.value = {}
    nestedMessageData.value = {}
  }
})

// 监听编辑模式切换
watch(editMode, (newMode) => {
  if (newMode === 'json' && selectedMessageType.value) {
    // 从表单模式切换到JSON模式，转换数据
    try {
      jsonContent.value = JSON.stringify(formData.value, null, 2)
      jsonError.value = ''
    } catch (error) {
      jsonError.value = error.message
    }
  } else if (newMode === 'form' && jsonContent.value) {
    // 从JSON模式切换到表单模式，解析JSON
    try {
      const data = JSON.parse(jsonContent.value)
      formData.value = data
      jsonError.value = ''
    } catch (error) {
      // JSON解析失败，保持原有表单数据
    }
  }
})

// 加载消息类型列表
const loadMessageTypes = () => {
  const types = activeProtoManager.getMessageTypes()
  console.log('Loading message types:', types.length, 'types found')
  messageTypes.value = types

  // 如果有消息类型但没有选中的，自动选择第一个
  if (types.length > 0 && !selectedMessageType.value) {
    // 不自动选择，让用户手动选择
  }
}

// 手动刷新消息类型
const refreshMessageTypes = () => {
  console.log('Manually refreshing message types...')
  console.log('Using:', useSimpleManager ? 'SimpleProtobufManager' : 'ProtobufManager')
  loadMessageTypes()
  if (messageTypes.value.length > 0) {
    ElMessage.success(`已刷新，找到 ${messageTypes.value.length} 个消息类型`)
  } else {
    ElMessage.warning('未找到消息类型，请先导入Proto文件')
  }
}

// 加载消息字段
const loadMessageFields = (typeName) => {
  const type = messageTypes.value.find(t => t.name === typeName)
  if (type) {
    currentFields.value = type.fields
  }
}

// 生成消息模板
const generateTemplate = (typeName) => {
  try {
    const template = activeProtoManager.generateMessageTemplate(typeName)
    formData.value = template

    if (editMode.value === 'json') {
      jsonContent.value = JSON.stringify(template, null, 2)
    }
  } catch (error) {
    console.error('Failed to generate template:', error)
  }
}

// 消息类型改变
const onTypeChange = () => {
  arrayInputs.value = {}
  jsonError.value = ''
}

// 判断是否为数字类型
const isNumberType = (type) => {
  return [
    'int32', 'uint32', 'sint32', 'fixed32', 'sfixed32',
    'int64', 'uint64', 'sint64', 'fixed64', 'sfixed64',
    'float', 'double'
  ].includes(type)
}

// 判断是否为浮点数类型
const isFloatType = (type) => {
  return ['float', 'double'].includes(type)
}

// 判断是否为消息类型
const isMessageType = (type) => {
  return activeProtoManager.isMessageType ? activeProtoManager.isMessageType(type) : false
}

// 处理嵌套消息类型改变
const onNestedTypeChange = (fieldName, typeName) => {
  if (typeName) {
    // 生成该类型的模板
    const template = activeProtoManager.generateMessageTemplate(typeName)
    nestedMessageData.value[fieldName] = template
    nestedJsonContent.value = JSON.stringify(template, null, 2)
  }
}

// 编辑嵌套消息
const editNestedMessage = (fieldName, typeName = null) => {
  currentEditingField.value = fieldName
  currentEditingType.value = typeName || nestedMessageTypes.value[fieldName]

  // 加载现有数据或模板
  const existingData = nestedMessageData.value[fieldName] || formData.value[fieldName]
  if (existingData) {
    nestedJsonContent.value = JSON.stringify(existingData, null, 2)
  } else if (currentEditingType.value) {
    // 生成模板
    const template = activeProtoManager.generateMessageTemplate(currentEditingType.value)
    nestedJsonContent.value = JSON.stringify(template, null, 2)
  } else {
    nestedJsonContent.value = '{}'
  }

  nestedEditDialogVisible.value = true
}

// 保存嵌套消息
const saveNestedMessage = () => {
  try {
    const data = JSON.parse(nestedJsonContent.value)

    // 验证消息格式
    if (currentEditingType.value) {
      const validation = activeProtoManager.validateMessage(currentEditingType.value, data)
      if (!validation.valid) {
        ElMessage.error(`消息验证失败: ${validation.error}`)
        return
      }
    }

    // 保存数据
    const fieldName = currentEditingField.value
    if (bytesFieldMode.value[fieldName] === 'message') {
      // 如果是bytes字段的消息模式，需要编码为二进制
      nestedMessageData.value[fieldName] = data
      // 编码消息并存储到formData
      if (currentEditingType.value || nestedMessageTypes.value[fieldName]) {
        const typeName = currentEditingType.value || nestedMessageTypes.value[fieldName]
        const encoded = activeProtoManager.encodeMessage(typeName, data)
        formData.value[fieldName] = Array.from(new Uint8Array(encoded))
      }
    } else {
      // 直接存储消息对象
      formData.value[fieldName] = data
      nestedMessageData.value[fieldName] = data
    }

    nestedEditDialogVisible.value = false
    ElMessage.success('嵌套消息已保存')
  } catch (error) {
    ElMessage.error(`保存失败: ${error.message}`)
  }
}

// 添加数组项
const addArrayItem = (fieldName) => {
  const value = arrayInputs.value[fieldName]
  if (!value) return

  if (!formData.value[fieldName]) {
    formData.value[fieldName] = []
  }

  formData.value[fieldName].push(value)
  arrayInputs.value[fieldName] = ''
}

// 删除数组项
const removeArrayItem = (fieldName, index) => {
  if (formData.value[fieldName]) {
    formData.value[fieldName].splice(index, 1)
  }
}

// 格式化JSON
const formatJson = () => {
  try {
    const data = JSON.parse(jsonContent.value)
    jsonContent.value = JSON.stringify(data, null, 2)
    jsonError.value = ''
    ElMessage.success('格式化成功')
  } catch (error) {
    jsonError.value = `JSON格式错误: ${error.message}`
    ElMessage.error('JSON格式错误')
  }
}

// 验证JSON
const validateJson = () => {
  if (!jsonContent.value) {
    jsonError.value = ''
    return
  }

  try {
    const data = JSON.parse(jsonContent.value)

    // 如果选择了消息类型，验证数据格式
    if (selectedMessageType.value) {
      const validation = activeProtoManager.validateMessage(selectedMessageType.value, data)
      if (!validation.valid) {
        jsonError.value = `数据验证失败: ${validation.error}`
        return false
      }
    }

    jsonError.value = ''
    return true
  } catch (error) {
    jsonError.value = `JSON解析错误: ${error.message}`
    return false
  }
}

// 清空JSON
const clearJson = () => {
  jsonContent.value = ''
  jsonError.value = ''
}

// 清空消息
const clearMessage = () => {
  if (editMode.value === 'form') {
    if (selectedMessageType.value) {
      generateTemplate(selectedMessageType.value)
    } else {
      formData.value = {}
    }
    arrayInputs.value = {}
  } else {
    clearJson()
  }
  ElMessage.info('已清空消息内容')
}

// 发送消息
const sendMessage = async () => {
  if (!canSend.value) return

  sending.value = true

  try {
    // 获取消息数据
    let messageData
    if (editMode.value === 'json') {
      if (!validateJson()) {
        throw new Error('JSON验证失败')
      }
      messageData = JSON.parse(jsonContent.value)
    } else {
      // 处理表单数据，包括嵌套消息
      messageData = prepareMessageData()
    }

    // 编码消息
    const binaryData = activeProtoManager.encodeMessage(selectedMessageType.value, messageData)

    // 如果需要显示二进制预览
    if (sendOptions.value.showBinary) {
      showBinaryPreview(binaryData)
      sending.value = false
      return
    }

    // 直接发送
    await doSend(binaryData, messageData)
  } catch (error) {
    ElMessage.error(`发送失败: ${error.message}`)
  } finally {
    sending.value = false
  }
}

// 准备消息数据（处理嵌套消息）
const prepareMessageData = () => {
  const data = {...formData.value}

  // 处理每个字段
  currentFields.value.forEach(field => {
    const fieldName = field.name

    // 处理bytes字段的消息模式
    if (field.type === 'bytes' && bytesFieldMode.value[fieldName] === 'message') {
      const nestedType = nestedMessageTypes.value[fieldName]
      const nestedData = nestedMessageData.value[fieldName]

      if (nestedType && nestedData) {
        // 编码嵌套消息为二进制
        try {
          const encoded = activeProtoManager.encodeMessage(nestedType, nestedData)
          data[fieldName] = Array.from(new Uint8Array(encoded))
        } catch (error) {
          console.error(`Failed to encode nested message for field ${fieldName}:`, error)
        }
      }
    } else if (field.type === 'bytes' && bytesFieldMode.value[fieldName] === 'base64') {
      // 处理Base64输入
      if (typeof data[fieldName] === 'string') {
        try {
          const decoded = atob(data[fieldName])
          data[fieldName] = Array.from(new Uint8Array(decoded.split('').map(c => c.charCodeAt(0))))
        } catch (error) {
          console.error(`Failed to decode base64 for field ${fieldName}:`, error)
        }
      }
    } else if (field.type === 'bytes' && bytesFieldMode.value[fieldName] === 'raw') {
      // 处理十六进制输入
      if (typeof data[fieldName] === 'string') {
        const hex = data[fieldName].replace(/0x/gi, '').replace(/\s/g, '')
        const bytes = []
        for (let i = 0; i < hex.length; i += 2) {
          bytes.push(parseInt(hex.substr(i, 2), 16))
        }
        data[fieldName] = bytes
      }
    } else if (isMessageType(field.type)) {
      // 处理直接的消息类型字段
      const nestedData = nestedMessageData.value[fieldName] || data[fieldName]
      if (nestedData) {
        data[fieldName] = nestedData
      }
    }
  })

  return data
}

// 显示二进制预览
const showBinaryPreview = (binaryData) => {
  pendingBinaryData.value = binaryData

  // 转换为十六进制
  const hexArray = Array.from(new Uint8Array(binaryData))
      .map(b => b.toString(16).padStart(2, '0'))

  // 每16个字节换行
  const hexLines = []
  for (let i = 0; i < hexArray.length; i += 16) {
    const line = hexArray.slice(i, i + 16).join(' ')
    const offset = i.toString(16).padStart(8, '0')
    hexLines.push(`${offset}: ${line}`)
  }
  binaryHex.value = hexLines.join('\n')

  // 转换为Base64
  const base64 = btoa(String.fromCharCode(...new Uint8Array(binaryData)))
  binaryBase64.value = base64

  // 计算大小
  binarySize.value = binaryData.byteLength

  binaryPreviewVisible.value = true
}

// 确认发送
const confirmSend = async () => {
  if (!pendingBinaryData.value) return

  binaryPreviewVisible.value = false
  sending.value = true

  try {
    const messageData = editMode.value === 'json'
        ? JSON.parse(jsonContent.value)
        : formData.value

    await doSend(pendingBinaryData.value, messageData)
  } catch (error) {
    ElMessage.error(`发送失败: ${error.message}`)
  } finally {
    sending.value = false
    pendingBinaryData.value = null
  }
}

// 执行发送
const doSend = async (binaryData, messageData) => {
  wsManager.sendBinary(binaryData)

  // 记录发送的消息
  const sentMessage = {
    id: Date.now(),
    type: 'sent',
    messageName: selectedMessageType.value,
    data: messageData,
    binary: binaryData,
    timestamp: new Date(),
    size: binaryData.byteLength
  }

  emit('message-sent', sentMessage)
  ElMessage.success('消息发送成功')

  // 如果设置了自动格式化，格式化显示
  if (sendOptions.value.autoFormat && editMode.value === 'json') {
    formatJson()
  }
}

// 接收来自ProtoManager的消息模板
const useMessageTemplate = (data) => {
  selectedMessageType.value = data.typeName

  if (editMode.value === 'json') {
    jsonContent.value = data.template
    validateJson()
  } else {
    try {
      formData.value = JSON.parse(data.template)
    } catch (error) {
      console.error('Failed to parse template:', error)
    }
  }
}

// 暴露方法给父组件
// eslint-disable-next-line no-undef
defineExpose({
  useMessageTemplate,
  loadMessageTypes
})

// 初始化
onMounted(() => {
  loadMessageTypes()

  // 更新当前连接状态
  wsConnected.value = wsManager.isConnected

  // 监听WebSocket连接状态变化
  const unsubscribe = wsManager.onConnectionChange((connected) => {
    wsConnected.value = connected
    console.log('WebSocket connection status changed:', connected)
  })

  // 定期更新消息类型列表（作为备用，防止遗漏）
  const intervalId = setInterval(() => {
    loadMessageTypes()
  }, 10000) // 10秒更新一次

  // 清理
  onUnmounted(() => {
    clearInterval(intervalId)
    if (unsubscribe) unsubscribe()
  })
})
</script>

<style scoped>
.message-sender {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.sender-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.sender-header h3 {
  margin: 0;
  font-size: 16px;
  color: #303133;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sender-content {
  flex: 1;
  overflow-y: auto;
  padding-right: 10px;
}

.type-selector {
  margin-bottom: 20px;
}

.no-types-hint {
  margin-top: 10px;
}

.option-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.form-mode {
  padding: 10px 0;
}

.field-info {
  margin-top: 5px;
  display: flex;
  gap: 5px;
  align-items: center;
}

.default-value {
  font-size: 12px;
  color: #909399;
  margin-left: 5px;
}

.array-field {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
}

.json-mode {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.json-toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.json-error {
  margin-top: 10px;
}

.sender-footer {
  border-top: 1px solid #e4e7ed;
  padding-top: 15px;
  margin-top: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.send-options {
  display: flex;
  gap: 15px;
}

.send-actions {
  display: flex;
  gap: 10px;
}

.binary-preview {
  max-height: 400px;
  overflow-y: auto;
}

.preview-section {
  margin-bottom: 20px;
}

.preview-section h4 {
  margin: 0 0 10px;
  color: #303133;
}

.preview-info {
  display: flex;
  justify-content: space-between;
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 4px;
  font-size: 14px;
  color: #606266;
}

:deep(.el-form-item__label) {
  font-weight: 500;
}

:deep(.el-textarea__inner) {
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

.bytes-field {
  width: 100%;
}

.nested-message {
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.nested-editor {
  margin-top: 10px;
}

.message-type-field {
  display: flex;
  align-items: center;
  gap: 10px;
}

.nested-message-editor {
  max-height: 500px;
  overflow-y: auto;
}
</style>
