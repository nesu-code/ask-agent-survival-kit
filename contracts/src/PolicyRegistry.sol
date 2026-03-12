// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title PolicyRegistry
/// @notice Minimal ASK MVP registry for per-agent policy control.
contract PolicyRegistry {
    struct AgentPolicy {
        address owner;
        uint256 spendLimitTotal;
        uint256 spentTotal;
        uint256 rateLimitPerWindow;
        uint64 windowSizeSec;
        uint256 windowSpent;
        uint64 windowStart;
        uint64 expiresAt;
        uint64 policyVersion;
        bool panicMode;
        bytes32[] allowedActions;
        address[] allowedRecipients;
        uint8 riskLevel;
    }

    mapping(bytes32 => AgentPolicy) private _policies;

    event PolicyRegistered(bytes32 indexed agentId, address indexed owner, uint64 policyVersion);
    event PolicyUpdated(bytes32 indexed agentId, address indexed owner, uint64 policyVersion);
    event PanicModeChanged(bytes32 indexed agentId, bool enabled, uint64 policyVersion);
    event OwnerRotated(bytes32 indexed agentId, address indexed oldOwner, address indexed newOwner, uint64 policyVersion);

    modifier onlyOwner(bytes32 agentId) {
        require(_policies[agentId].owner == msg.sender, "ASK: not policy owner");
        _;
    }

    function getPolicy(bytes32 agentId) external view returns (AgentPolicy memory) {
        return _policies[agentId];
    }

    /// @notice Register policy for a new agent.
    /// @dev Register/update semantics are FULL-REPLACE (except policyVersion which is managed internally).
    ///      The caller must be the policy owner to prevent third-party grief registration.
    function registerPolicy(bytes32 agentId, AgentPolicy calldata policy) external {
        require(_policies[agentId].owner == address(0), "ASK: already registered");
        require(policy.owner != address(0), "ASK: invalid owner");
        require(msg.sender == policy.owner, "ASK: sender must be owner");

        AgentPolicy storage p = _policies[agentId];
        p.owner = policy.owner;
        p.spendLimitTotal = policy.spendLimitTotal;
        p.spentTotal = policy.spentTotal;
        p.rateLimitPerWindow = policy.rateLimitPerWindow;
        p.windowSizeSec = policy.windowSizeSec;
        p.windowSpent = policy.windowSpent;
        p.windowStart = policy.windowStart;
        p.expiresAt = policy.expiresAt;
        p.panicMode = policy.panicMode;
        p.riskLevel = policy.riskLevel;
        p.policyVersion = 1;

        _replaceAllowedActions(agentId, policy.allowedActions);
        _replaceAllowedRecipients(agentId, policy.allowedRecipients);

        emit PolicyRegistered(agentId, p.owner, p.policyVersion);
    }

    /// @notice Update policy for an existing agent.
    /// @dev FULL-REPLACE semantics: all mutable fields are overwritten, and omitted arrays are cleared.
    ///      Owner rotation is intentionally not supported here; use rotateOwner().
    function updatePolicy(bytes32 agentId, AgentPolicy calldata policy) external onlyOwner(agentId) {
        require(policy.owner != address(0), "ASK: invalid owner");

        AgentPolicy storage p = _policies[agentId];
        require(policy.owner == p.owner, "ASK: owner change via rotateOwner");
        p.owner = policy.owner;
        p.spendLimitTotal = policy.spendLimitTotal;
        p.spentTotal = policy.spentTotal;
        p.rateLimitPerWindow = policy.rateLimitPerWindow;
        p.windowSizeSec = policy.windowSizeSec;
        p.windowSpent = policy.windowSpent;
        p.windowStart = policy.windowStart;
        p.expiresAt = policy.expiresAt;
        p.panicMode = policy.panicMode;
        p.riskLevel = policy.riskLevel;
        p.policyVersion += 1;

        _replaceAllowedActions(agentId, policy.allowedActions);
        _replaceAllowedRecipients(agentId, policy.allowedRecipients);

        emit PolicyUpdated(agentId, p.owner, p.policyVersion);
    }

    function setPanicMode(bytes32 agentId, bool enabled) external onlyOwner(agentId) {
        AgentPolicy storage p = _policies[agentId];
        p.panicMode = enabled;
        p.policyVersion += 1;

        emit PanicModeChanged(agentId, enabled, p.policyVersion);
    }

    function rotateOwner(bytes32 agentId, address newOwner) external onlyOwner(agentId) {
        require(newOwner != address(0), "ASK: invalid owner");
        AgentPolicy storage p = _policies[agentId];
        address oldOwner = p.owner;
        p.owner = newOwner;
        p.policyVersion += 1;

        emit OwnerRotated(agentId, oldOwner, newOwner, p.policyVersion);
    }

    function _replaceAllowedActions(bytes32 agentId, bytes32[] calldata values) internal {
        delete _policies[agentId].allowedActions;
        for (uint256 i = 0; i < values.length; i++) {
            _policies[agentId].allowedActions.push(values[i]);
        }
    }

    function _replaceAllowedRecipients(bytes32 agentId, address[] calldata values) internal {
        delete _policies[agentId].allowedRecipients;
        for (uint256 i = 0; i < values.length; i++) {
            _policies[agentId].allowedRecipients.push(values[i]);
        }
    }
}
