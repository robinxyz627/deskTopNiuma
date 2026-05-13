<template>
  <div class="pong-wrapper" @mousemove="handleMouseMove">
    <!-- 标题栏 -->
    <div class="game-header" @mousedown="startDrag">
      <span class="game-title">🎮 摸鱼弹球</span>
      <div class="game-controls">
        <button class="control-btn" @click="minimizeWindow">─</button>
        <button class="control-btn close" @click="closeGame">✕</button>
      </div>
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
      
      <div v-if="showJoinInput" class="join-input">
        <input v-model="joinIp" placeholder="主机IP (如: 192.168.1.100)" @keyup.enter="joinRoom" />
        <button @click="joinRoom">连接</button>
        <button @click="showJoinInput = false">取消</button>
      </div>
      
      <div v-if="waitingForConnection" class="waiting">
        <p>等待玩家连接...</p>
        <p class="waiting-ip">你的IP: {{ localIp }}</p>
        <button @click="cancelWaiting">取消</button>
      </div>
    </div>
    
    <!-- 游戏画面 -->
    <div v-else class="game-area">
      <div class="hp-bar">
        <div class="hp left">
          <span class="hp-label">玩家</span>
          <div class="hp-hearts">
            <span v-for="i in 5" :key="'l'+i" class="heart" :class="{ active: i <= leftHp }">❤️</span>
          </div>
        </div>
        <div class="hp right">
          <span class="hp-label">{{ isMultiplayer ? '对手' : 'AI' }}</span>
          <div class="hp-hearts">
            <span v-for="i in 5" :key="'r'+i" class="heart" :class="{ active: i <= rightHp }">❤️</span>
          </div>
        </div>
      </div>
      
      <canvas ref="gameCanvas" class="game-canvas" width="200" height="300"></canvas>
      
      <div class="control-hint">🖱️ 鼠标移动 | ⌨️ 方向键</div>
      
      <div v-if="gameOver" class="game-over">
        <h2>{{ winner === 'left' ? '🎉 你赢了！' : '😢 你输了！' }}</h2>
        <button @click="resetGame">再来一局</button>
        <button @click="backToMenu">返回</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { PongGameCore } from '../pong-game/PongGameCore'

const emit = defineEmits<{ close: [] }>()

async function startDrag() {
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().startDragging()
  } catch { /* ignore */ }
}

async function minimizeWindow() {
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().minimize()
  } catch { /* ignore */ }
}

function closeGame() {
  cleanup()
  emit('close')
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
const localIp = ref('localhost')
const leftHp = ref(5)
const rightHp = ref(5)
const gameCanvas = ref<HTMLCanvasElement | null>(null)

let gameCore: PongGameCore | null = null
let animationId = 0

const keys = ref<Record<string, boolean>>({})

function startSinglePlayer() {
  isMultiplayer.value = false
  isHost.value = false
  startGame()
}

function createRoom() {
  isMultiplayer.value = true
  isHost.value = true
  waitingForConnection.value = true
  // 简化：直接开始单机模式（联机需要 WebSocket 服务器）
  setTimeout(() => {
    waitingForConnection.value = false
    startGame()
  }, 1000)
}

function cancelWaiting() {
  waitingForConnection.value = false
}

function joinRoom() {
  if (!joinIp.value) return
  isMultiplayer.value = true
  isHost.value = false
  showJoinInput.value = false
  startGame()
}

function startGame() {
  gameStarted.value = true
  gameOver.value = false
  leftHp.value = 5
  rightHp.value = 5

  if (gameCanvas.value) {
    gameCore = new PongGameCore(gameCanvas.value, isMultiplayer.value, isHost.value, null)
    gameCore.onScore = (side: 'left' | 'right') => {
      if (side === 'left') rightHp.value--
      else leftHp.value--
      if (leftHp.value <= 0 || rightHp.value <= 0) {
        gameOver.value = true
        winner.value = leftHp.value > 0 ? 'left' : 'right'
        cancelAnimationFrame(animationId)
      }
    }
    gameCore.start()
    gameLoop()
  }
}

function gameLoop() {
  if (!gameCore || gameOver.value) return
  gameCore.handleInput(keys.value)
  gameCore.update()
  gameCore.render()
  animationId = requestAnimationFrame(gameLoop)
}

function resetGame() {
  leftHp.value = 5
  rightHp.value = 5
  gameOver.value = false
  gameCore?.reset()
  gameLoop()
}

function backToMenu() {
  cleanup()
  gameStarted.value = false
  gameOver.value = false
}

function cleanup() {
  cancelAnimationFrame(animationId)
  gameCore?.stop()
  gameCore = null
}

function handleMouseMove(e: MouseEvent) {
  if (!gameCanvas.value || !gameCore) return
  const rect = gameCanvas.value.getBoundingClientRect()
  gameCore.handleMouseMove(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height)
}

function handleKeyDown(e: KeyboardEvent) { keys.value[e.key] = true }
function handleKeyUp(e: KeyboardEvent) { keys.value[e.key] = false }

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
  background: rgba(30, 30, 46, 0.98);
  border-radius: var(--radius, 12px);
  overflow: hidden;
  color: #fff;
  z-index: 500;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.3);
  cursor: grab;
  flex-shrink: 0;
}

