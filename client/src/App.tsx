import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import NicheFinder from "./pages/NicheFinder";
import ContentResearch from "./pages/ContentResearch";
import VideoPipeline from "./pages/VideoPipeline";
import ScriptWriter from "./pages/ScriptWriter";
import Voiceover from "./pages/Voiceover";
import Thumbnails from "./pages/Thumbnails";
import SEOOptimizer from "./pages/SEOOptimizer";
import ContentCalendar from "./pages/ContentCalendar";
import Analytics from "./pages/Analytics";
import Revenue from "./pages/Revenue";
import ChannelGuide from "./pages/ChannelGuide";
import AuditLog from "./pages/AuditLog";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/niche-finder" component={NicheFinder} />
        <Route path="/content-research" component={ContentResearch} />
        <Route path="/video-pipeline" component={VideoPipeline} />
        <Route path="/script-writer" component={ScriptWriter} />
        <Route path="/voiceover" component={Voiceover} />
        <Route path="/thumbnails" component={Thumbnails} />
        <Route path="/seo-optimizer" component={SEOOptimizer} />
        <Route path="/content-calendar" component={ContentCalendar} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/revenue" component={Revenue} />
        <Route path="/channel-guide" component={ChannelGuide} />
        <Route path="/audit-log" component={AuditLog} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
