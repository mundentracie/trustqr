# TrustQR Pro — 销售 SOP（私有，不入仓库）

## 产品定义
- **TrustQR Pro $2.9 买断**：解锁 Wi-Fi QR、vCard QR、批量生成（≤50 行/次，自动去重）。
- 免费版保留：Text/URL、Current page、全部尺寸与纠错等级 —— 免费版本身已强于多数竞品免费版。
- 授权：ECDSA P-256 离线验签（与 TrustDownload Pro 同一对密钥，前缀 TQPRO- 隔离）。

## 生成 License（每单一次）
```
cd trustqr
node scripts/make-license.mjs ../secrets/trustdownload-license-private.jwk.json
```
输出形如 `VFFQUk8t...<base64url 片段>.<base64url 签名>` 的完整密钥（两段用 `.` 分隔，直接粘贴到扩展设置框即可），直接发给买家邮箱。

## 收款
- PayPal 快闪收单链接：**https://www.paypal.com/ncp/payment/3DPLYJQWHBSK2**（$2.90 固定价，已于 09-21 核实：名称/价格/描述正确展示）。
- 创建后：① 更新本文件 ② README「Pro」段已挂购买按钮 ③ popup 设置页 "Get a key" 链接已指向该付款链接。

## 发货流程
1. 收到 PayPal 付款邮件（含买家邮箱）
2. 跑上面命令生成 key
3. 回信：key + 一句激活说明（⚙ → 粘贴 → Activate），模板见 trustdownload/SELLING.md
4. 记账（日期/邮箱/key ID/金额）

## 定价依据
- 头部竞品 Pro 是订阅制（$10-40/月）或免费诱饵后收费墙；$2.9 买断 = 明确差异点。
- 预期贡献：装机量资产 + 低客单补充收入，月入主力仍是 TrustDownload Pro（$4.9）。
