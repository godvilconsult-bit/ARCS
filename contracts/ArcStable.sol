// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

interface IArcStablePool {
    function totalLpSupply() external view returns (uint256);
    function lpBalance(address user) external view returns (uint256);
}

interface IGaugeControllerHook {
    function onBeforeLpChange(address user) external;
    function onAfterLpChange(address user) external;
}

interface IVeARCS {
    function getVotingPower(address user) external view returns (uint256);
}

contract ArcStablePool is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public immutable token0;
    address public immutable token1;
    uint256 public amplificationCoeff;

    uint256 public totalLpSupply;
    mapping(address => uint256) public lpBalance;

    uint256 public reserve0;
    uint256 public reserve1;

    address public feeRecipient;
    uint256 public swapFeeBps;
    address public gaugeController;

    event LiquidityAdded(address indexed provider, uint256 amount0, uint256 amount1, uint256 lpMinted);
    event LiquidityRemoved(address indexed provider, uint256 lpBurned, uint256 amount0, uint256 amount1);
    event Swap(address indexed trader, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, uint256 feeAmount);
    event FeesCollected(address indexed token, uint256 amount, address indexed recipient);
    event GaugeControllerSet(address indexed gaugeController);

    error InvalidAddress();
    error InvalidToken();
    error InvalidAmount();
    error SlippageExceeded();
    error PoolNotInitialized();

    constructor(
        address _token0,
        address _token1,
        uint256 _ampCoeff,
        uint256 _swapFeeBps,
        address _feeRecipient,
        address _owner
    ) Ownable(_owner) {
        if (_token0 == address(0) || _token1 == address(0) || _feeRecipient == address(0) || _owner == address(0)) {
            revert InvalidAddress();
        }
        if (_token0 == _token1) revert InvalidToken();
        if (_ampCoeff == 0 || _swapFeeBps > 10_000) revert InvalidAmount();

        token0 = _token0;
        token1 = _token1;
        amplificationCoeff = _ampCoeff;
        swapFeeBps = _swapFeeBps;
        feeRecipient = _feeRecipient;
    }

    function setGaugeController(address _gaugeController) external onlyOwner nonReentrant {
        if (_gaugeController == address(0)) revert InvalidAddress();
        gaugeController = _gaugeController;
        emit GaugeControllerSet(_gaugeController);
    }

    function addLiquidity(
        uint256 amount0,
        uint256 amount1,
        uint256 minLpOut
    ) external nonReentrant returns (uint256 lpMinted) {
        if (amount0 == 0 || amount1 == 0) revert InvalidAmount();

        _beforeLpChange(msg.sender);

        uint256 balance0Before = IERC20(token0).balanceOf(address(this));
        IERC20(token0).safeTransferFrom(msg.sender, address(this), amount0);
        uint256 received0 = IERC20(token0).balanceOf(address(this)) - balance0Before;

        uint256 balance1Before = IERC20(token1).balanceOf(address(this));
        IERC20(token1).safeTransferFrom(msg.sender, address(this), amount1);
        uint256 received1 = IERC20(token1).balanceOf(address(this)) - balance1Before;

        if (totalLpSupply == 0) {
            lpMinted = _computeD(received0, received1);
            if (lpMinted == 0) revert InvalidAmount();
        } else {
            if (reserve0 == 0 || reserve1 == 0) revert PoolNotInitialized();
            uint256 lpFrom0 = (received0 * totalLpSupply) / reserve0;
            uint256 lpFrom1 = (received1 * totalLpSupply) / reserve1;
            lpMinted = lpFrom0 < lpFrom1 ? lpFrom0 : lpFrom1;
            if (lpMinted == 0) revert InvalidAmount();
        }

        if (lpMinted < minLpOut) revert SlippageExceeded();

        lpBalance[msg.sender] += lpMinted;
        totalLpSupply += lpMinted;

        reserve0 += received0;
        reserve1 += received1;

        _afterLpChange(msg.sender);

        emit LiquidityAdded(msg.sender, received0, received1, lpMinted);
    }

    function removeLiquidity(
        uint256 lpAmount,
        uint256 minAmount0,
        uint256 minAmount1
    ) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        if (lpAmount == 0) revert InvalidAmount();
        if (lpAmount > lpBalance[msg.sender]) revert InvalidAmount();

        _beforeLpChange(msg.sender);

        amount0 = (reserve0 * lpAmount) / totalLpSupply;
        amount1 = (reserve1 * lpAmount) / totalLpSupply;

        if (amount0 < minAmount0 || amount1 < minAmount1) revert SlippageExceeded();

        lpBalance[msg.sender] -= lpAmount;
        totalLpSupply -= lpAmount;

        reserve0 -= amount0;
        reserve1 -= amount1;

        IERC20(token0).safeTransfer(msg.sender, amount0);
        IERC20(token1).safeTransfer(msg.sender, amount1);

        _afterLpChange(msg.sender);

        emit LiquidityRemoved(msg.sender, lpAmount, amount0, amount1);
    }

    function swap(address tokenIn, uint256 amountIn, uint256 minOut) external nonReentrant returns (uint256 amountOut) {
        if (amountIn == 0) revert InvalidAmount();

        bool isToken0In;
        if (tokenIn == token0) {
            isToken0In = true;
        } else if (tokenIn == token1) {
            isToken0In = false;
        } else {
            revert InvalidToken();
        }

        uint256 balanceBefore = IERC20(tokenIn).balanceOf(address(this));
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        uint256 received = IERC20(tokenIn).balanceOf(address(this)) - balanceBefore;
        if (received == 0) revert InvalidAmount();

        amountOut = getSwapOutput(tokenIn, received);
        if (amountOut < minOut || amountOut == 0) revert SlippageExceeded();

        uint256 feeAmount = (received * swapFeeBps) / 10_000;
        uint256 amountInAfterFee = received - feeAmount;

        if (isToken0In) {
            if (feeAmount > 0) {
                IERC20(token0).safeTransfer(feeRecipient, feeAmount);
                emit FeesCollected(token0, feeAmount, feeRecipient);
            }
            IERC20(token1).safeTransfer(msg.sender, amountOut);

            reserve0 += amountInAfterFee;
            reserve1 -= amountOut;

            emit Swap(msg.sender, token0, token1, received, amountOut, feeAmount);
        } else {
            if (feeAmount > 0) {
                IERC20(token1).safeTransfer(feeRecipient, feeAmount);
                emit FeesCollected(token1, feeAmount, feeRecipient);
            }
            IERC20(token0).safeTransfer(msg.sender, amountOut);

            reserve1 += amountInAfterFee;
            reserve0 -= amountOut;

            emit Swap(msg.sender, token1, token0, received, amountOut, feeAmount);
        }
    }

    function getSwapOutput(address tokenIn, uint256 amountIn) public view returns (uint256 amountOut) {
        if (amountIn == 0) return 0;

        bool isToken0In;
        if (tokenIn == token0) {
            isToken0In = true;
        } else if (tokenIn == token1) {
            isToken0In = false;
        } else {
            return 0;
        }

        uint256 x = isToken0In ? reserve0 : reserve1;
        uint256 y = isToken0In ? reserve1 : reserve0;

        if (x == 0 || y == 0) return 0;

        uint256 amountInAfterFee = (amountIn * (10_000 - swapFeeBps)) / 10_000;
        uint256 d = _computeD(x, y);
        uint256 newX = x + amountInAfterFee;
        uint256 newY = _getY(newX, d);

        if (newY >= y) return 0;
        amountOut = y - newY;
    }

    function getReserves() external view returns (uint256, uint256) {
        return (reserve0, reserve1);
    }

    function _beforeLpChange(address user) internal {
        address gc = gaugeController;
        if (gc != address(0)) {
            IGaugeControllerHook(gc).onBeforeLpChange(user);
        }
    }

    function _afterLpChange(address user) internal {
        address gc = gaugeController;
        if (gc != address(0)) {
            IGaugeControllerHook(gc).onAfterLpChange(user);
        }
    }

    function _computeD(uint256 x, uint256 y) internal view returns (uint256) {
        uint256 s = x + y;
        if (s == 0) return 0;

        uint256 d = s;
        uint256 ann = amplificationCoeff * 4;

        for (uint256 i = 0; i < 256; i++) {
            uint256 dP = (d * d) / (x * 2);
            dP = (dP * d) / (y * 2);

            uint256 dPrev = d;
            uint256 numerator = (ann * s + (2 * dP)) * d;
            uint256 denominator = ((ann - 1) * d) + (3 * dP);
            d = numerator / denominator;

            uint256 diff = d > dPrev ? d - dPrev : dPrev - d;
            if (diff < 2) {
                return d;
            }
        }

        return d;
    }

    function _getY(uint256 x, uint256 d) internal view returns (uint256 y) {
        uint256 ann = amplificationCoeff * 4;
        uint256 c = d;

        c = (c * d) / (x * 2);
        c = (c * d) / (ann * 2);

        uint256 b = x + (d / ann);
        y = d;

        for (uint256 i = 0; i < 256; i++) {
            uint256 yPrev = y;
            y = ((y * y) + c) / ((2 * y) + b - d);

            uint256 diff = y > yPrev ? y - yPrev : yPrev - y;
            if (diff < 2) {
                return y;
            }
        }

        return y;
    }
}

