<!--
 * @Author: LBB wojiaolianbb@163.com
 * @Date: 2026-05-13 23:06:09
 * @LastEditors: LBB wojiaolianbb@163.com
 * @LastEditTime: 2026-05-13 23:06:17
 * @FilePath: \heth\AGENTS.md
 * @Description: 
 * 
 * Copyright (c) 2026 by ${git_name_email}, All Rights Reserved. 
-->
## 执行规则
- 每次任务开始前必须阅读 AGENTS.md
- 只做当前 Phase，不提前实现后续功能
- 最小 diff，不修改无关文件
- 不引入 Brief 未明确允许的依赖
- 每个 Phase 完成后必须运行验证命令
- 每个 Phase 输出：Summary / Files changed / Verification / Risks
- 只修 blocking issues，不做额外重构
## 健康内容边界（硬规则）
- 所有健康内容仅供一般信息参考
- 禁止出现：医疗诊断、治疗方案、药物名称、剂量建议、"适合 XX 疾病"
- 首页和所有内容详情页必须展示免责声明
- 免责声明文案：
  "本网站内容仅供一般健康信息参考，不构成医疗建议、诊断或治疗方案。如有健康问题，请咨询专业医生。"

## 数据边界（硬规则）
- localStorage 只存打卡状态，key 格式：checkin-YYYY-MM-DD
- 不存储任何真实健康数据、个人信息、症状描述
- MVP 不接数据库、不接后端 API、不做云同步

## 技术栈
- Next.js 14 App Router + TypeScript + Tailwind CSS
- 测试：Vitest（或项目已有工具）