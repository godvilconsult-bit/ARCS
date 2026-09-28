// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IVeToken {
    function getVotingPower(address user) external view returns (uint256);
    function getTotalVotingPower() external view returns (uint256);
}

interface ISwapPool {
    function swap(address tokenIn, uint256 amountIn, uint256 minOut) external returns (uint256 amountOut);
}

contract BuybackBurner is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public immutable usdc;
    address public immutable arcsToken;

    uint256 public totalUsdcFeesAccumulated;
    uint256 public totalUsdcUsedForBuyback;
    uint256 public totalArcsBurned;
    uint256 public lastBuybackTime;
    uint256 public buybackCount;

    address public feeSource;
    address public arcsPool;
    bool public arcsIsToken0;

    address internal constant DEAD = address(0x000000000000000000000000000000000000dEaD);

    event FeeReceived(uint256 usdcAmount);
    event BuybackExecuted(uint256 arcsBurned, uint256 usdcUsed);
    event FeeSourceSet(address feeSource);
    event ArcsPoolSet(address pool, bool isToken0);

    error InvalidAddress();
    error InvalidAmount();
    error Unauthorized();
    error ArcsPoolNotSet();

    constructor(address _usdc, address _arcsToken, address _feeSource, address _owner) Ownable(_owner) {
        if (_usdc == address(0) || _arcsToken == address(0) || _feeSource == address(0) || _owner == address(0)) {
            revert InvalidAddress();
        }

        usdc = _usdc;
        arcsToken = _arcsToken;
        feeSource = _feeSource;
    }

    function receiveSwapFee() external nonReentrant {
        if (msg.sender != feeSource) revert Unauthorized();

        uint256 accountedBalance = totalUsdcFeesAccumulated - totalUsdcUsedForBuyback;
        uint256 currentBalance = IERC20(usdc).balanceOf(address(this));
        if (currentBalance <= accountedBalance) revert InvalidAmount();

        uint256 received = currentBalance - accountedBalance;
        totalUsdcFeesAccumulated += received;

        emit FeeReceived(received);
    }

    function executeBuyback(uint256 minArcsOut) external onlyOwner nonReentrant {
        if (arcsPool == address(0)) revert ArcsPoolNotSet();

        uint256 usdcToSpend = IERC20(usdc).balanceOf(address(this));
        if (usdcToSpend == 0) revert InvalidAmount();

        IERC20(usdc).approve(arcsPool, usdcToSpend);
        uint256 arcsReceived = ISwapPool(arcsPool).swap(usdc, usdcToSpend, minArcsOut);

        IERC20(arcsToken).transfer(DEAD, arcsReceived);

        totalUsdcUsedForBuyback += usdcToSpend;
        totalArcsBurned += arcsReceived;
        lastBuybackTime = block.timestamp;
        buybackCount += 1;

        emit BuybackExecuted(arcsReceived, usdcToSpend);
    }

    function withdrawUsdc(uint256 amount) external onlyOwner nonReentrant {
        if (amount == 0) revert InvalidAmount();

        uint256 usdcAvailable = totalUsdcFeesAccumulated - totalUsdcUsedForBuyback;
        if (amount > usdcAvailable) revert InvalidAmount();

        totalUsdcFeesAccumulated -= amount;
        IERC20(usdc).safeTransfer(owner(), amount);
    }

    function setFeeSource(address _feeSource) external onlyOwner nonReentrant {
        if (_feeSource == address(0)) revert InvalidAddress();
        feeSource = _feeSource;
        emit FeeSourceSet(_feeSource);
    }

    function setArcsPool(address _pool, bool _isToken0) external onlyOwner {
        if (_pool == address(0)) revert InvalidAddress();

        arcsPool = _pool;
        arcsIsToken0 = _isToken0;

        emit ArcsPoolSet(_pool, _isToken0);
    }

    function usdcBalance() external view returns (uint256) {
        return IERC20(usdc).balanceOf(address(this));
    }
}

