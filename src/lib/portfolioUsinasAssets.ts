/**
 * Placeholders vetoriais (SVG Base64) das usinas de referência do portfólio Delfos Solar.
 * Seguem o padrão de assets Base64 embutidos no gerador da proposta (sem caminhos relativos).
 */

function svgToBase64(svgString: string): string {
  // Converte SVG UTF-8 para base64 seguro em Node/Vite e browsers
  if (typeof btoa === 'function') {
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString.trim())))
  }
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svgString.trim())
}

/**
 * 1. Usina Solar Residencial — Telhado Colonial Cerâmico em Erechim / RS
 */
const SVG_USINA_RESIDENCIAL = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" width="100%" height="100%">
  <defs>
    <linearGradient id="ur-sky" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8" />
      <stop offset="60%" stop-color="#BAE6FD" />
      <stop offset="100%" stop-color="#E0F2FE" />
    </linearGradient>
    <linearGradient id="ur-sun" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE047" />
      <stop offset="100%" stop-color="#F59E0B" />
    </linearGradient>
    <linearGradient id="ur-roof" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#B45309" />
      <stop offset="50%" stop-color="#9A3412" />
      <stop offset="100%" stop-color="#7C2D12" />
    </linearGradient>
    <linearGradient id="ur-pv" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E3A8A" />
      <stop offset="50%" stop-color="#1E40AF" />
      <stop offset="100%" stop-color="#0F172A" />
    </linearGradient>
    <filter id="ur-sh" x="-10%" y="-10%" width="125%" height="125%">
      <feDropShadow dx="2" dy="3" stdDeviation="2" flood-color="#000" flood-opacity="0.35" />
    </filter>
  </defs>
  <rect width="400" height="240" fill="url(#ur-sky)" />
  <!-- Sol Radiante -->
  <circle cx="340" cy="50" r="28" fill="url(#ur-sun)" opacity="0.9" />
  <circle cx="340" cy="50" r="38" fill="none" stroke="#FDE047" stroke-width="2" stroke-dasharray="4,4" opacity="0.6" />
  <!-- Casa / Fachada Superior -->
  <polygon points="40,240 40,160 200,90 360,160 360,240" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="2" />
  <!-- Telhado com caimento -->
  <polygon points="20,165 200,80 380,165 365,178 200,98 35,178" fill="#451A03" />
  <polygon points="35,168 200,92 365,168 350,172 200,98 50,172" fill="url(#ur-roof)" />
  <!-- Telhas texturizadas -->
  <line x1="90" y1="145" x2="80" y2="170" stroke="#78350F" stroke-width="1.5" />
  <line x1="140" y1="122" x2="135" y2="170" stroke="#78350F" stroke-width="1.5" />
  <line x1="260" y1="122" x2="265" y2="170" stroke="#78350F" stroke-width="1.5" />
  <line x1="310" y1="145" x2="320" y2="170" stroke="#78350F" stroke-width="1.5" />
  <!-- Conjunto de Painéis Solares no Telhado (Arranjo 2x5) -->
  <g filter="url(#ur-sh)" transform="translate(68, 108)">
    <g transform="skewX(-14)">
      <!-- Fileira 1 -->
      <rect x="0" y="0" width="38" height="26" rx="2" fill="url(#ur-pv)" stroke="#93C5FD" stroke-width="1" />
      <rect x="42" y="0" width="38" height="26" rx="2" fill="url(#ur-pv)" stroke="#93C5FD" stroke-width="1" />
      <rect x="84" y="0" width="38" height="26" rx="2" fill="url(#ur-pv)" stroke="#93C5FD" stroke-width="1" />
      <rect x="126" y="0" width="38" height="26" rx="2" fill="url(#ur-pv)" stroke="#93C5FD" stroke-width="1" />
      <rect x="168" y="0" width="38" height="26" rx="2" fill="url(#ur-pv)" stroke="#93C5FD" stroke-width="1" />
      <rect x="210" y="0" width="38" height="26" rx="2" fill="url(#ur-pv)" stroke="#93C5FD" stroke-width="1" />
      <!-- Fileira 2 -->
      <rect x="0" y="30" width="38" height="26" rx="2" fill="url(#ur-pv)" stroke="#93C5FD" stroke-width="1" />
      <rect x="42" y="30" width="38" height="26" rx="2" fill="url(#ur-pv)" stroke="#93C5FD" stroke-width="1" />
      <rect x="84" y="30" width="38" height="26" rx="2" fill="url(#ur-pv)" stroke="#93C5FD" stroke-width="1" />
      <rect x="126" y="30" width="38" height="26" rx="2" fill="url(#ur-pv)" stroke="#93C5FD" stroke-width="1" />
      <rect x="168" y="30" width="38" height="26" rx="2" fill="url(#ur-pv)" stroke="#93C5FD" stroke-width="1" />
      <rect x="210" y="30" width="38" height="26" rx="2" fill="url(#ur-pv)" stroke="#93C5FD" stroke-width="1" />
      <!-- Células internas em reflexo metálico -->
      <line x1="0" y1="13" x2="248" y2="13" stroke="#60A5FA" stroke-width="0.5" stroke-opacity="0.7" />
      <line x1="0" y1="43" x2="248" y2="43" stroke="#60A5FA" stroke-width="0.5" stroke-opacity="0.7" />
      <line x1="19" y1="0" x2="19" y2="56" stroke="#60A5FA" stroke-width="0.5" stroke-opacity="0.7" />
      <line x1="61" y1="0" x2="61" y2="56" stroke="#60A5FA" stroke-width="0.5" stroke-opacity="0.7" />
      <line x1="103" y1="0" x2="103" y2="56" stroke="#60A5FA" stroke-width="0.5" stroke-opacity="0.7" />
      <line x1="145" y1="0" x2="145" y2="56" stroke="#60A5FA" stroke-width="0.5" stroke-opacity="0.7" />
      <line x1="187" y1="0" x2="187" y2="56" stroke="#60A5FA" stroke-width="0.5" stroke-opacity="0.7" />
      <line x1="229" y1="0" x2="229" y2="56" stroke="#60A5FA" stroke-width="0.5" stroke-opacity="0.7" />
    </g>
  </g>
  <!-- Detalhe da Fachada com janela moderna e porta -->
  <rect x="80" y="185" width="45" height="35" rx="3" fill="#E0F2FE" stroke="#0284C7" stroke-width="1.5" />
  <line x1="102" y1="185" x2="102" y2="220" stroke="#0284C7" stroke-width="1.5" />
  <rect x="275" y="185" width="45" height="35" rx="3" fill="#E0F2FE" stroke="#0284C7" stroke-width="1.5" />
  <line x1="297" y1="185" x2="297" y2="220" stroke="#0284C7" stroke-width="1.5" />
  <rect x="180" y="180" width="40" height="60" rx="3" fill="#0F172A" />
  <!-- Selo Residencial Delfos -->
  <g transform="translate(14, 14)">
    <rect x="0" y="0" width="138" height="24" rx="12" fill="rgba(15, 23, 42, 0.75)" />
    <circle cx="12" cy="12" r="5" fill="#22C55E" />
    <text x="24" y="16" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="10" font-weight="bold">RESIDENCIAL</text>
  </g>
