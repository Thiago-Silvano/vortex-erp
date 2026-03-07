// UTC offsets for airports (standard time, no DST adjustment)
// Positive = east of UTC, negative = west of UTC
export const AIRPORT_UTC_OFFSETS: Record<string, number> = {
  // Brasil (UTC-3 unless noted)
  GRU: -3, CGH: -3, VCP: -3, GIG: -3, SDU: -3, BSB: -3, SSA: -3, FOR: -3,
  CNF: -3, CWB: -3, REC: -3, POA: -3, BEL: -3, FLN: -3, NAT: -3, MCZ: -3,
  JPA: -3, VIX: -3, IGU: -3, CGR: -4, CGB: -4, AJU: -3, BPS: -3, FEN: -2,
  SLZ: -3, THE: -3, GYN: -3, PMW: -3, PVH: -4, RBR: -5, MCP: -3, BVB: -4,
  STM: -3, IOS: -3, LDB: -3, MGF: -3, JOI: -3, NVT: -3, RAO: -3, UDI: -3,
  SJK: -3, CPV: -3, JDO: -3, IMP: -3, PPB: -3, MAO: -4,
  // Argentina (UTC-3)
  EZE: -3, AEP: -3, COR: -3, ROS: -3, MDZ: -3, BRC: -3, USH: -3, FTE: -3,
  SLA: -3, MDQ: -3, IGR: -3,
  // Chile (UTC-4 / UTC-3)
  SCL: -4, CCP: -4, PMC: -4, PUQ: -3, IPC: -6, CJC: -4,
  // Peru (UTC-5)
  LIM: -5, CUZ: -5, AQP: -5,
  // Colômbia (UTC-5)
  BOG: -5, MDE: -5, CTG: -5, CLO: -5, SMR: -5,
  // Uruguai (UTC-3)
  MVD: -3, PDP: -3,
  // Equador (UTC-5)
  UIO: -5, GYE: -5, GPS: -6,
  // Bolívia (UTC-4)
  LPB: -4, VVI: -4,
  // Paraguai (UTC-4)
  ASU: -4,
  // Venezuela (UTC-4)
  CCS: -4,
  // Guianas
  GEO: -4, PBM: -3, CAY: -3,
  // EUA
  JFK: -5, EWR: -5, LGA: -5, MIA: -5, FLL: -5, MCO: -5, TPA: -5,
  LAX: -8, SFO: -8, SJC: -8, OAK: -8, LAS: -8, SAN: -8, SNA: -8, PDX: -8,
  ORD: -6, MDW: -6, MSP: -6, STL: -6, AUS: -6, DFW: -6, IAH: -6, HOU: -6,
  MSY: -6, BNA: -6, IND: -5, DTW: -5, PIT: -5,
  IAD: -5, DCA: -5, BOS: -5, ATL: -5, CLT: -5, RDU: -5, PHL: -5, JAX: -5,
  SEA: -8, DEN: -7, PHX: -7, SLC: -7,
  HNL: -10, OGG: -10, ANC: -9,
  // Canadá
  YYZ: -5, YUL: -5, YOW: -5, YHZ: -4, YVR: -8, YYC: -7, YEG: -7,
  YQB: -5, YWG: -6,
  // México
  MEX: -6, CUN: -5, GDL: -6, MTY: -6, SJD: -7, PVR: -6, OAX: -6, MID: -6,
  // América Central
  GUA: -6, SJO: -6, LIR: -6, PTY: -5, BZE: -6, TGU: -6, SAP: -6, RTB: -6,
  SAL: -6, MGA: -6,
  // Europa
  LHR: 0, LGW: 0, STN: 0, LTN: 0, LCY: 0, MAN: 0, BHX: 0, BRS: 0, LPL: 0,
  CDG: 1, ORY: 1, NCE: 1, LYS: 1, MRS: 1, BOD: 1, TLS: 1, SXB: 1, MPL: 1,
  FCO: 1, CIA: 1, MXP: 1, LIN: 1, VCE: 1, FLR: 1, NAP: 1, TRN: 1, BLQ: 1,
  PSA: 1, VRN: 1, CTA: 1, PMO: 1, CAG: 1, OLB: 1, BRI: 1,
  MAD: 1, BCN: 1, AGP: 1, SVQ: 1, VLC: 1, BIO: 1, PMI: 1, IBZ: 1,
  TFS: 0, LPA: 0, ACE: 0, FUE: 0,
  LIS: 0, OPO: 0, FAO: 0, FNC: 0, PDL: -1,
  FRA: 1, MUC: 1, BER: 1, HAM: 1, DUS: 1, CGN: 1, STR: 1, HAJ: 1, NUE: 1,
  LEJ: 1, DRS: 1,
  AMS: 1, EIN: 1, RTM: 1,
  BRU: 1, CRL: 1,
  VIE: 1, SZG: 1, INN: 1,
  ZRH: 1, GVA: 1, BSL: 1,
  PRG: 1, BRQ: 1,
  BUD: 1,
  WAW: 1, KRK: 1, GDN: 1, WRO: 1,
  ATH: 2, JTR: 2, JMK: 2, HER: 2, RHO: 2, CFU: 2, SKG: 2, ZTH: 2,
  IST: 3, SAW: 3, AYT: 3, ADB: 3, DLM: 3, BJV: 3, ESB: 3, TZX: 3, GZT: 3,
  CPH: 1, AAL: 1, BLL: 1,
  OSL: 1, BGO: 1, TRD: 1, SVG: 1, TOS: 1,
  ARN: 1, GOT: 1, MMX: 1,
  HEL: 2, TMP: 2, OUL: 2,
  KEF: 0,
  DUB: 0, ORK: 0, SNN: 0, KNO: 0,
  EDI: 0, GLA: 0, ABZ: 0, BFS: 0,
  // Caribe
  NAS: -5, FPO: -5, GCM: -5, SXM: -4, POS: -4, BGI: -4, PUJ: -4, SDQ: -4,
  STI: -4, HAV: -5, VRA: -5, HOG: -5, KIN: -5, MBJ: -5, AUA: -4, CUR: -4,
  BON: -4, SBH: -4, PTP: -4, FDF: -4, UVF: -4,
  SJU: -4, STT: -4, STX: -4,
  // Ásia
  DXB: 4, AUH: 4, SHJ: 4,
  DOH: 3,
  RUH: 3, JED: 3, MED: 3,
  TLV: 2, AMM: 3, BEY: 2,
  NRT: 9, HND: 9, KIX: 9, NGO: 9, CTS: 9, FUK: 9, OKA: 9,
  ICN: 9, GMP: 9, PUS: 9, CJU: 9,
  PEK: 8, PVG: 8, SHA: 8, CAN: 8, CTU: 8, SZX: 8, HGH: 8,
  WUH: 8, XIY: 8, NKG: 8, CKG: 8, KMG: 8,
  HKG: 8, MFM: 8,
  TPE: 8,
  SIN: 8,
  KUL: 8, PEN: 8, LGK: 8, BKI: 8, KCH: 8,
  BKK: 7, CNX: 7, HKT: 7, USM: 7, KBV: 7,
  SGN: 7, HAN: 7, DAD: 7, PQC: 7,
  CGK: 7, DPS: 8, SUB: 7, JOG: 7, UPG: 8,
  MNL: 8, CEB: 8,
  RGN: 6.5, DEL: 5.5, BOM: 5.5, BLR: 5.5, MAA: 5.5, CCU: 5.5, HYD: 5.5,
  COK: 5.5, GOI: 5.5, AMD: 5.5, JAI: 5.5, GAU: 5.5, IXC: 5.5,
  CMB: 5.5, MLE: 5, KTM: 5.75,
  DAC: 6, ISB: 5, LHE: 5, KHI: 5,
  TAS: 5, ALA: 6, TSE: 6, TBS: 4, EVN: 4, BAK: 4,
  // Oceania
  SYD: 11, MEL: 11, BNE: 10, PER: 8, ADL: 10.5, OOL: 10, CNS: 10,
  AKL: 13, CHC: 13, WLG: 13, ZQN: 13,
  NAN: 12, PPT: -10, APW: 13, RAR: -10, TBU: 13,
  // África
  JNB: 2, CPT: 2, DUR: 2, PLZ: 2,
  NBO: 3, MBA: 3, DAR: 3, ZNZ: 3,
  ADD: 3, KGL: 2, EBB: 3,
  CMN: 1, RAK: 1, FEZ: 1, AGA: 1, TNG: 1, ESS: 1, NDR: 1,
  TUN: 1,
  ALG: 1,
  CAI: 2, HRG: 2, SSH: 2, LXR: 2, ASW: 2,
  LOS: 1, ABV: 1, ACC: 0, DSS: 0,
  MRU: 4, SEZ: 4, TNR: 3,
  WDH: 2, MPM: 2, HRE: 2,
};

/**
 * Get UTC offset for an airport code.
 * Extracts the IATA code from formats like "São Paulo (GRU) - Aeroporto de Guarulhos"
 */
export function getAirportUtcOffset(airportString: string): number | null {
  const match = airportString.match(/\(([A-Z]{3})\)/);
  const code = match ? match[1] : airportString.trim().toUpperCase();
  return AIRPORT_UTC_OFFSETS[code] ?? null;
}
