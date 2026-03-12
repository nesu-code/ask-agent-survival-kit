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

const replayState = {
  usedRequestIds: new Set(),
  usedNonceBySigner: new Set(),
};

function evaluateAndLogSignedIntent(signedIntent) {
  const auth = authorizeSignedIntentLocal(signedIntent);
  const result = auth.ok
    ? evaluateAction(policy, {
        requestId: signedIntent.intent.requestId,
        actionType: signedIntent.intent.actionType,
        amount: signedIntent.intent.amount,
        recipient: signedIntent.intent.recipient,
        highRisk: true,
      })
    : {
        decision: "BLOCK_POLICY_VIOLATION",
        reasonCode: auth.reason,
        policyVersion: policy.policyVersion,
      };

  logger.log(
    createDecisionRecord({
      requestId: signedIntent.intent.requestId,
      agentId,
      actionType: signedIntent.intent.actionType,
      decision: result.decision,
      reasonCode: result.reasonCode,
      evidenceHash: `eip712:${signedIntent.intent.requestId}:${signedIntent.signature.slice(0, 12)}`,
      policyVersion: result.policyVersion,
    })
  );

  return { auth, result };
}

function authorizeSignedIntentLocal(signedIntent) {
  const { intent, signer, signature } = signedIntent;
  const nowSec = Math.floor(Date.now() / 1000);

  if (!signature || !signature.startsWith("0x") || signature.length !== 132) {
    return { ok: false, reason: "BLOCK_INTENT_BAD_SIGNATURE_FORMAT" };
  }
  if (signer !== "owner") {
    return { ok: false, reason: "BLOCK_INTENT_INVALID_SIGNER" };
  }
  if (intent.deadline < nowSec) {
    return { ok: false, reason: "BLOCK_INTENT_EXPIRED" };
  }
  if (replayState.usedRequestIds.has(intent.requestId)) {
    return { ok: false, reason: "BLOCK_INTENT_REPLAY_REQUEST_ID" };
  }

  const nonceKey = `${signer}:${intent.nonce}`;
  if (replayState.usedNonceBySigner.has(nonceKey)) {
    return { ok: false, reason: "BLOCK_INTENT_REPLAY_NONCE" };
  }

  replayState.usedRequestIds.add(intent.requestId);
  replayState.usedNonceBySigner.add(nonceKey);

  return { ok: true, reason: "ALLOW_INTENT_AUTHORIZED" };
}

function makeSignedIntent({ requestId, nonce, recipient, amount, ttlSec = 300, signer = "owner" }) {
  return {
    intent: {
      agentId,
      requestId,
      actionType: "spend",
      recipient,
      amount,
      nonce,
      deadline: Math.floor(Date.now() / 1000) + ttlSec,
      policyVersion: policy.policyVersion,
    },
    signer,
    // Deterministic placeholder for local logging demo (contract tests enforce real ecrecover path).
    signature: "0x" + "11".repeat(32) + "22".repeat(32) + "1b",
  };
}

console.log("\n== STEP 1: policy create (v1) ==");
console.log(policy);

console.log("\n== STEP 2: signed intent + allowed request ==");
const signedR1 = makeSignedIntent({ requestId: "r1", nonce: 1, recipient: "0xabc", amount: 25 });
console.log(evaluateAndLogSignedIntent(signedR1));

console.log("\n== STEP 3: replay same requestId (rejected) ==");
const replayByRequestId = makeSignedIntent({ requestId: "r1", nonce: 2, recipient: "0xabc", amount: 1 });
console.log(evaluateAndLogSignedIntent(replayByRequestId));

console.log("\n== STEP 4: policy update (v2, tighter recipients) ==");
policy = {
  ...policy,
  policyVersion: 2,
  allowedRecipients: ["0xdef"],
};
console.log(policy);

console.log("\n== STEP 5: signed intent authorized, runtime blocks recipient ==");
const signedR2 = makeSignedIntent({ requestId: "r2", nonce: 3, recipient: "0xabc", amount: 10 });
console.log(evaluateAndLogSignedIntent(signedR2));

console.log("\n== STEP 6: panic mode ON (v3) ==");
policy = {
  ...policy,
  policyVersion: 3,
  panicMode: true,
};
console.log(policy);

console.log("\n== STEP 7: signed intent authorized, runtime blocks by panic mode ==");
const signedR3 = makeSignedIntent({ requestId: "r3", nonce: 4, recipient: "0xdef", amount: 1 });
console.log(evaluateAndLogSignedIntent(signedR3));

console.log("\n== STEP 8: decision log records ==");
console.log(JSON.stringify(logger.list(), null, 2));