</svg>`

/**
 * 2. Usina Solar Comercial — Telhado Metálico / Pavilhão Comercial em Passo Fundo / RS
 */
const SVG_USINA_COMERCIAL = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" width="100%" height="100%">
  <defs>
    <linearGradient id="uc-sky" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0284C7" />
      <stop offset="70%" stop-color="#7DD3FC" />
      <stop offset="100%" stop-color="#E0F2FE" />
    </linearGradient>
    <linearGradient id="uc-metal" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#64748B" />
      <stop offset="50%" stop-color="#475569" />
      <stop offset="100%" stop-color="#334155" />
    </linearGradient>
    <linearGradient id="uc-pv" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E3A8A" />
      <stop offset="60%" stop-color="#1D4ED8" />
      <stop offset="100%" stop-color="#0A2540" />
    </linearGradient>
    <filter id="uc-sh" x="-10%" y="-10%" width="125%" height="125%">
      <feDropShadow dx="2" dy="3" stdDeviation="2" flood-color="#000" flood-opacity="0.3" />
    </filter>
  </defs>
  <rect width="400" height="240" fill="url(#uc-sky)" />
  <!-- Edifício Comercial / Pavilhão -->
  <polygon points="30,240 30,120 370,120 370,240" fill="#F1F5F9" stroke="#94A3B8" stroke-width="2" />
  <!-- Telhado em Águas Suaves / Laje Comercial -->
  <polygon points="15,120 200,85 385,120 370,135 200,100 30,135" fill="#1E293B" />
  <polygon points="20,120 200,90 380,120" fill="url(#uc-metal)" />
  <!-- Linhas Trapezoidais do Telhado Metálico -->
  <line x1="60" y1="120" x2="80" y2="95" stroke="#334155" stroke-width="1.2" opacity="0.6" />
  <line x1="110" y1="120" x2="125" y2="92" stroke="#334155" stroke-width="1.2" opacity="0.6" />
  <line x1="160" y1="120" x2="170" y2="90" stroke="#334155" stroke-width="1.2" opacity="0.6" />
  <line x1="240" y1="120" x2="230" y2="90" stroke="#334155" stroke-width="1.2" opacity="0.6" />
  <line x1="290" y1="120" x2="275" y2="92" stroke="#334155" stroke-width="1.2" opacity="0.6" />
  <line x1="340" y1="120" x2="320" y2="95" stroke="#334155" stroke-width="1.2" opacity="0.6" />
  <!-- Grande Arranjo Fotovoltaico Comercial (3x7 módulos) -->
  <g filter="url(#uc-sh)" transform="translate(48, 96)">
    <g transform="skewX(-16)">
      <!-- Fileira 1 -->
      <rect x="0" y="0" width="36" height="20" rx="1.5" fill="url(#uc-pv)" stroke="#93C5FD" stroke-width="0.8" />
      <rect x="40" y="0" width="36" height="20" rx="1.5" fill="url(#uc-pv)" stroke="#93C5FD" stroke-width="0.8" />
      <rect x="80" y="0" width="36" height="20" rx="1.5" fill="url(#uc-pv)" stroke="#93C5FD" stroke-width="0.8" />
      <rect x="120" y="0" width="36" height="20" rx="1.5" fill="url(#uc-pv)" stroke="#93C5FD" stroke-width="0.8" />
      <rect x="160" y="0" width="36" height="20" rx="1.5" fill="url(#uc-pv)" stroke="#93C5FD" stroke-width="0.8" />
      <rect x="200" y="0" width="36" height="20" rx="1.5" fill="url(#uc-pv)" stroke="#93C5FD" stroke-width="0.8" />
      <rect x="240" y="0" width="36" height="20" rx="1.5" fill="url(#uc-pv)" stroke="#93C5FD" stroke-width="0.8" />
      <!-- Fileira 2 -->
      <rect x="0" y="23" width="36" height="20" rx="1.5" fill="url(#uc-pv)" stroke="#93C5FD" stroke-width="0.8" />
      <rect x="40" y="23" width="36" height="20" rx="1.5" fill="url(#uc-pv)" stroke="#93C5FD" stroke-width="0.8" />
      <rect x="80" y="23" width="36" height="20" rx="1.5" fill="url(#uc-pv)" stroke="#93C5FD" stroke-width="0.8" />
      <rect x="120" y="23" width="36" height="20" rx="1.5" fill="url(#uc-pv)" stroke="#93C5FD" stroke-width="0.8" />
      <rect x="160" y="23" width="36" height="20" rx="1.5" fill="url(#uc-pv)" stroke="#93C5FD" stroke-width="0.8" />
      <rect x="200" y="23" width="36" height="20" rx="1.5" fill="url(#uc-pv)" stroke="#93C5FD" stroke-width="0.8" />
      <rect x="240" y="23" width="36" height="20" rx="1.5" fill="url(#uc-pv)" stroke="#93C5FD" stroke-width="0.8" />
      <!-- Fileira 3 -->
      <rect x="0" y="46" width="36" height="20" rx="1.5" fill="url(#uc-pv)" stroke="#93C5FD" stroke-width="0.8" />
      <rect x="40" y="46" width="36" height="20" rx="1.5" fill="url(#uc-pv)" stroke="#93C5FD" stroke-width="0.8" />
      <rect x="80" y="46" width="36" height="20" rx="1.5" fill="url(#uc-pv)" stroke="#93C5FD" stroke-width="0.8" />
      <rect x="120" y="46" width="36" height="20" rx="1.5" fill="url(#uc-pv)" stroke="#93C5FD" stroke-width="0.8" />
      <rect x="160" y="46" width="36" height="20" rx="1.5" fill="url(#uc-pv)" stroke="#93C5FD" stroke-width="0.8" />
      <rect x="200" y="46" width="36" height="20" rx="1.5" fill="url(#uc-pv)" stroke="#93C5FD" stroke-width="0.8" />
      <rect x="240" y="46" width="36" height="20" rx="1.5" fill="url(#uc-pv)" stroke="#93C5FD" stroke-width="0.8" />
    </g>
  </g>
  <!-- Fachada Comercial / Vitrine de Vidro -->
  <g transform="translate(50, 180)">
    <rect x="0" y="0" width="70" height="50" fill="#E2E8F0" stroke="#0284C7" stroke-width="1.5" />
    <rect x="85" y="0" width="130" height="50" fill="#0284C7" fill-opacity="0.15" stroke="#0284C7" stroke-width="1.5" />
    <line x1="150" y1="0" x2="150" y2="50" stroke="#0284C7" stroke-width="1.5" />
    <rect x="230" y="0" width="70" height="50" fill="#E2E8F0" stroke="#0284C7" stroke-width="1.5" />
  </g>
  <!-- Selo Comercial Delfos -->
  <g transform="translate(14, 14)">
    <rect x="0" y="0" width="130" height="24" rx="12" fill="rgba(15, 23, 42, 0.75)" />
    <circle cx="12" cy="12" r="5" fill="#3B82F6" />
    <text x="24" y="16" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="10" font-weight="bold">COMERCIAL</text>
  </g>
</svg>`

