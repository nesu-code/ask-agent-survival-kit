// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PolicyRegistry} from "../src/PolicyRegistry.sol";

contract PolicyRegistryTest {
    PolicyRegistry internal registry;

    uint256 internal constant OWNER_PK = 0xA11CE;
    uint256 internal constant OTHER_PK = 0xB0B;

    address internal owner;
    address internal otherSigner;

    address internal constant RECIPIENT_A = address(0xBEEF);

    bytes32 internal constant AGENT_ID = keccak256("agent-1");

    function setUp() public {
        registry = new PolicyRegistry();
        owner = _vm().addr(OWNER_PK);
        otherSigner = _vm().addr(OTHER_PK);
    }

    function testRegisterPolicySetsVersionOne() public {
        PolicyRegistry.AgentPolicy memory p = _mkPolicy(owner, false);

        _prank(owner);
        registry.registerPolicy(AGENT_ID, p);

        PolicyRegistry.AgentPolicy memory stored = registry.getPolicy(AGENT_ID);
        require(stored.owner == owner, "owner mismatch");
        require(stored.policyVersion == 1, "version must start at 1");
        require(stored.allowedActions.length == 1, "action length mismatch");
        require(stored.allowedRecipients.length == 1, "recipient length mismatch");
        require(registry.authorizedSigner(AGENT_ID) == owner, "default signer must be owner");
    }

    function testRegisterPolicyRevertsIfSenderIsNotOwner() public {
        PolicyRegistry.AgentPolicy memory p = _mkPolicy(owner, false);

        _prank(address(0x1234));
        _expectRevert();
        registry.registerPolicy(AGENT_ID, p);
    }

    function testOnlyOwnerCanUpdate() public {
        PolicyRegistry.AgentPolicy memory p = _mkPolicy(owner, false);
        _prank(owner);
        registry.registerPolicy(AGENT_ID, p);

        PolicyRegistry.AgentPolicy memory updated = _mkPolicy(owner, false);
        updated.spendLimitTotal = 2_000;

        _prank(address(0x1234));
        _expectRevert();
        registry.updatePolicy(AGENT_ID, updated);
    }

    function testUpdatePolicyIsFullReplaceAndIncrementsVersion() public {
        PolicyRegistry.AgentPolicy memory p = _mkPolicy(owner, false);
        _prank(owner);
        registry.registerPolicy(AGENT_ID, p);

        PolicyRegistry.AgentPolicy memory updated = _mkPolicy(owner, false);
        updated.spendLimitTotal = 2_000;
        updated.allowedActions = new bytes32[](2);
        updated.allowedActions[0] = keccak256("spend");
        updated.allowedActions[1] = keccak256("tool.call");
        updated.allowedRecipients = new address[](0);

        _prank(owner);
        registry.updatePolicy(AGENT_ID, updated);

        PolicyRegistry.AgentPolicy memory stored = registry.getPolicy(AGENT_ID);
        require(stored.policyVersion == 2, "version should increment");
        require(stored.spendLimitTotal == 2_000, "new spend limit not applied");
        require(stored.allowedActions.length == 2, "actions not replaced");
        require(stored.allowedRecipients.length == 0, "recipients not cleared");
    }

    function testPanicModeToggleIncrementsVersion() public {
        _registerDefaultPolicy();

        _prank(owner);
        registry.setPanicMode(AGENT_ID, true);

        PolicyRegistry.AgentPolicy memory stored = registry.getPolicy(AGENT_ID);
        require(stored.panicMode, "panic should be enabled");
        require(stored.policyVersion == 2, "version should increment");
    }

    function testAuthorizeIntentValidSignature() public {
        _registerDefaultPolicy();

        PolicyRegistry.SignedIntent memory intent = _mkIntent(keccak256("req-valid"), 0, uint64(block.timestamp + 300));
        bytes memory sig = _signIntent(intent, OWNER_PK);

        registry.authorizeIntent(intent, sig);

        require(registry.usedRequestId(AGENT_ID, intent.requestId), "requestId should be marked used");
        require(registry.nextIntentNonce(AGENT_ID) == 1, "nonce should increment");
    }

    function testAuthorizeIntentRejectsInvalidSigner() public {
        _registerDefaultPolicy();

        PolicyRegistry.SignedIntent memory intent = _mkIntent(keccak256("req-bad-signer"), 0, uint64(block.timestamp + 300));
        bytes memory sig = _signIntent(intent, OTHER_PK);

        _expectRevert();
        registry.authorizeIntent(intent, sig);
    }

    function testAuthorizeIntentRejectsExpiredDeadline() public {
        _registerDefaultPolicy();

        uint64 deadline = uint64(block.timestamp + 10);
        PolicyRegistry.SignedIntent memory intent = _mkIntent(keccak256("req-expired"), 0, deadline);
        bytes memory sig = _signIntent(intent, OWNER_PK);

        _vm().warp(block.timestamp + 11);

        _expectRevert();
        registry.authorizeIntent(intent, sig);
    }

    function testAuthorizeIntentRejectsReplayByRequestId() public {
        _registerDefaultPolicy();

        bytes32 replayId = keccak256("req-replay");

        PolicyRegistry.SignedIntent memory first = _mkIntent(replayId, 0, uint64(block.timestamp + 300));
        registry.authorizeIntent(first, _signIntent(first, OWNER_PK));

        PolicyRegistry.SignedIntent memory second = _mkIntent(replayId, 1, uint64(block.timestamp + 300));
        _expectRevert();
        registry.authorizeIntent(second, _signIntent(second, OWNER_PK));
    }

    function testAuthorizeIntentRejectsBadNonceEvenWithFreshRequestId() public {
        _registerDefaultPolicy();

        PolicyRegistry.SignedIntent memory first = _mkIntent(keccak256("req-1"), 0, uint64(block.timestamp + 300));
        registry.authorizeIntent(first, _signIntent(first, OWNER_PK));

        PolicyRegistry.SignedIntent memory secondWithOldNonce = _mkIntent(keccak256("req-2"), 0, uint64(block.timestamp + 300));
        _expectRevert();
        registry.authorizeIntent(secondWithOldNonce, _signIntent(secondWithOldNonce, OWNER_PK));
    }

    function testSetAuthorizedSignerAllowsSignerRotation() public {
        _registerDefaultPolicy();

        _prank(owner);
        registry.setAuthorizedSigner(AGENT_ID, otherSigner);

        PolicyRegistry.SignedIntent memory intent = _mkIntent(keccak256("req-rotated"), 0, uint64(block.timestamp + 300));
        bytes memory sig = _signIntent(intent, OTHER_PK);

        registry.authorizeIntent(intent, sig);
        require(registry.nextIntentNonce(AGENT_ID) == 1, "nonce should increment after rotated signer auth");
    }

    function _registerDefaultPolicy() internal {
        PolicyRegistry.AgentPolicy memory p = _mkPolicy(owner, false);
        _prank(owner);
        registry.registerPolicy(AGENT_ID, p);
    }

    function _mkIntent(bytes32 requestId, uint256 nonce, uint64 deadline)
        internal
        view
        returns (PolicyRegistry.SignedIntent memory intent)
    {
        intent.agentId = AGENT_ID;
        intent.requestId = requestId;
        intent.action = keccak256("spend");
        intent.recipient = RECIPIENT_A;
        intent.amount = 25;
        intent.nonce = nonce;
        intent.deadline = deadline;
    }

    function _signIntent(PolicyRegistry.SignedIntent memory intent, uint256 privateKey)
        internal
        view
        returns (bytes memory sig)
    {
        bytes32 digest = registry.getIntentDigest(intent);
        (uint8 v, bytes32 r, bytes32 s) = _vm().sign(privateKey, digest);
        sig = abi.encodePacked(r, s, v);
    }

    function _mkPolicy(address policyOwner, bool panic)
        internal
        pure
        returns (PolicyRegistry.AgentPolicy memory p)
    {
        p.owner = policyOwner;
        p.spendLimitTotal = 1_000;
        p.spentTotal = 100;
        p.rateLimitPerWindow = 200;
        p.windowSizeSec = 60;
        p.windowSpent = 50;
        p.windowStart = 1_700_000_000;
        p.expiresAt = 4_102_444_800;
        p.policyVersion = 0;
        p.panicMode = panic;
        p.riskLevel = 1;

        p.allowedActions = new bytes32[](1);
        p.allowedActions[0] = keccak256("spend");

        p.allowedRecipients = new address[](1);
        p.allowedRecipients[0] = RECIPIENT_A;
    }

    function _expectRevert() internal {
        _vm().expectRevert();
    }

    function _prank(address sender) internal {
        _vm().prank(sender);
    }

    function _vm() internal pure returns (Vm) {
        return Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    }
}

interface Vm {
    function prank(address) external;
    function expectRevert() external;
    function sign(uint256, bytes32) external returns (uint8, bytes32, bytes32);
    function addr(uint256) external returns (address);
    function warp(uint256) external;
}
