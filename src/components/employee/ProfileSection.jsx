import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

// Helper function to get display name
const getDisplayName = (user) => user?.employee_name || user?.full_name || 'Usuario';

export default function ProfileSection({ user }) {
    const [profilePictureFile, setProfilePictureFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const queryClient = useQueryClient();

    const updateProfilePic = useMutation({
        mutationFn: async (file) => {
            setIsUploading(true);
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            await base44.auth.updateMe({ profile_picture_url: file_url });
            return file_url;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['currentUser'] });
            setIsUploading(false);
        },
        onError: () => {
            setIsUploading(false);
        }
    });
    
    useEffect(() => {
        if (profilePictureFile) {
            updateProfilePic.mutate(profilePictureFile);
        }
    }, [profilePictureFile]);

    const tenure = user.hire_date 
        ? formatDistanceToNow(new Date(user.hire_date), { locale: es })
        : "Pendiente de configurar";

    const displayRole = user.role === 'admin' ? 'Administrador' : (user.employee_type || 'Empleado');
    const displayName = getDisplayName(user);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Mi Perfil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left sm:gap-6">
                    <div className="relative">
                        <img 
                            src={user.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=fdc80c&color=252a5c&size=128`}
                            alt="Foto de perfil"
                            className="w-24 h-24 rounded-full border-4 border-gray-200 object-cover"
                        />
                         <label htmlFor="profile-pic-upload" className="absolute bottom-0 right-0 bg-proman-navy text-white rounded-full p-1.5 cursor-pointer hover:bg-opacity-90">
                            <Camera className="w-4 h-4" />
                        </label>
                        <Input 
                            id="profile-pic-upload"
                            type="file" 
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => setProfilePictureFile(e.target.files[0])}
                            disabled={isUploading}
                        />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-proman-navy">{displayName}</h3>
                        <p className="text-gray-500">{displayRole}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoField label="Email" value={user.email} />
                    <InfoField label="Fecha de Contratación" value={user.hire_date ? format(new Date(user.hire_date), 'dd MMMM yyyy', { locale: es }) : 'Pendiente'} />
                    <InfoField label="Antigüedad en la Empresa" value={tenure} />
                </div>
                 {isUploading && <p className="text-sm text-center text-gray-500">Actualizando foto de perfil...</p>}
            </CardContent>
        </Card>
    );
}

const InfoField = ({ label, value }) => (
    <div className="bg-gray-50 p-3 rounded-lg">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="font-semibold text-proman-navy">{value}</p>
    </div>
);