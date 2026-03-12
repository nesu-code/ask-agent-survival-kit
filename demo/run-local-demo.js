const { evaluateAction } = require("../dist/runtime/src");
const { InMemoryDecisionLogger, createDecisionRecord } = require("../dist/api/src");

const agentId = "agent-1";
const logger = new InMemoryDecisionLogger();

let policy = {
  agentId,
  policyVersion: 1,
  panicMode: false,
  expiresAt: 4102444800,
  spendLimitTotal: 1000,
  spentTotal: 100,
  rateLimitPerWindow: 200,
  windowSizeSec: 60,
  windowSpent: 50,
  windowStart: Math.floor(Date.now() / 1000),
  allowedActions: ["spend"],
  allowedRecipients: ["0xabc"],
};

function evaluateAndLog(request, evidenceHash) {
  const result = evaluateAction(policy, request);
  logger.log(
    createDecisionRecord({
      requestId: request.requestId,
      agentId,
      actionType: request.actionType,
      decision: result.decision,
      reasonCode: result.reasonCode,
      evidenceHash,
      policyVersion: result.policyVersion,
    })
  );
  return result;
}

console.log("\n== STEP 1: policy create (v1) ==");
console.log(policy);

console.log("\n== STEP 2: allowed request ==");
console.log(
  evaluateAndLog(
    { requestId: "r1", actionType: "spend", amount: 25, recipient: "0xabc", highRisk: true },
    "demo:evidence:r1"
  )
);

console.log("\n== STEP 3: policy update (v2, tighter recipients) ==");
policy = {
  ...policy,
  policyVersion: 2,
  allowedRecipients: ["0xdef"], // full-replace semantics: old allowlist removed
};
console.log(policy);

console.log("\n== STEP 4: request blocked after update ==");
console.log(
  evaluateAndLog(
    { requestId: "r2", actionType: "spend", amount: 10, recipient: "0xabc", highRisk: true },
    "demo:evidence:r2"
  )
);

console.log("\n== STEP 5: panic mode ON (v3) ==");
policy = {
  ...policy,
  policyVersion: 3,
  panicMode: true,
};
console.log(policy);

console.log("\n== STEP 6: request blocked by panic mode ==");
console.log(
  evaluateAndLog(
    { requestId: "r3", actionType: "spend", amount: 1, recipient: "0xdef", highRisk: true },
    "demo:evidence:r3"
  )
);

console.log("\n== STEP 7: decision log records ==");
console.log(JSON.stringify(logger.list(), null, 2));