/**
 * 3. Usina Solar Industrial — Galpão de Estrutura Metálica em Frederico Westphalen / RS
 */
const SVG_USINA_INDUSTRIAL = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" width="100%" height="100%">
  <defs>
    <linearGradient id="ui-sky" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#475569" />
      <stop offset="70%" stop-color="#94A3B8" />
      <stop offset="100%" stop-color="#CBD5E1" />
    </linearGradient>
    <linearGradient id="ui-roof" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#334155" />
      <stop offset="100%" stop-color="#1E293B" />
    </linearGradient>
    <linearGradient id="ui-pv" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#172554" />
      <stop offset="50%" stop-color="#1E3A8A" />
      <stop offset="100%" stop-color="#0284C7" />
    </linearGradient>
    <filter id="ui-sh" x="-10%" y="-10%" width="125%" height="125%">
      <feDropShadow dx="2" dy="4" stdDeviation="3" flood-color="#000" flood-opacity="0.4" />
    </filter>
  </defs>
  <rect width="400" height="240" fill="url(#ui-sky)" />
  <!-- Galpão Industrial em Dente de Serra / Shed -->
  <polygon points="20,240 20,130 180,95 200,130 360,95 380,130 380,240" fill="#E2E8F0" stroke="#64748B" stroke-width="2" />
  <polygon points="10,130 180,90 200,130 190,135 180,98 20,135" fill="url(#ui-roof)" />
  <polygon points="190,130 360,90 380,130 370,135 360,98 200,135" fill="url(#ui-roof)" />
  <!-- Pilares e Portões Industriais -->
  <rect x="50" y="170" width="55" height="70" rx="2" fill="#475569" />
  <line x1="50" y1="185" x2="105" y2="185" stroke="#334155" stroke-width="1.5" />
  <line x1="50" y1="200" x2="105" y2="200" stroke="#334155" stroke-width="1.5" />
  <line x1="50" y1="215" x2="105" y2="215" stroke="#334155" stroke-width="1.5" />
  <rect x="230" y="170" width="55" height="70" rx="2" fill="#475569" />
  <line x1="230" y1="185" x2="285" y2="185" stroke="#334155" stroke-width="1.5" />
  <line x1="230" y1="200" x2="285" y2="200" stroke="#334155" stroke-width="1.5" />
  <line x1="230" y1="215" x2="285" y2="215" stroke="#334155" stroke-width="1.5" />
  <!-- Grande Parque Fotovoltaico de Telhado Industrial (Alta Potência) -->
  <g filter="url(#ui-sh)" transform="translate(30, 96)">
    <g transform="skewX(-18)">
      <!-- Shed 1 -->
      <rect x="0" y="0" width="30" height="24" rx="1.5" fill="url(#ui-pv)" stroke="#38BDF8" stroke-width="0.8" />
      <rect x="33" y="0" width="30" height="24" rx="1.5" fill="url(#ui-pv)" stroke="#38BDF8" stroke-width="0.8" />
      <rect x="66" y="0" width="30" height="24" rx="1.5" fill="url(#ui-pv)" stroke="#38BDF8" stroke-width="0.8" />
      <rect x="99" y="0" width="30" height="24" rx="1.5" fill="url(#ui-pv)" stroke="#38BDF8" stroke-width="0.8" />
      <rect x="132" y="0" width="30" height="24" rx="1.5" fill="url(#ui-pv)" stroke="#38BDF8" stroke-width="0.8" />
      <!-- Shed 2 -->
      <rect x="180" y="0" width="30" height="24" rx="1.5" fill="url(#ui-pv)" stroke="#38BDF8" stroke-width="0.8" />
      <rect x="213" y="0" width="30" height="24" rx="1.5" fill="url(#ui-pv)" stroke="#38BDF8" stroke-width="0.8" />
      <rect x="246" y="0" width="30" height="24" rx="1.5" fill="url(#ui-pv)" stroke="#38BDF8" stroke-width="0.8" />
      <rect x="279" y="0" width="30" height="24" rx="1.5" fill="url(#ui-pv)" stroke="#38BDF8" stroke-width="0.8" />
      <rect x="312" y="0" width="30" height="24" rx="1.5" fill="url(#ui-pv)" stroke="#38BDF8" stroke-width="0.8" />
    </g>
  </g>
  <!-- Selo Industrial Delfos -->
  <g transform="translate(14, 14)">
    <rect x="0" y="0" width="130" height="24" rx="12" fill="rgba(15, 23, 42, 0.75)" />
    <circle cx="12" cy="12" r="5" fill="#EAB308" />
    <text x="24" y="16" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="10" font-weight="bold">INDUSTRIAL</text>
  </g>
