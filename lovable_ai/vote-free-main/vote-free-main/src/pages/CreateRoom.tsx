import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientButton } from '@/components/ui/GradientButton';
import { CONTRACT_ADDRESSES } from '@/config/contracts';
import { ABIS } from '@/config/abis';
import { useFactorySettings } from '@/hooks/useFactorySettings';
import {
    Loader2,
    CheckCircle,
    XCircle,
    ArrowLeft,
    Coins,
    Info
} from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function CreateRoomPage() {
    const navigate = useNavigate();
    const { address, isConnected } = useAccount();
    const [roomName, setRoomName] = useState('');
    const [depositAmount, setDepositAmount] = useState('0.1');

    // Get registration fee
    const { registrationFeeWei } = useFactorySettings();
    const regFeeETH = registrationFeeWei ? Number(registrationFeeWei) / 1e18 : 0.01;

    // Contract write
    const { writeContract, data: hash, error, isPending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const handleCreate = () => {
        if (!roomName.trim()) {
            alert('Please enter room name');
            return;
        }

        try {
            writeContract({
                address: CONTRACT_ADDRESSES.RoomFactory,
                abi: ABIS.RoomFactory,
                functionName: 'createRoom',
                args: [roomName],
                value: parseEther(depositAmount),
            });
        } catch (err) {
            console.error('Create room error:', err);
        }
    };

    // Success - redirect to dashboard
    if (isSuccess) {
        setTimeout(() => {
            navigate('/dashboard');
        }, 3000);
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="w-10 h-10 rounded-xl bg-card hover:bg-muted flex items-center justify-center transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold">Create New Voting Room</h1>
                        <p className="text-muted-foreground">
                            Deploy a new voting room on Sepolia
                        </p>
                    </div>
                </div>

                {/* Connect Wallet First */}
                {!isConnected ? (
                    <GlassCard className="p-8 text-center">
                        <h3 className="text-xl font-semibold mb-4">Connect Your Wallet</h3>
                        <p className="text-muted-foreground mb-6">
                            You need to connect your wallet to create a voting room
                        </p>
                        <ConnectButton />
                    </GlassCard>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        {/* Form */}
                        <GlassCard className="p-6 space-y-6">
                            {/* Room Name */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Room Name</label>
                                <input
                                    type="text"
                                    value={roomName}
                                    onChange={(e) => setRoomName(e.target.value)}
                                    placeholder="e.g., Annual Board Election 2024"
                                    className="w-full h-12 px-4 rounded-xl bg-muted/50 border border-border/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                                    disabled={isPending || isConfirming}
                                />
                            </div>

                            {/* Initial Deposit */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Initial Gas Deposit (ETH)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={depositAmount}
                                        onChange={(e) => setDepositAmount(e.target.value)}
                                        min={regFeeETH}
                                        step="0.01"
                                        className="w-full h-12 px-4 pr-16 rounded-xl bg-muted/50 border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                                        disabled={isPending || isConfirming}
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                                        ETH
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Info className="w-3 h-3" />
                                    <span>
                                        Minimum: {regFeeETH} ETH (registration fee).
                                        Recommended: 0.1 ETH (~500-1000 votes)
                                    </span>
                                </div>
                            </div>

                            {/* Quick Amount Buttons */}
                            <div className="flex gap-2">
                                {['0.05', '0.1', '0.5', '1.0'].map((amount) => (
                                    <button
                                        key={amount}
                                        onClick={() => setDepositAmount(amount)}
                                        className="flex-1 h-10 rounded-lg bg-muted/50 hover:bg-muted text-sm font-medium transition-colors"
                                        disabled={isPending || isConfirming}
                                    >
                                        {amount} ETH
                                    </button>
                                ))}
                            </div>

                            {/* Estimated Votes */}
                            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Coins className="w-5 h-5 text-primary" />
                                        <span className="font-medium">Estimated Capacity</span>
                                    </div>
                                    <span className="text-lg font-bold text-primary">
                                        ~{Math.floor(Number(depositAmount) * 1000)} votes
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    Based on ~0.001 ETH per vote (actual cost may vary)
                                </p>
                            </div>
                        </GlassCard>

                        {/* Summary */}
                        <GlassCard className="p-6 space-y-4">
                            <h3 className="font-semibold">Summary</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Room Name:</span>
                                    <span className="font-medium">{roomName || 'Not set'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Initial Deposit:</span>
                                    <span className="font-medium">{depositAmount} ETH</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Network:</span>
                                    <span className="font-medium text-success">Sepolia Testnet</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Your Address:</span>
                                    <span className="font-mono text-xs">
                                        {address?.slice(0, 6)}...{address?.slice(-4)}
                                    </span>
                                </div>
                            </div>
                        </GlassCard>

                        {/* Error Display */}
                        {error && (
                            <GlassCard className="p-4 border-destructive/50 bg-destructive/5">
                                <div className="flex items-start gap-3">
                                    <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-semibold text-destructive">Transaction Failed</p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {error.message.includes('insufficient funds')
                                                ? 'Insufficient ETH balance'
                                                : error.message.slice(0, 100)}
                                        </p>
                                    </div>
                                </div>
                            </GlassCard>
                        )}

                        {/* Success Display */}
                        {isSuccess && (
                            <GlassCard className="p-6 border-success/50 bg-success/5 text-center">
                                <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-success mb-2">Room Created!</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Transaction confirmed. Redirecting to dashboard...
                                </p>
                                <a
                                    href={`https://sepolia.etherscan.io/tx/${hash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-primary hover:underline"
                                >
                                    View on Etherscan →
                                </a>
                            </GlassCard>
                        )}

                        {/* Action Button */}
                        <GradientButton
                            className="w-full h-14 text-lg"
                            onClick={handleCreate}
                            disabled={!roomName.trim() || isPending || isConfirming || isSuccess}
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Waiting for approval...
                                </>
                            ) : isConfirming ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Confirming transaction...
                                </>
                            ) : isSuccess ? (
                                <>
                                    <CheckCircle className="w-5 h-5" />
                                    Room Created!
                                </>
                            ) : (
                                <>
                                    Create Voting Room
                                </>
                            )}
                        </GradientButton>

                        {/* Help Text */}
                        <p className="text-xs text-center text-muted-foreground">
                            After creation, you can add voters and candidates from the room management page
                        </p>
                    </motion.div>
                )}
            </div>
        </div>
    );
}

export default CreateRoomPage;
