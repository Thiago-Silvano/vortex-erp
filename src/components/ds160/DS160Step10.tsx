import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DS160StepProps } from './types';
import { FieldError, errClass } from './fieldError';

const SECURITY_GROUPS: { title: string; questions: { key: string; label: string }[] }[] = [
  {
    title: '🏥 Saúde',
    questions: [
      { key: 'doenca_contagiosa', label: 'Possui doença contagiosa de importância para a saúde pública?' },
      { key: 'transtorno_mental', label: 'Já teve transtorno mental ou comportamental?' },
      { key: 'dependente_drogas', label: 'Já foi dependente de drogas ou álcool?' },
    ],
  },
  {
    title: '⚖️ Antecedentes Criminais',
    questions: [
      { key: 'preso_condenado', label: 'Já foi preso ou condenado por algum crime?' },
      { key: 'trafico_drogas', label: 'Já traficou ou distribuiu substâncias controladas (drogas)?' },
    ],
  },
  {
    title: '💰 Crimes Financeiros',
    questions: [
      { key: 'lavagem_dinheiro', label: 'Já praticou lavagem de dinheiro?' },
    ],
  },
  {
    title: '👥 Tráfico e Exploração',
    questions: [
      { key: 'prostituicao', label: 'Já se envolveu com prostituição?' },
      { key: 'trafico_pessoas', label: 'Já se envolveu com tráfico de pessoas?' },
      { key: 'auxilio_trafico_pessoas', label: 'Já auxiliou ou facilitou o tráfico de pessoas?' },
    ],
  },
  {
    title: '🔒 Segurança Nacional',
    questions: [
      { key: 'atividade_terrorista', label: 'Já praticou ou planejou atividades terroristas?' },
      { key: 'apoio_terrorismo', label: 'Já apoiou financeiramente ou de outra forma grupos terroristas?' },
      { key: 'membro_org_terrorista', label: 'Já foi membro de organização terrorista?' },
      { key: 'genocidio', label: 'Já cometeu ou participou de genocídio?' },
      { key: 'tortura', label: 'Já praticou tortura?' },
      { key: 'violencia_extrajudicial', label: 'Já cometeu violência extrajudicial?' },
      { key: 'crianca_soldado', label: 'Já recrutou ou utilizou crianças como soldados?' },
      { key: 'violou_liberdade_religiosa', label: 'Já violou a liberdade religiosa de outras pessoas?' },
      { key: 'controle_populacional', label: 'Já impôs controle populacional de forma coercitiva?' },
      { key: 'transplante_orgaos', label: 'Já se envolveu com transplante de órgãos de forma coercitiva?' },
    ],
  },
  {
    title: '🇺🇸 Imigração',
    questions: [
      { key: 'visto_cancelado', label: 'Já teve seu Visto Americano Cancelado/Revogado?' },
      { key: 'deportacao', label: 'Esteve envolvido em deportação ou remoção dos EUA?' },
      { key: 'fraude', label: 'Cometeu fraude ou deturpou informações para obter visto ou entrada nos EUA?' },
      { key: 'excedeu_prazo', label: 'Já excedeu o prazo de permanência permitido nos EUA?' },
      { key: 'esta_negado', label: 'Seu pedido ESTA (Visa Waiver Program) foi negado?' },
      { key: 'renunciou_cidadania_impostos', label: 'Já renunciou à cidadania americana para evitar impostos?' },
      { key: 'violou_guarda_criancas', label: 'Já violou a guarda internacional de crianças?' },
      { key: 'votou_ilegalmente', label: 'Já votou ilegalmente nos EUA?' },
    ],
  },
];

export default function DS160Step10({ data, onChange, errors }: DS160StepProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-600 border-b border-slate-200 pb-3">10. Segurança e Antecedentes</h2>
      <p className="text-sm text-slate-500">Para as perguntas abaixo, selecione <strong>Não</strong> como padrão. Se selecionar <strong>Sim</strong>, um campo de texto será exibido para a explicação obrigatória.</p>
      {SECURITY_GROUPS.map(group => (
        <div key={group.title} className="space-y-4">
          <h3 className="font-semibold text-sm text-slate-700 bg-slate-100 rounded-lg px-3 py-2">{group.title}</h3>
          {group.questions.map(q => (
            <div key={q.key} className="space-y-2 pl-1">
              <Label className="text-sm">{q.label}</Label>
              <RadioGroup value={data[`seg_${q.key}`] || 'Não'} onValueChange={v => onChange(`seg_${q.key}`, v)} className="flex gap-4">
                <div className="flex items-center gap-2"><RadioGroupItem value="Não" id={`${q.key}_nao`} /><Label htmlFor={`${q.key}_nao`}>Não</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="Sim" id={`${q.key}_sim`} /><Label htmlFor={`${q.key}_sim`}>Sim</Label></div>
              </RadioGroup>
              {data[`seg_${q.key}`] === 'Sim' && (
                <>
                  <Textarea
                    value={data[`seg_${q.key}_explicacao`] || ''}
                    onChange={e => onChange(`seg_${q.key}_explicacao`, e.target.value)}
                    placeholder="Explicação obrigatória"
                    rows={2}
                    className={errClass(errors?.[`seg_${q.key}_explicacao`], 'border-amber-300 bg-amber-50/50')}
                  />
                  <FieldError msg={errors?.[`seg_${q.key}_explicacao`]} />
                </>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
