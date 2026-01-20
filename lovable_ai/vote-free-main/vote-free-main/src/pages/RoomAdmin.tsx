import { useParams, Navigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { Navbar } from "@/components/landing/Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Users, User, CreditCard, Settings, Wallet } from "lucide-react";

const RoomAdmin = () => {
  const { roomAddress } = useParams<{ roomAddress: string }>();
  const { address } = useAccount();

  // TODO: Read roomAdmin from contract and check access control
  const isAuthorized = true; // Placeholder

  if (!address) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Connect Wallet Required</h1>
          <p className="text-muted-foreground">Please connect your wallet to access the admin dashboard.</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">Room Name</h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="font-mono text-sm">{roomAddress}</span>
                <Button variant="ghost" size="sm">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-lg px-4 py-2">⚫ Inactive</Badge>
              <span className="text-sm text-muted-foreground">Round: 0</span>
            </div>
          </div>
          <p className="text-muted-foreground">Admin: {address}</p>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="voters">Voters</TabsTrigger>
            <TabsTrigger value="candidates">Candidates</TabsTrigger>
            <TabsTrigger value="pool">Credit Pool</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="vault">Vault</TabsTrigger>
          </TabsList>

          {/* Tab 1: Dashboard */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Voters</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">Eligible to vote</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
                  <User className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">Available options</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Credits in Pool</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">Ready for reuse</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Vault Balance</CardTitle>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0.0 ETH</div>
                  <p className="text-xs text-muted-foreground">Gas budget</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>State Machine</CardTitle>
                <CardDescription>Current voting lifecycle state</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-primary/5">
                    <span className="font-medium">⚫ Inactive</span>
                    <span className="text-sm text-muted-foreground">Setup phase - Add voters and candidates</span>
                  </div>
                  <div className="text-center text-sm text-muted-foreground">↓ Start Voting</div>
                  <div className="flex items-center justify-between p-4 border rounded-lg opacity-50">
                    <span className="font-medium">🟢 Active</span>
                    <span className="text-sm text-muted-foreground">Voting in progress</span>
                  </div>
                  <div className="text-center text-sm text-muted-foreground">↓ End Voting</div>
                  <div className="flex items-center justify-between p-4 border rounded-lg opacity-50">
                    <span className="font-medium">🔴 Ended</span>
                    <span className="text-sm text-muted-foreground">Results ready</span>
                  </div>
                  <div className="text-center text-sm text-muted-foreground">↓ Close Round</div>
                  <div className="flex items-center justify-between p-4 border rounded-lg opacity-50">
                    <span className="font-medium">⚫ Closed</span>
                    <span className="text-sm text-muted-foreground">Round complete</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button size="lg" className="text-lg px-8">
                Start Voting →
              </Button>
            </div>
          </TabsContent>

          {/* Tab 2: Voters Management */}
          <TabsContent value="voters" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Voters Management</CardTitle>
                <CardDescription>Add, remove, and manage voter credits</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Voters management interface will be implemented here</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Candidates Management */}
          <TabsContent value="candidates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Candidates Management</CardTitle>
                <CardDescription>Add and remove candidates</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Candidates management interface will be implemented here</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Credit Pool */}
          <TabsContent value="pool" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Credit Pool Status</CardTitle>
                <CardDescription>Monitor and manage credit pooling system</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Credit pool management interface will be implemented here</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 5: Settings */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Room Settings</CardTitle>
                <CardDescription>Configure room parameters</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Room settings interface will be implemented here</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 6: Vault & Gas Budget */}
          <TabsContent value="vault" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Vault & Gas Budget</CardTitle>
                <CardDescription>Manage ETH deposits for gasless voting</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Vault management interface will be implemented here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RoomAdmin;