.game-header:active { cursor: grabbing; }
.game-title { font-size: 13px; font-weight: 600; }
.game-controls { display: flex; gap: 4px; }

.control-btn {
  width: 22px; height: 22px;
  border: none; border-radius: 4px;
  background: rgba(255,255,255,0.1);
  color: #fff; cursor: pointer; font-size: 12px;
}
.control-btn:hover { background: rgba(255,255,255,0.2); }
.control-btn.close:hover { background: #e74c3c; }

.mode-selection {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 12px;
}

.mode-selection h2 { font-size: 16px; }
.mode-buttons { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }

.mode-btn {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 14px 20px; border: 2px solid rgba(255,255,255,0.2);
  border-radius: 10px; background: rgba(255,255,255,0.05);
  color: #fff; cursor: pointer; transition: all 0.3s; min-width: 90px;
}
.mode-btn:hover { border-color: #3498db; background: rgba(52,152,219,0.1); transform: translateY(-2px); }
.mode-icon { font-size: 24px; }
.mode-label { font-size: 12px; font-weight: 600; }
.mode-desc { font-size: 10px; color: #888; }

.join-input { display: flex; gap: 6px; align-items: center; }
.join-input input {
  padding: 6px 10px; border: 1px solid rgba(255,255,255,0.3);
  border-radius: 6px; background: rgba(0,0,0,0.3); color: #fff; width: 160px; font-size: 12px;
}
.join-input button {
  padding: 6px 12px; border: none; border-radius: 6px;
  background: #3498db; color: #fff; cursor: pointer; font-size: 12px;
}
.join-input button:last-child { background: #666; }

.waiting { text-align: center; }
.waiting p { margin-bottom: 6px; font-size: 13px; }
.waiting-ip { font-size: 11px; color: #888; }
.waiting button {
  margin-top: 8px; padding: 6px 14px; border: none;
  border-radius: 6px; background: #e74c3c; color: #fff; cursor: pointer;
}

.game-area { flex: 1; display: flex; flex-direction: column; padding: 6px; min-height: 0; }

.hp-bar { display: flex; justify-content: space-between; padding: 0 6px 6px; flex-shrink: 0; }
.hp { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.hp-label { font-size: 10px; color: #888; }
.hp-hearts { display: flex; gap: 1px; }
.heart { font-size: 12px; opacity: 0.3; transition: opacity 0.3s; }
.heart.active { opacity: 1; }

.game-canvas { flex: 1; background: #1a1a2e; border-radius: 6px; cursor: none; min-height: 0; }
.control-hint { text-align: center; padding: 4px; font-size: 10px; color: #555; flex-shrink: 0; }

.game-over {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0,0,0,0.9); padding: 20px 30px;
  border-radius: 10px; text-align: center;
}
.game-over h2 { margin-bottom: 14px; font-size: 18px; }
.game-over button {
  margin: 0 6px; padding: 8px 16px; border: none;
  border-radius: 6px; background: #3498db; color: #fff;
  cursor: pointer; font-size: 13px;
}
.game-over button:last-child { background: #666; }
</style>
