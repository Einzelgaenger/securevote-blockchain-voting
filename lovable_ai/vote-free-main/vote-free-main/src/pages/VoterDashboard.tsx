import { useAccount } from "wagmi";
import { Navbar } from "@/components/landing/Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Vote, History, Users } from "lucide-react";

const VoterDashboard = () => {
    const { address } = useAccount();

    if (!address) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="container mx-auto px-4 py-16 text-center">
                    <h1 className="text-2xl font-bold mb-4">Connect Wallet Required</h1>
                    <p className="text-muted-foreground">Please connect your wallet to access the voter dashboard.</p>
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
                    <h1 className="text-4xl font-bold mb-2">Voter Dashboard</h1>
                    <p className="text-muted-foreground">View eligible rooms and cast your votes</p>
                </div>

                <Tabs defaultValue="rooms" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="rooms">My Rooms</TabsTrigger>
                        <TabsTrigger value="vote">Vote</TabsTrigger>
                        <TabsTrigger value="history">History</TabsTrigger>
                    </TabsList>

                    {/* Tab 1: My Rooms */}
                    <TabsContent value="rooms" className="space-y-6">
                        <div className="grid gap-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Eligible Voting Rooms</CardTitle>
                                    <CardDescription>Rooms where you are registered as a voter</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p>You are not registered as a voter in any room</p>
                                        <p className="text-sm mt-2">Contact room admins to get added</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Example Room Card (hidden when no rooms) */}
                        {/* <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Room Name</CardTitle>
                  <Badge variant="outline">🟢 Active</Badge>
                </div>
                <CardDescription>Admin: 0x123...</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Round</p>
                    <p className="font-semibold">3</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">My Credits</p>
                    <p className="font-semibold">100</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last Voted</p>
                    <p className="font-semibold">Round 2</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <Badge variant="secondary">Pending</Badge>
                  </div>
                </div>
                <Button className="w-full mt-4">View Room</Button>
              </CardContent>
            </Card> */}
                    </TabsContent>

                    {/* Tab 2: Vote */}
                    <TabsContent value="vote" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Cast Your Vote</CardTitle>
                                <CardDescription>Select a candidate to vote for</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center py-12 text-muted-foreground">
                                    <Vote className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>No active voting room selected</p>
                                    <p className="text-sm mt-2">Go to "My Rooms" to select an active room</p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tab 3: History */}
                    <TabsContent value="history" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Voting History</CardTitle>
                                <CardDescription>All votes you have cast</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center py-12 text-muted-foreground">
                                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>No voting history yet</p>
                                    <p className="text-sm mt-2">Your votes will appear here after you participate</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Statistics Cards */}
                        <div className="grid gap-4 md:grid-cols-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Rooms Participated</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">0</div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Total Votes Cast</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">0</div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Total Credits Used</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">0</div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">0%</div>
                                    <p className="text-xs text-muted-foreground">Voted for winners</p>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default VoterDashboard;
