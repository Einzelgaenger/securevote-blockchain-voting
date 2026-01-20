import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import CreatorDashboard from "./pages/CreatorDashboard";
import RoomAdmin from "./pages/RoomAdmin";
import VoterDashboard from "./pages/VoterDashboard";
import RoomExplorer from "./pages/RoomExplorer";
import RoomDetails from "./pages/RoomDetails";
import CreateRoom from "./pages/CreateRoom";
import NotFound from "./pages/NotFound";

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/creator" element={<CreatorDashboard />} />
        <Route path="/admin/:roomAddress" element={<RoomAdmin />} />
        <Route path="/voter" element={<VoterDashboard />} />
        <Route path="/explore" element={<RoomExplorer />} />
        <Route path="/explore/:roomAddress" element={<RoomDetails />} />
        <Route path="/create-room" element={<CreateRoom />} />
        <Route path="/dashboard/*" element={<Dashboard />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
