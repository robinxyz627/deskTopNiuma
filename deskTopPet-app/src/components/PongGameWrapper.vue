<template>
  <div class="pong-wrapper" @mousemove="handleMouseMove" @click="handleClick">
    <!-- 标题栏 -->
    <div class="game-header" @mousedown="startDragWindow">
      <span class="game-title">🎮 摸鱼弹球</span>
      <div class="game-controls">
        <button class="control-btn" @click.stop="minimizeWindow" title="最小化">─</button>
        <button class="control-btn close" @click.stop="closeGame" title="关闭">✕</button>
      </div>
      <span class="esc-hint">ESC 关闭</span>
    </div>

    <!-- 模式选择 -->
    <div v-if="!gameStarted" class="mode-selection">
      <h2>选择游戏模式</h2>
      <div class="mode-buttons">
        <button class="mode-btn" @click="startSinglePlayer">
          <span class="mode-icon">🤖</span>
          <span class="mode-label">单机模式</span>
          <span class="mode-desc">vs AI</span>
        </button>
        <button class="mode-btn" @click="showJoinInput = true">
          <span class="mode-icon">🔗</span>
          <span class="mode-label">加入房间</span>
          <span class="mode-desc">输入IP连接</span>
        </button>
      </div>

      <!-- 加入房间输入 -->
      <div v-if="showJoinInput" class="join-input">
        <input
          v-model="joinIp"
          placeholder="输入主机IP (如: 192.168.1.100)"
          @keyup.enter="joinRoom"
        />
        <button @click="joinRoom">连接</button>
        <button @click="showJoinInput = false">取消</button>
      </div>
    </div>

    <!-- 游戏画面 -->
    <div v-else class="game-container">
      <!-- 血量显示 -->
      <div class="hp-bar">
        <div class="hp left">
          <span class="hp-label">玩家</span>
          <div class="hp-hearts">
            <span v-for="i in 5" :key="'l'+i" class="heart" :class="{ active: i <= leftHp }">❤️</span>
          </div>
        </div>
        <div class="hp right">
          <span class="hp-label">AI</span>
          <div class="hp-hearts">
            <span v-for="i in 5" :key="'r'+i" class="heart" :class="{ active: i <= rightHp }">❤️</span>
          </div>
        </div>
      </div>

      <!-- Canvas 游戏区域 -->
      <div class="canvas-wrapper">
        <canvas
          ref="gameCanvas"
          class="game-canvas"
          :width="canvasWidth"
          :height="canvasHeight"
        ></canvas>

        <!-- 发球提示 -->
        <div v-if="serveInfo" class="serve-overlay">
          <div class="serve-text" :class="{ 'serve-countdown': serveInfo.isCountdown }">
            <template v-if="serveInfo.isCountdown">
              <span class="countdown-number">{{ serveInfo.text }}</span>
              <span class="countdown-label">AI 发球倒计时...</span>
            </template>
            <template v-else>
              <span class="click-hint">🖱️ 点击左键发球</span>
            </template>
          </div>
        </div>
      </div>

      <!-- 控制提示 -->
      <div class="control-hint">
        <span>🖱️ 鼠标移动控制 | ⌨️ WASD/方向键 | ESC退出</span>
      </div>
    </div>

    <!-- 游戏结束遮罩 -->
    <div v-if="gameOver" class="game-over-overlay">
      <div class="game-over-box">
        <h2>{{ winner === 'left' ? '🎉 你赢了！' : '😢 你输了！' }}</h2>
        <div class="game-over-buttons">
          <button @click="resetGame">再来一局</button>
          <button @click="backToMenu">返回菜单</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { PongGameCore } from '../pong-game/PongGameCore'

const emit = defineEmits<{ close: [] }>()

// 窗口/标题栏控制
async function startDragWindow() {
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().startDragging()
  } catch { /* 非Tauri环境忽略 */ }
}

async function minimizeWindow() {
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().minimize()
  } catch { /* 非Tauri环境忽略 */ }
}

function closeGame() {
  cleanup()
  emit('close')
}

// ---- 游戏状态 ----
const gameStarted = ref(false)
const gameOver = ref(false)
const winner = ref<'left' | 'right' | null>(null)

const showJoinInput = ref(false)
const joinIp = ref('')

// 血量
const leftHp = ref(5)
const rightHp = ref(5)

// Canvas
const gameCanvas = ref<HTMLCanvasElement | null>(null)
const canvasWidth = 560
const canvasHeight = 320

// 发球信息显示
interface ServeInfo {
  text: string
  isCountdown: boolean
}
const serveInfo = ref<ServeInfo | null>(null)

// 游戏核心
let gameCore: PongGameCore | null = null
let animationId = 0

// 键盘状态
const keys: Record<string, boolean> = {}

// ---- 游戏控制 ----

function startSinglePlayer() {
  startGame()
}

async function startGame() {
  gameStarted.value = true
  gameOver.value = false
  leftHp.value = 5
  rightHp.value = 5

  // 等待 Vue 更新 DOM，确保 canvas 已渲染
  await nextTick()

  if (!gameCanvas.value) {
    console.error('Canvas 未渲染')
    return
  }

  gameCore = new PongGameCore(
    gameCanvas.value,
    false, // 单机模式
    false, // 非主机
    null   // 无网络
  )

  // ---- 事件回调 ----

  gameCore.onScore = (side: 'left' | 'right') => {
    if (side === 'left') {
      rightHp.value--
    } else {
      leftHp.value--
    }

    if (leftHp.value <= 0 || rightHp.value <= 0) {
      endGame(leftHp.value > 0 ? 'left' : 'right')
    }
  }

  // 玩家发球时：显示点击提示
  gameCore.onPlayerServe = () => {
    serveInfo.value = { text: '', isCountdown: false }
  }

  // AI 倒计时：每秒更新一次
  gameCore.onServeCountdown = (seconds: number) => {
    if (seconds > 0) {
      serveInfo.value = { text: String(seconds), isCountdown: true }
    } else {
      serveInfo.value = null
    }
  }

  gameCore.start()
  gameLoop()
}

