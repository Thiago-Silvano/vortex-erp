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

