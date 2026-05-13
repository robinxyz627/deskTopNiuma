import type { PongNetwork } from './PongNetwork'

interface Ball {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
}

interface Paddle {
  x: number
  y: number
  width: number
  height: number
  speed: number
}

export class PongGameCore {
  private ctx: CanvasRenderingContext2D
  private width: number
  private height: number
  
  private ball: Ball
  private leftPaddle: Paddle
  private rightPaddle: Paddle
  
  private isMultiplayer: boolean
  private isHost: boolean
  private network: PongNetwork | null
  
  private paddleSpeed = 5
  private ballSpeed = 5
  private aiSpeed = 3.5
  
  public onScore: ((side: 'left' | 'right') => void) | null = null
  
  // 鼠标控制状态
  private useMouse = false
  
  constructor(
    canvas: HTMLCanvasElement,
    isMultiplayer: boolean,
    isHost: boolean,
    network: PongNetwork | null
  ) {
    this.ctx = canvas.getContext('2d')!
    this.width = canvas.width
    this.height = canvas.height
    
    this.isMultiplayer = isMultiplayer
    this.isHost = isHost
    this.network = network
    
    // 初始化球
    this.ball = {
      x: this.width / 2,
      y: this.height / 2,
      vx: this.ballSpeed * (Math.random() > 0.5 ? 1 : -1),
      vy: this.ballSpeed * (Math.random() * 2 - 1),
      radius: 8
    }
    
    // 初始化挡板
    const paddleWidth = 12
    const paddleHeight = 80
    
    this.leftPaddle = {
      x: 20,
      y: this.height / 2 - paddleHeight / 2,
      width: paddleWidth,
      height: paddleHeight,
      speed: this.paddleSpeed
    }
    
    this.rightPaddle = {
      x: this.width - 20 - paddleWidth,
      y: this.height / 2 - paddleHeight / 2,
      width: paddleWidth,
      height: paddleHeight,
      speed: this.paddleSpeed
    }
    
    // 网络事件监听
    if (this.network && !this.isHost) {
      this.network.onData = (data) => this.handleNetworkData(data)
    }
  }
  
  start() {
    // 游戏开始
  }
  
  stop() {
    // 清理资源
  }
  
  reset() {
    this.resetBall()
    this.leftPaddle.y = this.height / 2 - this.leftPaddle.height / 2
    this.rightPaddle.y = this.height / 2 - this.rightPaddle.height / 2
  }
  
  private resetBall() {
    this.ball.x = this.width / 2
    this.ball.y = this.height / 2
    this.ball.vx = this.ballSpeed * (Math.random() > 0.5 ? 1 : -1)
    this.ball.vy = this.ballSpeed * (Math.random() * 2 - 1)
  }
  
  // 处理键盘输入
  handleInput(keys: { [key: string]: boolean }) {
    if (this.useMouse) return // 如果使用鼠标，忽略键盘
    
    // 玩家控制左挡板
    if (keys.ArrowUp) {
      this.leftPaddle.y -= this.leftPaddle.speed
    }
    if (keys.ArrowDown) {
      this.leftPaddle.y += this.leftPaddle.speed
    }
    if (keys.ArrowLeft) {
      this.leftPaddle.x -= this.leftPaddle.speed
    }
    if (keys.ArrowRight) {
      this.leftPaddle.x += this.leftPaddle.speed
    }
    
    // 限制挡板在屏幕内
    this.clampPaddle(this.leftPaddle)
  }
  
  // 处理鼠标移动
  handleMouseMove(x: number, y: number, canvasWidth: number, canvasHeight: number) {
    this.useMouse = true
    
    // 计算相对位置（-1 到 1）
    const relX = (x / canvasWidth) * 2 - 1
    const relY = (y / canvasHeight) * 2 - 1
    
    // 根据鼠标位置移动挡板
    const centerX = this.width * 0.25 // 左挡板区域中心
    const centerY = this.height / 2
    
    const targetX = centerX + relX * 50
    const targetY = centerY + relY * (this.height / 2 - this.leftPaddle.height / 2)
    
    // 平滑移动
    this.leftPaddle.x += (targetX - this.leftPaddle.x) * 0.1
    this.leftPaddle.y += (targetY - this.leftPaddle.y) * 0.1
    
    this.clampPaddle(this.leftPaddle)
  }
  
  private clampPaddle(paddle: Paddle) {
    // X轴限制（左半边）
    paddle.x = Math.max(10, Math.min(this.width / 2 - paddle.width - 10, paddle.x))
    // Y轴限制
    paddle.y = Math.max(10, Math.min(this.height - paddle.height - 10, paddle.y))
  }
  
