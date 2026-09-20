import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AdminRoute from "./components/AdminRoute";
import OwnerRoute from "./components/OwnerRoute";
import UserRoute from "./components/UserRoute";
import AdminLayout from "./layouts/AdminLayout";
import MainLayout from "./layouts/MainLayout";
import OwnerLayout from "./layouts/OwnerLayout";
import UserLayout from "./layouts/UserLayout";
import About from "./pages/About";
import Auth from "./pages/Auth";
import CountryIndia from "./pages/CountryIndia";
import Favorites from "./pages/Favorites";
import Home from "./pages/Home";
import HowItWorks from "./pages/HowItWorks";
import SpaceDetails from "./pages/SpaceDetails";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOwners from "./pages/admin/AdminOwners";
import AdminReviews from "./pages/admin/AdminReviews";
import AdminSpaces from "./pages/admin/AdminSpaces";
import AddSpace from "./pages/owner/AddSpace";
import MySpaces from "./pages/owner/MySpaces";
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import OwnerSettings from "./pages/owner/OwnerSettings";
import UserDashboard from "./pages/user/UserDashboard";
import UserFavoriteSpaces from "./pages/user/UserFavoriteSpaces";
import UserSearchSpace from "./pages/user/UserSearchSpace";
import UserSettings from "./pages/user/UserSettings";
import UserYourSpaces from "./pages/user/UserYourSpaces";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/country/india" element={<CountryIndia />} />
          <Route path="/about" element={<About />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/space/:id" element={<SpaceDetails />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/register" element={<Auth />} />
        </Route>

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="spaces" element={<AdminSpaces />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="owners" element={<AdminOwners />} />
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
        </Route>

        <Route
          path="/owner"
          element={
            <OwnerRoute>
              <OwnerLayout />
            </OwnerRoute>
          }
        >
          <Route path="dashboard" element={<OwnerDashboard />} />
          <Route path="add-space" element={<AddSpace />} />
          <Route path="my-spaces" element={<MySpaces />} />
          <Route path="settings" element={<OwnerSettings />} />
          <Route path="notifications" element={<Navigate to="/owner/settings?tab=notifications" replace />} />
          <Route path="profile" element={<Navigate to="/owner/settings?tab=profile" replace />} />
          <Route index element={<Navigate to="/owner/dashboard" replace />} />
        </Route>

        <Route
          path="/user"
          element={
            <UserRoute>
              <UserLayout />
            </UserRoute>
          }
        >
          <Route path="dashboard" element={<UserDashboard />} />
          <Route path="search-space" element={<UserSearchSpace />} />
          <Route path="favorite-spaces" element={<UserFavoriteSpaces />} />
          <Route path="your-spaces" element={<UserYourSpaces />} />
          <Route path="settings" element={<UserSettings />} />
          <Route path="notifications" element={<Navigate to="/user/settings?tab=notifications" replace />} />
          <Route index element={<Navigate to="/user/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

