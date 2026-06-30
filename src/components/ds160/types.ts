export interface DS160StepProps {
  data: Record<string, any>;
  onChange: (key: string, value: any) => void;
  errors?: Record<string, string>;
}

export const COUNTRIES = [
  'Brasil','Afeganistão','África do Sul','Albânia','Alemanha','Andorra','Angola','Anguilla',
  'Antígua e Barbuda','Arábia Saudita','Argélia','Argentina','Armênia','Aruba','Austrália',
  'Áustria','Azerbaijão','Bahamas','Bahrein','Bangladesh','Barbados','Bélgica','Belize',
  'Benin','Bermudas','Bielorrússia','Birmânia (Myanmar)','Bolívia','Bósnia e Herzegovina',
  'Botsuana','Brunei','Bulgária','Cabo Verde','Camarões','Camboja','Canadá','Cazaquistão',
  'Chade','Chile','China','Chipre','Cingapura','Colômbia','Comores','Congo','Coreia do Norte',
  'Coreia do Sul','Costa do Marfim','Costa Rica','Croácia','Cuba','Curaçao','Dinamarca',
  'Djibuti','Dominica','Egito','El Salvador','Emirados Árabes Unidos','Equador','Eritreia',
  'Eslováquia','Eslovênia','Espanha','Estados Unidos','Estônia','Etiópia','Fiji','Filipinas',
  'Finlândia','França','Gabão','Gâmbia','Gana','Geórgia','Gibraltar','Granada','Grécia',
  'Groenlândia','Guadalupe','Guam','Guatemala','Guiana','Guiana Francesa','Guiné',
  'Guiné Equatorial','Guiné-Bissau','Haiti','Honduras','Hong Kong','Hungria','Iêmen',
  'Índia','Indonésia','Irã','Iraque','Irlanda','Islândia','Israel','Itália','Jamaica',
  'Japão','Jordânia','Kosovo','Kuwait','Laos','Letônia','Líbano','Lesoto','Libéria',
  'Líbia','Liechtenstein','Lituânia','Luxemburgo','Macau','Macedônia do Norte','Madagascar',
  'Malásia','Malawi','Maldivas','Mali','Malta','Marrocos','Martinica','Maurício','Mauritânia',
  'Mayotte','México','Micronésia','Moçambique','Moldávia','Mônaco','Mongólia','Montenegro',
  'Montserrat','Nepal','Nicarágua','Níger','Nigéria','Noruega','Nova Caledônia',
  'Nova Zelândia','Omã','Países Baixos','Palau','Panamá','Papua-Nova Guiné','Paquistão',
  'Paraguai','Peru','Pitcairn','Polinésia Francesa','Polônia','Porto Rico','Portugal',
  'Qatar','Quênia','Quirguistão','Reino Unido','República Centro-Africana',
  'República Democrática do Congo','República Dominicana','República Tcheca','Romênia',
  'Ruanda','Rússia','Saint Pierre e Miquelon','Samoa','San Marino','São Tomé e Príncipe',
  'Senegal','Serra Leoa','Sérvia','Seychelles','Síria','Somália','Sri Lanka',
  'Suazilândia (Eswatini)','Sudão','Sudão do Sul','Suécia','Suíça','Suriname','Tailândia',
  'Taiwan','Tajiquistão','Tanzânia','Timor-Leste','Togo','Tonga','Trinidad e Tobago',
  'Tunísia','Turcomenistão','Turquia','Tuvalu','Ucrânia','Uganda','Uruguai','Uzbequistão',
  'Vanuatu','Vaticano','Venezuela','Vietnã','Zâmbia','Zimbábue',
];

export const ESTADO_CIVIL_OPTIONS = [
  { code: 'M', label: 'Casado(a)' },
  { code: 'C', label: 'União Estável' },
  { code: 'P', label: 'Parceria Civil/Doméstica' },
  { code: 'S', label: 'Solteiro(a)' },
  { code: 'W', label: 'Viúvo(a)' },
  { code: 'D', label: 'Divorciado(a)' },
  { code: 'L', label: 'Separado(a) Legalmente' },
  { code: 'O', label: 'Outro' },
] as const;

export const normalizarEstadoCivil = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const v = value.toLowerCase().replace(/\s+/g, ' ').trim();
  const found = ESTADO_CIVIL_OPTIONS.find(o => o.code === value.toUpperCase());
  if (found) return found.code;
  const map: Record<string, string> = {
    casado: 'M', casada: 'M', 'casado(a)': 'M',
    'união estável': 'C', 'uniao estavel': 'C', 'união estavel': 'C',
    'parceria civil/doméstica': 'P', 'parceria civil domestica': 'P', 'parceria civil/domestica': 'P',
    solteiro: 'S', solteira: 'S', 'solteiro(a)': 'S',
    viuvo: 'W', viúvo: 'W', viuva: 'W', viúva: 'W', 'viúvo(a)': 'W', 'viuvo(a)': 'W',
    divorciado: 'D', divorciada: 'D', 'divorciado(a)': 'D',
    'separado legalmente': 'L', 'separada legalmente': 'L', 'separado(a) legalmente': 'L',
    outro: 'O', outros: 'O',
  };
  return map[v] || value;
};

