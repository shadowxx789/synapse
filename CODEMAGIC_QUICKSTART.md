# Codemagic 快速开始

## 🚀 5 分钟快速配置

### 步骤 1: 连接 Codemagic
1. 访问 https://codemagic.io
2. 使用 GitHub 登录
3. 选择 `shadowxx789/synapse` 仓库

### 步骤 2: 配置环境变量

#### 必需的环境变量（创建环境变量组）

**firebase_config** 组:
```bash
EXPO_PUBLIC_FIREBASE_API_KEY=AIza...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=synapse-xxxx.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=synapse-xxxx
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=synapse-xxxx.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:xxxxx
```

**openai_config** 组:
```bash
EXPO_PUBLIC_OPENAI_API_KEY=sk-...
```

**expo_credentials** 组（推荐用 EAS Build）:
```bash
# 获取 token: npx expo login && npx expo whoami --token
EXPO_TOKEN=your-expo-token-here
```

### 步骤 3: 选择工作流

#### 推荐: EAS Build（最简单）
- 触发条件: Git 标签 `v*.*.*`
- 用法: `git tag v1.0.1 && git push --tags`
- 自动构建: iOS + Android + Web

#### 或使用独立工作流
- `check-workflow`: PR 时自动运行 TypeScript 检查
- `web-workflow`: Push 到 main 时构建 Web
- `android-workflow`: 构建 Android APK
- `ios-workflow`: 构建 iOS IPA

### 步骤 4: 触发首次构建

```bash
# 方式 1: 通过标签（推荐）
git tag v1.0.0
git push origin main --tags

# 方式 2: 通过 Push
git push origin main

# 方式 3: 在 Codemagic UI 手动触发
```

### 步骤 5: 获取构建产物

构建完成后：
1. 打开 Codemagic 控制台
2. 进入构建详情页
3. 下载 Artifacts 中的 APK/IPA/Web 文件

---

## 📱 推荐配置（EAS Build）

### 一次性设置
```bash
cd synapse-app
npm install -g eas-cli
npx expo login
eas build:configure
```

### 获取 Expo Token
```bash
npx expo whoami --token
# 复制输出的 token，添加到 Codemagic 的 expo_credentials 组
```

### 发布新版本
```bash
npm version patch  # 1.0.0 -> 1.0.1
git push origin main --tags
# Codemagic 自动开始构建
```

---

## ⚠️ 常见问题

**Q: 构建失败 "Environment variable not set"**  
A: 在 Codemagic → Team settings → Environment variables 中添加变量组

**Q: iOS 构建需要证书？**  
A: 使用 EAS Build（推荐）会自动管理证书，或在 Codemagic 配置 App Store Connect

**Q: 想在 PR 时运行检查？**  
A: `check-workflow` 已配置自动运行，无需额外设置

**Q: 如何部署到 App Store/Play Store？**  
A: 配置 `eas.json` 中的 submit 部分，或使用 Codemagic 的 Publishing 功能

---

## 📖 详细文档

完整配置和高级选项请参考 `CODEMAGIC_SETUP.md`

## 🔗 相关链接

- [Codemagic Dashboard](https://codemagic.io/apps)
- [Expo Dashboard](https://expo.dev)
- [配置文档](./CODEMAGIC_SETUP.md)
