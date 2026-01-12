# Codemagic 构建问题排查指南

## ❌ 问题：没有生成 APK 文件

### 已修复的问题

**问题根源**: `codemagic.yaml` 中错误地使用了 `cd synapse-app`，但 Git 仓库本身就是 synapse-app 目录。

**修复内容**:
1. ✅ 移除所有 `cd synapse-app` 命令
2. ✅ 添加 Java 17 环境配置
3. ✅ 添加 `chmod +x gradlew` 确保可执行权限
4. ✅ 添加 `--no-daemon --stacktrace` 参数以获得更好的错误信息
5. ✅ 添加构建产物列表输出，方便调试
6. ✅ 同时收集 APK 和 AAB 文件

---

## 🔍 排查步骤

### 1. 检查 Codemagic 构建日志

查找以下关键信息：

#### ✅ 成功标志
```
BUILD SUCCESSFUL in Xs Ys
```

#### ❌ 常见错误

**错误 1: 环境变量未设置**
```
Error: EXPO_PUBLIC_FIREBASE_API_KEY is not defined
```
**解决**: 在 Codemagic → Environment variables 中添加 `firebase_config` 组

**错误 2: Gradle 构建失败**
```
FAILURE: Build failed with an exception.
```
**解决**: 查看完整的 stacktrace，通常是依赖或配置问题

**错误 3: Prebuild 失败**
```
Error: expo prebuild failed
```
**解决**: 确保 `app.json` 配置正确，尤其是 `android.package`

**错误 4: 权限问题**
```
Permission denied: ./gradlew
```
**解决**: 已在配置中添加 `chmod +x gradlew`

### 2. 验证本地可以构建

在推送到 Codemagic 之前，先本地测试：

```bash
cd synapse-app

# 1. 安装依赖
npm ci

# 2. Prebuild Android
npx expo prebuild --platform android --clean

# 3. 构建 APK
cd android
./gradlew assembleRelease

# 4. 检查输出
find . -name "*.apk"
# 应该看到: ./app/build/outputs/apk/release/app-release.apk
```

### 3. 检查必需文件

确保这些文件存在且配置正确：

#### ✅ app.json
```json
{
  "expo": {
    "android": {
      "package": "com.synapse.app",
      "versionCode": 1
    }
  }
}
```

#### ✅ eas.json
```json
{
  "build": {
    "ci-android": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

### 4. 检查环境变量组

在 Codemagic UI 中验证：

**firebase_config** 组必须包含：
- ✅ EXPO_PUBLIC_FIREBASE_API_KEY
- ✅ EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
- ✅ EXPO_PUBLIC_FIREBASE_PROJECT_ID
- ✅ EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
- ✅ EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- ✅ EXPO_PUBLIC_FIREBASE_APP_ID

**openai_config** 组必须包含：
- ✅ EXPO_PUBLIC_OPENAI_API_KEY

**expo_credentials** 组（可选，用于 EAS Build）：
- ✅ EXPO_TOKEN

---

## 🚀 推荐的构建方式

### 方式 1: 使用 EAS Build（最简单，推荐）

```bash
# 1. 安装 EAS CLI
npm install -g eas-cli

# 2. 登录
npx expo login

# 3. 配置 EAS
cd synapse-app
eas build:configure

# 4. 构建
eas build --platform android --profile preview

# 5. 下载 APK
# 构建完成后会提供下载链接
```

**优势**:
- ✅ 自动处理证书和签名
- ✅ 云端构建，无需本地环境
- ✅ 支持 OTA 更新
- ✅ 更稳定可靠

### 方式 2: 使用 Codemagic 原生构建（当前方式）

**触发构建**:
```bash
git push origin main
```

**查看日志**:
1. 打开 Codemagic Dashboard
2. 选择 `android-workflow` 构建
3. 查看 "Build Android APK" 步骤的日志
4. 查看 "List build outputs" 步骤确认 APK 路径

---

## 📝 构建日志检查清单

在 Codemagic 构建日志中，确认以下步骤都成功：

```
✅ Install dependencies
   → npm ci 成功完成
   
✅ Install Expo CLI
   → eas-cli 和 expo-cli 安装成功
   
✅ Verify environment variables
   → 所有必需的环境变量都存在
   
✅ Prebuild Android native code
   → expo prebuild 成功
   → android/ 目录生成
   
✅ Build Android APK
   → gradlew assembleRelease 成功
   → BUILD SUCCESSFUL
   
✅ List build outputs
   → 显示 APK 文件路径
   → 例如: android/app/build/outputs/apk/release/app-release.apk
```

---

## 🐛 常见问题解决方案

### Q1: 构建成功但没有 APK
**检查**: 
- Artifacts 标签页是否有文件
- 构建日志 "List build outputs" 步骤输出
- artifacts 路径配置是否正确

### Q2: Gradle 构建超时
**解决**:
```yaml
environment:
  vars:
    GRADLE_OPTS: "-Xmx4096m -XX:MaxPermSize=512m"
```

### Q3: 依赖下载失败
**解决**:
- 检查网络连接
- 使用 `npm ci` 而不是 `npm install`
- 确保 `package-lock.json` 已提交

### Q4: 签名错误（Release 构建）
**解决**:
- 使用 `assembleRelease` 会生成未签名的 APK
- 如需签名，配置 `android/app/build.gradle` 签名配置
- 或使用 EAS Build 自动处理签名

---

## 📦 APK 位置

构建成功后，APK 文件会在：

**本地构建**:
```
android/app/build/outputs/apk/release/app-release.apk
```

**Codemagic 构建**:
1. 进入构建详情页
2. 点击 "Artifacts" 标签
3. 下载 `app-release.apk`

---

## 💡 调试技巧

### 1. 添加调试输出

在 `codemagic.yaml` 中添加：
```yaml
- name: Debug environment
  script: |
    pwd
    ls -la
    echo "Node: $(node --version)"
    echo "NPM: $(npm --version)"
    echo "Java: $(java -version)"
```

### 2. 保存构建日志

下载完整的构建日志：
1. Codemagic 构建页面
2. 右上角 "..." 菜单
3. "Download build log"

### 3. 本地复现

使用 Docker 在本地复现 Codemagic 环境：
```bash
docker run -it --rm -v $(pwd):/project -w /project node:20
npm ci
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

---

## ✅ 成功构建检查表

- [ ] `codemagic.yaml` 已更新（移除 `cd synapse-app`）
- [ ] 环境变量组已配置（firebase_config, openai_config）
- [ ] `app.json` 包含 android.package
- [ ] 本地可以成功 prebuild
- [ ] 推送代码到 GitHub
- [ ] Codemagic 自动触发构建
- [ ] 构建日志显示 BUILD SUCCESSFUL
- [ ] Artifacts 标签页有 APK 文件

---

## 🆘 需要帮助？

如果问题仍未解决：

1. **分享构建日志**：完整的 Codemagic 构建日志
2. **分享配置文件**：`app.json`, `eas.json`, `codemagic.yaml`
3. **描述错误**：具体的错误信息和步骤

**推荐**: 切换到 EAS Build 工作流，更稳定可靠！