// Lista oficial de redes sociais do DS-160 (rótulo + código enviado no JSON)
export const REDES_SOCIAIS_OPTIONS = [
  { code: 'ASKF', label: 'ASK.FM' },
  { code: 'DUBN', label: 'DOUBAN' },
  { code: 'FCBK', label: 'FACEBOOK' },
  { code: 'FLKR', label: 'FLICKR' },
  { code: 'GOGL', label: 'GOOGLE+' },
  { code: 'INST', label: 'INSTAGRAM' },
  { code: 'LINK', label: 'LINKEDIN' },
  { code: 'MYSP', label: 'MYSPACE' },
  { code: 'PNTR', label: 'PINTEREST' },
  { code: 'QZNE', label: 'QZONE (QQ)' },
  { code: 'RDDT', label: 'REDDIT' },
  { code: 'SWBO', label: 'SINA WEIBO' },
  { code: 'TWBO', label: 'TENCENT WEIBO' },
  { code: 'TUMB', label: 'TUMBLR' },
  { code: 'TWIT', label: 'TWITTER' },
  { code: 'TWOO', label: 'TWOO' },
  { code: 'VINE', label: 'VINE' },
  { code: 'VKON', label: 'VKONTAKTE (VK)' },
  { code: 'YUKU', label: 'YOUKU' },
  { code: 'YTUB', label: 'YOUTUBE' },
  { code: 'NONE', label: 'NONE' },
] as const;

export const labelRedeSocial = (code: string): string =>
  REDES_SOCIAIS_OPTIONS.find(o => o.code === code)?.label || code;

// ── Tabelas de opções do prompt (value = o que vai no JSON) ────────────────
export interface Opt { value: string; label: string; }

export const SEXO_OPTIONS: Opt[] = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Feminino' },
];

export const PROPOSITO_OPTIONS: Opt[] = [
  { value: 'B1/B2', label: 'Turismo ou negócios (B1/B2)' },
];

export const PAGADOR_OPTIONS: Opt[] = [
  { value: 'S', label: 'Eu mesmo(a)' },
  { value: 'O', label: 'Outra pessoa' },
  { value: 'C', label: 'Empresa / empregador' },
];

export const PARENTESCO_ACOMP_OPTIONS: Opt[] = [
  { value: 'PARENT', label: 'Pai/Mãe' },
  { value: 'SPOUSE', label: 'Cônjuge' },
  { value: 'CHILD', label: 'Filho(a)' },
  { value: 'OTHER RELATIVE', label: 'Outro parente' },
  { value: 'FRIEND', label: 'Amigo(a)' },
  { value: 'BUSINESS ASSOCIATE', label: 'Sócio/Colega de trabalho' },
  { value: 'OTHER', label: 'Outro' },
];

export const PASSAPORTE_TIPO_OPTIONS: Opt[] = [
  { value: 'Regular', label: 'Comum/Regular' },
  { value: 'Official', label: 'Oficial' },
  { value: 'Diplomatic', label: 'Diplomático' },
  { value: 'Laissez-Passer', label: 'Laissez-Passer' },
  { value: 'Other', label: 'Outro' },
];

export const STATUS_EUA_OPTIONS: Opt[] = [
  { value: 'US_CITIZEN', label: 'Cidadão americano' },
  { value: 'LPR', label: 'Residente permanente (green card)' },
  { value: 'NONIMMIGRANT', label: 'Não-imigrante (visto temporário)' },
  { value: 'OTHER', label: 'Outro / Não sei' },
];

export const OCUPACAO_OPTIONS: Opt[] = [
  { value: 'A', label: 'Agricultura' },
  { value: 'AP', label: 'Artista / Artes cênicas' },
  { value: 'B', label: 'Negócios / Empresário' },
  { value: 'CM', label: 'Comunicação' },
  { value: 'CS', label: 'Ciência da computação / TI' },
  { value: 'C', label: 'Gastronomia / Alimentação' },
  { value: 'ED', label: 'Educação / Professor' },
  { value: 'EN', label: 'Engenharia' },
  { value: 'G', label: 'Governo / Serviço público' },
  { value: 'H', label: 'Do lar' },
  { value: 'LP', label: 'Advocacia / Jurídico' },
  { value: 'MH', label: 'Saúde / Medicina' },
  { value: 'M', label: 'Militar' },
  { value: 'NS', label: 'Ciências naturais' },
  { value: 'N', label: 'Desempregado(a)' },
  { value: 'PS', label: 'Ciências físicas' },
  { value: 'RV', label: 'Vocação religiosa' },
  { value: 'R', label: 'Pesquisa' },
  { value: 'RT', label: 'Aposentado(a)' },
  { value: 'SS', label: 'Ciências sociais' },
  { value: 'S', label: 'Estudante' },
  { value: 'O', label: 'Outro' },
];

