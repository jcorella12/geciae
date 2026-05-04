/* global React */
// Iconografía minimal lineart, stroke 1.5
const Ic = ({ d, size = 14, viewBox = "0 0 24 24", stroke = 1.5 }) => (
  <svg className="ic" width={size} height={size} viewBox={viewBox} fill="none"
    stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);

const Icons = {
  dashboard: <Ic d={<><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></>} />,
  obras: <Ic d={<><path d="M3 21h18"/><path d="M5 21V8l7-4 7 4v13"/><rect x="9" y="12" width="6" height="9"/></>} />,
  presupuesto: <Ic d={<><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>} />,
  oc: <Ic d={<><path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/></>} />,
  ot: <Ic d={<><path d="M11 4H4v7l9 9 7-7-9-9z"/><circle cx="7.5" cy="7.5" r="1"/></>} />,
  inventario: <Ic d={<><path d="M21 8L12 3 3 8l9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></>} />,
  rrhh: <Ic d={<><circle cx="9" cy="8" r="3.5"/><path d="M2 21c0-3.5 3-6 7-6s7 2.5 7 6"/><circle cx="17" cy="6" r="2.5"/><path d="M22 17c0-2.5-2-4-5-4"/></>} />,
  reportes: <Ic d={<><path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-5"/></>} />,
  aprobaciones: <Ic d={<><path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></>} />,
  proveedores: <Ic d={<><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 12l9 4 9-4M3 17l9 4 9-4"/></>} />,
  cursos: <Ic d={<><path d="M22 7L12 12 2 7l10-5 10 5z"/><path d="M6 9.5V14c0 1.5 3 3 6 3s6-1.5 6-3V9.5"/></>} />,
  search: <Ic d={<><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/></>} />,
  bell: <Ic d={<><path d="M6 9a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8z"/><path d="M10 21a2 2 0 0 0 4 0"/></>} />,
  plus: <Ic d={<><path d="M12 5v14M5 12h14"/></>} />,
  filter: <Ic d={<><path d="M3 4h18l-7 9v5l-4 2v-7z"/></>} />,
  download: <Ic d={<><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></>} />,
  more: <Ic d={<><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>} />,
  arrowUp: <Ic d={<><path d="M7 14l5-5 5 5"/></>} size={12} />,
  arrowDown: <Ic d={<><path d="M7 10l5 5 5-5"/></>} size={12} />,
  arrowRight: <Ic d={<><path d="M5 12h14M13 6l6 6-6 6"/></>} />,
  check: <Ic d={<><path d="M5 12l5 5L20 7"/></>} />,
  clock: <Ic d={<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>} />,
  calendar: <Ic d={<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></>} />,
  settings: <Ic d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>} />,
  alert: <Ic d={<><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></>} />,
  trend: <Ic d={<><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></>} />,
  building: <Ic d={<><rect x="4" y="2" width="16" height="20"/><path d="M9 6h2M13 6h2M9 10h2M13 10h2M9 14h2M13 14h2M10 22v-4h4v4"/></>} />,
  chevronDown: <Ic d={<><path d="M6 9l6 6 6-6"/></>} size={12} />,
};

window.Icons = Icons;
window.Ic = Ic;
