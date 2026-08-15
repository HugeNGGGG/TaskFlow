# 组件规格（default / hover / active / disabled 四态）

| 组件 | default | hover | active | disabled |
|---|---|---|---|---|
| 主按钮 | 底 brass、字 #FFF8E8、圆角 8 | brassHover | 按下位移 1px | 50% 透明度、禁止点击 |
| 次按钮 | 透明底、皮革棕描边、墨色字 | 底 parchmentDeep | 按下位移 1px | 40% 透明度 |
| 悬赏单任务卡 | 底 surface-raised、皮革描边、shadow-sm | shadow-md、轻微上移 | 按下 scale .98 | — |
| 火漆状态徽章 | 双线圆环 + 旋转 -8°（已结 moss/待审 brass/紧急 seal/可接 leather） | — | 盖章动画 200ms | — |
| 难度徽章 | D 灰绿 / C 苔绿 / B 黄铜 / A 火漆 / S 暗金，描边圆角胶囊 | — | — | — |
| 筛选签 | 边框 border、灰字 | 底 parchmentDeep | 选中底 leather 白字 | — |
| 时间线节点 | 8px 圆点 #CBB98E + 虚线分隔 | — | — | — |
| 表单字段 | 底 parchment、border 描边、圆角 8 | 边框 brass | 聚焦阴影 | 底 surface、灰字 |
| 看板状态列 | 底 boardColumnBg、皮革描边 | — | — | — |
| 等级/称号/头像框 | SVG 徽章按 levels.icon/frame 渲染 | — | — | — |

验收：所有颜色必须来自 `design-tokens.json`（禁用裸色值）；状态齐全；低端安卓真机滚动流畅；对比度与字号达标。
