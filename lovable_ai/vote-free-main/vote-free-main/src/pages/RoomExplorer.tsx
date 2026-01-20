import { Navbar } from "@/components/landing/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter } from "lucide-react";
import { Link } from "react-router-dom";

const RoomExplorer = () => {
    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2">Explore Voting Rooms</h1>
                    <p className="text-muted-foreground">Browse all public voting rooms on the platform</p>
                </div>

                {/* Filters */}
                <div className="mb-6 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by room name or address..."
                            className="pl-10"
                        />
                    </div>
                    <Select defaultValue="all">
                        <SelectTrigger className="w-full md:w-[200px]">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Filter by state" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All States</SelectItem>
                            <SelectItem value="active">Active Only</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="ended">Ended</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select defaultValue="newest">
                        <SelectTrigger className="w-full md:w-[200px]">
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">Newest First</SelectItem>
                            <SelectItem value="active">Most Active</SelectItem>
                            <SelectItem value="voters">Most Voters</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Room Cards Grid */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {/* Empty State */}
                    <div className="col-span-full">
                        <Card>
                            <CardContent className="text-center py-12">
                                <p className="text-muted-foreground">No rooms found</p>
                                <p className="text-sm text-muted-foreground mt-2">Rooms will appear here when created</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Example Room Card (shown when rooms exist) */}
                    {/* <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="truncate">Room Name</CardTitle>
                <Badge variant="outline">🟢 Active</Badge>
              </div>
              <CardDescription className="truncate">
                Admin: 0x742d35Cc6634C0532925a3b844Bc454e4438f44e
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Current Round</p>
                    <p className="font-semibold">3</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Votes</p>
                    <p className="font-semibold">1,234</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Voters</p>
                    <p className="font-semibold">56</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Created</p>
                    <p className="font-semibold">2 days ago</p>
                  </div>
                </div>
                <Link to="/explore/0x123...">
                  <Button className="w-full">View Details</Button>
                </Link>
              </div>
            </CardContent>
          </Card> */}
                </div>

                {/* Pagination (shown when there are many rooms) */}
                {/* <div className="mt-8 flex justify-center gap-2">
          <Button variant="outline" disabled>Previous</Button>
          <Button variant="outline">1</Button>
          <Button variant="default">2</Button>
          <Button variant="outline">3</Button>
          <Button variant="outline">Next</Button>
        </div> */}
            </div>
        </div>
    );
};

export default RoomExplorer;
