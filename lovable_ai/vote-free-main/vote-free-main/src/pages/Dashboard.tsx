import { Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { MyRooms } from "@/components/dashboard/MyRooms";
import { CreateRoom } from "@/components/dashboard/CreateRoom";
import { VotingRooms } from "@/components/dashboard/VotingRooms";

const Dashboard = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <main className="flex-1 p-6">
            <Routes>
              <Route path="/" element={<MyRooms />} />
              <Route path="/my-rooms" element={<MyRooms />} />
              <Route path="/create" element={<CreateRoom />} />
              <Route path="/voting" element={<VotingRooms />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