function gameLoop() {
  if (!gameCore || gameOver.value) return

  gameCore.handleInput(keys)
  gameCore.update()
  gameCore.render()

  animationId = requestAnimationFrame(gameLoop)
}

function endGame(w: 'left' | 'right') {
  gameOver.value = true
  winner.value = w
  serveInfo.value = null
  cancelAnimationFrame(animationId)
}

function resetGame() {
  leftHp.value = 5
  rightHp.value = 5
  gameOver.value = false
  serveInfo.value = null
  gameCore?.reset()
  gameLoop()
}

function backToMenu() {
  gameStarted.value = false
  gameOver.value = false
  serveInfo.value = null
  cancelAnimationFrame(animationId)
  gameCore?.stop()
  gameCore = null
}

function cleanup() {
  cancelAnimationFrame(animationId)
  gameCore?.stop()
  gameCore = null
}

// ---- 输入控制 ----

function handleClick(e: MouseEvent) {
  if (e.button !== 0) return // 只响应左键
  // 如果是在发球状态，尝试发球
  if (gameCore) {
    gameCore.serveBall()
  }
}

function handleMouseMove(e: MouseEvent) {
  if (!gameCanvas.value || !gameCore) return

  const rect = gameCanvas.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  gameCore.handleMouseMove(x, y, rect.width, rect.height)
}

function handleKeyDown(e: KeyboardEvent) {
  keys[e.key] = true

  // ESC 关闭游戏，返回牛牛界面
  if (e.key === 'Escape') {
    e.preventDefault()
    closeGame()
    return
  }

  // 防止方向键滚动页面
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    e.preventDefault()
  }
}

function handleKeyUp(e: KeyboardEvent) {
  keys[e.key] = false
}

async function joinRoom() {
  if (!joinIp.value) return
  showJoinInput.value = false
  startGame()
}

// ---- 生命周期 ----

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  cleanup()
})
</script>

<style scoped>
.pong-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  background: rgba(40, 40, 40, 0.98);
  border-radius: 12px;
  overflow: hidden;
  color: #fff;
  z-index: 500;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.3);
  cursor: grab;
  flex-shrink: 0;
}

.game-header:active {
  cursor: grabbing;
}

.game-title {
  font-size: 14px;
  font-weight: 600;
}

.game-controls {
  display: flex;
  gap: 4px;
}

.control-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  cursor: pointer;
  font-size: 12px;
  line-height: 24px;
  text-align: center;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.control-btn.close:hover {
  background: #e74c3c;
}

.esc-hint {
  font-size: 10px;
  color: #555;
}

.mode-selection {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 20px;
}

.mode-selection h2 {
  font-size: 20px;
}

.mode-buttons {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
}

.mode-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 30px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  cursor: pointer;
  transition: all 0.3s;
  min-width: 120px;
}

.mode-btn:hover {
  border-color: #3498db;
  background: rgba(52, 152, 219, 0.1);
  transform: translateY(-2px);
}

.mode-icon {
  font-size: 32px;
}

.mode-label {
  font-size: 14px;
  font-weight: 600;
}

.mode-desc {
  font-size: 11px;
  color: #888;
}

.join-input {
  display: flex;
  gap: 8px;
  align-items: center;
}

.join-input input {
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.3);
  color: #fff;
  width: 200px;
  font-size: 13px;
  outline: none;
}

.join-input input:focus {
  border-color: #3498db;
}

.join-input button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: #3498db;
  color: #fff;
  cursor: pointer;
  font-size: 13px;
}

.join-input button:last-child {
  background: #666;
}

.game-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 10px;
  min-height: 0;
}

.hp-bar {
  display: flex;
  justify-content: space-between;
  padding: 0 10px 10px;
  flex-shrink: 0;
}

.hp {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.hp-label {
  font-size: 11px;
  color: #888;
}

.hp-hearts {
  display: flex;
  gap: 2px;
}

.heart {
  font-size: 14px;
  opacity: 0.3;
  transition: opacity 0.3s;
}

.heart.active {
  opacity: 1;
}

.canvas-wrapper {
  flex: 1;
  position: relative;
  min-height: 0;
}

.game-canvas {
  width: 100%;
  height: 100%;
  background: #1a1a1a;
  border-radius: 8px;
  cursor: none;
}

.serve-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.serve-text {
  text-align: center;
}

.click-hint {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8);
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

.serve-countdown {
  text-align: center;
}

.countdown-number {
  display: block;
  font-size: 60px;
  font-weight: 800;
  color: #e74c3c;
  text-shadow: 0 0 30px rgba(231, 76, 60, 0.5);
}

.countdown-label {
  display: block;
  font-size: 14px;
  color: #888;
  margin-top: 8px;
}

.control-hint {
  text-align: center;
  padding: 8px;
  font-size: 11px;
  color: #666;
  flex-shrink: 0;
}

.game-over-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  z-index: 10;
}

.game-over-box {
  background: rgba(0, 0, 0, 0.9);
  padding: 30px 40px;
  border-radius: 12px;
  text-align: center;
}

.game-over-box h2 {
  margin-bottom: 20px;
  font-size: 24px;
}

.game-over-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.game-over-buttons button {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  background: #3498db;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
}

.game-over-buttons button:last-child {
  background: #666;
}
</style>