  // 更新游戏状态
  update() {
    // 如果是联机客户端，不更新逻辑（只接收主机数据）
    if (this.isMultiplayer && !this.isHost) return
    
    // 更新球位置
    this.ball.x += this.ball.vx
    this.ball.y += this.ball.vy
    
    // 上下墙壁碰撞
    if (this.ball.y - this.ball.radius <= 0 || this.ball.y + this.ball.radius >= this.height) {
      this.ball.vy = -this.ball.vy
    }
    
    // 挡板碰撞检测
    if (this.checkPaddleCollision(this.leftPaddle)) {
      this.ball.vx = Math.abs(this.ball.vx)
      this.addBallSpin(this.leftPaddle)
    }
    
    if (this.checkPaddleCollision(this.rightPaddle)) {
      this.ball.vx = -Math.abs(this.ball.vx)
      this.addBallSpin(this.rightPaddle)
    }
    
    // AI 控制右挡板（单机模式）
    if (!this.isMultiplayer) {
      this.updateAI()
    }
    
    // 得分检测
    if (this.ball.x < 0) {
      this.onScore?.('right')
      this.resetBall()
    } else if (this.ball.x > this.width) {
      this.onScore?.('left')
      this.resetBall()
    }
    
    // 同步网络数据
    if (this.isMultiplayer && this.isHost && this.network) {
      this.network.send({
        type: 'sync',
        ball: { x: this.ball.x, y: this.ball.y, vx: this.ball.vx, vy: this.ball.vy },
        leftPaddle: { x: this.leftPaddle.x, y: this.leftPaddle.y },
        rightPaddle: { x: this.rightPaddle.x, y: this.rightPaddle.y }
      })
    }
  }
  
  private checkPaddleCollision(paddle: Paddle): boolean {
    return (
      this.ball.x - this.ball.radius < paddle.x + paddle.width &&
      this.ball.x + this.ball.radius > paddle.x &&
      this.ball.y - this.ball.radius < paddle.y + paddle.height &&
      this.ball.y + this.ball.radius > paddle.y
    )
  }
  
  private addBallSpin(paddle: Paddle) {
    // 根据击中挡板的位置改变球的Y速度
    const hitPoint = (this.ball.y - paddle.y) / paddle.height
    this.ball.vy = (hitPoint - 0.5) * 10
    
    // 稍微加速
    this.ball.vx *= 1.02
    this.ball.vy *= 1.02
  }
  
  private updateAI() {
    const targetY = this.ball.y - this.rightPaddle.height / 2
    const diff = targetY - this.rightPaddle.y
    
    if (Math.abs(diff) > this.aiSpeed) {
      this.rightPaddle.y += Math.sign(diff) * this.aiSpeed
    } else {
      this.rightPaddle.y = targetY
    }
    
    // 限制在屏幕内
    this.rightPaddle.y = Math.max(10, Math.min(this.height - this.rightPaddle.height - 10, this.rightPaddle.y))
  }
  
  // 处理网络数据
  private handleNetworkData(data: any) {
    if (data.type === 'sync') {
      this.ball.x = data.ball.x
      this.ball.y = data.ball.y
      this.ball.vx = data.ball.vx
      this.ball.vy = data.ball.vy
      this.leftPaddle.x = data.leftPaddle.x
      this.leftPaddle.y = data.leftPaddle.y
      this.rightPaddle.x = data.rightPaddle.x
      this.rightPaddle.y = data.rightPaddle.y
    }
  }
  
  // 渲染游戏画面
  render() {
    // 清空画布
    this.ctx.fillStyle = '#1a1a1a'
    this.ctx.fillRect(0, 0, this.width, this.height)
    
    // 绘制中线
    this.ctx.strokeStyle = '#333'
    this.ctx.lineWidth = 2
    this.ctx.setLineDash([10, 10])
    this.ctx.beginPath()
    this.ctx.moveTo(this.width / 2, 0)
    this.ctx.lineTo(this.width / 2, this.height)
    this.ctx.stroke()
    this.ctx.setLineDash([])
    
    // 绘制挡板
    this.ctx.fillStyle = '#3498db'
    this.ctx.fillRect(this.leftPaddle.x, this.leftPaddle.y, this.leftPaddle.width, this.leftPaddle.height)
    
    this.ctx.fillStyle = '#e74c3c'
    this.ctx.fillRect(this.rightPaddle.x, this.rightPaddle.y, this.rightPaddle.width, this.rightPaddle.height)
    
    // 绘制球
    this.ctx.fillStyle = '#fff'
    this.ctx.beginPath()
    this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2)
    this.ctx.fill()
    
    // 绘制球的光晕效果
    this.ctx.shadowColor = '#fff'
    this.ctx.shadowBlur = 10
    this.ctx.beginPath()
    this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2)
    this.ctx.fill()
    this.ctx.shadowBlur = 0
  }
}