contract veARCS is ERC20, Ownable {
    using SafeERC20 for IERC20;

    struct LockedBalance {
        uint128 amount;
        uint64 end;
    }

    IERC20 public immutable arcsToken;
    mapping(address => LockedBalance) public locked;
    mapping(address => uint256) public veBalance;
    uint256 public totalVeSupply;

    uint256 public constant MAX_LOCK_TIME = 4 * 365 days;
    uint256 public constant WEEK = 7 days;

    address public rewardDistributor;

    event Locked(address indexed user, uint256 amount, uint256 lockEnd);
    event Unlocked(address indexed user, uint256 amount);
    event VeBalanceCheckpointed(address indexed user, uint256 userVeBalance, uint256 totalVeSupply);
    event RewardDistributorSet(address indexed distributor);

    error InvalidAddress();
    error InvalidAmount();
    error LockExists();
    error NoLock();
    error LockNotExpired();
    error InvalidUnlockTime();
    error NonTransferable();
    error Unauthorized();

    constructor(address _arcsToken, address _owner) ERC20("Vote Escrowed ARCS", "veARCS") Ownable(_owner) {
        if (_arcsToken == address(0) || _owner == address(0)) revert InvalidAddress();
        arcsToken = IERC20(_arcsToken);
    }

    function setRewardDistributor(address _rewardDistributor) external onlyOwner {
        if (_rewardDistributor == address(0)) revert InvalidAddress();
        rewardDistributor = _rewardDistributor;
        emit RewardDistributorSet(_rewardDistributor);
    }

    function createLock(uint256 amount, uint256 unlockTime) external {
        if (amount == 0) revert InvalidAmount();

        LockedBalance memory userLock = locked[msg.sender];
        if (userLock.amount != 0) revert LockExists();

        uint256 roundedUnlock = (unlockTime / WEEK) * WEEK;
        if (roundedUnlock <= block.timestamp + WEEK) revert InvalidUnlockTime();
        if (roundedUnlock > block.timestamp + MAX_LOCK_TIME) revert InvalidUnlockTime();

        arcsToken.safeTransferFrom(msg.sender, address(this), amount);

        locked[msg.sender] = LockedBalance({amount: SafeCast.toUint128(amount), end: uint64(roundedUnlock)});

        _checkpoint(msg.sender);
        emit Locked(msg.sender, amount, roundedUnlock);
    }

    function increaseAmount(uint256 amount) external {
        if (amount == 0) revert InvalidAmount();

        LockedBalance memory userLock = locked[msg.sender];
        if (userLock.amount == 0) revert NoLock();
        if (block.timestamp >= userLock.end) revert LockNotExpired();

        arcsToken.safeTransferFrom(msg.sender, address(this), amount);

        uint256 newAmount = uint256(userLock.amount) + amount;
        locked[msg.sender].amount = SafeCast.toUint128(newAmount);

        _checkpoint(msg.sender);
        emit Locked(msg.sender, newAmount, userLock.end);
    }

    function increaseUnlockTime(uint256 newUnlockTime) external {
        LockedBalance memory userLock = locked[msg.sender];
        if (userLock.amount == 0) revert NoLock();
        if (block.timestamp >= userLock.end) revert LockNotExpired();

        uint256 roundedUnlock = (newUnlockTime / WEEK) * WEEK;
        if (roundedUnlock <= userLock.end) revert InvalidUnlockTime();
        if (roundedUnlock <= block.timestamp + WEEK) revert InvalidUnlockTime();
        if (roundedUnlock > block.timestamp + MAX_LOCK_TIME) revert InvalidUnlockTime();

        locked[msg.sender].end = uint64(roundedUnlock);

        _checkpoint(msg.sender);
        emit Locked(msg.sender, userLock.amount, roundedUnlock);
    }

    function withdraw() external {
        LockedBalance memory userLock = locked[msg.sender];
        if (userLock.amount == 0) revert NoLock();
        if (block.timestamp < userLock.end) revert LockNotExpired();

        _checkpoint(msg.sender);

        uint256 amount = userLock.amount;
        delete locked[msg.sender];

        arcsToken.safeTransfer(msg.sender, amount);
        emit Unlocked(msg.sender, amount);
    }

    function checkpoint(address user) external {
        if (msg.sender != rewardDistributor && msg.sender != user) revert Unauthorized();
        _checkpoint(user);
    }

    function getVotingPower(address user) public view returns (uint256) {
        LockedBalance memory userLock = locked[user];
        if (userLock.amount == 0 || block.timestamp >= userLock.end) {
            return 0;
        }

        uint256 timeRemaining = uint256(userLock.end) - block.timestamp;
        return (uint256(userLock.amount) * timeRemaining) / MAX_LOCK_TIME;
    }

    function getTotalVotingPower() external view returns (uint256) {
        return totalVeSupply;
    }

    function _checkpoint(address user) internal {
        uint256 oldBalance = veBalance[user];
        uint256 newBalance = getVotingPower(user);

        veBalance[user] = newBalance;

        if (newBalance > oldBalance) {
            uint256 mintAmount = newBalance - oldBalance;
            totalVeSupply += mintAmount;
            _mint(user, mintAmount);
        } else if (oldBalance > newBalance) {
            uint256 burnAmount = oldBalance - newBalance;
            totalVeSupply -= burnAmount;
            _burn(user, burnAmount);
        }

        emit VeBalanceCheckpointed(user, newBalance, totalVeSupply);
    }

    function _update(address from, address to, uint256 value) internal virtual override {
        if (from != address(0) && to != address(0)) {
            revert NonTransferable();
        }
        super._update(from, to, value);
    }
}