</svg>`

/**
 * 4. Usina Solar Rural / Agropecuária — Solo / Galpão Agro em Chapecó / SC
 */
const SVG_USINA_RURAL = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" width="100%" height="100%">
  <defs>
    <linearGradient id="urur-sky" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0284C7" />
      <stop offset="60%" stop-color="#38BDF8" />
      <stop offset="100%" stop-color="#BAE6FD" />
    </linearGradient>
    <linearGradient id="urur-ground" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#15803D" />
      <stop offset="50%" stop-color="#166534" />
      <stop offset="100%" stop-color="#14532D" />
    </linearGradient>
    <linearGradient id="urur-pv" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E3A8A" />
      <stop offset="50%" stop-color="#2563EB" />
      <stop offset="100%" stop-color="#0F172A" />
    </linearGradient>
    <filter id="urur-sh" x="-10%" y="-10%" width="125%" height="125%">
      <feDropShadow dx="3" dy="4" stdDeviation="3" flood-color="#000" flood-opacity="0.35" />
    </filter>
  </defs>
  <rect width="400" height="240" fill="url(#urur-sky)" />
  <!-- Colinas Suaves do Campo Gaúcho / Catarinense -->
  <path d="M 0,160 Q 120,130 240,150 T 400,140 L 400,240 L 0,240 Z" fill="url(#urur-ground)" />
  <!-- Galpão Agro ao Fundo (Silos / Estábulo) -->
  <polygon points="280,150 280,120 340,95 400,120 400,150" fill="#DC2626" stroke="#991B1B" stroke-width="1.5" />
  <rect x="290" y="125" width="20" height="25" fill="#FFFFFF" opacity="0.8" />
  <!-- Usina de Solo com Estrutura Biposte em Aço Galvanizado -->
  <g filter="url(#urur-sh)" transform="translate(30, 110)">
    <!-- Postes de Fixação no Solo -->
    <line x1="40" y1="70" x2="40" y2="110" stroke="#94A3B8" stroke-width="4" stroke-linecap="round" />
    <line x1="120" y1="70" x2="120" y2="110" stroke="#94A3B8" stroke-width="4" stroke-linecap="round" />
    <line x1="200" y1="70" x2="200" y2="110" stroke="#94A3B8" stroke-width="4" stroke-linecap="round" />
    <line x1="280" y1="70" x2="280" y2="110" stroke="#94A3B8" stroke-width="4" stroke-linecap="round" />
    <!-- Mesa Inclinada (Ângulo Solar 24°) -->
    <g transform="skewX(-20)">
      <!-- Fileira 1 -->
      <rect x="20" y="20" width="38" height="26" rx="2" fill="url(#urur-pv)" stroke="#93C5FD" stroke-width="1" />
      <rect x="62" y="20" width="38" height="26" rx="2" fill="url(#urur-pv)" stroke="#93C5FD" stroke-width="1" />
      <rect x="104" y="20" width="38" height="26" rx="2" fill="url(#urur-pv)" stroke="#93C5FD" stroke-width="1" />
      <rect x="146" y="20" width="38" height="26" rx="2" fill="url(#urur-pv)" stroke="#93C5FD" stroke-width="1" />
      <rect x="188" y="20" width="38" height="26" rx="2" fill="url(#urur-pv)" stroke="#93C5FD" stroke-width="1" />
      <rect x="230" y="20" width="38" height="26" rx="2" fill="url(#urur-pv)" stroke="#93C5FD" stroke-width="1" />
      <rect x="272" y="20" width="38" height="26" rx="2" fill="url(#urur-pv)" stroke="#93C5FD" stroke-width="1" />
      <!-- Fileira 2 -->
      <rect x="20" y="50" width="38" height="26" rx="2" fill="url(#urur-pv)" stroke="#93C5FD" stroke-width="1" />
      <rect x="62" y="50" width="38" height="26" rx="2" fill="url(#urur-pv)" stroke="#93C5FD" stroke-width="1" />
      <rect x="104" y="50" width="38" height="26" rx="2" fill="url(#urur-pv)" stroke="#93C5FD" stroke-width="1" />
      <rect x="146" y="50" width="38" height="26" rx="2" fill="url(#urur-pv)" stroke="#93C5FD" stroke-width="1" />
      <rect x="188" y="50" width="38" height="26" rx="2" fill="url(#urur-pv)" stroke="#93C5FD" stroke-width="1" />
      <rect x="230" y="50" width="38" height="26" rx="2" fill="url(#urur-pv)" stroke="#93C5FD" stroke-width="1" />
      <rect x="272" y="50" width="38" height="26" rx="2" fill="url(#urur-pv)" stroke="#93C5FD" stroke-width="1" />
    </g>
  </g>
  <!-- Selo Rural Delfos -->
  <g transform="translate(14, 14)">
    <rect x="0" y="0" width="110" height="24" rx="12" fill="rgba(15, 23, 42, 0.75)" />
    <circle cx="12" cy="12" r="5" fill="#16A34A" />
    <text x="24" y="16" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="10" font-weight="bold">RURAL</text>
  </g>
</svg>`

