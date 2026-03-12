// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PolicyRegistry} from "../src/PolicyRegistry.sol";

contract PolicyRegistryTest {
    PolicyRegistry internal registry;

    uint256 internal constant OWNER_PK = 0xA11CE;
    uint256 internal constant ALT_SIGNER_PK = 0xB0B;

    address internal owner;
    address internal altSigner;

    address internal constant RECIPIENT_A = address(0xBEEF);

    bytes32 internal constant AGENT_ID = keccak256("agent-1");
    bytes32 internal constant ACTION_SPEND = keccak256("spend");

    function setUp() public {
        registry = new PolicyRegistry();
        owner = _vm().addr(OWNER_PK);
        altSigner = _vm().addr(ALT_SIGNER_PK);
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
        require(registry.authorizedSigner(AGENT_ID) == owner, "authorized signer must default to owner");
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
        updated.allowedRecipients = new address[](0);

        _prank(owner);
        registry.updatePolicy(AGENT_ID, updated);

        PolicyRegistry.AgentPolicy memory stored = registry.getPolicy(AGENT_ID);
        require(stored.policyVersion == 2, "version should increment");
        require(stored.spendLimitTotal == 2_000, "new spend limit not applied");
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

        PolicyRegistry.ActionIntent memory intent = _mkIntent(
            keccak256("req-valid"),
            1,
            RECIPIENT_A,
            25,
            uint64(block.timestamp + 1 hours),
            1
        );

        bytes memory sig = _signIntent(OWNER_PK, intent);
        address signer = registry.authorizeIntent(intent, sig);

        require(signer == owner, "signer mismatch");
        require(registry.usedRequestIds(AGENT_ID, intent.requestId), "requestId should be consumed");
        require(registry.usedNonces(AGENT_ID, owner, intent.nonce), "nonce should be consumed");
    }

    function testAuthorizeIntentInvalidSigner() public {
        _registerDefaultPolicy();

        PolicyRegistry.ActionIntent memory intent = _mkIntent(
            keccak256("req-bad-signer"),
            2,
            RECIPIENT_A,
            25,
            uint64(block.timestamp + 1 hours),
            1
        );

        bytes memory sig = _signIntent(ALT_SIGNER_PK, intent);
        _expectRevert();
        registry.authorizeIntent(intent, sig);
    }

    function testAuthorizeIntentExpiredDeadline() public {
        _registerDefaultPolicy();

        PolicyRegistry.ActionIntent memory intent = _mkIntent(
            keccak256("req-expired"),
            3,
            RECIPIENT_A,
            25,
            uint64(block.timestamp + 100),
            1
        );

        bytes memory sig = _signIntent(OWNER_PK, intent);
        _vm().warp(block.timestamp + 101);

        _expectRevert();
        registry.authorizeIntent(intent, sig);
    }

    function testAuthorizeIntentReplayAttackBlocked() public {
        _registerDefaultPolicy();

        PolicyRegistry.ActionIntent memory first = _mkIntent(
            keccak256("req-replay"),
            4,
            RECIPIENT_A,
            25,
            uint64(block.timestamp + 1 hours),
            1
        );

        bytes memory firstSig = _signIntent(OWNER_PK, first);
        registry.authorizeIntent(first, firstSig);

        // Same requestId with fresh nonce must still fail.
        PolicyRegistry.ActionIntent memory second = _mkIntent(
            first.requestId,
            5,
            RECIPIENT_A,
            25,
            uint64(block.timestamp + 1 hours),
            1
        );

        bytes memory secondSig = _signIntent(OWNER_PK, second);
        _expectRevert();
        registry.authorizeIntent(second, secondSig);
    }

    function testAuthorizeIntentWithRotatedAuthorizedSigner() public {
        _registerDefaultPolicy();

        _prank(owner);
        registry.setAuthorizedSigner(AGENT_ID, altSigner);

        PolicyRegistry.ActionIntent memory intent = _mkIntent(
            keccak256("req-alt-signer"),
            6,
            RECIPIENT_A,
            25,
            uint64(block.timestamp + 1 hours),
            2
        );

        bytes memory sig = _signIntent(ALT_SIGNER_PK, intent);
        address signer = registry.authorizeIntent(intent, sig);

        require(signer == altSigner, "rotated signer mismatch");
    }

    function _registerDefaultPolicy() internal {
        PolicyRegistry.AgentPolicy memory p = _mkPolicy(owner, false);
        _prank(owner);
        registry.registerPolicy(AGENT_ID, p);
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
        p.allowedActions[0] = ACTION_SPEND;

        p.allowedRecipients = new address[](1);
        p.allowedRecipients[0] = RECIPIENT_A;
    }

    function _mkIntent(
        bytes32 requestId,
        uint256 nonce,
        address recipient,
        uint256 amount,
        uint64 deadline,
        uint64 policyVersion
    ) internal pure returns (PolicyRegistry.ActionIntent memory intent) {
        intent.requestId = requestId;
        intent.nonce = nonce;
        intent.agentId = AGENT_ID;
        intent.actionType = ACTION_SPEND;
        intent.recipient = recipient;
        intent.amount = amount;
        intent.deadline = deadline;
        intent.policyVersion = policyVersion;
    }

    function _signIntent(uint256 privateKey, PolicyRegistry.ActionIntent memory intent)
        internal
        view
        returns (bytes memory)
    {
        bytes32 digest = registry.hashIntent(intent);
        (uint8 v, bytes32 r, bytes32 s) = _vm().sign(privateKey, digest);
        return abi.encodePacked(r, s, v);
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
