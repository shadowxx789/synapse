# Codemagic CI/CD 配置指南

## 概述

本项目已配置 Codemagic 用于自动化构建和部署 Synapse App（Expo/React Native 应用）。

## 工作流程

### 1. **android-workflow** - Android 构建
- **触发条件**: Push 到 `main` 或 `develop` 分支，PR
- **构建产物**: Android APK
- **构建时间**: ~30-40 分钟

### 2. **ios-workflow** - iOS 构建
- **触发条件**: Push 到 `main` 或 `release/*` 分支
- **构建产物**: iOS IPA
- **构建时间**: ~40-50 分钟
- **需要**: Apple 开发者证书和配置文件

### 3. **web-workflow** - Web 构建
- **触发条件**: Push 到 `main` 分支
- **构建产物**: 静态 Web 文件
- **构建时间**: ~10-15 分钟

### 4. **check-workflow** - TypeScript & 代码检查
- **触发条件**: 所有 Pull Requests
- **功能**: TypeScript 类型检查
- **构建时间**: ~5 分钟

### 5. **eas-build-workflow** - EAS 全平台构建（推荐）
- **触发条件**: Git 标签 (v*.*.*)
- **构建产物**: iOS + Android + Web（通过 EAS）
- **构建时间**: ~60-90 分钟

## 环境变量配置

在 Codemagic 控制台中创建以下环境变量组：

### 1. `expo_credentials`
```
EXPO_TOKEN=<your-expo-access-token>
```
获取方式: `npx expo login` 然后 `npx expo whoami --token`

### 2. `firebase_config`
```
EXPO_PUBLIC_FIREBASE_API_KEY=<your-api-key>
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=<your-project>.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=<your-project-id>
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=<your-project>.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<your-sender-id>
EXPO_PUBLIC_FIREBASE_APP_ID=<your-app-id>
```

### 3. `openai_config`
```
EXPO_PUBLIC_OPENAI_API_KEY=<your-openai-api-key>
```

### 4. `ios_credentials` (仅 iOS 构建需要)
```
APP_STORE_CONNECT_ISSUER_ID=<issuer-id>
APP_STORE_CONNECT_KEY_IDENTIFIER=<key-id>
APP_STORE_CONNECT_PRIVATE_KEY=<private-key>
CERTIFICATE_PRIVATE_KEY=<cert-private-key>
```

## 初次设置步骤

### 1. 连接 GitHub 仓库
1. 登录 [Codemagic](https://codemagic.io)
2. 点击 "Add application"
3. 选择 GitHub 并授权访问 `shadowxx789/synapse`
4. 选择 `synapse` 仓库

### 2. 配置环境变量
1. 进入 Application settings → Environment variables
2. 创建上述环境变量组
3. 添加所有必需的变量

### 3. 配置构建触发器
1. 进入 Workflow settings
2. 选择要启用的工作流
3. 配置分支和触发条件

### 4. iOS 额外配置（如需 iOS 构建）

#### 方式 A: 使用 App Store Connect API（推荐）
1. 在 [App Store Connect](https://appstoreconnect.apple.com/) 创建 API 密钥
2. 下载 `.p8` 文件
3. 在 Codemagic 中配置 App Store Connect 集成

#### 方式 B: 使用证书和配置文件
1. 导出开发者证书（.p12）
2. 下载配置文件（.mobileprovision）
3. 在 Codemagic 中上传这些文件

### 5. EAS 配置（使用 EAS Build）
1. 安装 EAS CLI: `npm install -g eas-cli`
2. 登录: `npx expo login`
3. 配置 EAS: `cd synapse-app && eas build:configure`
4. 获取 Expo token: `npx expo whoami --token`
5. 将 token 添加到 Codemagic 环境变量 `EXPO_TOKEN`

## 推荐使用 EAS Build

对于 Expo 应用，推荐使用 `eas-build-workflow`，因为：
- ✅ 官方支持，稳定可靠
- ✅ 自动处理原生依赖
- ✅ 云端构建，无需本地配置
- ✅ 支持 OTA 更新
- ✅ 简化证书管理

### 发布新版本
```bash
# 1. 更新版本号
cd synapse-app
npm version patch  # 或 minor, major

# 2. 推送标签
git push origin main --tags

# 3. Codemagic 会自动触发 eas-build-workflow
```

## 构建产物

### Android
- **路径**: `synapse-app/android/app/build/outputs/apk/release/app-release.apk`
- **下载**: Codemagic 构建详情页 → Artifacts

### iOS
- **路径**: `synapse-app/ios/build/synapseapp.ipa`
- **下载**: Codemagic 构建详情页 → Artifacts

### Web
- **路径**: `synapse-app/dist/`
- **部署**: 可直接部署到 Vercel、Netlify 或 Firebase Hosting

## 常见问题

### Q: 构建失败 "TypeScript errors"
A: 检查 `tsconfig.json` 的 `strict` 模式，确保没有类型错误。运行 `npx tsc --noEmit` 本地检查。

### Q: iOS 构建失败 "Code signing error"
A: 确保已正确配置 App Store Connect API 或上传了有效的证书和配置文件。

### Q: Android 构建失败 "Gradle error"
A: 检查 `android/build.gradle` 配置，确保 Gradle 版本兼容。

### Q: 环境变量未生效
A: 确保环境变量名以 `EXPO_PUBLIC_` 开头（Expo SDK 49+），并在 Codemagic 中正确配置。

### Q: EAS Build 失败 "Not authenticated"
A: 确保 `EXPO_TOKEN` 环境变量正确设置。重新生成 token: `npx expo whoami --token`

## 手动触发构建

在 Codemagic 控制台：
1. 选择工作流
2. 点击 "Start new build"
3. 选择分支
4. 点击 "Start build"

## 监控构建状态

- **邮件通知**: 构建成功/失败会发送邮件到 `shadowxx789@users.noreply.github.com`
- **GitHub Status**: 在 PR 和 Commit 页面显示构建状态
- **Codemagic 控制台**: 实时查看构建日志

## 优化建议

1. **缓存依赖**: Codemagic 会自动缓存 `node_modules`
2. **并行构建**: 使用 EAS Build 可以同时构建多个平台
3. **增量构建**: 仅在文件变更时触发特定工作流
4. **预览构建**: 使用 `preview` 配置生成内部测试版本

## 资源链接

- [Codemagic 文档](https://docs.codemagic.io/)
- [Expo EAS Build 文档](https://docs.expo.dev/build/introduction/)
- [React Native 构建指南](https://reactnative.dev/docs/signed-apk-android)

## 支持

如有问题，请查看：
1. Codemagic 构建日志
2. GitHub Issues
3. [Expo 论坛](https://forums.expo.dev/)