/**
 * 5. Usina Solar Comercial — Telhado Metálico em Caxias do Sul / RS
 */
const SVG_USINA_COMERCIAL_2 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" width="100%" height="100%">
  <defs>
    <linearGradient id="uc2-sky" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0369A1" />
      <stop offset="60%" stop-color="#38BDF8" />
      <stop offset="100%" stop-color="#E0F2FE" />
    </linearGradient>
    <linearGradient id="uc2-roof" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#334155" />
      <stop offset="100%" stop-color="#1E293B" />
    </linearGradient>
    <linearGradient id="uc2-pv" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E3A8A" />
      <stop offset="50%" stop-color="#1D4ED8" />
      <stop offset="100%" stop-color="#0F172A" />
    </linearGradient>
    <filter id="uc2-sh" x="-10%" y="-10%" width="125%" height="125%">
      <feDropShadow dx="2" dy="3" stdDeviation="2" flood-color="#000" flood-opacity="0.3" />
    </filter>
  </defs>
  <rect width="400" height="240" fill="url(#uc2-sky)" />
  <!-- Centro Empresarial Moderno -->
  <polygon points="30,240 30,110 370,110 370,240" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2" />
  <!-- Platibanda e Telhado Embutido -->
  <rect x="25" y="105" width="350" height="15" rx="2" fill="#0F172A" />
  <!-- Módulos Fotovoltaicos em Laje Técnica com Orientação Otimizada -->
  <g filter="url(#uc2-sh)" transform="translate(50, 115)">
    <g transform="skewX(-15)">
      <rect x="0" y="0" width="36" height="22" rx="2" fill="url(#uc2-pv)" stroke="#93C5FD" stroke-width="0.9" />
      <rect x="40" y="0" width="36" height="22" rx="2" fill="url(#uc2-pv)" stroke="#93C5FD" stroke-width="0.9" />
      <rect x="80" y="0" width="36" height="22" rx="2" fill="url(#uc2-pv)" stroke="#93C5FD" stroke-width="0.9" />
      <rect x="120" y="0" width="36" height="22" rx="2" fill="url(#uc2-pv)" stroke="#93C5FD" stroke-width="0.9" />
      <rect x="160" y="0" width="36" height="22" rx="2" fill="url(#uc2-pv)" stroke="#93C5FD" stroke-width="0.9" />
      <rect x="200" y="0" width="36" height="22" rx="2" fill="url(#uc2-pv)" stroke="#93C5FD" stroke-width="0.9" />
      <rect x="240" y="0" width="36" height="22" rx="2" fill="url(#uc2-pv)" stroke="#93C5FD" stroke-width="0.9" />
      <rect x="0" y="26" width="36" height="22" rx="2" fill="url(#uc2-pv)" stroke="#93C5FD" stroke-width="0.9" />
      <rect x="40" y="26" width="36" height="22" rx="2" fill="url(#uc2-pv)" stroke="#93C5FD" stroke-width="0.9" />
      <rect x="80" y="26" width="36" height="22" rx="2" fill="url(#uc2-pv)" stroke="#93C5FD" stroke-width="0.9" />
      <rect x="120" y="26" width="36" height="22" rx="2" fill="url(#uc2-pv)" stroke="#93C5FD" stroke-width="0.9" />
      <rect x="160" y="26" width="36" height="22" rx="2" fill="url(#uc2-pv)" stroke="#93C5FD" stroke-width="0.9" />
      <rect x="200" y="26" width="36" height="22" rx="2" fill="url(#uc2-pv)" stroke="#93C5FD" stroke-width="0.9" />
      <rect x="240" y="26" width="36" height="22" rx="2" fill="url(#uc2-pv)" stroke="#93C5FD" stroke-width="0.9" />
    </g>
  </g>
  <!-- Fachada com Janelas de Vidro Fumê -->
  <g transform="translate(60, 175)">
    <rect x="0" y="0" width="60" height="55" rx="3" fill="#0284C7" fill-opacity="0.2" stroke="#0284C7" stroke-width="1.5" />
    <rect x="80" y="0" width="120" height="55" rx="3" fill="#0284C7" fill-opacity="0.2" stroke="#0284C7" stroke-width="1.5" />
    <rect x="220" y="0" width="60" height="55" rx="3" fill="#0284C7" fill-opacity="0.2" stroke="#0284C7" stroke-width="1.5" />
  </g>
  <!-- Selo Comercial Delfos -->
  <g transform="translate(14, 14)">
    <rect x="0" y="0" width="130" height="24" rx="12" fill="rgba(15, 23, 42, 0.75)" />
    <circle cx="12" cy="12" r="5" fill="#0284C7" />
    <text x="24" y="16" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="10" font-weight="bold">COMERCIAL</text>
  </g>
