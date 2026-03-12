// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title PolicyRegistry
/// @notice ASK MVP registry for per-agent policy control + ERC-712 signed intent authorization.
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

    /// @dev Owner-signed typed intent for runtime-executed actions.
    struct ActionIntent {
        bytes32 requestId;
        uint256 nonce;
        bytes32 agentId;
        bytes32 actionType;
        address recipient;
        uint256 amount;
        uint64 deadline;
        uint64 policyVersion;
    }

    bytes32 private constant _EIP712_DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 private constant _INTENT_TYPEHASH =
        keccak256(
            "ActionIntent(bytes32 requestId,uint256 nonce,bytes32 agentId,bytes32 actionType,address recipient,uint256 amount,uint64 deadline,uint64 policyVersion)"
        );
    bytes32 private constant _NAME_HASH = keccak256("ASK PolicyRegistry");
    bytes32 private constant _VERSION_HASH = keccak256("1");

    mapping(bytes32 => AgentPolicy) private _policies;
    mapping(bytes32 => address) public authorizedSigner; // agentId => authorized signer
    mapping(bytes32 => mapping(bytes32 => bool)) public usedRequestIds; // agentId => requestId => used
    mapping(bytes32 => mapping(address => mapping(uint256 => bool))) public usedNonces; // agentId => signer => nonce => used

    event PolicyRegistered(bytes32 indexed agentId, address indexed owner, uint64 policyVersion);
    event PolicyUpdated(bytes32 indexed agentId, address indexed owner, uint64 policyVersion);
    event PanicModeChanged(bytes32 indexed agentId, bool enabled, uint64 policyVersion);
    event OwnerRotated(bytes32 indexed agentId, address indexed oldOwner, address indexed newOwner, uint64 policyVersion);
    event AuthorizedSignerUpdated(bytes32 indexed agentId, address indexed signer, uint64 policyVersion);
    event IntentAuthorized(
        bytes32 indexed agentId,
        bytes32 indexed requestId,
        address indexed signer,
        uint256 nonce,
        uint64 policyVersion,
        bytes32 actionType,
        address recipient,
        uint256 amount
    );

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

        authorizedSigner[agentId] = policy.owner;

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

        // Keep signer deterministic with ownership unless owner explicitly rotates again.
        authorizedSigner[agentId] = newOwner;

        emit OwnerRotated(agentId, oldOwner, newOwner, p.policyVersion);
    }

    function setAuthorizedSigner(bytes32 agentId, address signer) external onlyOwner(agentId) {
        require(signer != address(0), "ASK: invalid signer");

        AgentPolicy storage p = _policies[agentId];
        authorizedSigner[agentId] = signer;
        p.policyVersion += 1;

        emit AuthorizedSignerUpdated(agentId, signer, p.policyVersion);
    }

    /// @notice Verify owner-signed ERC-712 action intent and consume replay guards.
    /// @dev This is an MVP authorization primitive for runtime/executor integration.
    function authorizeIntent(ActionIntent calldata intent, bytes calldata signature) external returns (address signer) {
        AgentPolicy storage p = _policies[intent.agentId];
        require(p.owner != address(0), "ASK: policy not found");
        require(!p.panicMode, "ASK: panic mode active");
        require(block.timestamp <= intent.deadline, "ASK: intent expired");
        require(intent.policyVersion == p.policyVersion, "ASK: policy version mismatch");
        address allowedSigner = authorizedSigner[intent.agentId];
        require(allowedSigner != address(0), "ASK: signer not set");
        require(!usedRequestIds[intent.agentId][intent.requestId], "ASK: request replay");
        require(!usedNonces[intent.agentId][allowedSigner][intent.nonce], "ASK: nonce replay");

        require(_isActionAllowed(p, intent.actionType), "ASK: action not allowed");
        require(_isRecipientAllowed(p, intent.recipient), "ASK: recipient not allowed");
        _enforceSpend(p, intent.amount);

        bytes32 digest = hashIntent(intent);
        signer = _recoverSigner(digest, signature);
        require(signer == allowedSigner, "ASK: invalid signer");

        usedRequestIds[intent.agentId][intent.requestId] = true;
        usedNonces[intent.agentId][allowedSigner][intent.nonce] = true;

        emit IntentAuthorized(
            intent.agentId,
            intent.requestId,
            signer,
            intent.nonce,
            intent.policyVersion,
            intent.actionType,
            intent.recipient,
            intent.amount
        );
    }

    function domainSeparator() public view returns (bytes32) {
        return
            keccak256(
                abi.encode(_EIP712_DOMAIN_TYPEHASH, _NAME_HASH, _VERSION_HASH, block.chainid, address(this))
            );
    }

    function hashIntent(ActionIntent calldata intent) public view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                _INTENT_TYPEHASH,
                intent.requestId,
                intent.nonce,
                intent.agentId,
                intent.actionType,
                intent.recipient,
                intent.amount,
                intent.deadline,
                intent.policyVersion
            )
        );
        return keccak256(abi.encodePacked("\x19\x01", domainSeparator(), structHash));
    }

    function _isActionAllowed(AgentPolicy storage p, bytes32 actionType) internal view returns (bool) {
        for (uint256 i = 0; i < p.allowedActions.length; i++) {
            if (p.allowedActions[i] == actionType) return true;
        }
        return false;
    }

    function _isRecipientAllowed(AgentPolicy storage p, address recipient) internal view returns (bool) {
        if (p.allowedRecipients.length == 0) return true;
        for (uint256 i = 0; i < p.allowedRecipients.length; i++) {
            if (p.allowedRecipients[i] == recipient) return true;
        }
        return false;
    }

    function _enforceSpend(AgentPolicy storage p, uint256 amount) internal {
        uint256 projectedTotal = p.spentTotal + amount;
        require(projectedTotal <= p.spendLimitTotal, "ASK: total spend exceeded");

        uint256 effectiveWindowSpent = p.windowSpent;
        if (p.windowStart == 0 || block.timestamp >= p.windowStart + p.windowSizeSec) {
            effectiveWindowSpent = 0;
        }

        uint256 projectedWindow = effectiveWindowSpent + amount;
        require(projectedWindow <= p.rateLimitPerWindow, "ASK: rate limit exceeded");
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

    function _recoverSigner(bytes32 digest, bytes calldata signature) internal pure returns (address) {
        require(signature.length == 65, "ASK: bad signature length");

        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }

        require(v == 27 || v == 28, "ASK: bad signature v");
        // secp256k1n/2 to reject malleable signatures.
        require(
            uint256(s) <= 0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0,
            "ASK: bad signature s"
        );

        address recovered = ecrecover(digest, v, r, s);
        require(recovered != address(0), "ASK: invalid signer");
        return recovered;
    }
}
