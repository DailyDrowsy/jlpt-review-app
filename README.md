# Kotoba Flow — JLPT Review App Pro v2

这是对 `DailyDrowsy/jlpt-review-app` 的兼容式前端重构。项目不依赖构建工具，仍可作为原生 HTML、CSS 和 JavaScript 直接部署到 GitHub Pages。

## 本次版本重点

- 词汇页取消分页，改为可持续向下浏览的长瀑布流。
- 词汇按 N1、N2、N3、N4、N5 分区，并在每个等级内按假名排序；自定义词汇单独置于末尾。
- 右侧提供可拖动的假名定位条，拖动时实时显示当前 JLPT 等级与假名位置，也支持方向键、Page Up、Page Down、Home 和 End。
- 学习题作答后只显示“上一题 / 下一题”，不再要求选择复习间隔；系统根据答题正确与否自动更新学习进度。
- 日语朗读优先使用七海（Nanami）与圭太（Keita），在手机端或缺少指定音色时会回退到系统/浏览器默认日语朗读。
- 删除内置演示词汇回退逻辑。本包已包含 3,201 条红书 N1 内置词库；未检测到词库时会显示导入提示，而不会生成示例数据。

## 其他能力

- 今日学习仪表盘、到期复习、薄弱词与每日目标。
- 词→义、义→词、假名→写法、输入题四种练习。
- 搜索、五十音筛选、收藏、批量学习、词条详情及自定义词汇。
- 7 日趋势、等级掌握度、学习热力图、正确率和连续学习天数。
- 手机、平板和桌面自适应；浅色、深色及跟随系统主题。
- JSON、CSV、TSV、XLSX 导入，以及完整数据备份与恢复。
- Web App Manifest 和 Service Worker，可安装并缓存核心界面与内置词库。

## 与原项目数据兼容

以下 localStorage 键保持不变，因此旧版中的自定义词、隐藏词、学习进度、历史记录和朗读设置可继续使用：

- `jlpt-review.customWords.v1`
- `jlpt-review.deletedBaseIds.v1`
- `jlpt-review.progress.v1`
- `jlpt-review.history.v1`
- `jlpt-review.speech.v1`

新界面偏好存放在 `jlpt-review.settings.v2`。

## 安装与运行

1. 备份原仓库。
2. 将本包全部文件复制到仓库根目录，保留目录结构。
3. 如原仓库另有 `assets/vocab.json` 或更多等级词库，可继续保留；新版会优先读取 `window.DEFAULT_VOCAB`，也兼容 `assets/vocab.json`。
4. 本地测试建议使用 HTTP 服务：

```bash
python3 -m http.server 8080
```

随后访问 `http://localhost:8080`。

## 快捷键

- `/`：聚焦词汇搜索
- `1` / `2` / `3` / `4`：选择答案
- `Space`：显示答案
- `Enter` / `→`：答题后进入下一题
- `←`：返回上一题
- `S`：朗读当前词
- `F`：收藏当前词
- `Esc`：退出学习

## 文件结构

```text
jlpt-review-app-pro-v2/
├── index.html
├── styles.css
├── app.js
├── manifest.webmanifest
├── sw.js
└── assets/
    ├── vocab-data.js
    ├── kotoba-icon-192.png
    └── kotoba-icon-512.png
```