</svg>`

/**
 * 6. Usina Solar Residencial — Telhado Metálico/Cerâmico em Pato Branco / PR
 */
const SVG_USINA_RESIDENCIAL_2 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" width="100%" height="100%">
  <defs>
    <linearGradient id="ur2-sky" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0284C7" />
      <stop offset="60%" stop-color="#60A5FA" />
      <stop offset="100%" stop-color="#DBEAFE" />
    </linearGradient>
    <linearGradient id="ur2-roof" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1E293B" />
      <stop offset="100%" stop-color="#0F172A" />
    </linearGradient>
    <linearGradient id="ur2-pv" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E3A8A" />
      <stop offset="50%" stop-color="#2563EB" />
      <stop offset="100%" stop-color="#0F172A" />
    </linearGradient>
    <filter id="ur2-sh" x="-10%" y="-10%" width="125%" height="125%">
      <feDropShadow dx="2" dy="3" stdDeviation="2" flood-color="#000" flood-opacity="0.35" />
    </filter>
  </defs>
  <rect width="400" height="240" fill="url(#ur2-sky)" />
  <!-- Residência Contemporânea em Linhas Retas -->
  <polygon points="50,240 50,140 350,140 350,240" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="2" />
  <!-- Telhado Inclinado Escuro Moderno -->
  <polygon points="30,140 200,90 370,140 355,150 200,105 45,150" fill="#020617" />
  <polygon points="45,142 200,100 355,142" fill="url(#ur2-roof)" />
  <!-- Painéis Solares Elegantes e Integrados -->
  <g filter="url(#ur2-sh)" transform="translate(65, 105)">
    <g transform="skewX(-16)">
      <rect x="0" y="0" width="38" height="24" rx="2" fill="url(#ur2-pv)" stroke="#93C5FD" stroke-width="1" />
      <rect x="42" y="0" width="38" height="24" rx="2" fill="url(#ur2-pv)" stroke="#93C5FD" stroke-width="1" />
      <rect x="84" y="0" width="38" height="24" rx="2" fill="url(#ur2-pv)" stroke="#93C5FD" stroke-width="1" />
      <rect x="126" y="0" width="38" height="24" rx="2" fill="url(#ur2-pv)" stroke="#93C5FD" stroke-width="1" />
      <rect x="168" y="0" width="38" height="24" rx="2" fill="url(#ur2-pv)" stroke="#93C5FD" stroke-width="1" />
      <rect x="210" y="0" width="38" height="24" rx="2" fill="url(#ur2-pv)" stroke="#93C5FD" stroke-width="1" />
      <rect x="0" y="28" width="38" height="24" rx="2" fill="url(#ur2-pv)" stroke="#93C5FD" stroke-width="1" />
      <rect x="42" y="28" width="38" height="24" rx="2" fill="url(#ur2-pv)" stroke="#93C5FD" stroke-width="1" />
      <rect x="84" y="28" width="38" height="24" rx="2" fill="url(#ur2-pv)" stroke="#93C5FD" stroke-width="1" />
      <rect x="126" y="28" width="38" height="24" rx="2" fill="url(#ur2-pv)" stroke="#93C5FD" stroke-width="1" />
      <rect x="168" y="28" width="38" height="24" rx="2" fill="url(#ur2-pv)" stroke="#93C5FD" stroke-width="1" />
      <rect x="210" y="28" width="38" height="24" rx="2" fill="url(#ur2-pv)" stroke="#93C5FD" stroke-width="1" />
    </g>
  </g>
  <!-- Esquadrias e Fachada Amadeirada / Concreto -->
  <rect x="90" y="170" width="60" height="70" fill="#78350F" opacity="0.9" />
  <rect x="175" y="175" width="125" height="45" rx="3" fill="#E0F2FE" stroke="#0284C7" stroke-width="1.5" />
  <!-- Selo Residencial Delfos -->
  <g transform="translate(14, 14)">
    <rect x="0" y="0" width="138" height="24" rx="12" fill="rgba(15, 23, 42, 0.75)" />
    <circle cx="12" cy="12" r="5" fill="#10B981" />
    <text x="24" y="16" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="10" font-weight="bold">RESIDENCIAL</text>
  </g>
</svg>`

