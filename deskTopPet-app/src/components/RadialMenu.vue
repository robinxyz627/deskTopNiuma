<template>
  <div class="radial-menu" :style="menuStyle">
    <!-- 中心点（点击关闭菜单） -->
    <div class="menu-center" @click="closeMenu">
      <span class="close-icon">✕</span>
    </div>
    
    <!-- 菜单项（全圆形展开） -->
    <div
      v-for="(item, index) in menuItems"
      :key="index"
      class="menu-item"
      :class="`item-${index}`"
      :style="getItemStyle(index)"
      @click.stop="handleItemClick(item)"
    >
      <div class="menu-item-icon">{{ item.icon }}</div>
      <div class="menu-item-label">{{ item.label }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface MenuItem {
  icon: string
  label: string
  action: string
}

const props = defineProps<{
  x: number
  y: number
}>()

const emit = defineEmits<{
  close: []
  select: [action: string]
}>()

// 6个菜单项：打卡、小说、工资、弹球、设置、日报
const menuItems: MenuItem[] = [
  { icon: '💼', label: '打卡', action: 'clockin' },
  { icon: '📖', label: '小说', action: 'novel' },
  { icon: '💰', label: '工资', action: 'wage' },
  { icon: '🎮', label: '弹球', action: 'pong' },
  { icon: '⚙️', label: '设置', action: 'settings' },
  { icon: '📊', label: '日报', action: 'report' },
]

const menuStyle = computed(() => ({
  left: `${props.x}px`,
  top: `${props.y}px`,
}))

// 全圆形展开：360° 均匀分布
// 使用 left/top 定位，配合 CSS transform: translate(-50%, -50%) 居中
function getItemStyle(index: number) {
  const count = menuItems.length
  const radius = 85
  // 从上方开始，顺时针分布
  const angle = (index * 360 / count - 90) * (Math.PI / 180)
  
  const x = Math.cos(angle) * radius
  const y = Math.sin(angle) * radius
  
  return {
    left: `${x}px`,
    top: `${y}px`,
    animationDelay: `${index * 0.05}s`,
  }
}

function handleItemClick(item: MenuItem) {
  emit('select', item.action)
}

function closeMenu() {
  emit('close')
}
</script>

<style scoped>
.radial-menu {
  position: absolute;
  width: 0;
  height: 0;
  z-index: 100;
  transform: translate(-50%, -50%);
}

.menu-center {
  position: absolute;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(30, 30, 46, 0.9), rgba(40, 40, 60, 0.9));
  border: 2px solid rgba(137, 180, 250, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translate(-50%, -50%);
  cursor: pointer;
  box-shadow: 0 0 15px rgba(137, 180, 250, 0.3);
  transition: all 0.2s;
}

.menu-center:hover {
  transform: translate(-50%, -50%) scale(1.1);
  box-shadow: 0 0 25px rgba(137, 180, 250, 0.5);
  border-color: #89b4fa;
}

.close-icon {
  font-size: 18px;
  color: #89b4fa;
  font-weight: bold;
}

.menu-item {
  position: absolute;
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(240,240,240,0.95));
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transform: translate(-50%, -50%);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2), 0 0 0 2px rgba(137, 180, 250, 0.3);
  transition: all 0.2s ease;
  animation: popIn 0.3s ease backwards;
}

.menu-item:hover {
  transform: translate(-50%, -50%) scale(1.15);
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3), 0 0 0 3px rgba(137, 180, 250, 0.5);
  background: linear-gradient(135deg, #fff, #f0f0f0);
}

.menu-item-icon {
  font-size: 20px;
  line-height: 1;
}

.menu-item-label {
  font-size: 10px;
  color: #333;
  margin-top: 2px;
  font-weight: 500;
}

@keyframes popIn {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}
</style>
