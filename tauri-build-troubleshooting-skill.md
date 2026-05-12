# Tauri 2.x 构建问题排查技能

## 问题现象
桌面应用打包后打开显示"无法访问此网页"或空白页面

## 根本原因
Tauri 生产构建时前端资源没有正确嵌入到可执行文件中

## 常见原因及解决方案

### 1. 前端资源路径错误（最常见）
**症状**: 打包后打开显示"无法访问此网页"

**原因**: Vite 默认使用绝对路径 `/assets/...`，但 Tauri 的 `tauri://` 协议无法解析

**解决**: 在 `vite.config.ts` 中添加 `base: './'`

```typescript
export default defineConfig({
  base: './',  // 关键：使用相对路径
  plugins: [vue()],
  // ...
})
```

### 2. 使用 cargo build 而非 tauri build
**症状**: 代码编译成功但页面空白/无法访问

**原因**: `cargo build` 不会自动执行 `beforeBuildCommand`，前端可能不是最新的，或者 `generate_context!()` 宏嵌入的资源不正确

**解决**: 始终使用 `npx tauri build` 进行生产构建

```bash
# ❌ 错误：直接用 cargo
$ cargo build --release

# ✅ 正确：使用 Tauri CLI
$ npx tauri build
```

`npx tauri build` 会自动：
1. 执行 `beforeBuildCommand`（通常是 `npm run build`）
2. 等待前端构建完成
3. 编译 Rust 并正确嵌入前端资源

### 3. 构建缓存问题
**症状**: 修改配置后仍然出现旧问题

**原因**: Cargo 缓存了旧的构建产物，包括嵌入的前端资源

**解决**: 清理构建缓存

```powershell
# 清理特定项目的构建缓存
Remove-Item -Recurse -Force "src-tauri/target/release/build/your-app-*"
Remove-Item -Force "src-tauri/target/release/your-app.exe"

# 或者完整清理（较慢）
$ cargo clean
```

### 4. tauri.conf.json 配置错误
**症状**: 窗口打开但无内容

**检查点**:
- `build.frontendDist` 路径是否正确（相对于 `src-tauri` 目录）
- 不需要手动设置 `url` 字段，Tauri 会自动从 `frontendDist` 加载 `index.html`

```json
{
  "build": {
    "frontendDist": "../dist",  // 相对 src-tauri 的路径
    "beforeBuildCommand": "npm run build"
  },
  "app": {
    "windows": [{
      // 不需要 "url": "index.html"，会自动加载
      "width": 800,
      "height": 600
    }]
  }
}
```

## 正确的构建流程

```bash
# 1. 确保 vite.config.ts 有 base: './'

# 2. 使用 Tauri CLI 构建（会自动处理前端+后端）
$ npx tauri build

# 3. 输出在 src-tauri/target/release/[app-name].exe
```

## 调试技巧

1. **检查 dist 目录**: 确认 `dist/index.html` 存在且资源引用是相对路径
2. **开发模式验证**: 先确保 `npm run dev` 和 `npx tauri dev` 能正常工作
3. **查看构建日志**: 确认 `beforeBuildCommand` 被执行且成功
4. **测试嵌入资源**: 在 Rust 代码中添加日志检查资源加载

## 关键区别

| 命令 | 执行 beforeBuildCommand | 嵌入前端资源 | 适用场景 |
|------|------------------------|-------------|---------|
| `cargo build` | ❌ 否 | ⚠️ 可能旧资源 | 仅 Rust 开发 |
| `npx tauri build` | ✅ 是 | ✅ 正确嵌入 | 生产发布 |
| `npx tauri dev` | ✅ 是 | ✅ 热重载 | 开发调试 |