export const USINAS_PORTFOLIO_PADRAO = [
  {
    id: 'usina-erechim-rs',
    titulo: 'Usina Solar Residencial',
    tipo: 'residencial',
    cidade: 'Erechim / RS',
    potenciaKwp: 8.54,
    fotoBase64: svgToBase64(SVG_USINA_RESIDENCIAL),
  },
  {
    id: 'usina-passo-fundo-rs',
    titulo: 'Usina Solar Comercial',
    tipo: 'comercial',
    cidade: 'Passo Fundo / RS',
    potenciaKwp: 15.0,
    fotoBase64: svgToBase64(SVG_USINA_COMERCIAL),
  },
  {
    id: 'usina-frederico-rs',
    titulo: 'Usina Solar Industrial',
    tipo: 'industrial',
    cidade: 'Frederico Westphalen / RS',
    potenciaKwp: 25.0,
    fotoBase64: svgToBase64(SVG_USINA_INDUSTRIAL),
  },
  {
    id: 'usina-chapeco-sc',
    titulo: 'Usina Solar Rural',
    tipo: 'rural',
    cidade: 'Chapecó / SC',
    potenciaKwp: 30.0,
    fotoBase64: svgToBase64(SVG_USINA_RURAL),
  },
  {
    id: 'usina-caxias-rs',
    titulo: 'Usina Solar Comercial',
    tipo: 'comercial',
    cidade: 'Caxias do Sul / RS',
    potenciaKwp: 20.0,
    fotoBase64: svgToBase64(SVG_USINA_COMERCIAL_2),
  },
  {
    id: 'usina-pato-branco-pr',
    titulo: 'Usina Solar Residencial',
    tipo: 'residencial',
    cidade: 'Pato Branco / PR',
    potenciaKwp: 12.0,
    fotoBase64: svgToBase64(SVG_USINA_RESIDENCIAL_2),
  },
] as const

export type UsinaPortfolioPadrao = (typeof USINAS_PORTFOLIO_PADRAO)[number]
