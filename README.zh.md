# DSH 思考状态自定义插件

[English](README.md)

这是一个纯 CSS 的 DSH Web 插件。它可以用自定义文字（流光效果）、GIF/APNG/WebP 动画或图文组合覆盖运行中状态的视觉显示，不修改 DSH 源码，也不重写状态元素的 DOM。

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
dsh plugin --profile web add github:Dbi-Eshuh/dsh-thinking-status-customizer#v0.2.2
dsh --profile web --dump-config
```

重启后点击悬浮的 **思考状态** 按钮打开设置面板；再次点击同一按钮、点击关闭按钮或按 Escape 均可关闭。插件会跟随 DSH 当前语言设置，在中英文之间即时切换，且不会丢失未保存的表单内容；用户自行填写的自定义文字保持原样。设置面板可以启用或停用自定义显示，并在自定义文字（流光效果）、动态图片和左图右文三种模式之间切换。自定义文字和图文组合模式支持 2 至 5 个自定义颜色、四种流光方向，以及循环或往返两种流动方式。图片模式内置一张约 12 秒、透明背景的舞蹈 GIF，也支持 HTTPS / Data URL，以及不超过 20 MB 的本地 GIF、APNG 或 WebP 文件。超过 2 MB 的本地图片不压缩，使用临时对象 URL，仅在当前标签页有效，刷新后需要重新选择。

设置面板会继承 DSH Web 的浅色或深色主题变量，并在保存前实时预览自定义文字、颜色数量、颜色、流光方向、流动方式、动画和尺寸调整。

卸载后重启 DSH Web，即可恢复内置显示：

```sh
dsh plugin --profile web remove dsh-thinking-status-customizer
```

## 行为与隐私

默认使用带流光效果的自定义文字 `正在吃饭中...`。设置和不超过约 3 MB 的 Data URL 图片只保存在浏览器 `localStorage` 的 `dsh-thinking-status-customizer:v1` 项中；更大的本地图片使用临时对象 URL，不会写入存储。插件不会主动上传设置、状态文字、图片或模型交互。用户填写 HTTPS 图片地址时，浏览器会直接向该地址请求图片。存储缺失、损坏或不可用时，插件使用默认值，不会阻止页面加载。

样式仅匹配 `[data-conversation-scroll] [role="status"][aria-live="polite"]`。插件使用参与布局的伪元素和自有 CSS 属性，不监听页面、不替换 `textContent`，也不匹配其他实时状态元素。停用或卸载插件会移除其样式、控件、属性、CSS 属性和事件监听器。

原始 DSH 状态仍保留在无障碍树中，因此插件只修改视觉文字；辅助技术仍会收到 DSH 内置状态文字。

## 兼容性

当前版本已在 DSH Web `0.1.0-rc.6` 上测试。该版本的 `ui-conversation` 尚未提供运行状态文字 Provider，因此插件依赖上述语义选择器。若后续 DSH 修改这个选择器，自定义视觉可能不再生效；插件仍会正常加载，设置面板会提示正在等待匹配状态。

本包只使用公开的 DSH Bundle、客户端模块加载声明和客户端语言服务，不修改 `ui-conversation`，也不依赖 DSH 私有构建工具。

## 开发与验证

```sh
npm install
npm run verify
```

仓库提交了 `lib/index.js` 和 `lib/client.js`，所以通过 GitHub 安装时不需要现场构建。`npm run verify` 会依次执行类型检查、测试和构建，确认提交的 Bundle 与源码一致，并预览包内容。

## 模型体验

无。插件不添加工具、提示词、模型可见输入或输出、会话事件，也不改变模型行为；它只修改已有运行状态在浏览器中的本地显示。
