import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Pencil, Shield } from 'lucide-react';
import UserManagement from '@/components/UserManagement';
import { useCompany, Company } from '@/contexts/CompanyContext';

interface UserInfo {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  lastSignIn: string | null;
}

interface UserPermission {
  user_id: string;
  user_role: string;
  permissions: Record<string, boolean>;
  empresa_ids: string[];
}

const ALL_PERMISSIONS = [
  { group: 'Clientes', keys: [{ key: 'clients_view', label: 'Visualizar' }, { key: 'clients_create', label: 'Criar' }, { key: 'clients_edit', label: 'Editar' }] },
  { group: 'Fornecedores', keys: [{ key: 'suppliers_view', label: 'Visualizar' }, { key: 'suppliers_create', label: 'Criar' }, { key: 'suppliers_edit', label: 'Editar' }] },
  { group: 'Cotações', keys: [{ key: 'quotes_view', label: 'Visualizar' }, { key: 'quotes_create', label: 'Criar' }, { key: 'quotes_convert', label: 'Converter em venda' }] },
  { group: 'Vendas', keys: [{ key: 'sales_view', label: 'Visualizar' }, { key: 'sales_create', label: 'Criar' }, { key: 'sales_edit', label: 'Editar' }] },
  { group: 'Reservas', keys: [{ key: 'reservations_view', label: 'Visualizar' }, { key: 'reservations_create', label: 'Criar' }, { key: 'reservations_edit', label: 'Editar' }] },
  { group: 'Financeiro', keys: [{ key: 'financial_receivable', label: 'Contas a receber' }, { key: 'financial_payable', label: 'Contas a pagar' }, { key: 'financial_cashflow', label: 'Fluxo de caixa' }] },
  { group: 'Relatórios', keys: [{ key: 'reports_dashboard', label: 'Dashboard' }, { key: 'reports_financial', label: 'Financeiro' }, { key: 'reports_sales', label: 'Vendas' }] },
  { group: 'Configurações', keys: [{ key: 'settings_access', label: 'Acesso permitido' }] },
];

export default function UserAdmin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [permissions, setPermissions] = useState<Record<string, UserPermission>>({});
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<UserInfo | null>(null);
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [permUser, setPermUser] = useState<UserInfo | null>(null);
  const [permRole, setPermRole] = useState('vendedor');
  const [permChecks, setPermChecks] = useState<Record<string, boolean>>({});

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', { body: { action: 'list' } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setUsers(data.users || []);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const fetchPermissions = async () => {
    const { data } = await supabase.from('user_permissions').select('*') as any;
    if (data) {
      const map: Record<string, UserPermission> = {};
      data.forEach((p: any) => { map[p.user_id] = { user_id: p.user_id, user_role: p.user_role, permissions: p.permissions || {} }; });
      setPermissions(map);
    }
  };

  useEffect(() => { fetchUsers(); fetchPermissions(); }, []);

  const handleDelete = async (user: UserInfo) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário ${user.email}?`)) return;
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', { body: { action: 'delete', userId: user.id } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await supabase.from('user_permissions').delete().eq('user_id', user.id) as any;
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
        body: { action: 'update', userId: editUser.id, displayName: editName, ...(editPassword ? { password: editPassword } : {}) },
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

  const openPermissions = (user: UserInfo) => {
    const perm = permissions[user.id];
    setPermUser(user);
    if (perm) {
      setPermRole(perm.user_role);
      setPermChecks(perm.permissions);
    } else {
      // Default for master email
      if (user.email === 'thiago@vortexviagens.com.br') {
        setPermRole('master');
        const all: Record<string, boolean> = {};
        ALL_PERMISSIONS.forEach(g => g.keys.forEach(k => { all[k.key] = true; }));
        setPermChecks(all);
      } else {
        setPermRole('vendedor');
        setPermChecks({ clients_view: true, clients_create: true, clients_edit: true, quotes_view: true, quotes_create: true, quotes_convert: true, sales_view: true, sales_create: true, reservations_view: true });
      }
    }
  };

  const handleSavePermissions = async () => {
    if (!permUser) return;
    setSaving(true);
    const payload = { user_id: permUser.id, user_role: permRole, permissions: permChecks, updated_at: new Date().toISOString() };
    
    if (permissions[permUser.id]) {
      await supabase.from('user_permissions').update(payload as any).eq('user_id', permUser.id) as any;
    } else {
      await supabase.from('user_permissions').insert(payload as any) as any;
    }
    
    toast({ title: 'Permissões salvas!' });
    setPermUser(null);
    fetchPermissions();
    setSaving(false);
  };

  useEffect(() => {
    if (permRole === 'master') {
      const all: Record<string, boolean> = {};
      ALL_PERMISSIONS.forEach(g => g.keys.forEach(k => { all[k.key] = true; }));
      setPermChecks(all);
    }
  }, [permRole]);

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getRoleBadge = (userId: string) => {
    const perm = permissions[userId];
    if (!perm) return <Badge variant="outline">Sem perfil</Badge>;
    return perm.user_role === 'master' 
      ? <Badge className="bg-primary">Master</Badge> 
      : <Badge variant="secondary">Vendedor</Badge>;
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Gerenciar Usuários</h1>
          <UserManagement />
        </div>

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
                      <TableHead>Perfil</TableHead>
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
                        <TableCell>{getRoleBadge(user.id)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(user.lastSignIn)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openPermissions(user)} title="Permissões">
                              <Shield className="h-4 w-4" />
                            </Button>
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
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Usuário</DialogTitle></DialogHeader>
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

      {/* Permissions Dialog */}
      <Dialog open={!!permUser} onOpenChange={(open) => !open && setPermUser(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Permissões - {permUser?.email}</DialogTitle></DialogHeader>
          <div className="space-y-6 pt-2">
            <div>
              <Label>Tipo de Usuário</Label>
              <Select value={permRole} onValueChange={setPermRole} disabled={permUser?.email === 'thiago@vortexviagens.com.br'}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="master">Master</SelectItem>
                  <SelectItem value="vendedor">Vendedor</SelectItem>
                </SelectContent>
              </Select>
              {permRole === 'master' && <p className="text-xs text-muted-foreground mt-1">Master tem acesso total ao sistema</p>}
            </div>

            <div className="space-y-4">
              {ALL_PERMISSIONS.map(group => (
                <div key={group.group} className="border rounded-lg p-4">
                  <h3 className="font-medium text-sm mb-3">{group.group}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {group.keys.map(k => (
                      <label key={k.key} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={!!permChecks[k.key]}
                          onCheckedChange={(checked) => setPermChecks(prev => ({ ...prev, [k.key]: !!checked }))}
                          disabled={permRole === 'master'}
                        />
                        <span className="text-sm">{k.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <Button onClick={handleSavePermissions} disabled={saving} className="w-full">
              {saving ? 'Salvando...' : 'Salvar Permissões'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
