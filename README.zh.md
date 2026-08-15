# DSH 思考状态自定义插件

[English](README.md)

这是一个纯 CSS 的 DSH Web 插件。它可以自定义运行中状态的可见文字和双色流光效果，不修改 DSH 源码，也不重写状态元素的 DOM。

## 效果预览

### 深色主题

![DSH Web 深色主题与打开的思考状态设置栏](assets/harness-dark-preview.png)

### 浅色主题

![DSH Web 浅色主题与打开的思考状态设置栏](assets/harness-light-preview.png)

### 设置栏特写

![思考状态设置](assets/settings-preview.png)

## 安装

将指定版本安装到 Web Profile，检查解析后的配置，然后重启 DSH Web：

```sh
dsh plugin --profile web add github:Dbi-Eshuh/dsh-thinking-status-customizer#v0.1.1
dsh --profile web --dump-config
```

重启后点击悬浮的 **思考状态** 按钮打开设置面板；再次点击同一按钮、点击关闭按钮或按 Escape 均可关闭。设置面板可以启用或停用自定义显示、修改文字、选择两种流光颜色、保存设置或恢复默认值。

设置面板会继承 DSH Web 的浅色或深色主题变量，并在保存前实时预览文字与颜色调整。

卸载后重启 DSH Web，即可恢复内置显示：

```sh
dsh plugin --profile web remove dsh-thinking-status-customizer
```

## 行为与隐私

默认显示文字是 `正在吃饭中...`。设置只保存在浏览器 `localStorage` 的 `dsh-thinking-status-customizer:v1` 项中；插件不会通过网络发送设置、状态文字或模型交互。存储缺失、损坏或不可用时，插件使用默认值，不会阻止页面加载。

样式仅匹配 `[data-conversation-scroll] [role="status"][aria-live="polite"]`。插件使用参与布局的伪元素和自有 CSS 属性，不监听页面、不替换 `textContent`，也不匹配其他实时状态元素。停用或卸载插件会移除其样式、控件、属性、CSS 属性和事件监听器。

原始 DSH 状态仍保留在无障碍树中，因此插件只修改视觉文字；辅助技术仍会收到 DSH 内置状态文字。

## 兼容性

当前版本已在 DSH Web `0.1.0-rc.6` 上测试。该版本的 `ui-conversation` 尚未提供运行状态文字 Provider，因此插件依赖上述语义选择器。若后续 DSH 修改这个选择器，自定义视觉可能不再生效；插件仍会正常加载，设置面板会提示正在等待匹配状态。

本包只使用公开的 DSH Bundle 和客户端模块加载声明，不修改 `ui-conversation`，也不依赖 DSH 私有构建工具。

## 开发与验证

```sh
npm install
npm run verify
```

仓库提交了 `lib/index.js` 和 `lib/client.js`，所以通过 GitHub 安装时不需要现场构建。`npm run verify` 会依次执行类型检查、测试和构建，确认提交的 Bundle 与源码一致，并预览包内容。

## 模型体验

无。插件不添加工具、提示词、模型可见输入或输出、会话事件，也不改变模型行为；它只修改已有运行状态在浏览器中的本地显示。
