import logoOficialPngAsset from '@/assets/prancheta-1-049a2.png?inline'
import onGridPngAsset from '@/assets/editedimage1789566225196-8e828.png?inline'
import monitoramentoPngAsset from '@/assets/generatedimage1789566526403-a7f37.png?inline'

export { logoOficialPngAsset, onGridPngAsset, monitoramentoPngAsset }

/**
 * @deprecated Mantido para compatibilidade seletiva caso necessário,
 * a proposta agora utiliza a foto real `monitoramentoPngAsset`.
 */
export const SVG_MONITORAMENTO_INLINE = `<svg viewBox="0 0 1000 560" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Monitoramento do Sistema Solar em Tempo Real" style="display:block;max-width:100%;height:auto;">
  <defs>
    <linearGradient id="mon-bg-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#F0FDF4" />
      <stop offset="60%" stop-color="#F8FAFC" />
      <stop offset="100%" stop-color="#FFFFFF" />
    </linearGradient>
    <linearGradient id="mon-sun-grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FDE047" />
      <stop offset="50%" stop-color="#FACC15" />
      <stop offset="100%" stop-color="#F59E0B" />
    </linearGradient>
    <linearGradient id="mon-panel-grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1E3A8A" />
      <stop offset="50%" stop-color="#1D4ED8" />
      <stop offset="100%" stop-color="#2563EB" />
    </linearGradient>
    <linearGradient id="mon-phone-screen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0B132B" />
      <stop offset="100%" stop-color="#1C2541" />
    </linearGradient>
    <linearGradient id="mon-chart-bar" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4ADE80" />
      <stop offset="100%" stop-color="#16A34A" />
    </linearGradient>
    <marker id="mon-arrow-green" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <path d="M1,1 L7,4 L1,7 Z" fill="#16A34A" />
    </marker>
    <marker id="mon-arrow-blue" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <path d="M1,1 L7,4 L1,7 Z" fill="#2563EB" />
    </marker>
  </defs>

  <rect width="1000" height="560" rx="14" fill="url(#mon-bg-sky)" stroke="#E2E8F0" stroke-width="2" />
  <ellipse cx="230" cy="480" rx="260" ry="40" fill="#DCFCE7" />
  <ellipse cx="780" cy="490" rx="200" ry="32" fill="#F1F5F9" />

  <!-- Sol Radiante -->
  <g transform="translate(60, 50)">
    <circle cx="36" cy="36" r="22" fill="url(#mon-sun-grad)" />
    <g stroke="#F59E0B" stroke-width="3.5" stroke-linecap="round">
      <line x1="36" y1="6" x2="36" y2="-2" />
      <line x1="36" y1="66" x2="36" y2="74" />
      <line x1="6" y1="36" x2="-2" y2="36" />
      <line x1="66" y1="36" x2="74" y2="36" />
      <line x1="15" y1="15" x2="9" y2="9" />
      <line x1="57" y1="57" x2="63" y2="63" />
      <line x1="15" y1="57" x2="9" y2="63" />
      <line x1="57" y1="15" x2="63" y2="9" />
    </g>
  </g>

  <!-- Usina e Residência -->
  <g id="usina-e-residencia" transform="translate(40, 160)">
    <polygon points="50,220 50,110 180,50 310,110 310,220" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="2" />
    <rect x="50" y="110" width="260" height="110" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.5" />
    <polygon points="30,115 180,45 330,115 320,122 180,56 40,122" fill="#334155" />
    <polygon points="40,115 180,52 320,115" fill="#475569" />

    <g transform="translate(68, 64) skewX(-16)">
      <rect x="0" y="0" width="62" height="40" rx="3" fill="url(#mon-panel-grad)" stroke="#93C5FD" stroke-width="1.5" />
      <line x1="20" y1="0" x2="20" y2="40" stroke="#93C5FD" stroke-width="1" />
      <line x1="41" y1="0" x2="41" y2="40" stroke="#93C5FD" stroke-width="1" />
      <line x1="0" y1="20" x2="62" y2="20" stroke="#93C5FD" stroke-width="1" />

      <rect x="68" y="0" width="62" height="40" rx="3" fill="url(#mon-panel-grad)" stroke="#93C5FD" stroke-width="1.5" />
      <line x1="88" y1="0" x2="88" y2="40" stroke="#93C5FD" stroke-width="1" />
      <line x1="109" y1="0" x2="109" y2="40" stroke="#93C5FD" stroke-width="1" />
      <line x1="0" y1="20" x2="130" y2="20" stroke="#93C5FD" stroke-width="1" />

      <rect x="136" y="0" width="62" height="40" rx="3" fill="url(#mon-panel-grad)" stroke="#93C5FD" stroke-width="1.5" />
      <line x1="156" y1="0" x2="156" y2="40" stroke="#93C5FD" stroke-width="1" />
      <line x1="177" y1="0" x2="177" y2="40" stroke="#93C5FD" stroke-width="1" />
      <line x1="0" y1="20" x2="198" y2="20" stroke="#93C5FD" stroke-width="1" />
    </g>

    <rect x="80" y="145" width="36" height="75" rx="3" fill="#9A3412" stroke="#7C2D12" stroke-width="2" />
    <circle cx="110" cy="185" r="2.5" fill="#FEF08A" />
    <rect x="140" y="145" width="50" height="45" rx="3" fill="#E0F2FE" stroke="#0284C7" stroke-width="2" />
    <line x1="165" y1="145" x2="165" y2="190" stroke="#0284C7" stroke-width="2" />
    <line x1="140" y1="167" x2="190" y2="167" stroke="#0284C7" stroke-width="2" />
  </g>

  <!-- Rótulo: Usina Fotovoltaica -->
  <g transform="translate(140, 48)">
    <rect x="0" y="0" width="180" height="34" rx="8" fill="#15803D" />
    <text x="90" y="22" text-anchor="middle" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="13" font-weight="900" letter-spacing="0.04em">USINA FOTOVOLTAICA</text>
    <line x1="90" y1="34" x2="90" y2="82" stroke="#15803D" stroke-width="3" />
    <circle cx="90" cy="82" r="5" fill="#15803D" />
  </g>

  <!-- Linha DC Módulos -> Inversor -->
  <path d="M 285, 260 L 370, 260 L 370, 290" fill="none" stroke="#16A34A" stroke-width="4" stroke-dasharray="6,4" marker-end="url(#mon-arrow-green)" />

  <!-- Inversor Solar -->
  <g id="inversor-solar" transform="translate(330, 260)">
    <rect x="0" y="0" width="90" height="130" rx="12" fill="#F8FAFC" stroke="#047857" stroke-width="3" />
    <rect x="6" y="6" width="78" height="118" rx="8" fill="#FFFFFF" />
    <rect x="18" y="24" width="54" height="34" rx="5" fill="#064E3B" stroke="#0F766E" stroke-width="1.5" />
    <circle cx="28" cy="36" r="3" fill="#4ADE80" />
    <text x="36" y="39" fill="#86EFAC" font-family="monospace" font-size="8" font-weight="bold">9.84kW</text>
    <text x="26" y="51" fill="#FDE047" font-family="monospace" font-size="7">OPERANDO</text>
    <circle cx="32" cy="74" r="3" fill="#22C55E" />
    <circle cx="45" cy="74" r="3" fill="#3B82F6" />
    <circle cx="58" cy="74" r="3" fill="#F59E0B" />
    <rect x="30" y="128" width="30" height="22" rx="4" fill="#1E293B" stroke="#047857" stroke-width="2" />
    <circle cx="45" cy="138" r="3.5" fill="#38BDF8" />
    <text x="45" y="148" text-anchor="middle" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="6" font-weight="bold">Wi-Fi</text>
  </g>

  <!-- Rótulo: Inversor Solar -->
  <g transform="translate(295, 185)">
    <rect x="0" y="0" width="160" height="34" rx="8" fill="#15803D" />
    <text x="80" y="22" text-anchor="middle" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="13" font-weight="900" letter-spacing="0.04em">INVERSOR SOLAR</text>
    <line x1="80" y1="34" x2="80" y2="72" stroke="#15803D" stroke-width="3" />
    <circle cx="80" cy="72" r="5" fill="#15803D" />
  </g>

  <!-- Ondas Wi-Fi / Conexão em Nuvem -->
  <g id="ondas-transmissao" transform="translate(435, 305)">
    <path d="M 15,20 A 25,25 0 0,1 15,60" fill="none" stroke="#0284C7" stroke-width="3.5" stroke-linecap="round" />
    <path d="M 30,10 A 45,45 0 0,1 30,70" fill="none" stroke="#0284C7" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="4,4" />
    <path d="M 45,0 A 65,65 0 0,1 45,80" fill="none" stroke="#2563EB" stroke-width="3.5" stroke-linecap="round" />

    <g transform="translate(70, 16)">
      <rect x="0" y="0" width="110" height="42" rx="8" fill="#EFF6FF" stroke="#3B82F6" stroke-width="2" />
      <path d="M22,26 C22,23 24,20 28,20 C29,16 33,14 38,15 C42,12 48,14 49,18 C53,18 56,21 56,25 C56,29 53,31 49,31 L24,31 C22,31 22,28 22,26 Z" fill="#3B82F6" />
      <text x="64" y="22" fill="#1E40AF" font-family="Arial, sans-serif" font-size="9" font-weight="900">TELEMETRIA</text>
      <text x="64" y="32" fill="#2563EB" font-family="Arial, sans-serif" font-size="8" font-weight="bold">EM TEMPO REAL</text>
    </g>
    <path d="M 185, 37 L 225, 37" fill="none" stroke="#2563EB" stroke-width="4" marker-end="url(#mon-arrow-blue)" />
  </g>

  <!-- Smartphone com App Delfos Monitor -->
  <g id="smartphone-dashboard" transform="translate(680, 70)">
    <rect x="0" y="0" width="260" height="440" rx="34" fill="#0F172A" stroke="#334155" stroke-width="4" />
    <rect x="10" y="12" width="240" height="416" rx="26" fill="url(#mon-phone-screen)" />
    <rect x="95" y="20" width="70" height="14" rx="7" fill="#020617" />
    <circle cx="150" cy="27" r="3" fill="#1E293B" />

    <rect x="10" y="38" width="240" height="44" fill="#1E293B" />
    <circle cx="34" cy="60" r="12" fill="#15803D" />
    <text x="34" y="64" text-anchor="middle" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="10" font-weight="900">D</text>
    <text x="54" y="56" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="11" font-weight="bold">DELFOS MONITOR</text>
    <text x="54" y="68" fill="#4ADE80" font-family="Arial, sans-serif" font-size="8" font-weight="bold">● ONLINE • TEMPO REAL</text>

    <!-- Card Status -->
    <g transform="translate(24, 92)">
      <rect x="0" y="0" width="212" height="48" rx="10" fill="#064E3B" stroke="#059669" stroke-width="1.5" />
      <circle cx="24" cy="24" r="14" fill="#10B981" />
      <path d="M 18,24 L 22,28 L 30,19" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      <text x="46" y="20" fill="#A7F3D0" font-family="Arial, sans-serif" font-size="8" font-weight="800">STATUS OPERACIONAL</text>
      <text x="46" y="34" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="11" font-weight="900">Sistema Operando 100%</text>
    </g>

    <!-- Card Potência Atual -->
    <g transform="translate(24, 148)">
      <rect x="0" y="0" width="212" height="74" rx="10" fill="#1E293B" stroke="#334155" stroke-width="1" />
      <text x="14" y="20" fill="#94A3B8" font-family="Arial, sans-serif" font-size="9" font-weight="bold">POTÊNCIA ATUAL INSTANTÂNEA</text>
      <text x="14" y="48" fill="#FACC15" font-family="Arial, sans-serif" font-size="24" font-weight="900">9,84 <tspan font-size="13" fill="#FDE047">kW</tspan></text>
      <text x="14" y="64" fill="#86EFAC" font-family="Arial, sans-serif" font-size="9" font-weight="bold">Hoje: +48,6 kWh gerados</text>
      <g transform="translate(162, 16)">
        <circle cx="16" cy="16" r="11" fill="url(#mon-sun-grad)" />
        <circle cx="16" cy="16" r="14" fill="none" stroke="#F59E0B" stroke-width="1" stroke-dasharray="3,2" />
      </g>
    </g>

    <!-- Gráfico de Curva de Geração -->
    <g transform="translate(24, 230)">
      <rect x="0" y="0" width="212" height="120" rx="10" fill="#1E293B" stroke="#334155" stroke-width="1" />
      <text x="14" y="18" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="10" font-weight="bold">GERAÇÃO DO DIA (kWh)</text>
      <text x="142" y="18" fill="#38BDF8" font-family="Arial, sans-serif" font-size="8" font-weight="bold">Curva Solar</text>
      <line x1="14" y1="92" x2="198" y2="92" stroke="#334155" stroke-width="1" />
      <line x1="14" y1="62" x2="198" y2="62" stroke="#334155" stroke-width="1" stroke-dasharray="2,3" />
      <line x1="14" y1="36" x2="198" y2="36" stroke="#334155" stroke-width="1" stroke-dasharray="2,3" />

      <rect x="22" y="82" width="14" height="10" rx="3" fill="#16A34A" opacity="0.8" />
      <rect x="46" y="64" width="14" height="28" rx="3" fill="#16A34A" />
      <rect x="70" y="44" width="14" height="48" rx="3" fill="#22C55E" />
      <rect x="96" y="28" width="18" height="64" rx="4" fill="url(#mon-chart-bar)" stroke="#86EFAC" stroke-width="1" />
      <rect x="124" y="38" width="14" height="54" rx="3" fill="#22C55E" />
      <rect x="148" y="58" width="14" height="34" rx="3" fill="#16A34A" />
      <rect x="172" y="80" width="14" height="12" rx="3" fill="#16A34A" opacity="0.8" />

      <text x="25" y="104" fill="#94A3B8" font-family="Arial, sans-serif" font-size="7">06h</text>
      <text x="73" y="104" fill="#94A3B8" font-family="Arial, sans-serif" font-size="7">10h</text>
      <text x="101" y="104" fill="#FACC15" font-family="Arial, sans-serif" font-size="7" font-weight="bold">12h</text>
      <text x="151" y="104" fill="#94A3B8" font-family="Arial, sans-serif" font-size="7">16h</text>
      <text x="175" y="104" fill="#94A3B8" font-family="Arial, sans-serif" font-size="7">18h</text>
    </g>

    <!-- Economia do Mês -->
    <g transform="translate(24, 358)">
      <rect x="0" y="0" width="212" height="46" rx="10" fill="#047857" />
      <text x="14" y="18" fill="#D1FAE5" font-family="Arial, sans-serif" font-size="8" font-weight="bold">ECONOMIA ESTIMADA DO MÊS</text>
      <text x="14" y="36" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="14" font-weight="900">R$ 1.240,00</text>
      <text x="148" y="30" fill="#FEF08A" font-family="Arial, sans-serif" font-size="10" font-weight="bold">✓ 95% off</text>
    </g>
    <rect x="90" y="416" width="80" height="4" rx="2" fill="#64748B" />
  </g>

  <!-- Rótulo: App de Monitoramento -->
  <g transform="translate(680, 24)">
    <rect x="0" y="0" width="260" height="34" rx="8" fill="#1D4ED8" />
    <text x="130" y="22" text-anchor="middle" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="13" font-weight="900" letter-spacing="0.04em">APP DE MONITORAMENTO</text>
    <line x1="130" y1="34" x2="130" y2="62" stroke="#1D4ED8" stroke-width="3" />
    <circle cx="130" cy="62" r="5" fill="#1D4ED8" />
  </g>

  <!-- Box de Legenda Inferior -->
  <g transform="translate(40, 485)">
    <rect x="0" y="0" width="600" height="52" rx="10" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5" />
    <rect x="14" y="10" width="32" height="32" rx="8" fill="#F97316" />
    <text x="30" y="30" text-anchor="middle" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="16" font-weight="bold">⚡</text>
    <text x="58" y="23" fill="#0F172A" font-family="Arial, sans-serif" font-size="11" font-weight="900">Acompanhe a geração de energia em tempo real pelo celular ou computador</text>
    <text x="58" y="38" fill="#475569" font-family="Arial, sans-serif" font-size="9.5">Gráficos diários, mensais e anuais, histórico de rendimento em kWh e alerta inteligente de anomalias.</text>
  </g>

  <!-- Box Multiplataforma -->
  <g transform="translate(680, 485)">
    <rect x="0" y="0" width="260" height="52" rx="10" fill="#F8FAFC" stroke="#93C5FD" stroke-width="1.5" />
    <text x="20" y="22" fill="#1E40AF" font-family="Arial, sans-serif" font-size="10" font-weight="900">ACESSO MULTIPLATAFORMA</text>
    <text x="20" y="38" fill="#0284C7" font-family="Arial, sans-serif" font-size="9" font-weight="bold">📱 Android  •  🍏 iOS  •  💻 Portal Web PC</text>
  </g>
</svg>`
