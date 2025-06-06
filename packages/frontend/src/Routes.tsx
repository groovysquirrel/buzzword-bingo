import { Route, Routes } from "react-router-dom";
import Home from "./containers/Home.tsx";
import Login from "./containers/Login.tsx";
import Settings from "./containers/Settings.tsx";
import NotFound from "./containers/NotFound.tsx";
import Admin from "./containers/Admin.tsx";
import StatusScreen from "./containers/StatusScreen.tsx";
import Join from "./containers/Join.tsx";
import BingoGame from "./containers/BingoGame.tsx";
import Leaderboard from "./containers/Leaderboard.tsx";
import AuthenticatedRoute from "./components/AuthenticatedRoute.tsx";
import UnauthenticatedRoute from "./components/UnauthenticatedRoute.tsx";

export default function Links() {
  return (
    <Routes>
      {/* Main user flow - mobile-first experience */}
      <Route path="/" element={<Join />} />
      <Route path="/play" element={<BingoGame />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      
      {/* Status board for public displays */}
      <Route path="/status" element={<StatusScreen />} />
      
      {/* Admin dashboard with authentication required */}
      <Route
        path="/admin"
        element={
          <AuthenticatedRoute>
            <Admin />
          </AuthenticatedRoute>
        }
      />
      
      {/* Legacy home route - redirect to main Join page */}
      <Route path="/home" element={<Home />} />
      
      <Route
        path="/login"
        element={
          <UnauthenticatedRoute>
            <Login />
          </UnauthenticatedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <AuthenticatedRoute>
            <Settings />
          </AuthenticatedRoute>
        }
      />
     
      {/* Finally, catch all unmatched routes */}
      <Route path="*" element={<NotFound />} />;
    </Routes>
  );
}
