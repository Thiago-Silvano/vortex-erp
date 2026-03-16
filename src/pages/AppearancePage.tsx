import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { useTheme, defaultTheme, themePresets, ThemeSettings } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Save, RotateCcw, Download, Upload, Palette, Type, Layout, RectangleHorizontal, Table2, PanelTop, Maximize2, Sparkles, Eye } from 'lucide-react';
import { toast } from 'sonner';

const fontOptions = ['Inter', 'Roboto', 'Open Sans', 'Segoe UI', 'Montserrat', 'Arial'];

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-8 h-8 rounded border border-border cursor-pointer shrink-0"
      />
      <div className="flex-1 min-w-0">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Input value={value} onChange={e => onChange(e.target.value)} className="h-7 text-xs mt-0.5" />
      </div>
    </div>
  );
}

function LivePreview({ theme }: { theme: ThemeSettings }) {
  const previewTabs = ['Detalhes', 'Dados adicionais', 'Vendas', 'Grupos', 'Dados financeiros', 'Contatos', 'Usuário', 'Anexos', 'Tarefas'];
  const [activeTab, setActiveTab] = useState('Anexos');

  const btnRadius = theme.button_style === 'rounded' ? '8px' : theme.button_style === 'square' ? '2px' : '6px';
  const btnPad = theme.button_size === 'small' ? '6px 12px' : theme.button_size === 'large' ? '12px 24px' : '8px 16px';
  const btnFontSize = theme.font_size_button;

  const tabBorderStyle = () => {
    if (theme.tab_border === 'border') return { border: `1px solid ${theme.border_color}`, borderBottom: 'none' };
    if (theme.tab_border === 'underline') return { borderBottom: `2px solid transparent` };
    if (theme.tab_border === 'colored') return { background: theme.tab_inactive_color + '22' };
    return {};
  };

  const activeTabStyle = () => {
    const base: React.CSSProperties = { color: theme.tab_active_color, fontWeight: 600, fontSize: theme.font_size_tab };
    if (theme.tab_border === 'underline') return { ...base, borderBottom: `2px solid ${theme.tab_active_color}` };
    if (theme.tab_border === 'border') return { ...base, border: `1px solid ${theme.border_color}`, borderBottom: '1px solid transparent', background: theme.field_color };
    if (theme.tab_border === 'colored') return { ...base, background: theme.tab_active_color + '22' };
    return base;
  };

  const inactiveTabStyle = (): React.CSSProperties => ({
    color: theme.tab_inactive_color,
    fontSize: theme.font_size_tab,
    ...tabBorderStyle(),
  });

  const cols = theme.field_columns;
  const gridCols = cols === 1 ? '1fr' : cols === 3 ? '1fr 1fr 1fr' : '1fr 1fr';

  const attachments = [
    { desc: 'Contrato de viagem.pdf', tipo: 'PDF' },
    { desc: 'Passaporte_scan.jpg', tipo: 'Imagem' },
    { desc: 'Comprovante_pagamento.pdf', tipo: 'PDF' },
  ];

  const justify = theme.button_position === 'left' ? 'flex-start' : theme.button_position === 'center' ? 'center' : 'flex-end';
  const btnOrder = theme.button_order === 'ok-cancel' ? ['OK', 'Cancelar'] : ['Salvar', 'Cancelar'];

  return (
    <div
      style={{
        background: theme.background_color,
        fontFamily: `'${theme.font_family}', sans-serif`,
        fontSize: theme.font_size_body,
        lineHeight: theme.line_height,
        padding: theme.inner_padding,
        borderRadius: '8px',
        minHeight: '100%',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: theme.header_color,
          color: '#fff',
          padding: '12px 20px',
          borderRadius: '6px 6px 0 0',
          fontFamily: `'${theme.font_family_titles}', sans-serif`,
          fontSize: theme.font_size_title,
          fontWeight: 700,
        }}
      >
        Pessoa Física
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0',
          borderBottom: theme.tab_border === 'underline' ? `1px solid ${theme.border_color}` : 'none',
          background: theme.field_color,
          overflowX: 'auto',
          flexWrap: 'nowrap',
        }}
      >
        {previewTabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 14px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              border: 'none',
              background: 'transparent',
              transition: 'all 0.15s',
              ...(activeTab === tab ? activeTabStyle() : inactiveTabStyle()),
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div style={{ background: theme.field_color, border: `1px solid ${theme.border_color}`, borderTop: 'none', padding: theme.inner_padding, borderRadius: '0 0 6px 6px' }}>
        {activeTab === 'Detalhes' && (
          <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: theme.element_spacing }}>
            {['Nome completo', 'CPF', 'Data nascimento', 'Telefone', 'Email', 'Endereço'].map(f => (
              <div key={f}>
                <label style={{ fontSize: '12px', color: theme.tab_inactive_color, fontWeight: 500, display: 'block', marginBottom: '4px' }}>{f}</label>
                <input
                  readOnly
                  placeholder={f}
                  style={{
                    width: '100%',
                    height: theme.field_height,
                    border: `1px solid ${theme.border_color}`,
                    borderRadius: '4px',
                    padding: '0 10px',
                    fontSize: theme.font_size_body,
                    background: theme.field_color,
                    color: theme.header_color,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Anexos' && (
          <div>
            {/* Attachments table */}
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontFamily: `'${theme.font_family_tables}', sans-serif`,
                fontSize: theme.font_size_table,
              }}
            >
              <thead>
                <tr style={{ background: theme.header_color, color: '#fff' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>Descrição</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>Tipo</th>
                </tr>
              </thead>
              <tbody>
                {attachments.map((a, i) => (
                  <tr
                    key={i}
                    style={{
                      background: theme.table_style === 'striped' && i % 2 === 1 ? theme.table_alt_color : theme.table_color,
                      height: theme.table_row_height,
                      borderBottom: theme.table_borders !== 'none' ? `1px solid ${theme.border_color}` : 'none',
                    }}
                  >
                    <td style={{ padding: '6px 12px' }}>{a.desc}</td>
                    <td style={{ padding: '6px 12px' }}>{a.tipo}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button style={{ padding: btnPad, borderRadius: btnRadius, fontSize: btnFontSize, background: theme.button_primary_color, color: '#fff', border: 'none', cursor: 'pointer', boxShadow: theme.button_style === 'shadow' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none' }}>Anexar</button>
              <button style={{ padding: btnPad, borderRadius: btnRadius, fontSize: btnFontSize, background: theme.button_secondary_color, color: theme.header_color, border: `1px solid ${theme.border_color}`, cursor: 'pointer' }}>Colar</button>
            </div>
          </div>
        )}

        {activeTab !== 'Detalhes' && activeTab !== 'Anexos' && (
          <div style={{ padding: '32px', textAlign: 'center', color: theme.tab_inactive_color }}>
            Conteúdo de "{activeTab}" será exibido aqui
          </div>
        )}
      </div>

      {/* Footer buttons */}
      <div style={{ display: 'flex', justifyContent: justify, gap: '8px', marginTop: '16px' }}>
        <button style={{ padding: btnPad, borderRadius: btnRadius, fontSize: btnFontSize, background: theme.button_primary_color, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, boxShadow: theme.button_style === 'shadow' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none' }}>{btnOrder[0]}</button>
        <button style={{ padding: btnPad, borderRadius: btnRadius, fontSize: btnFontSize, background: theme.button_secondary_color, color: theme.header_color, border: `1px solid ${theme.border_color}`, cursor: 'pointer' }}>{btnOrder[1]}</button>
      </div>
    </div>
  );
}

export default function AppearancePage() {
  const { theme, setTheme, saveTheme } = useTheme();
  const [draft, setDraft] = useState<ThemeSettings>({ ...theme });
  const [activeSection, setActiveSection] = useState('tema');

  const update = (partial: Partial<ThemeSettings>) => {
    const next = { ...draft, ...partial };
    setDraft(next);
    setTheme(next); // live apply
  };

  const handleSave = async () => {
    await saveTheme(draft);
    toast.success('Tema salvo com sucesso!');
  };

  const handleReset = () => {
    setDraft({ ...defaultTheme });
    setTheme({ ...defaultTheme });
    toast.info('Tema restaurado ao padrão');
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `tema-${draft.theme_name}.json`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Tema exportado!');
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const imported = JSON.parse(ev.target?.result as string);
          const merged = { ...defaultTheme, ...imported };
          setDraft(merged);
          setTheme(merged);
          toast.success('Tema importado!');
        } catch { toast.error('Arquivo inválido'); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const applyPreset = (key: string) => {
    const preset = themePresets[key];
    if (!preset) return;
    const next = { ...defaultTheme, ...preset };
    setDraft(next);
    setTheme(next);
    toast.success(`Preset "${preset.theme_name}" aplicado!`);
  };

  const sections = [
    { id: 'tema', label: 'Tema', icon: Palette },
    { id: 'tipografia', label: 'Tipografia', icon: Type },
    { id: 'layout', label: 'Layout de Telas', icon: Layout },
    { id: 'botoes', label: 'Botões e Campos', icon: RectangleHorizontal },
    { id: 'tabelas', label: 'Tabelas e Listagens', icon: Table2 },
    { id: 'abas', label: 'Abas e Painéis', icon: PanelTop },
    { id: 'densidade', label: 'Espaçamento e Densidade', icon: Maximize2 },
    { id: 'presets', label: 'Presets de Layout', icon: Sparkles },
    { id: 'preview', label: 'Visualização ao vivo', icon: Eye },
  ];

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-56px)]">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-3 border-b bg-card shrink-0">
          <h1 className="text-xl font-bold text-foreground">Aparência do Sistema</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}><RotateCcw className="h-4 w-4 mr-1" />Restaurar padrão</Button>
            <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-1" />Exportar</Button>
            <Button variant="outline" size="sm" onClick={handleImport}><Upload className="h-4 w-4 mr-1" />Importar</Button>
            <Button size="sm" onClick={handleSave}><Save className="h-4 w-4 mr-1" />Salvar tema</Button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Left: Settings */}
          <div className="w-[420px] border-r flex flex-col shrink-0 bg-card">
            {/* Section nav */}
            <ScrollArea className="h-full">
              <div className="flex flex-wrap gap-1 p-3 border-b">
                {sections.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(s.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${activeSection === s.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-accent'}`}
                  >
                    <s.icon className="h-3.5 w-3.5" />
                    {s.label}
                  </button>
                ))}
              </div>

              <div className="p-4 space-y-4">
                {/* TEMA - Colors */}
                {activeSection === 'tema' && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-foreground">Configuração de Cores</h3>
                    <ColorField label="Cor principal" value={draft.primary_color} onChange={v => update({ primary_color: v })} />
                    <ColorField label="Cor secundária" value={draft.secondary_color} onChange={v => update({ secondary_color: v })} />
                    <ColorField label="Cor de fundo" value={draft.background_color} onChange={v => update({ background_color: v })} />
                    <ColorField label="Cor de cabeçalhos" value={draft.header_color} onChange={v => update({ header_color: v })} />
                    <ColorField label="Cor de abas ativas" value={draft.tab_active_color} onChange={v => update({ tab_active_color: v })} />
                    <ColorField label="Cor de abas inativas" value={draft.tab_inactive_color} onChange={v => update({ tab_inactive_color: v })} />
                    <ColorField label="Cor de botões primários" value={draft.button_primary_color} onChange={v => update({ button_primary_color: v })} />
                    <ColorField label="Cor de botões secundários" value={draft.button_secondary_color} onChange={v => update({ button_secondary_color: v })} />
                    <ColorField label="Cor de hover" value={draft.hover_color} onChange={v => update({ hover_color: v })} />
                    <ColorField label="Cor de bordas" value={draft.border_color} onChange={v => update({ border_color: v })} />
                    <ColorField label="Cor de campos" value={draft.field_color} onChange={v => update({ field_color: v })} />
                    <ColorField label="Cor de tabelas" value={draft.table_color} onChange={v => update({ table_color: v })} />
                    <ColorField label="Cor de linhas alternadas" value={draft.table_alt_color} onChange={v => update({ table_alt_color: v })} />
                  </div>
                )}

                {/* TIPOGRAFIA */}
                {activeSection === 'tipografia' && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-foreground">Tipografia</h3>
                    {[
                      { label: 'Fonte do sistema', key: 'font_family' as keyof ThemeSettings },
                      { label: 'Fonte de títulos', key: 'font_family_titles' as keyof ThemeSettings },
                      { label: 'Fonte de tabelas', key: 'font_family_tables' as keyof ThemeSettings },
                    ].map(f => (
                      <div key={f.key}>
                        <Label className="text-xs">{f.label}</Label>
                        <Select value={draft[f.key] as string} onValueChange={v => update({ [f.key]: v })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {fontOptions.map(fo => <SelectItem key={fo} value={fo}>{fo}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Título da tela', key: 'font_size_title' },
                        { label: 'Título de abas', key: 'font_size_tab' },
                        { label: 'Texto normal', key: 'font_size_body' },
                        { label: 'Texto de tabela', key: 'font_size_table' },
                        { label: 'Botões', key: 'font_size_button' },
                      ].map(f => (
                        <div key={f.key}>
                          <Label className="text-xs">{f.label}</Label>
                          <Input className="h-7 text-xs" value={(draft as any)[f.key]} onChange={e => update({ [f.key]: e.target.value })} />
                        </div>
                      ))}
                      <div>
                        <Label className="text-xs">Espaçamento linhas</Label>
                        <Input className="h-7 text-xs" value={draft.line_height} onChange={e => update({ line_height: e.target.value })} />
                      </div>
                    </div>
                  </div>
                )}

                {/* LAYOUT */}
                {activeSection === 'layout' && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-foreground">Layout de Telas</h3>
                    <div>
                      <Label className="text-xs">Estilo de Layout</Label>
                      <Select value={draft.layout_density} onValueChange={v => {
                        const densityMap: Record<string, Partial<ThemeSettings>> = {
                          compact: { row_height: '32px', field_height: '32px', element_spacing: '8px', inner_padding: '12px' },
                          default: { row_height: '40px', field_height: '40px', element_spacing: '16px', inner_padding: '16px' },
                          spacious: { row_height: '48px', field_height: '48px', element_spacing: '24px', inner_padding: '24px' },
                        };
                        update({ layout_density: v, ...densityMap[v] });
                      }}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="compact">Layout compacto</SelectItem>
                          <SelectItem value="default">Layout padrão</SelectItem>
                          <SelectItem value="spacious">Layout espaçoso</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Disposição dos campos</Label>
                      <Select value={draft.field_layout} onValueChange={v => update({ field_layout: v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="side-by-side">Campos lado a lado</SelectItem>
                          <SelectItem value="stacked">Campos empilhados</SelectItem>
                          <SelectItem value="auto">Largura automática</SelectItem>
                          <SelectItem value="grid">Campos em grid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Colunas</Label>
                      <Select value={String(draft.field_columns)} onValueChange={v => update({ field_columns: Number(v) })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 coluna</SelectItem>
                          <SelectItem value="2">2 colunas</SelectItem>
                          <SelectItem value="3">3 colunas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs">Altura linhas</Label><Input className="h-7 text-xs" value={draft.row_height} onChange={e => update({ row_height: e.target.value })} /></div>
                      <div><Label className="text-xs">Altura campos</Label><Input className="h-7 text-xs" value={draft.field_height} onChange={e => update({ field_height: e.target.value })} /></div>
                      <div><Label className="text-xs">Espaçamento</Label><Input className="h-7 text-xs" value={draft.element_spacing} onChange={e => update({ element_spacing: e.target.value })} /></div>
                      <div><Label className="text-xs">Margens internas</Label><Input className="h-7 text-xs" value={draft.inner_padding} onChange={e => update({ inner_padding: e.target.value })} /></div>
                    </div>
                  </div>
                )}

                {/* BOTÕES */}
                {activeSection === 'botoes' && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-foreground">Botões</h3>
                    <div>
                      <Label className="text-xs">Estilo</Label>
                      <Select value={draft.button_style} onValueChange={v => update({ button_style: v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rounded">Arredondados</SelectItem>
                          <SelectItem value="square">Quadrados</SelectItem>
                          <SelectItem value="shadow">Com sombra</SelectItem>
                          <SelectItem value="flat">Flat</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Tamanho</Label>
                      <Select value={draft.button_size} onValueChange={v => update({ button_size: v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Pequeno</SelectItem>
                          <SelectItem value="medium">Médio</SelectItem>
                          <SelectItem value="large">Grande</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Posição padrão</Label>
                      <Select value={draft.button_position} onValueChange={v => update({ button_position: v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Esquerda</SelectItem>
                          <SelectItem value="center">Centro</SelectItem>
                          <SelectItem value="right">Direita</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Ordem dos botões</Label>
                      <Select value={draft.button_order} onValueChange={v => update({ button_order: v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="save-cancel">Salvar / Cancelar</SelectItem>
                          <SelectItem value="ok-cancel">OK / Cancelar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* TABELAS */}
                {activeSection === 'tabelas' && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-foreground">Tabelas e Listagens</h3>
                    <div>
                      <Label className="text-xs">Estilo de linhas</Label>
                      <Select value={draft.table_style} onValueChange={v => update({ table_style: v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="striped">Linhas alternadas</SelectItem>
                          <SelectItem value="hover">Linhas com hover</SelectItem>
                          <SelectItem value="compact">Linhas compactas</SelectItem>
                          <SelectItem value="large">Linhas grandes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-xs">Altura da linha</Label><Input className="h-7 text-xs" value={draft.table_row_height} onChange={e => update({ table_row_height: e.target.value })} /></div>
                    <div><Label className="text-xs">Tamanho da fonte</Label><Input className="h-7 text-xs" value={draft.font_size_table} onChange={e => update({ font_size_table: e.target.value })} /></div>
                    <div>
                      <Label className="text-xs">Bordas</Label>
                      <Select value={draft.table_borders} onValueChange={v => update({ table_borders: v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="horizontal">Horizontais</SelectItem>
                          <SelectItem value="all">Todas</SelectItem>
                          <SelectItem value="none">Nenhuma</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* ABAS */}
                {activeSection === 'abas' && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-foreground">Abas e Painéis</h3>
                    <div>
                      <Label className="text-xs">Tipo de aba</Label>
                      <Select value={draft.tab_style} onValueChange={v => update({ tab_style: v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="classic">Abas clássicas</SelectItem>
                          <SelectItem value="modern">Abas modernas</SelectItem>
                          <SelectItem value="minimal">Abas minimalistas</SelectItem>
                          <SelectItem value="browser">Abas estilo navegador</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Borda/Estilo</Label>
                      <Select value={draft.tab_border} onValueChange={v => update({ tab_border: v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="border">Com borda</SelectItem>
                          <SelectItem value="none">Sem borda</SelectItem>
                          <SelectItem value="underline">Com linha inferior</SelectItem>
                          <SelectItem value="colored">Com fundo colorido</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* DENSIDADE */}
                {activeSection === 'densidade' && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-foreground">Espaçamento e Densidade</h3>
                    <div>
                      <Label className="text-xs">Densidade global</Label>
                      <Select value={draft.layout_density} onValueChange={v => {
                        const map: Record<string, Partial<ThemeSettings>> = {
                          compact: { row_height: '32px', field_height: '32px', element_spacing: '8px', inner_padding: '12px', table_row_height: '32px' },
                          default: { row_height: '40px', field_height: '40px', element_spacing: '16px', inner_padding: '16px', table_row_height: '40px' },
                          spacious: { row_height: '48px', field_height: '48px', element_spacing: '24px', inner_padding: '24px', table_row_height: '48px' },
                        };
                        update({ layout_density: v, ...map[v] });
                      }}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="compact">Modo compacto</SelectItem>
                          <SelectItem value="default">Modo padrão</SelectItem>
                          <SelectItem value="spacious">Modo espaçoso</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs">Altura de linhas</Label><Input className="h-7 text-xs" value={draft.row_height} onChange={e => update({ row_height: e.target.value })} /></div>
                      <div><Label className="text-xs">Altura de botões</Label><Input className="h-7 text-xs" value={draft.field_height} onChange={e => update({ field_height: e.target.value })} /></div>
                      <div><Label className="text-xs">Altura de campos</Label><Input className="h-7 text-xs" value={draft.field_height} onChange={e => update({ field_height: e.target.value })} /></div>
                      <div><Label className="text-xs">Espaçamento</Label><Input className="h-7 text-xs" value={draft.element_spacing} onChange={e => update({ element_spacing: e.target.value })} /></div>
                    </div>
                  </div>
                )}

                {/* PRESETS */}
                {activeSection === 'presets' && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-foreground">Presets de Layout</h3>
                    <div className="grid grid-cols-1 gap-2">
                      {Object.entries(themePresets).map(([key, preset]) => (
                        <button
                          key={key}
                          onClick={() => applyPreset(key)}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary hover:bg-accent transition-colors text-left"
                        >
                          <div className="flex gap-1">
                            <div className="w-4 h-4 rounded-full" style={{ background: preset.primary_color }} />
                            <div className="w-4 h-4 rounded-full" style={{ background: preset.background_color }} />
                            <div className="w-4 h-4 rounded-full" style={{ background: preset.header_color }} />
                          </div>
                          <span className="text-sm font-medium">{preset.theme_name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* PREVIEW section */}
                {activeSection === 'preview' && (
                  <div className="text-sm text-muted-foreground">
                    A visualização ao vivo é exibida no painel à direita. Altere qualquer configuração para ver o resultado em tempo real.
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right: Live Preview */}
          <div className="flex-1 min-w-0 overflow-auto bg-muted/30 p-4">
            <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              Preview em tempo real
            </div>
            <div className="border rounded-lg overflow-hidden shadow-sm">
              <LivePreview theme={draft} />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
