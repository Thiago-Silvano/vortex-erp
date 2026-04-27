import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, SortableTableHead } from '@/components/ui/table';
import { useTableSort } from '@/hooks/useTableSort';
import { Plus, Edit, Trash2, FileText, Copy, Eye, ChevronDown, Variable } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const AVAILABLE_VARIABLES = [
  { key: '{{nome_cliente}}', label: 'Nome do Cliente' },
  { key: '{{cpf_cliente}}', label: 'CPF do Cliente' },
  { key: '{{email_cliente}}', label: 'Email do Cliente' },
  { key: '{{telefone_cliente}}', label: 'Telefone do Cliente' },
  { key: '{{nome_empresa}}', label: 'Nome da Empresa' },
  { key: '{{cnpj_empresa}}', label: 'CNPJ da Empresa' },
  { key: '{{numero_venda}}', label: 'Número da Venda' },
  { key: '{{data_venda}}', label: 'Data da Venda' },
  { key: '{{valor_total}}', label: 'Valor Total' },
  { key: '{{forma_pagamento}}', label: 'Forma de Pagamento' },
  { key: '{{descricao_servicos}}', label: 'Descrição dos Serviços' },
  { key: '{{destino}}', label: 'Destino' },
  { key: '{{data_inicio}}', label: 'Data de Início' },
  { key: '{{data_fim}}', label: 'Data de Fim' },
  { key: '{{nome_vendedor}}', label: 'Nome do Vendedor' },
  { key: '{{lista_passageiros}}', label: 'Lista de Passageiros' },
  { key: '{{data_atual}}', label: 'Data Atual' },
];

const CATEGORIES = [
  { value: 'turismo', label: 'Prestação de Serviços de Turismo' },
  { value: 'responsabilidade', label: 'Termo de Responsabilidade' },
  { value: 'cancelamento', label: 'Política de Cancelamento' },
  { value: 'assessoria_visto', label: 'Assessoria Documental (Vistos)' },
  { value: 'ciencia_consular', label: 'Ciência sobre Análise Consular' },
  { value: 'honorarios', label: 'Política de Honorários' },
  { value: 'outro', label: 'Outro' },
];

interface Template {
  id: string;
  name: string;
  category: string;
  body_html: string;
  is_active: boolean;
  created_at: string;
}

