export const CUR_YEAR = new Date().getFullYear();

export const MESES: { v: number; l: string }[] = [
  { v: 1,  l: 'Enero' },    { v: 2,  l: 'Febrero' },  { v: 3,  l: 'Marzo' },
  { v: 4,  l: 'Abril' },    { v: 5,  l: 'Mayo' },      { v: 6,  l: 'Junio' },
  { v: 7,  l: 'Julio' },    { v: 8,  l: 'Agosto' },    { v: 9,  l: 'Septiembre' },
  { v: 10, l: 'Octubre' },  { v: 11, l: 'Noviembre' }, { v: 12, l: 'Diciembre' },
];

export const MESES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export const ANOS = Array.from({ length: CUR_YEAR - 2019 }, (_, i) => 2020 + i);

export const CHART_COLORS = ['#263578','#676FF8','#C501E2','#4A9BE8','#4A4A6A','#9B6FF8'];

export const TOTALES_STYLE = 'bg-[#263578] text-white font-bold';
