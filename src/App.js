import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import WelcomePage from "./pages/WelcomePage";
import NewCustomerForm from "./pages/NewCustomerForm";
import ExistingCustomerLogin from "./pages/ExistingCustomerLogin";
import VerifyOtpPage from "./pages/VerifyOtpPage";
import ConfirmCustomerInfo from "./pages/ConfirmCustomerInfo";
import RuleReminder from "./pages/RuleReminder";
import SignaturePage from "./pages/SignaturePage";
import AllDone from "./pages/AllDone";
import StarRating from "./pages/StarRatingPage";
import Feedback from "./pages/FeedbackPage";
import LoginAdmin from "./pages/admin/login";
import Home from "./pages/admin/home";
import History from "./pages/admin/History";
import ClientProfilePage from "./pages/admin/ClientProfilePage";
import ForgotPasswordForm from "./pages/admin/forgetPassword";
import ResetPasswordForm from "./pages/admin/ResetPassword";
import ChangePassword from "./pages/admin/ChangePassword";
import StaffList from "./pages/admin/StaffList";
import AddStaff from "./pages/admin/AddStaff";
import UpdateStaff from "./pages/admin/UpdateStaff";
import AdminProfile from "./pages/admin/AdminProfile";
import AdminFeedbackPage from "./pages/admin/AdminFeedbackPage";

import AdminPrivateRoute from "./pages/components/AdminPrivateRoute";
import LoadingOverlay from "./components/LoadingOverlay";
import NotFound from "./pages/NotFound";

function AppContent() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <LoadingOverlay isVisible={isLoading} />
      <Routes>
        {/* Admin Public Route */}
        <Route path="/admin/login" element={<LoginAdmin />} />

          <Route path="admin/forgot-password" element={<ForgotPasswordForm />} />
                <Route path="/admin/reset-password" element={<ResetPasswordForm />} />

        {/* ✅ Protected Admin Routes */}
        <Route
          path="/admin/home"
          element={
            <AdminPrivateRoute>
              <Home />
            </AdminPrivateRoute>
          }
        />
        <Route
          path="/admin/history"
          element={
            <AdminPrivateRoute>
              <History />
            </AdminPrivateRoute>
          }
        />
        <Route
          path="/admin/client-profile/:id"
          element={
            <AdminPrivateRoute>
              <ClientProfilePage />
            </AdminPrivateRoute>
          }
        />
         <Route
          path="admin/change-password"
          element={
            <AdminPrivateRoute>
              <ChangePassword />
            </AdminPrivateRoute>
          }
        />


         <Route
          path="admin/staff-list"
          element={
            <AdminPrivateRoute>
              <StaffList />
            </AdminPrivateRoute>
          }
        />

           <Route
          path="admin/add-staff"
          element={
            <AdminPrivateRoute>
              <AddStaff />
            </AdminPrivateRoute>
          }
        />

           <Route
          path="admin/update-staff/:id"
          element={
            <AdminPrivateRoute>
              <UpdateStaff />
            </AdminPrivateRoute>
          }
        />

         <Route
          path="admin/update-profile"
          element={
            <AdminPrivateRoute>
              <AdminProfile />
            </AdminPrivateRoute>
          }
        />

          <Route
          path="admin/feedback-list"
          element={
            <AdminPrivateRoute>
              <AdminFeedbackPage />
            </AdminPrivateRoute>
          }
        />



        {/* Public User Routes */}
        <Route path="/" element={<WelcomePage />} />
        <Route path="/register" element={<NewCustomerForm />} />
        <Route path="/login" element={<ExistingCustomerLogin />} />
        <Route path="/verify-phone" element={<VerifyOtpPage />} />
        <Route path="/review-information" element={<ConfirmCustomerInfo />} />
        <Route path="/sign-waiver" element={<SignaturePage />} />
        <Route path="/rules" element={<RuleReminder />} />
        <Route path="/complete" element={<AllDone />} />
        <Route path="/rate/:id" element={<StarRating />} />
        {/* <Route path="/feedback/:id" element={<Feedback />} /> */}
        <Route path="/feedback" element={<Feedback />} />
        
        {/* Catch-all route for 404 - must be last */}
        <Route path="*" element={<NotFound />} />

      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;