// Ocupações que NÃO exigem dados de empregador
export const OCUPACAO_SEM_EMPREGADOR = ['H', 'N', 'RT'];

export const CONTATO_EUA_RELACAO_OPTIONS: Opt[] = [
  { value: 'RELATIVE', label: 'Parente' },
  { value: 'SPOUSE', label: 'Cônjuge' },
  { value: 'FRIEND', label: 'Amigo(a)' },
  { value: 'BUSINESS CONTACT', label: 'Sócio / Contato de negócios' },
  { value: 'HOTEL', label: 'Hotel' },
  { value: 'OTHER', label: 'Outro' },
];

// Estados dos EUA (sigla = valor enviado)
export const US_STATES: Opt[] = [
  { value: 'AL', label: 'Alabama (AL)' }, { value: 'AK', label: 'Alaska (AK)' },
  { value: 'AZ', label: 'Arizona (AZ)' }, { value: 'AR', label: 'Arkansas (AR)' },
  { value: 'CA', label: 'California (CA)' }, { value: 'CO', label: 'Colorado (CO)' },
  { value: 'CT', label: 'Connecticut (CT)' }, { value: 'DE', label: 'Delaware (DE)' },
  { value: 'DC', label: 'District of Columbia (DC)' }, { value: 'FL', label: 'Florida (FL)' },
  { value: 'GA', label: 'Georgia (GA)' }, { value: 'HI', label: 'Hawaii (HI)' },
  { value: 'ID', label: 'Idaho (ID)' }, { value: 'IL', label: 'Illinois (IL)' },
  { value: 'IN', label: 'Indiana (IN)' }, { value: 'IA', label: 'Iowa (IA)' },
  { value: 'KS', label: 'Kansas (KS)' }, { value: 'KY', label: 'Kentucky (KY)' },
  { value: 'LA', label: 'Louisiana (LA)' }, { value: 'ME', label: 'Maine (ME)' },
  { value: 'MD', label: 'Maryland (MD)' }, { value: 'MA', label: 'Massachusetts (MA)' },
  { value: 'MI', label: 'Michigan (MI)' }, { value: 'MN', label: 'Minnesota (MN)' },
  { value: 'MS', label: 'Mississippi (MS)' }, { value: 'MO', label: 'Missouri (MO)' },
  { value: 'MT', label: 'Montana (MT)' }, { value: 'NE', label: 'Nebraska (NE)' },
  { value: 'NV', label: 'Nevada (NV)' }, { value: 'NH', label: 'New Hampshire (NH)' },
  { value: 'NJ', label: 'New Jersey (NJ)' }, { value: 'NM', label: 'New Mexico (NM)' },
  { value: 'NY', label: 'New York (NY)' }, { value: 'NC', label: 'North Carolina (NC)' },
  { value: 'ND', label: 'North Dakota (ND)' }, { value: 'OH', label: 'Ohio (OH)' },
  { value: 'OK', label: 'Oklahoma (OK)' }, { value: 'OR', label: 'Oregon (OR)' },
  { value: 'PA', label: 'Pennsylvania (PA)' }, { value: 'RI', label: 'Rhode Island (RI)' },
  { value: 'SC', label: 'South Carolina (SC)' }, { value: 'SD', label: 'South Dakota (SD)' },
  { value: 'TN', label: 'Tennessee (TN)' }, { value: 'TX', label: 'Texas (TX)' },
  { value: 'UT', label: 'Utah (UT)' }, { value: 'VT', label: 'Vermont (VT)' },
  { value: 'VA', label: 'Virginia (VA)' }, { value: 'WA', label: 'Washington (WA)' },
  { value: 'WV', label: 'West Virginia (WV)' }, { value: 'WI', label: 'Wisconsin (WI)' },
  { value: 'WY', label: 'Wyoming (WY)' },
];

// Rótulos das 15 etapas (fonte única usada pela página pública e pelo editor)
export const DS160_STEP_LABELS = [
  'Dados Pessoais',
  'Nacionalidade',
  'Viagem',
  'Acompanhantes',
  'Viagens Anteriores',
  'Endereço e Contato',
  'Passaporte',
  'Contato nos EUA',
  'Família (Pais)',
  'Cônjuge',
  'Trabalho Atual',
  'Trabalho/Educação',
  'Informações Adicionais',
  'Antecedentes',
  'Revisão e Envio',
];

