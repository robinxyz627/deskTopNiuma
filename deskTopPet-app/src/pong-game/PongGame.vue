<template>
  <div class="pong-game" @mousemove="handleMouseMove">
    <!-- 标题栏 -->
    <div class="game-header" @mousedown="startDrag">
      <span class="game-title">🎮 摸鱼弹球</span>
      <div class="game-controls">
        <button class="control-btn" @click="minimizeWindow">─</button>
        <button class="control-btn close" @click="closeWindow">✕</button>
      </div>
    </div>
    
    <!-- 模式选择 -->
    <div v-if="!gameStarted" class="mode-selection">
      <h2>选择游戏模式</h2>
      <div class="mode-buttons">
        <button class="mode-btn" @click="startSinglePlayer">
          <span class="mode-icon">🤖</span>
          <span class="mode-label">单机模式</span>
          <span class="mode-desc"> vs AI</span>
        </button>
        <button class="mode-btn" @click="createRoom">
          <span class="mode-icon">🏠</span>
          <span class="mode-label">创建房间</span>
          <span class="mode-desc">成为主机</span>
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
      
      <!-- 等待连接提示 -->
      <div v-if="waitingForConnection" class="waiting">
        <p>等待玩家连接...</p>
        <p class="waiting-ip">你的IP: {{ localIp }}</p>
        <button @click="cancelWaiting">取消</button>
      </div>
    </div>
    
    <!-- 游戏画面 -->
    <div v-else class="game-container">
      <!-- 血量显示 -->
      <div class="hp-bar">
        <div class="hp left">
          <span class="hp-label">玩家</span>
          <div class="hp-hearts">
            <span v-for="i in 5" :key="i" class="heart" :class="{ active: i <= leftHp }">❤️</span>
          </div>
        </div>
        <div class="hp right">
          <span class="hp-label">{{ isMultiplayer ? '对手' : 'AI' }}</span>
          <div class="hp-hearts">
            <span v-for="i in 5" :key="i" class="heart" :class="{ active: i <= rightHp }">❤️</span>
          </div>
        </div>
      </div>
      
      <!-- Canvas 游戏区域 -->
      <canvas 
        ref="gameCanvas" 
        class="game-canvas"
        :width="canvasWidth"
        :height="canvasHeight"
      ></canvas>
      
      <!-- 控制提示 -->
      <div class="control-hint">
        <span>🖱️ 鼠标移动控制 | ⌨️ 方向键控制</span>
      </div>
      
      <!-- 游戏结束 -->
      <div v-if="gameOver" class="game-over">
        <h2>{{ winner === 'left' ? '🎉 你赢了！' : '😢 你输了！' }}</h2>
        <button @click="resetGame">再来一局</button>
        <button @click="backToMenu">返回菜单</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { PongGameCore } from './PongGameCore'
import { PongNetwork } from './PongNetwork'

// 窗口控制
async function startDrag() {
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().startDragging()
  } catch (err) {
    console.error('拖动失败:', err)
  }
}

async function minimizeWindow() {
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().minimize()
  } catch (err) {
    console.error('最小化失败:', err)
  }
}

async function closeWindow() {
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().close()
  } catch (err) {
    console.error('关闭失败:', err)
  }
}

// 游戏状态
const gameStarted = ref(false)
const gameOver = ref(false)
const winner = ref<'left' | 'right' | null>(null)
const isMultiplayer = ref(false)
const isHost = ref(false)
const waitingForConnection = ref(false)
const showJoinInput = ref(false)
const joinIp = ref('')
const localIp = ref('获取中...')

// 血量
const leftHp = ref(5)
const rightHp = ref(5)

// Canvas
const gameCanvas = ref<HTMLCanvasElement | null>(null)
const canvasWidth = 560
const canvasHeight = 320

// 游戏核心
let gameCore: PongGameCore | null = null
let network: PongNetwork | null = null
let animationId: number = 0

// 键盘状态
const keys = ref({
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
})

// 获取本机IP
async function getLocalIp() {
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    localIp.value = await invoke('get_local_ip')
  } catch {
    localIp.value = 'localhost'
  }
}

// 单机模式
function startSinglePlayer() {
  isMultiplayer.value = false
  isHost.value = false
  startGame()
}

