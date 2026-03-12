const assert = require("node:assert/strict");
const { evaluateAction } = require("../dist/runtime/src");

const basePolicy = {
  agentId: "agent-1",
  policyVersion: 1,
  panicMode: false,
  expiresAt: 4102444800,
  spendLimitTotal: 1000,
  spentTotal: 100,
  rateLimitPerWindow: 200,
  windowSizeSec: 60,
  windowSpent: 50,
  windowStart: 1700000000,
  allowedActions: ["spend"],
  allowedRecipients: ["0xabc"],
};

const allow = evaluateAction(basePolicy, {
  requestId: "t1",
  actionType: "spend",
  amount: 10,
  recipient: "0xabc",
  nowSec: 1700000010,
  highRisk: true,
});
assert.equal(allow.decision, "ALLOW");
assert.equal(allow.reasonCode, "ALLOW_WITHIN_POLICY");

const blockedRecipient = evaluateAction(basePolicy, {
  requestId: "t2",
  actionType: "spend",
  amount: 10,
  recipient: "0xdef",
  nowSec: 1700000010,
  highRisk: true,
});
assert.equal(blockedRecipient.reasonCode, "BLOCK_RECIPIENT_NOT_ALLOWED");

const blockedPanic = evaluateAction(
  { ...basePolicy, panicMode: true },
  {
    requestId: "t3",
    actionType: "spend",
    amount: 1,
    recipient: "0xabc",
    nowSec: 1700000010,
    highRisk: true,
  }
);
assert.equal(blockedPanic.decision, "BLOCK_PANIC_MODE");
assert.equal(blockedPanic.reasonCode, "BLOCK_PANIC_MODE_ACTIVE");

console.log("runtime-enforcer.test: OK");
