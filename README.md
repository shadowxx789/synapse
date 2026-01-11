# ⚡ Synapse (同频)

> **Bridging the Executive Function Gap for ADHD Couples.**
>
> 修复 ADHD 家庭中的“执行功能鸿沟”，平衡伴侣双方的情感劳动。从“管理者”与“被照顾者”，转变为并肩作战的“副驾驶”与“赛车手”。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android%20%7C%20Web-lightgrey.svg)
![Status](https://img.shields.io/badge/status-Alpha-orange.svg)

---

## 🌟 核心理念 (Core Philosophy)

1.  **时间坍缩理论 (Time Collapse)**: 承认 ADHD 只有“现在”与“非现在”。用视觉、触觉替代抽象的数字时间。
2.  **多巴胺补偿 (Dopamine Compensation)**: 用即时、高频、游戏化的反馈来弥补内部驱动力的不足。
3.  **角色去标签化 (Role Reframing)**: 拒绝“巨婴”与“保姆”的叙事，建立基于理解与协作的伙伴关系。

## 🚀 功能特性 (Features)

### 🏎️ 执行者 (The Executor - ADHDer)
*   **🧘 禅模式 (Calm Focus)**: 极简 UI，一次只显示一步，拒绝信息过载。
*   **⏳ 视觉沙漏 (Visual Timer)**: 像沙漏一样流逝的时间，而非焦虑的倒计时数字。
*   **🎉 多巴胺反馈 (Dopamine Hits)**: 完成任务时的强触觉反馈与视觉烟花。
*   **🆘 一键求助 (One-Tap Help)**: 降低羞耻感，快速请求伴侣介入（找东西、拆解任务）。

### 🧭 支持者 (The Supporter - Partner)
*   **✂️ 任务粉碎机 (Task Shredder)**: AI 辅助将模糊的大任务（如“收拾房间”）拆解为 <2分钟的原子步骤。
*   **📊 情感热力图 (Support Heatmap)**: 可视化你的付出，让隐形的情感劳动被看见。
*   **🎁 愿望商店 (Reward Shop)**: 积累“能量点”兑换实际奖励（按摩、免做家务卡等）。
*   **🤖 AI 代理催促 (Agent Mode)**: 让 AI 充当“坏人”去提醒，保护伴侣关系。

---

## 🛠️ 技术栈 (Tech Stack)

*   **Framework**: [React Native](https://reactnative.dev/) / [Expo](https://expo.dev/) (SDK 50+)
*   **Routing**: [Expo Router](https://docs.expo.dev/router/introduction/) (v3)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **State Management**: [Zustand](https://github.com/pmndrs/zustand) + Persistence
*   **Backend / Realtime**: [Firebase](https://firebase.google.com/) (Firestore, Auth)
*   **Styling**: Custom Design System (Warm Orange / Calming Teal)
*   **Animations**: [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)

---

## 🏁 快速开始 (Getting Started)

### 前置要求
*   Node.js (LTS)
*   npm 或 yarn
*   Firebase 项目 (用于后端同步)
*   OpenAI API Key (可选，用于 AI 任务拆解)

### 安装步骤

1.  **克隆仓库**
    ```bash
    git clone https://github.com/shadowxx789/synapse.git
    cd synapse/synapse-app
    ```

2.  **安装依赖**
    ```bash
    npm install
    ```

3.  **配置环境变量**
    复制示例文件并填入你的 API Keys：
    ```bash
    cp .env.example .env
    ```
    *在 `.env` 中填入 Firebase 配置和 OpenAI Key。*

4.  **运行项目**
    ```bash
    # Web 端 (推荐调试 UI)
    npm run web

    # iOS 模拟器
    npm run ios

    # Android 模拟器
    npm run android
    ```

---

## 📂 项目结构 (Structure)

```
synapse-app/
├── app/                  # Expo Router 页面路由
│   ├── (auth)/           # 认证/角色选择流程
│   ├── (executor)/       # 执行者视图 (红色系)
│   └── (supporter)/      # 支持者视图 (青色系)
├── components/           # UI 组件 (TaskCard, VisualTimer等)
├── stores/               # Zustand 状态管理 (User, Task, Energy)
├── services/             # API 服务 (Firebase, AI)
├── hooks/                # 自定义 Hooks (useFirestore...)
└── constants/            # 样式常量与配置
```

---

## 🤝 贡献 (Contributing)

这是一个开源项目，旨在帮助更多神经多样性家庭。欢迎提交 PR 或 Issue！

1.  Fork 本仓库
2.  创建特性分支 (`git checkout -b feature/AmazingFeature`)
3.  提交更改 (`git commit -m 'Add some AmazingFeature'`)
4.  推送到分支 (`git push origin feature/AmazingFeature`)
5.  发起 Pull Request

## 📄 许可证 (License)

Distributed under the MIT License. See `LICENSE` for more information.

---
*Built with ❤️ for ADHD brains.*
