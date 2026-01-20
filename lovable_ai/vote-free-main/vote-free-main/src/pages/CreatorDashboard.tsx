import { useAccount } from "wagmi";
import { Navigate } from "react-router-dom";
import { Navbar } from "@/components/landing/Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, DollarSign, Users, Vote, Loader2 } from "lucide-react";
import { useIsFactoryOwner } from "@/hooks/useIsFactoryOwner";
import { useFactorySettings } from "@/hooks/useFactorySettings";
import { useVaultData } from "@/hooks/useVaultData";
import { useRooms } from "@/hooks/useRooms";
import { formatEther } from "viem";

const CreatorDashboard = () => {
    const { address } = useAccount();
    const isFactoryOwner = useIsFactoryOwner();
    const { registrationFeeWei, platformFeeBps, overheadBps, roomCount } = useFactorySettings();
    const { balance: vaultBalance } = useVaultData();
    const { rooms, loading: roomsLoading } = useRooms();

    // Access Control: Only factory owner can access
    if (address && !isFactoryOwner) {
        return <Navigate to="/" replace />;
    }

    if (!address) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="container mx-auto px-4 py-16 text-center">
                    <h1 className="text-2xl font-bold mb-4">Connect Wallet Required</h1>
                    <p className="text-muted-foreground">Please connect your wallet to access the creator dashboard.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2">Platform Creator Dashboard</h1>
                    <p className="text-muted-foreground">Manage RoomFactory and SponsorVault settings</p>
                </div>

                <Tabs defaultValue="factory" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="factory">Factory Settings</TabsTrigger>
                        <TabsTrigger value="rooms">All Rooms</TabsTrigger>
                        <TabsTrigger value="vault">Vault Management</TabsTrigger>
                        <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    </TabsList>

                    {/* Tab 1: Factory Settings */}
                    <TabsContent value="factory" className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Registration Fee</CardTitle>
                                    <CardDescription>Fee required to create a new room</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">Current Fee:</span>
                                        {registrationFeeWei !== undefined ? (
                                            <span className="text-2xl font-bold">{formatEther(registrationFeeWei)} ETH</span>
                                        ) : (
                                            <Loader2 className="h-6 w-6 animate-spin" />
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="newFee">Update Fee (ETH)</Label>
                                        <Input id="newFee" type="number" step="0.001" placeholder="0.01" />
                                    </div>
                                    <Button className="w-full">Update Registration Fee</Button>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Platform Fees</CardTitle>
                                    <CardDescription>SponsorVault fee configuration</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-sm">Platform Fee:</span>
                                            {platformFeeBps !== undefined ? (
                                                <Badge variant="secondary">{Number(platformFeeBps) / 100}% ({platformFeeBps.toString()} bps)</Badge>
                                            ) : (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            )}
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm">Overhead:</span>
                                            {overheadBps !== undefined ? (
                                                <Badge variant="secondary">{Number(overheadBps) / 100}% ({overheadBps.toString()} bps)</Badge>
                                            ) : (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="platformFee">Platform Fee (bps)</Label>
                                        <Input id="platformFee" type="number" placeholder="500" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="overhead">Overhead (bps)</Label>
                                        <Input id="overhead" type="number" placeholder="1000" />
                                    </div>
                                    <Button className="w-full">Update Fees</Button>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Transaction History</CardTitle>
                                <CardDescription>Recent factory configuration changes</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Action</TableHead>
                                            <TableHead>Old Value</TableHead>
                                            <TableHead>New Value</TableHead>
                                            <TableHead>Transaction</TableHead>
                                            <TableHead>Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="text-muted-foreground" colSpan={5}>
                                                No transactions yet
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tab 2: All Rooms */}
                    <TabsContent value="rooms" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>All Voting Rooms</CardTitle>
                                <CardDescription>
                                    {roomCount !== undefined ? `Total: ${roomCount.toString()} rooms` : 'Loading...'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="mb-4 flex gap-4">
                                    <Input placeholder="Search by name or address..." className="max-w-sm" />
                                    <Button variant="outline">Filter by State</Button>
                                </div>
                                {roomsLoading ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="h-8 w-8 animate-spin" />
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Room Name</TableHead>
                                                <TableHead>Address</TableHead>
                                                <TableHead>Admin</TableHead>
                                                <TableHead>State</TableHead>
                                                <TableHead>Round</TableHead>
                                                <TableHead>Credits</TableHead>
                                                <TableHead>Created</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {rooms.length === 0 ? (
                                                <TableRow>
                                                    <TableCell className="text-muted-foreground text-center" colSpan={7}>
                                                        No rooms created yet
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                rooms.map((room) => (
                                                    <TableRow key={room.room_address}>
                                                        <TableCell className="font-medium">{room.room_name}</TableCell>
                                                        <TableCell className="font-mono text-xs">
                                                            {room.room_address.slice(0, 6)}...{room.room_address.slice(-4)}
                                                        </TableCell>
                                                        <TableCell className="font-mono text-xs">
                                                            {room.room_admin.slice(0, 6)}...{room.room_admin.slice(-4)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={room.state === 'Active' ? 'default' : 'secondary'}>
                                                                {room.state}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>{room.current_round}</TableCell>
                                                        <TableCell>{room.total_credits_in_system}</TableCell>
                                                        <TableCell className="text-xs">
                                                            {new Date(room.created_at).toLocaleDateString()}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tab 3: Vault Management */}
                    <TabsContent value="vault" className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-3">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Vault ETH Balance</CardTitle>
                                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    {vaultBalance !== undefined ? (
                                        <>
                                            <div className="text-2xl font-bold">{formatEther(vaultBalance)} ETH</div>
                                            <p className="text-xs text-muted-foreground">Available in SponsorVault</p>
                                        </>
                                    ) : (
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Platform Fees Collected</CardTitle>
                                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">0.0 ETH</div>
                                    <p className="text-xs text-muted-foreground">Ready to withdraw</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Registration Fees</CardTitle>
                                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">0.0 ETH</div>
                                    <p className="text-xs text-muted-foreground">From room creation</p>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Withdraw Platform Fees</CardTitle>
                                <CardDescription>Collect accumulated platform fees</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="withdrawAmount">Amount to Withdraw (ETH)</Label>
                                    <Input id="withdrawAmount" type="number" step="0.001" placeholder="0.0" />
                                </div>
                                <Button className="w-full">Withdraw Fees</Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Transaction Log</CardTitle>
                                <CardDescription>Vault deposit and withdrawal history</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Room</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Transaction</TableHead>
                                            <TableHead>Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="text-muted-foreground" colSpan={5}>
                                                No transactions yet
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tab 4: Analytics */}
                    <TabsContent value="analytics" className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total Rooms</CardTitle>
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">0</div>
                                    <p className="text-xs text-muted-foreground">Created via factory</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Active Rooms</CardTitle>
                                    <Vote className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">0</div>
                                    <p className="text-xs text-muted-foreground">Currently voting</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total Votes</CardTitle>
                                    <BarChart className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">0</div>
                                    <p className="text-xs text-muted-foreground">Across all rooms</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">ETH Collected</CardTitle>
                                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">0.0 ETH</div>
                                    <p className="text-xs text-muted-foreground">Registration fees</p>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Rooms Created Over Time</CardTitle>
                                    <CardDescription>Monthly room creation trend</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                                        Chart placeholder - Rooms created over time
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Credit Pool Efficiency</CardTitle>
                                    <CardDescription>Percentage of credits reused vs newly created</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                                        Chart placeholder - Pool reuse percentage
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default CreatorDashboard;
