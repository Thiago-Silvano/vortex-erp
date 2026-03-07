import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Trash2, Pencil, UserPlus, Users } from 'lucide-react';
import UserManagement from '@/components/UserManagement';

interface UserInfo {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  lastSignIn: string | null;
}

export default function UserAdmin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<UserInfo | null>(null);
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'list' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setUsers(data.users || []);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleDelete = async (user: UserInfo) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário ${user.email}?`)) return;
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'delete', userId: user.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Usuário excluído!' });
      fetchUsers();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const handleEdit = (user: UserInfo) => {
    setEditUser(user);
    setEditName(user.displayName);
    setEditPassword('');
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'update',
          userId: editUser.id,
          displayName: editName,
          ...(editPassword ? { password: editPassword } : {}),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Usuário atualizado!' });
      setEditUser(null);
      fetchUsers();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-primary text-primary-foreground">
        <div className="container mx-auto flex items-center justify-between py-3 px-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <h1 className="text-base sm:text-xl font-bold">Gerenciar Usuários</h1>
          </div>
          <div className="flex items-center gap-2">
            <UserManagement />
            <Button variant="ghost" size="sm" className="text-primary-foreground hover:text-foreground hover:bg-muted" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-6 px-4 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Usuários Cadastrados ({users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-center py-8">Carregando...</p>
            ) : users.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhum usuário encontrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead>Último acesso</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map(user => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>{user.displayName || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(user.lastSignIn)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(user)} title="Editar">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {user.email !== 'thiago@vortexviagens.com.br' && (
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(user)} title="Excluir">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">{editUser?.email}</p>
            <div>
              <Label>Nome</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nome do usuário" />
            </div>
            <div>
              <Label>Nova senha (deixe vazio para não alterar)</Label>
              <Input type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="••••••" minLength={6} />
            </div>
            <Button onClick={handleSaveEdit} disabled={saving} className="w-full">
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
