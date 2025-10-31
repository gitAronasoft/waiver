import React, { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import AdminPrivateRoute from "./pages/components/AdminPrivateRoute";
import LoadingOverlay from "./components/LoadingOverlay";

const WelcomePage = lazy(() => import("./pages/WelcomePage"));
const NewCustomerForm = lazy(() => import("./pages/NewCustomerForm"));
const ExistingCustomerLogin = lazy(() => import("./pages/ExistingCustomerLogin"));
const VerifyOtpPage = lazy(() => import("./pages/VerifyOtpPage"));
const ConfirmCustomerInfo = lazy(() => import("./pages/ConfirmCustomerInfo"));
const RuleReminder = lazy(() => import("./pages/RuleReminder"));
const SignaturePage = lazy(() => import("./pages/SignaturePage"));
const AllDone = lazy(() => import("./pages/AllDone"));
const StarRating = lazy(() => import("./pages/StarRatingPage"));
const Feedback = lazy(() => import("./pages/FeedbackPage"));
const LoginAdmin = lazy(() => import("./pages/admin/login"));
const Home = lazy(() => import("./pages/admin/home"));
const History = lazy(() => import("./pages/admin/History"));
const ClientProfilePage = lazy(() => import("./pages/admin/ClientProfilePage"));
const ForgotPasswordForm = lazy(() => import("./pages/admin/forgetPassword"));
const ResetPasswordForm = lazy(() => import("./pages/admin/ResetPassword"));
const ChangePassword = lazy(() => import("./pages/admin/ChangePassword"));
const StaffList = lazy(() => import("./pages/admin/StaffList"));
const AddStaff = lazy(() => import("./pages/admin/AddStaff"));
const UpdateStaff = lazy(() => import("./pages/admin/UpdateStaff"));
const AdminProfile = lazy(() => import("./pages/admin/AdminProfile"));
const AdminFeedbackPage = lazy(() => import("./pages/admin/AdminFeedbackPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

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
      <Suspense fallback={<LoadingOverlay isVisible={true} />}>
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
      </Suspense>
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