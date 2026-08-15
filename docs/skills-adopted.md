# 技能采纳记录（docs/skills-adopted.md）

按实施计划第 9 节工作流，用 Tavily 检索 GitHub 并按「许可 / 活跃度 / 相关性 / 安全」门槛评审后安装。

| 名称 | 来源 | 许可 | 用途 | 里程碑 | 安装方式 |
|---|---|---|---|---|---|
| nestjs-best-practices | xirothedev/agent-skills@main `skills/nestjs-best-practices` | MIT | 模块/Guard/DTO 校验/Prisma 规范，已用于 M0 实现 | M0–M2 | git sparse-checkout（skill-installer 脚本本机异常，按计划兜底） |
| security-best-practices | openai/skills@main `skills/.curated/security-best-practices` | MIT（官方） | 认证/附件访问的 secure-by-default 编码 | M0/M2 | 同上 |
| security-threat-model | openai/skills@main `skills/.curated/security-threat-model` | MIT（官方） | 按需威胁建模（仅显式请求时触发） | M0/M2 | 同上 |
| prisma-cli | prisma/skills@main `prisma-cli` | MIT（官方） | Prisma 7 命令/迁移参考，规避 v7 破坏性变更 | M0 | 同上 |
| product-design | openai/role-specific-plugins@main `plugins/product-design` | MIT（官方） | 官方 Product Design 插件：产品方向探索、交互原型、URL/截图转代码、UX/无障碍审计 | U0/持续 | 本地个人插件市场安装（`codex plugin add product-design@personal`） |

备注：
- `youlaitech/youlai-skills`（根目录无 LICENSE）、`tinh2/skills-hub-registry`（根目录无 LICENSE）按门槛仅作阅读参考，未安装。
- `codercup/unibest`（MIT）作为 uni-app 目录约定参考；`HabitRPG/habitica`（GPL）仅借鉴游戏化机制。
- 安装后新技能自下一轮对话起自动可用。
- `product-design` 安装到个人插件市场，插件版本 `0.1.50`，提交 `fe5608d`；包含 10 个技能：`index`、`get-context`、`user-context`、`research`、`ideate`、`image-to-code`、`url-to-code`、`design-qa`、`audit`、`share`。