// 创建房间（主机）
async function createRoom() {
  isMultiplayer.value = true
  isHost.value = true
  waitingForConnection.value = true
  await getLocalIp()
  
  network = new PongNetwork(true)
  await network.startServer(8765)
  
  network.onPeerConnected = () => {
    waitingForConnection.value = false
    startGame()
  }
}

// 取消等待
function cancelWaiting() {
  waitingForConnection.value = false
  network?.close()
  network = null
}

// 加入房间
async function joinRoom() {
  if (!joinIp.value) return
  
  isMultiplayer.value = true
  isHost.value = false
  showJoinInput.value = false
  
  network = new PongNetwork(false)
  const connected = await network.connect(joinIp.value, 8765)
  
  if (connected) {
    startGame()
  } else {
    alert('连接失败，请检查IP地址')
    network = null
  }
}

// 开始游戏
function startGame() {
  gameStarted.value = true
  gameOver.value = false
  leftHp.value = 5
  rightHp.value = 5
  
  // 初始化游戏核心
  if (gameCanvas.value) {
    gameCore = new PongGameCore(
      gameCanvas.value,
      isMultiplayer.value,
      isHost.value,
      network
    )
    
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
    
    gameCore.start()
    gameLoop()
  }
}

// 游戏循环
function gameLoop() {
  if (!gameCore) return
  
  // 处理键盘输入
  gameCore.handleInput(keys.value)
  
  // 更新游戏
  gameCore.update()
  
  // 渲染
  gameCore.render()
  
  if (!gameOver.value) {
    animationId = requestAnimationFrame(gameLoop)
  }
}

// 结束游戏
function endGame(w: 'left' | 'right') {
  gameOver.value = true
  winner.value = w
  cancelAnimationFrame(animationId)
}

// 重置游戏
function resetGame() {
  leftHp.value = 5
  rightHp.value = 5
  gameOver.value = false
  gameCore?.reset()
  gameLoop()
}

// 返回菜单
function backToMenu() {
  gameStarted.value = false
  gameOver.value = false
  cancelAnimationFrame(animationId)
  gameCore?.stop()
  gameCore = null
  network?.close()
  network = null
}

// 鼠标控制
function handleMouseMove(e: MouseEvent) {
  if (!gameCanvas.value || !gameCore) return
  
  const rect = gameCanvas.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  
  gameCore.handleMouseMove(x, y, rect.width, rect.height)
}

// 键盘事件
function handleKeyDown(e: KeyboardEvent) {
  if (e.key in keys.value) {
    keys.value[e.key as keyof typeof keys.value] = true
  }
}

function handleKeyUp(e: KeyboardEvent) {
  if (e.key in keys.value) {
    keys.value[e.key as keyof typeof keys.value] = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  cancelAnimationFrame(animationId)
  gameCore?.stop()
  network?.close()
})
</script>

<style scoped>
.pong-game {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: rgba(40, 40, 40, 0.95);
  border-radius: 12px;
  overflow: hidden;
  color: #fff;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.3);
  cursor: grab;
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
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.control-btn.close:hover {
  background: #e74c3c;
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
  margin-bottom: 10px;
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
}

.join-input button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: #3498db;
  color: #fff;
  cursor: pointer;
}

.join-input button:last-child {
  background: #666;
}

.waiting {
  text-align: center;
}

.waiting p {
  margin-bottom: 8px;
}

.waiting-ip {
  font-size: 12px;
  color: #888;
}

.waiting button {
  margin-top: 12px;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: #e74c3c;
  color: #fff;
  cursor: pointer;
}

.game-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 10px;
}

.hp-bar {
  display: flex;
  justify-content: space-between;
  padding: 0 10px 10px;
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

.game-canvas {
  flex: 1;
  background: #1a1a1a;
  border-radius: 8px;
  cursor: none;
}

.control-hint {
  text-align: center;
  padding: 8px;
  font-size: 11px;
  color: #666;
}

.game-over {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.9);
  padding: 30px 40px;
  border-radius: 12px;
  text-align: center;
}

.game-over h2 {
  margin-bottom: 20px;
  font-size: 24px;
}

.game-over button {
  margin: 0 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  background: #3498db;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
}

.game-over button:last-child {
  background: #666;
}
</style>
