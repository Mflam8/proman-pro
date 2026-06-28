import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import ProfileSection from "../components/employee/ProfileSection";
import JobList from "../components/employee/JobList";
import ClockInOut from "../components/employee/ClockInOut";
import ScheduleManager from "../components/employee/ScheduleManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, ListChecks, Clock, Calendar } from "lucide-react";

export default function EmployeeDashboard() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const { data: userData, isLoading: isUserLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        // No está autenticado, redirigir al login
        base44.auth.redirectToLogin(window.location.pathname);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (userData) {
      setUser(userData);
    }
  }, [userData]);

  if (isLoading || isUserLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-proman-navy mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando portal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="gradient-navy-yellow text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <img 
              src={user.profile_picture_url || `https://ui-avatars.com/api/?name=${user.full_name}&background=fdc80c&color=252a5c`} 
              alt="Perfil" 
              className="w-16 h-16 rounded-full border-4 border-proman-yellow"
            />
            <div>
              <h1 className="text-3xl font-bold">Portal de Empleado</h1>
              <p className="text-gray-200">Bienvenido, {user.full_name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="today">
          <TabsList className="mb-6 flex flex-wrap h-auto gap-2 bg-transparent p-0">
            <TabsTrigger value="today"><Calendar className="w-4 h-4 mr-2" />Hoy</TabsTrigger>
            <TabsTrigger value="jobs"><ListChecks className="w-4 h-4 mr-2" />Mis Trabajos</TabsTrigger>
            <TabsTrigger value="schedule"><Calendar className="w-4 h-4 mr-2" />Disponibilidad</TabsTrigger>
            <TabsTrigger value="clock"><Clock className="w-4 h-4 mr-2" />Marcaje</TabsTrigger>
            <TabsTrigger value="profile"><User className="w-4 h-4 mr-2" />Mi Perfil</TabsTrigger>
          </TabsList>

          <TabsContent value="today">
            <JobList user={user} filterMode="today" />
          </TabsContent>
          <TabsContent value="jobs">
            <JobList user={user} filterMode="all" />
          </TabsContent>
          <TabsContent value="schedule">
            <ScheduleManager user={user} />
          </TabsContent>
          <TabsContent value="clock">
            <ClockInOut user={user} />
          </TabsContent>
          <TabsContent value="profile">
            <ProfileSection user={user} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}