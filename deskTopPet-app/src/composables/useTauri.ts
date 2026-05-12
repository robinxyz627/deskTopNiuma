/** 检测是否在 Tauri 环境中运行 */
export function isTauri(): boolean {
  return !!(window as any).__TAURI_INTERNALS__
}

/** 选择图片文件 */
export async function selectImage(): Promise<string | null> {
  if (!isTauri()) return null

  try {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const { readFile } = await import('@tauri-apps/plugin-fs')

    const selected = await open({
      multiple: false,
      filters: [{
        name: '图片文件',
        extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp']
      }]
    })

    if (!selected) return null

    const filePath = selected as string
    const imageData = await readFile(filePath)

    // 根据扩展名确定 MIME 类型
    const ext = filePath.split('.').pop()?.toLowerCase() || 'png'
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      bmp: 'image/bmp'
    }
    const mime = mimeMap[ext] || 'image/png'
    const base64 = `data:${mime};base64,${arrayBufferToBase64(imageData)}`

    return base64
  } catch (e) {
    console.error('选择图片失败:', e)
    return null
  }
}

function arrayBufferToBase64(buffer: Uint8Array): string {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}