contract RevenueDistributor is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public immutable usdc;
    address public immutable veToken;

    uint256 public constant WEEK = 7 days;

    uint256 public startTime;
    mapping(uint256 => uint256) public epochRevenue;
    mapping(uint256 => uint256) public epochTotalVe;
    mapping(uint256 => mapping(address => uint256)) public epochUserVe;
    mapping(address => uint256) public lastClaimedEpoch;

    uint256 public totalDistributed;
    uint256 public totalClaimed;

    uint256 internal constant MAX_CLAIM_EPOCHS = 52;

    event RevenueDeposited(uint256 epoch, uint256 amount);
    event YieldClaimed(address indexed user, uint256 amount, uint256 fromEpoch, uint256 toEpoch);
    event UserCheckpointed(address indexed user, uint256 epoch, uint256 veBalance);

    error InvalidAddress();
    error InvalidAmount();
    error NothingToClaim();

    constructor(address _usdc, address _veToken, address _owner) Ownable(_owner) {
        if (_usdc == address(0) || _veToken == address(0) || _owner == address(0)) revert InvalidAddress();

        usdc = _usdc;
        veToken = _veToken;
        startTime = (block.timestamp / WEEK) * WEEK;
    }

    function currentEpoch() public view returns (uint256) {
        return (block.timestamp - startTime) / WEEK;
    }

    function checkpointUser(address user) public {
        if (user == address(0)) revert InvalidAddress();

        uint256 epoch = currentEpoch();

        if (epochTotalVe[epoch] == 0) {
            epochTotalVe[epoch] = IVeToken(veToken).getTotalVotingPower();
        }

        uint256 veBalance = IVeToken(veToken).getVotingPower(user);
        epochUserVe[epoch][user] = veBalance;

        emit UserCheckpointed(user, epoch, veBalance);
    }

    function depositRevenue(uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();

        uint256 epoch = currentEpoch();

        IERC20(usdc).safeTransferFrom(msg.sender, address(this), amount);

        if (epochTotalVe[epoch] == 0) {
            epochTotalVe[epoch] = IVeToken(veToken).getTotalVotingPower();
        }

        epochRevenue[epoch] += amount;
        totalDistributed += amount;

        emit RevenueDeposited(epoch, amount);
    }

    // Users must call checkpointUser(address) during each epoch they want to be eligible to claim.
    function claim(address user) external nonReentrant returns (uint256 totalYield) {
        if (user == address(0)) revert InvalidAddress();

        uint256 fromEpoch = lastClaimedEpoch[user];
        uint256 toEpochExclusive = currentEpoch();
        if (fromEpoch >= toEpochExclusive) revert NothingToClaim();

        uint256 endEpochExclusive = fromEpoch + MAX_CLAIM_EPOCHS;
        if (endEpochExclusive > toEpochExclusive) {
            endEpochExclusive = toEpochExclusive;
        }

        for (uint256 epoch = fromEpoch; epoch < endEpochExclusive; ++epoch) {
            uint256 userVe = epochUserVe[epoch][user];
            if (userVe == 0) continue;

            uint256 totalVe = epochTotalVe[epoch];
            if (totalVe == 0) continue;

            uint256 revenue = epochRevenue[epoch];
            if (revenue == 0) continue;

            totalYield += (revenue * userVe) / totalVe;
        }

        if (totalYield == 0) revert NothingToClaim();

        lastClaimedEpoch[user] = endEpochExclusive;
        totalClaimed += totalYield;

        IERC20(usdc).safeTransfer(user, totalYield);

        emit YieldClaimed(user, totalYield, fromEpoch, endEpochExclusive - 1);
    }

    function claimable(address user) external view returns (uint256) {
        if (user == address(0)) return 0;

        uint256 fromEpoch = lastClaimedEpoch[user];
        uint256 toEpochExclusive = currentEpoch();
        if (fromEpoch >= toEpochExclusive) return 0;

        uint256 endEpochExclusive = fromEpoch + MAX_CLAIM_EPOCHS;
        if (endEpochExclusive > toEpochExclusive) {
            endEpochExclusive = toEpochExclusive;
        }

        uint256 totalYield;

        for (uint256 epoch = fromEpoch; epoch < endEpochExclusive; ++epoch) {
            uint256 userVe = epochUserVe[epoch][user];
            if (userVe == 0) continue;

            uint256 totalVe = epochTotalVe[epoch];
            if (totalVe == 0) continue;

            uint256 revenue = epochRevenue[epoch];
            if (revenue == 0) continue;

            totalYield += (revenue * userVe) / totalVe;
        }

        return totalYield;
    }
}
