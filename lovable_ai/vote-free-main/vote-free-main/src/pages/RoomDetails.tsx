import { useParams } from "react-router-dom";
import { Navbar } from "@/components/landing/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const RoomDetails = () => {
  const { roomAddress } = useParams<{ roomAddress: string }>();

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
                <Button variant="ghost" size="sm">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">🟢 Active</Badge>
          </div>
          <p className="text-muted-foreground">Admin: 0x742d35Cc6634C0532925a3b844Bc454e4438f44e</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Current Round</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Voters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">56</div>
              <p className="text-xs text-muted-foreground">Eligible participants</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Votes Cast</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,234</div>
              <p className="text-xs text-muted-foreground">This round</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Participation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">67%</div>
              <p className="text-xs text-muted-foreground">Voter turnout</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="results" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="history">Round History</TabsTrigger>
            <TabsTrigger value="info">Room Info</TabsTrigger>
          </TabsList>

          {/* Tab 1: Results */}
          <TabsContent value="results" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Live Vote Tally</CardTitle>
                <CardDescription>Current round voting results</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Votes</TableHead>
                      <TableHead>Voters</TableHead>
                      <TableHead>Percentage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="text-muted-foreground" colSpan={5}>
                        No votes yet
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Round History */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Previous Rounds</CardTitle>
                <CardDescription>Historical voting results</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Round</TableHead>
                      <TableHead>Winner</TableHead>
                      <TableHead>Total Votes</TableHead>
                      <TableHead>Participation</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="text-muted-foreground" colSpan={5}>
                        No completed rounds yet
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Room Info */}
          <TabsContent value="info" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Room Information</CardTitle>
                <CardDescription>Contract details and configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Room Address</p>
                    <p className="font-mono text-sm">{roomAddress}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Admin Address</p>
                    <p className="font-mono text-sm">0x742d...f44e</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Current State</p>
                    <Badge variant="outline">Active</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Current Round</p>
                    <p className="font-semibold">3</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Voter Registry Version</p>
                    <p className="font-semibold">1</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Candidate Registry Version</p>
                    <p className="font-semibold">1</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="font-semibold">2 days ago</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sponsor Vault</p>
                    <p className="font-mono text-sm">0x04d1...b67</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Credit Pool Status</CardTitle>
                <CardDescription>Credit allocation and utilization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total in System</p>
                    <p className="text-2xl font-bold">10,000</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">In Pool</p>
                    <p className="text-2xl font-bold">1,200</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Currently Granted</p>
                    <p className="text-2xl font-bold">8,800</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Used</p>
                    <p className="text-2xl font-bold">3,200</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RoomDetails;
