# AGENTS.md - Synapse App

## Build & Run
```bash
npm start          # Start Expo dev server
npm run android    # Android emulator
npm run ios        # iOS simulator
npm run web        # Web browser
```
No test runner configured yet. Single test file at `components/__tests__/`.

## Code Style
- **TypeScript**: Strict mode enabled. Never use `as any`, `@ts-ignore`, or `@ts-expect-error`.
- **Path aliases**: Use `@/` for project root (e.g., `@/stores/userStore`, `@/constants/Colors`).
- **Exports**: Default export for React components, named exports for stores/services.
- **Zustand stores**: Use `useXxxStore` naming pattern with `create<State>()`.
- **Interfaces**: Define props interfaces above component with `XxxProps` naming.
- **Styles**: Use `StyleSheet.create()` at file bottom. Import design tokens from `@/constants/Colors`.
- **Design system**: Use `Colors`, `Spacing`, `FontSizes`, `BorderRadius` from constants—no magic numbers.
- **Haptics**: Use `expo-haptics` for tactile feedback on user actions.
- **VSCode**: Auto-organizes imports and fixes on save.

## Conventions
- App uses Chinese UI text (ADHD task management for Chinese users).
- Executor (orange theme) vs Supporter (teal theme) role distinction in constants.
- Components receive callbacks via props; state lives in Zustand stores.