export default function ContractTemplatesPage() {
  const { activeCompany } = useCompany();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('turismo');
  const [formBody, setFormBody] = useState('');

  const editorRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeCompany) loadTemplates();
  }, [activeCompany]);

  const loadTemplates = async () => {
    if (!activeCompany) return;
    setLoading(true);
    const { data } = await supabase
      .from('contract_templates')
      .select('*')
      .eq('empresa_id', activeCompany.id)
      .order('created_at', { ascending: false });
    setTemplates((data as any) || []);
    setLoading(false);
  };

  const openNew = () => {
    setEditingTemplate(null);
    setFormName('');
    setFormCategory('turismo');
    setFormBody('');
    setShowEditor(true);
  };

  const openEdit = (t: Template) => {
    setEditingTemplate(t);
    setFormName(t.name);
    setFormCategory(t.category);
    setFormBody(t.body_html);
    setShowEditor(true);
  };

  useEffect(() => {
    if (showEditor) {
      const timer = setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.innerHTML = formBody;
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [showEditor, editingTemplate]);

  const insertVariable = (varKey: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand('insertText', false, varKey);
      setFormBody(editorRef.current.innerHTML);
    }
  };

  const handleSave = async () => {
    if (!activeCompany || !formName.trim()) {
      toast.error('Preencha o nome do modelo');
      return;
    }
    const bodyHtml = editorRef.current?.innerHTML || formBody;

    if (editingTemplate) {
      const { error } = await supabase
        .from('contract_templates')
        .update({ name: formName, category: formCategory, body_html: bodyHtml, updated_at: new Date().toISOString() } as any)
        .eq('id', editingTemplate.id);
      if (error) { toast.error('Erro ao salvar'); return; }
      toast.success('Modelo atualizado');
    } else {
      const { error } = await supabase
        .from('contract_templates')
        .insert({ empresa_id: activeCompany.id, name: formName, category: formCategory, body_html: bodyHtml } as any);
      if (error) { toast.error('Erro ao criar'); return; }
      toast.success('Modelo criado');
    }
    setShowEditor(false);
    loadTemplates();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('contract_templates').delete().eq('id', deleteId);
    toast.success('Modelo excluído');
    setDeleteId(null);
    loadTemplates();
  };

  const handleDuplicate = async (t: Template) => {
    if (!activeCompany) return;
    await supabase.from('contract_templates').insert({
      empresa_id: activeCompany.id, name: `${t.name} (cópia)`, category: t.category, body_html: t.body_html
    } as any);
    toast.success('Modelo duplicado');
    loadTemplates();
  };

  const catLabel = (v: string) => CATEGORIES.find(c => c.value === v)?.label || v;

  const { sortedData: sortedTemplates, sortState, requestSort } = useTableSort(templates, {
    name: (t) => t.name,
    category: (t) => catLabel(t.category),
    is_active: (t) => t.is_active ? 1 : 0,
  }, { initialKey: 'name', initialDirection: 'asc' });

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Modelos de Contrato</h1>
            <p className="text-sm text-muted-foreground mt-1">Crie e gerencie modelos de contrato com variáveis dinâmicas</p>
          </div>
          <Button onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Modelo
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead sortKey="name" sortState={sortState} onSort={requestSort}>Nome</SortableTableHead>
                  <SortableTableHead sortKey="category" sortState={sortState} onSort={requestSort}>Categoria</SortableTableHead>
                  <SortableTableHead sortKey="is_active" sortState={sortState} onSort={requestSort}>Status</SortableTableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : sortedTemplates.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum modelo cadastrado</TableCell></TableRow>
                ) : sortedTemplates.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell><Badge variant="secondary">{catLabel(t.category)}</Badge></TableCell>
                    <TableCell><Badge className={t.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}>{t.is_active ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setPreviewHtml(t.body_html)} title="Visualizar"><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(t)} title="Editar"><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDuplicate(t)} title="Duplicar"><Copy className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(t.id)} title="Excluir" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Editor Modal */}
        <Dialog open={showEditor} onOpenChange={setShowEditor}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? 'Editar Modelo' : 'Novo Modelo de Contrato'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome do Modelo</Label>
                  <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Ex: Contrato de Turismo" />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={formCategory} onValueChange={setFormCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Corpo do Contrato</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <Variable className="h-3.5 w-3.5" /> Inserir Variável <ChevronDown className="h-3 w-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-2 max-h-64 overflow-y-auto" align="end">
                      {AVAILABLE_VARIABLES.map(v => (
                        <button
                          key={v.key}
                          className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                          onClick={() => insertVariable(v.key)}
                        >
                          <span className="font-mono text-xs text-primary">{v.key}</span>
                          <span className="block text-muted-foreground text-xs">{v.label}</span>
                        </button>
                      ))}
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex gap-1 mb-2">
                  <Button variant="outline" size="sm" onClick={() => document.execCommand('bold')} title="Negrito"><strong>B</strong></Button>
                  <Button variant="outline" size="sm" onClick={() => document.execCommand('italic')} title="Itálico"><em>I</em></Button>
                  <Button variant="outline" size="sm" onClick={() => document.execCommand('underline')} title="Sublinhado"><u>U</u></Button>
                  <Button variant="outline" size="sm" onClick={() => document.execCommand('insertUnorderedList')} title="Lista">• Lista</Button>
                </div>
                <div
                  ref={editorRef}
                  contentEditable
                  className="min-h-[300px] max-h-[500px] overflow-y-auto border border-input rounded-md p-4 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring prose prose-sm max-w-none"
                  onInput={() => { if (editorRef.current) setFormBody(editorRef.current.innerHTML); }}
                  style={{ whiteSpace: 'pre-wrap' }}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowEditor(false)}>Cancelar</Button>
                <Button onClick={handleSave}>Salvar Modelo</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Preview Modal */}
        <Dialog open={!!previewHtml} onOpenChange={() => setPreviewHtml(null)}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Pré-visualização do Contrato</DialogTitle></DialogHeader>
            <div className="border rounded-lg p-6 bg-white">
              <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: previewHtml || '' }} />
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Modelo</AlertDialogTitle>
              <AlertDialogDescription>Tem certeza que deseja excluir este modelo de contrato?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
