export class PongNetwork {
  private isHost: boolean
  private ws: WebSocket | null = null
  
  public onData: ((data: any) => void) | null = null
  public onPeerConnected: (() => void) | null = null
  public onPeerDisconnected: (() => void) | null = null
  
  constructor(isHost: boolean) {
    this.isHost = isHost
  }
  
  // 主机：启动 WebSocket 服务器
  async startServer(port: number): Promise<void> {
    if (!this.isHost) return
    
    // 使用浏览器的 WebSocket 服务器（简化版）
    // 实际项目中可能需要使用 Tauri 的命令来启动真正的服务器
    console.log(`启动服务器在端口 ${port}`)
    
    // 模拟等待连接
    setTimeout(() => {
      this.onPeerConnected?.()
    }, 1000)
  }
  
  // 客户端：连接到主机
  async connect(host: string, port: number): Promise<boolean> {
    if (this.isHost) return false
    
    try {
      const wsUrl = `ws://${host}:${port}`
      this.ws = new WebSocket(wsUrl)
      
      return new Promise((resolve) => {
        if (!this.ws) {
          resolve(false)
          return
        }
        
        this.ws.onopen = () => {
          console.log('已连接到服务器')
          resolve(true)
        }
        
        this.ws.onerror = () => {
          console.error('连接失败')
          resolve(false)
        }
        
        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            this.onData?.(data)
          } catch (err) {
            console.error('解析消息失败:', err)
          }
        }
        
        this.ws.onclose = () => {
          this.onPeerDisconnected?.()
        }
        
        // 超时处理
        setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            resolve(false)
          }
        }, 5000)
      })
    } catch (err) {
      console.error('连接错误:', err)
      return false
    }
  }
  
  // 发送数据
  send(data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }
  
  // 关闭连接
  close(): void {
    this.ws?.close()
    this.ws = null
  }
}
