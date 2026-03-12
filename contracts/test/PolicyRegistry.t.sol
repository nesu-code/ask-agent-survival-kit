// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PolicyRegistry} from "../src/PolicyRegistry.sol";

contract PolicyRegistryTest {
    PolicyRegistry internal registry;

    address internal constant OWNER = address(0xA11CE);
    address internal constant RECIPIENT_A = address(0xBEEF);
    address internal constant RECIPIENT_B = address(0xCAFE);

    bytes32 internal constant AGENT_ID = keccak256("agent-1");

    function setUp() public {
        registry = new PolicyRegistry();
    }

    function testRegisterPolicySetsVersionOne() public {
        PolicyRegistry.AgentPolicy memory p = _mkPolicy(OWNER, false);

        _prank(OWNER);
        registry.registerPolicy(AGENT_ID, p);

        PolicyRegistry.AgentPolicy memory stored = registry.getPolicy(AGENT_ID);
        require(stored.owner == OWNER, "owner mismatch");
        require(stored.policyVersion == 1, "version must start at 1");
        require(stored.allowedActions.length == 1, "action length mismatch");
        require(stored.allowedRecipients.length == 1, "recipient length mismatch");
    }

    function testRegisterPolicyRevertsIfSenderIsNotOwner() public {
        PolicyRegistry.AgentPolicy memory p = _mkPolicy(OWNER, false);

        _prank(address(0x1234));
        _expectRevert();
        registry.registerPolicy(AGENT_ID, p);
    }

    function testOnlyOwnerCanUpdate() public {
        PolicyRegistry.AgentPolicy memory p = _mkPolicy(OWNER, false);
        _prank(OWNER);
        registry.registerPolicy(AGENT_ID, p);

        PolicyRegistry.AgentPolicy memory updated = _mkPolicy(OWNER, false);
        updated.spendLimitTotal = 2_000;

        _prank(address(0x1234));
        _expectRevert();
        registry.updatePolicy(AGENT_ID, updated);
    }

    function testUpdatePolicyIsFullReplaceAndIncrementsVersion() public {
        PolicyRegistry.AgentPolicy memory p = _mkPolicy(OWNER, false);
        _prank(OWNER);
        registry.registerPolicy(AGENT_ID, p);

        PolicyRegistry.AgentPolicy memory updated = _mkPolicy(OWNER, false);
        updated.spendLimitTotal = 2_000;
        updated.allowedActions = new bytes32[](2);
        updated.allowedActions[0] = keccak256("spend");
        updated.allowedActions[1] = keccak256("tool.call");
        updated.allowedRecipients = new address[](0); // explicit clear

        _prank(OWNER);
        registry.updatePolicy(AGENT_ID, updated);

        PolicyRegistry.AgentPolicy memory stored = registry.getPolicy(AGENT_ID);
        require(stored.policyVersion == 2, "version should increment");
        require(stored.spendLimitTotal == 2_000, "new spend limit not applied");
        require(stored.allowedActions.length == 2, "actions not replaced");
        require(stored.allowedRecipients.length == 0, "recipients not cleared");
    }

    function testUpdatePolicyRejectsOwnerChange() public {
        PolicyRegistry.AgentPolicy memory p = _mkPolicy(OWNER, false);
        _prank(OWNER);
        registry.registerPolicy(AGENT_ID, p);

        PolicyRegistry.AgentPolicy memory updated = _mkPolicy(address(0xD00D), false);

        _prank(OWNER);
        _expectRevert();
        registry.updatePolicy(AGENT_ID, updated);
    }

    function testOnlyOwnerCanTogglePanicMode() public {
        PolicyRegistry.AgentPolicy memory p = _mkPolicy(OWNER, false);
        _prank(OWNER);
        registry.registerPolicy(AGENT_ID, p);

        _prank(address(0x1234));
        _expectRevert();
        registry.setPanicMode(AGENT_ID, true);
    }

    function testPanicModeToggleIncrementsVersion() public {
        PolicyRegistry.AgentPolicy memory p = _mkPolicy(OWNER, false);
        _prank(OWNER);
        registry.registerPolicy(AGENT_ID, p);

        _prank(OWNER);
        registry.setPanicMode(AGENT_ID, true);

        PolicyRegistry.AgentPolicy memory stored = registry.getPolicy(AGENT_ID);
        require(stored.panicMode, "panic should be enabled");
        require(stored.policyVersion == 2, "version should increment");
    }

    function _mkPolicy(address owner, bool panic) internal pure returns (PolicyRegistry.AgentPolicy memory p) {
        p.owner = owner;
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
}