contract GaugeController is Ownable, ReentrancyGuard, IGaugeControllerHook {
    using SafeERC20 for IERC20;

    IERC20 public immutable arcsToken;
    address public immutable veARCS;
    address public immutable pool;

    uint256 public weeklyEmission;
    mapping(address => uint256) public gaugeWeight;

    mapping(address => uint256) public lpRewardDebt;
    uint256 public rewardPerShare;
    uint256 public lastUpdateTime;
    mapping(address => uint256) public pendingRewards;

    uint256 public totalVoted;
    mapping(address => uint256) public userVoteWeight;

    uint256 public rewardReserve;

    event VoteCast(address indexed voter, uint256 weight, uint256 totalVoted);
    event RewardClaimed(address indexed user, uint256 amount);
    event WeeklyEmissionSet(uint256 amount);
    event RewardNotified(uint256 amount);

    error InvalidAddress();
    error InvalidWeight();
    error Unauthorized();

    constructor(address _arcsToken, address _veARCS, address _pool, uint256 _weeklyEmission, address _owner) Ownable(_owner) {
        if (_arcsToken == address(0) || _veARCS == address(0) || _pool == address(0) || _owner == address(0)) {
            revert InvalidAddress();
        }
        arcsToken = IERC20(_arcsToken);
        veARCS = _veARCS;
        pool = _pool;
        weeklyEmission = _weeklyEmission;
        lastUpdateTime = block.timestamp;
    }

    modifier onlyPool() {
        if (msg.sender != pool) revert Unauthorized();
        _;
    }

    function vote(uint256 weight) external {
        uint256 voterPower = IVeARCS(veARCS).getVotingPower(msg.sender);
        if (weight > voterPower) revert InvalidWeight();

        updateRewardPerShare();

        uint256 oldWeight = userVoteWeight[msg.sender];
        userVoteWeight[msg.sender] = weight;

        if (weight >= oldWeight) {
            uint256 deltaIncrease = weight - oldWeight;
            totalVoted += deltaIncrease;
            gaugeWeight[pool] += deltaIncrease;
        } else {
            uint256 deltaDecrease = oldWeight - weight;
            totalVoted -= deltaDecrease;
            gaugeWeight[pool] -= deltaDecrease;
        }

        emit VoteCast(msg.sender, weight, totalVoted);
    }

    function onBeforeLpChange(address user) external onlyPool {
        updateRewardPerShare();
        _accrue(user);
    }

    function onAfterLpChange(address user) external onlyPool {
        uint256 userLp = IArcStablePool(pool).lpBalance(user);
        lpRewardDebt[user] = (userLp * rewardPerShare) / 1e18;
    }

    function updateRewardPerShare() public {
        if (block.timestamp <= lastUpdateTime) return;

        uint256 totalLp = IArcStablePool(pool).totalLpSupply();
        if (totalLp == 0) {
            lastUpdateTime = block.timestamp;
            return;
        }

        uint256 elapsed = block.timestamp - lastUpdateTime;
        uint256 toDistribute = (elapsed * weeklyEmission) / 7 days;
        if (toDistribute > rewardReserve) {
            toDistribute = rewardReserve;
        }

        if (toDistribute > 0) {
            uint256 poolEmission = toDistribute;
            if (totalVoted > 0) {
                uint256 weightedShare = (gaugeWeight[pool] * 1e18) / totalVoted;
                poolEmission = (toDistribute * weightedShare) / 1e18;
            }

            if (poolEmission > 0) {
                rewardPerShare += (poolEmission * 1e18) / totalLp;
                rewardReserve -= poolEmission;
            }
        }

        lastUpdateTime = block.timestamp;
    }

    function claimRewards(address user) external nonReentrant {
        updateRewardPerShare();
        _accrue(user);

        uint256 amount = pendingRewards[user];
        if (amount > 0) {
            pendingRewards[user] = 0;
            arcsToken.safeTransfer(user, amount);
            emit RewardClaimed(user, amount);
        }

        uint256 userLp = IArcStablePool(pool).lpBalance(user);
        lpRewardDebt[user] = (userLp * rewardPerShare) / 1e18;
    }

    function notifyReward(uint256 amount) external onlyOwner {
        if (amount == 0) revert InvalidWeight();
        arcsToken.safeTransferFrom(msg.sender, address(this), amount);
        rewardReserve += amount;
        emit RewardNotified(amount);
    }

    function setWeeklyEmission(uint256 amount) external onlyOwner {
        updateRewardPerShare();
        weeklyEmission = amount;
        emit WeeklyEmissionSet(amount);
    }

    function pendingReward(address user) external view returns (uint256) {
        uint256 _rewardPerShare = rewardPerShare;
        uint256 totalLp = IArcStablePool(pool).totalLpSupply();

        if (block.timestamp > lastUpdateTime && totalLp > 0) {
            uint256 elapsed = block.timestamp - lastUpdateTime;
            uint256 toDistribute = (elapsed * weeklyEmission) / 7 days;
            if (toDistribute > rewardReserve) {
                toDistribute = rewardReserve;
            }
            _rewardPerShare += (toDistribute * 1e18) / totalLp;
        }

        uint256 userLp = IArcStablePool(pool).lpBalance(user);
        uint256 accumulated = (userLp * _rewardPerShare) / 1e18;

        if (accumulated < lpRewardDebt[user]) {
            return pendingRewards[user];
        }

        return pendingRewards[user] + (accumulated - lpRewardDebt[user]);
    }

    function _accrue(address user) internal {
        uint256 userLp = IArcStablePool(pool).lpBalance(user);
        uint256 accumulated = (userLp * rewardPerShare) / 1e18;
        uint256 debt = lpRewardDebt[user];

        if (accumulated > debt) {
            pendingRewards[user] += (accumulated - debt);
        }
    }
}

contract ARCSToken is ERC20, Ownable {
    constructor(address _owner) ERC20("ArcStable Governance", "ARCS") Ownable(_owner) {
        if (_owner == address(0)) revert OwnableInvalidOwner(address(0));
        _mint(_owner, 100_000_000 * 1e18);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
