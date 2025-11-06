import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { User, UserPlus, Mail, Calendar, Edit2, Shield, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import EmployeeAvailability from "./EmployeeAvailability";

// Helper function to get display name
const getDisplayName = (user) => user.employee_name || user.full_name;

export default function EmployeeManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list('-created_date'),
    initialData: [],
  });

  const filteredUsers = users.filter(u =>
    getDisplayName(u)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.employee_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const employeeCount = users.filter(u => u.employee_type === 'Empleado').length;
  const supervisorCount = users.filter(u => u.employee_type === 'Supervisor').length;
  const adminCount = users.filter(u => u.role === 'admin').length;

  const roleColors = {
    'Empleado': 'bg-blue-100 text-blue-800',
    'Supervisor': 'bg-purple-100 text-purple-800',
    'Admin': 'bg-red-100 text-red-800'
  };

  const getDisplayRole = (user) => {
    if (user.role === 'admin') return 'Admin';
    return user.employee_type || 'Empleado';
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 hexagon bg-blue-100 flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-proman-navy">{employeeCount}</div>
                <div className="text-sm text-gray-600">Empleados</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 hexagon bg-purple-100 flex items-center justify-center">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-proman-navy">{supervisorCount}</div>
                <div className="text-sm text-gray-600">Supervisores</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 hexagon bg-red-100 flex items-center justify-center">
                <Shield className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-proman-navy">{adminCount}</div>
                <div className="text-sm text-gray-600">Administradores</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Empleados y Supervisores</CardTitle>
            <Button onClick={() => setShowInviteModal(true)} className="bg-proman-yellow text-proman-navy hover:opacity-90">
              <UserPlus className="w-4 h-4 mr-2" />
              Invitar Usuario
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Buscar por nombre, email o rol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            {filteredUsers.map((user) => {
              const displayRole = getDisplayRole(user);
              const displayName = getDisplayName(user);
              return (
                <Card key={user.id} className="border-2 border-gray-100 hover:border-proman-yellow transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-4">
                        <img
                          src={user.profile_picture_url || `https://ui-avatars.com/api/?name=${displayName}&background=fdc80c&color=252a5c`}
                          alt={displayName}
                          className="w-12 h-12 rounded-full border-2 border-proman-yellow"
                        />
                        <div>
                          <h3 className="font-bold text-proman-navy">{displayName}</h3>
                          {user.employee_name && user.employee_name !== user.full_name && (
                            <p className="text-xs text-gray-400">Cuenta: {user.full_name}</p>
                          )}
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-3 h-3" />
                            <span>{user.email}</span>
                          </div>
                          {user.hire_date && (
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                              <Calendar className="w-3 h-3" />
                              <span>Desde {format(new Date(user.hire_date), "dd MMM yyyy", { locale: es })}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge className={roleColors[displayRole] || 'bg-gray-100 text-gray-800'}>
                          {displayRole}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingUser(user)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {(displayRole === 'Empleado' || displayRole === 'Supervisor') && (
                      <div className="border-t pt-3 mt-3">
                        <EmployeeAvailability employeeEmail={user.email} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredUsers.length === 0 && !isLoading && (
            <p className="text-center text-gray-500 py-8">No se encontraron usuarios</p>
          )}
        </CardContent>
      </Card>

      {showInviteModal && (
        <InviteUserModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
        />
      )}
    </div>
  );
}

function InviteUserModal({ isOpen, onClose }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invitar Nuevo Usuario</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-proman-navy mb-2">📋 Pasos para invitar:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>Ve a <strong>Dashboard → Data → User</strong></li>
              <li>Haz click en <strong>"Invite User"</strong></li>
              <li>Ingresa el email del nuevo empleado</li>
              <li>El empleado recibirá un email para registrarse</li>
              <li><strong>IMPORTANTE:</strong> Después de que se registre, regresa aquí para:
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li>Configurar su nombre oficial</li>
                  <li>Asignar tipo (Empleado/Supervisor)</li>
                  <li>Subir su foto oficial</li>
                  <li>Configurar fecha de contratación</li>
                </ul>
              </li>
            </ol>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>💡 Tip:</strong> Después del registro, podrás personalizar toda la información del empleado desde aquí.
            </p>
          </div>
          
          <Button onClick={onClose} className="w-full bg-proman-yellow text-proman-navy">
            Entendido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditUserModal({ user, isOpen, onClose }) {
  const [imageFile, setImageFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState(user.profile_picture_url || '');
  const [employeeName, setEmployeeName] = useState(user.employee_name || user.full_name || '');
  const [employeeType, setEmployeeType] = useState(user.employee_type || 'Empleado');
  const [hireDate, setHireDate] = useState(user.hire_date || '');
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const uploadImage = async () => {
      if (!imageFile) return;
      setIsUploading(true);
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: imageFile });
        setUploadedImageUrl(file_url);
      } catch (error) {
        console.error("Error uploading image", error);
      } finally {
        setIsUploading(false);
      }
    };
    uploadImage();
  }, [imageFile]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await base44.entities.User.update(user.id, {
        employee_name: employeeName,
        employee_type: employeeType,
        hire_date: hireDate || null,
        profile_picture_url: uploadedImageUrl || null
      });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      alert('✅ Usuario actualizado correctamente');
      onClose();
    } catch (error) {
      console.error("Error updating user", error);
      alert('❌ Error al actualizar usuario: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Usuario: {getDisplayName(user)}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Card className="border-2 border-proman-yellow">
            <CardHeader>
              <CardTitle className="text-base">✏️ Configuración del Empleado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-proman-navy mb-2">
                  Nombre Oficial del Empleado <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  placeholder="Juan Pérez García"
                />
                {user.full_name && employeeName !== user.full_name && (
                  <p className="text-xs text-gray-500 mt-1">
                    Nombre de cuenta original: {user.full_name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-proman-navy mb-2">
                  Tipo de Empleado
                </label>
                <Select value={employeeType} onValueChange={setEmployeeType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Empleado">Empleado</SelectItem>
                    <SelectItem value="Supervisor">Supervisor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-proman-navy mb-2">
                  Fecha de Contratación
                </label>
                <Input
                  type="date"
                  value={hireDate}
                  onChange={(e) => setHireDate(e.target.value)}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-sm text-blue-800">
                  <strong>ℹ️ Nota:</strong> Para cambiar permisos de administrador, edita el campo "Role" desde Dashboard → Data → User (admin o user).
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-gray-200">
            <CardHeader>
              <CardTitle className="text-base">📸 Foto de Perfil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {uploadedImageUrl && (
                <div className="flex justify-center">
                  <img 
                    src={uploadedImageUrl} 
                    alt="Preview" 
                    className="w-32 h-32 rounded-full border-4 border-proman-yellow object-cover"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-proman-navy mb-2">
                  Subir Foto Oficial del Empleado
                </label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files[0])}
                  disabled={isUploading}
                />
                {isUploading && <p className="text-sm text-gray-500 mt-2">Subiendo imagen...</p>}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-sm text-blue-800">
                  <strong>📸 Importante:</strong> Esta debe ser la foto oficial del empleado con uniforme de PROMAN.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              className="bg-proman-yellow text-proman-navy hover:opacity-90"
              disabled={isSaving || isUploading || !employeeName.trim()}
            >
              {isSaving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}