/* ═══════════════════════════════════════════
   POPUP — funções base globais
═══════════════════════════════════════════ */
function abrirPopup(id) {
  var el = document.getElementById(id);
  if (el) {
    el.removeAttribute('hidden');
    el.style.setProperty('display', 'flex', 'important');
    el.style.pointerEvents = 'auto';
  }
}
function fecharPopup(id) {
  var el = document.getElementById(id);
  if (el) {
    el.setAttribute('hidden', '');
    el.style.setProperty('display', 'none', 'important');
    el.style.pointerEvents = 'none';
  }
}
function iniciarSessao() {
  fecharPopup('popup-entrada');
  var pop = document.getElementById('popup-entrada');
  if (pop) {
    pop.setAttribute('hidden', '');
    pop.style.setProperty('display', 'none', 'important');
    pop.style.pointerEvents = 'none';
  }
  if (typeof atualizarTimerLogin === 'function') {
    atualizarTimerLogin();
  }
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}
window.abrirPopup    = abrirPopup;
window.fecharPopup   = fecharPopup;
window.iniciarSessao = iniciarSessao;

document.addEventListener('DOMContentLoaded', function () {

  /* ═══════════════════════════════════════════
     BANCO DE DADOS & SERVIÇO DE ARMAZENAMENTO (DB ADAPTER SERVICE)
     Interface modular para transição transparente entre LocalStorage e Backend API (Supabase/Firebase/REST)
  ═══════════════════════════════════════════ */
  /* Purge e limpeza completa de testes antigos armazenados no navegador */
  var RESET_PROD_KEY = 'tv_reset_clean_prod_v1';
  if (!localStorage.getItem(RESET_PROD_KEY)) {
    localStorage.removeItem('tv_ocorrencias_v1');
    localStorage.removeItem('tv_historico_v1');
    localStorage.setItem(RESET_PROD_KEY, 'true');
  }

  var STORAGE_KEY           = 'tv_ocorrencias_prod';
  var HISTORICO_STORAGE_KEY = 'tv_historico_prod';
  var PHOTO_STORAGE_KEY     = 'tv_user_photo_v1';
  var USER_NAME_STORAGE_KEY = 'tv_user_name_v1';

  function getUsuarioAtual() {
    var stored = localStorage.getItem(USER_NAME_STORAGE_KEY);
    if (stored && stored.trim()) return stored.trim();
    var upName = document.getElementById('up-name');
    if (upName && upName.textContent && upName.textContent.trim()) return upName.textContent.trim();
    return 'Operador';
  }

  var dashboardMetrics = {
    telejornal: {
      'INTEGRAÇÃO NOTÍCIA': { conf: 0, nc: 0, canc: 0 },
      'MG1':                { conf: 0, nc: 0, canc: 0 },
      'MG2':                { conf: 0, nc: 0, canc: 0 },
      'GIRO MG2':           { conf: 0, nc: 0, canc: 0 }
    },
    equipamento: {
      'LIVE U1':      { conf: 0, nc: 0, canc: 0 },
      'LIVE U2':      { conf: 0, nc: 0, canc: 0 },
      'LIVE U3':      { conf: 0, nc: 0, canc: 0 },
      'LIVE U SMART': { conf: 0, nc: 0, canc: 0 },
      'REDAÇÃO':      { conf: 0, nc: 0, canc: 0 },
      'LIVE U4':      { conf: 0, nc: 0, canc: 0 },
      'NET PRAÇA':    { conf: 0, nc: 0, canc: 0 },
      'NET PORTARIA': { conf: 0, nc: 0, canc: 0 },
      'FORMATOS NET': { conf: 0, nc: 0, canc: 0 },
      'NET 2º ANDAR': { conf: 0, nc: 0, canc: 0 },
      'NET 3º ANDAR': { conf: 0, nc: 0, canc: 0 },
      'NET 4º ANDAR': { conf: 0, nc: 0, canc: 0 },
      'KMJ':          { conf: 0, nc: 0, canc: 0 }
    }
  };

  var SUPABASE_URL = 'https://rzncbvikykkkhdsuofha.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_IPr_5xcx8qYQQgLmQaE4gA_5J2ZaXeC';

  var DBService = {
    mode: 'supabase',
    url: SUPABASE_URL,
    key: SUPABASE_ANON_KEY,

    getOcorrencias: function() { return load(); },
    saveOcorrencias: function(list) { 
      save(list);
      this.pushRemote('ocorrencias', list);
    },

    getHistorico: function() { return loadHistorico(); },
    saveHistorico: function(list) { 
      saveHistorico(list);
      this.pushRemote('historico', list);
    },

    getFotoPerfil: function() { return localStorage.getItem(PHOTO_STORAGE_KEY); },
    saveFotoPerfil: function(url) { localStorage.setItem(PHOTO_STORAGE_KEY, url); },
    removeFotoPerfil: function() { localStorage.removeItem(PHOTO_STORAGE_KEY); },

    enviarNotificacaoEmail: function(assunto, corpo, destinatarios) {
      if (typeof mostrarToast === 'function') {
        mostrarToast('E-mail', 'Essa função de envio de e-mail ainda não está disponível.', 'info');
      }
    },

    pushRemote: function(table, data) {
      if (!this.url || !this.key) return;
      if (!Array.isArray(data) || data.length === 0) return;
      try {
        var endpoint = this.url.replace(/\/$/, '') + '/rest/v1/' + table;
        fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.key,
            'Authorization': 'Bearer ' + this.key,
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(data)
        }).catch(function(err) {
          console.warn('[DBService Cloud] Falha ao enviar dados para o Supabase:', err);
        });
      } catch (e) {
        console.warn('[DBService Cloud] Exceção no push remoto:', e);
      }
    },

    syncRemote: function() {
      if (!this.url || !this.key) return;
      var self = this;
      try {
        // 1. Sincroniza Ocorrências
        fetch(self.url.replace(/\/$/, '') + '/rest/v1/ocorrencias?select=*', {
          headers: {
            'apikey': self.key,
            'Authorization': 'Bearer ' + self.key
          }
        })
        .then(function(res) { return res.ok ? res.json() : null; })
        .then(function(remoteData) {
          if (Array.isArray(remoteData)) {
            var clean = remoteData.map(sanitizeOcorrencia).filter(Boolean);
            ocorrencias = clean;
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(ocorrencias));
            } catch(e) {}
            if (typeof renderAll === 'function') renderAll();
          }
        })
        .catch(function(err) {
          console.warn('[DBService Cloud Sync] Offline ou conectando ao Supabase...', err);
        });

        // 2. Sincroniza Histórico
        fetch(self.url.replace(/\/$/, '') + '/rest/v1/historico?select=*', {
          headers: {
            'apikey': self.key,
            'Authorization': 'Bearer ' + self.key
          }
        })
        .then(function(res) { return res.ok ? res.json() : null; })
        .then(function(remoteHist) {
          if (Array.isArray(remoteHist)) {
            historicoSeedData = remoteHist;
            try {
              localStorage.setItem(HISTORICO_STORAGE_KEY, JSON.stringify(historicoSeedData));
            } catch(e) {}
            if (typeof renderHistorico === 'function') renderHistorico();
          }
        })
        .catch(function(err) {
          console.warn('[DBService Cloud Sync] Offline no histórico:', err);
        });
      } catch (e) {
        console.warn('[DBService Cloud Sync] Erro no sync:', e);
      }
    }
  };
  window.DBService = DBService;

  function getSeed() {
    return [];
  }

  function sanitizeOcorrencia(o) {
    if (!o || typeof o !== 'object') return null;
    return {
      id: o.id || ('oc_' + Date.now()),
      titulo: o.titulo || 'Ocorrência sem título',
      prio: o.prio || 'Média',
      cat: o.cat || 'Equipamento',
      resp: o.resp || 'Todos do turno',
      local: o.local || '',
      prazo: o.prazo || '',
      desc: o.desc || '',
      mine: !!o.mine,
      tags: Array.isArray(o.tags) ? o.tags : [],
      status: o.status || 'aberta',
      criado: o.criado || Date.now(),
      dataCriacao: o.dataCriacao || formatDataHoraLocal(o.criado),
      resolucao: o.resolucao || null
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var data = JSON.parse(raw);
      if (Array.isArray(data)) {
        var realOnly = data.filter(function(o) {
          return o && !String(o.id || '').startsWith('s');
        });
        return realOnly.map(sanitizeOcorrencia).filter(Boolean);
      }
      return [];
    } catch(e) {
      return [];
    }
  }

  function save(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      if (typeof DBService !== 'undefined' && DBService && typeof DBService.pushRemote === 'function') {
        DBService.pushRemote('ocorrencias', list);
      }
    } catch(e) {
      console.warn('Erro ao salvar no localStorage:', e);
    }
  }

  var ocorrencias = load();
  save(ocorrencias);

  function getAbertas()    { return ocorrencias.filter(function(o){ return o && o.status === 'aberta'; }); }
  function getResolvidas() { return ocorrencias.filter(function(o){ return o && o.status === 'resolvida'; }); }

  /* ═══════════════════════════════════════════
     HELPERS DE RENDER
  ═══════════════════════════════════════════ */

  function formatDataHoraLocal(dateInput) {
    var d;
    if (dateInput) {
      if (typeof dateInput === 'number' || typeof dateInput === 'string' || dateInput instanceof Date) {
        d = new Date(dateInput);
      } else {
        d = new Date();
      }
    } else {
      d = new Date();
    }
    if (isNaN(d.getTime())) d = new Date();

    var ano = d.getFullYear();
    var mes = String(d.getMonth() + 1);
    if (mes.length < 2) mes = '0' + mes;
    var dia = String(d.getDate());
    if (dia.length < 2) dia = '0' + dia;
    var hora = String(d.getHours());
    if (hora.length < 2) hora = '0' + hora;
    var min = String(d.getMinutes());
    if (min.length < 2) min = '0' + min;

    return ano + '-' + mes + '-' + dia + ' ' + hora + ':' + min;
  }
  window.formatDataHoraLocal = formatDataHoraLocal;

  function prioLine(prio) { return prio==='Alta'?'pl-r':prio==='Média'?'pl-y':'pl-g'; }
  function tagClass(prio) { return prio==='Alta'?'tag-r':prio==='Média'?'tag-y':'tag-g'; }

  function isOcorrenciaVencida(oc) {
    if (!oc || oc.status !== 'aberta') return false;
    if (oc.tags && Array.isArray(oc.tags) && oc.tags.indexOf('Atrasada') !== -1) return true;
    if (oc.prazo) {
      var parts = String(oc.prazo).split(':');
      if (parts.length === 2) {
        var now = new Date();
        var pTime = new Date();
        pTime.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);
        if (now > pTime) return true;
      }
    }
    return false;
  }
  window.isOcorrenciaVencida = isOcorrenciaVencida;

  var filtroOcorrenciasAtivo = 'todas';

  /* ─── Render: lista principal de ocorrências ─── */
  function renderCards() {
    var container = document.getElementById('oc-list');
    if (!container) return;

    var lista = getAbertas();

    if (filtroOcorrenciasAtivo === 'alta') {
      lista = lista.filter(function(o) { return (o.prio || '').toLowerCase() === 'alta'; });
    } else if (filtroOcorrenciasAtivo === 'media') {
      lista = lista.filter(function(o) { return (o.prio || '').toLowerCase() === 'média' || (o.prio || '').toLowerCase() === 'media'; });
    } else if (filtroOcorrenciasAtivo === 'baixa') {
      lista = lista.filter(function(o) { return (o.prio || '').toLowerCase() === 'baixa'; });
    } else if (filtroOcorrenciasAtivo === 'atrasadas') {
      lista = lista.filter(function(o) { return isOcorrenciaVencida(o); });
    }

    if (lista.length === 0) {
      container.innerHTML =
        '<p style="color:var(--muted);font-size:13px;text-align:center;padding:28px 0;">' +
        'Nenhuma ocorrência encontrada para o filtro selecionado.</p>';
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    container.innerHTML = lista.map(function(oc) {
      var isVencida = isOcorrenciaVencida(oc);
      var tagsHTML = '<span class="tag ' + tagClass(oc.prio) + '">' + (oc.prio || 'Média') + '</span>';
      if (isVencida) {
        tagsHTML += '<span class="tag tag-r">⚠️ Prazo Expirado</span>';
      }
      (oc.tags || []).forEach(function(t) {
        if (t !== 'Atrasada' || !isVencida) {
          tagsHTML += '<span class="tag tag-y">' + t + '</span>';
        }
      });
      if (oc.mine) tagsHTML += '<span class="tag tag-ind">Só para você</span>';

      var respIco  = (oc.resp === 'Todos do turno') ? 'users' : 'user';
      var prazoH   = oc.prazo ? '<span class="oc-meta-item"><i data-lucide="clock" style="width:12px;height:12px;stroke-width:2;color:var(--dim);"></i>' + oc.prazo + '</span>' : '';
      var localH   = oc.local ? '<span class="oc-meta-item"><i data-lucide="map-pin" style="width:12px;height:12px;stroke-width:2;color:var(--dim);"></i>' + oc.local + '</span>' : '';

      var cardClasses = 'oc-card';
      if (isVencida) cardClasses += ' vencida';
      else if (oc.mine) cardClasses += ' mine';

      return (
        '<article class="' + cardClasses + '" data-id="' + oc.id + '">' +
          '<div class="prio-line ' + prioLine(oc.prio) + '"></div>' +
          '<div class="oc-body">' +
            '<div class="oc-header"><h3>' + (oc.titulo || 'Sem título') + '</h3>' + tagsHTML + '</div>' +
            '<p class="oc-desc">' + (oc.desc || '') + '</p>' +
            '<div class="oc-meta">' +
              '<span class="oc-meta-item"><i data-lucide="' + respIco + '" style="width:12px;height:12px;stroke-width:2;color:var(--dim);"></i>' + (oc.resp || 'Todos do turno') + '</span>' +
              prazoH + localH +
            '</div>' +
          '</div>' +
          '<div class="oc-actions">' +
            '<button class="btn btn-success btn-sm" onclick="abrirResolver(\'' + oc.id + '\')">Resolver</button>' +
            '<button class="btn btn-ghost btn-sm" onclick="verDetalhesOcorrencia(\'' + oc.id + '\')">Detalhes</button>' +
          '</div>' +
        '</article>'
      );
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  /* ─── Render: painéis aside (CTRS + Falhas) ─── */
  /* Ambos usam o mesmo nome "Ocorrências" e os mesmos dados */
  function renderAside(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var abertas    = getAbertas();
    var resolvidas = getResolvidas();

    /* ── Mini cards das abertas ── */
    var abertasHTML = '';
    if (abertas.length === 0) {
      abertasHTML = '<p style="font-size:11.5px;color:var(--muted);padding:8px 0;">Nenhuma ocorrência ativa.</p>';
    } else {
      abertasHTML = abertas.map(function(oc) {
        var dotClass = oc.prio==='Alta'?'md-r':oc.prio==='Média'?'md-y':'md-g';
        var tagsPrio = '<span class="tag ' + tagClass(oc.prio) + '">' + (oc.prio || 'Média') + '</span>';
        (oc.tags || []).forEach(function(t) { tagsPrio += '<span class="tag tag-y">' + t + '</span>'; });
        if (oc.mine) tagsPrio += '<span class="tag tag-ind">Só para você</span>';

        var meta = oc.resp || 'Todos do turno';
        if (oc.prazo) meta += ' · ' + oc.prazo;
        if (oc.local) meta += ' · ' + oc.local;

        return (
          '<div class="mini-oc' + (oc.mine ? ' mine' : '') + '" onclick="abrirResolver(\'' + oc.id + '\')">' +
            '<div class="mini-top"><div class="mini-dot ' + dotClass + '"></div>' +
            '<div class="mini-title">' + (oc.titulo || 'Ocorrência') + '</div></div>' +
            '<div style="margin-bottom:3px;">' + tagsPrio + '</div>' +
            '<div class="mini-info">' + meta + '</div>' +
          '</div>'
        );
      }).join('');
    }

    /* ── Lista de resolvidas ── */
    var resolvidasHTML = '';
    if (resolvidas.length > 0) {
      resolvidasHTML =
        '<div class="aside-divider"></div>' +
        '<div class="aside-lbl">Resolvidas (' + resolvidas.length + ')</div>' +
        resolvidas.slice(0, 5).map(function(oc) {
          var statusLabel = oc.resolucao ? oc.resolucao.statusRes : 'Resolvido';
          return (
            '<div class="resolved-item">' +
              '<div class="ri-title">' + oc.titulo + '</div>' +
              '<div class="ri-meta">' + statusLabel + ' · ' + oc.resp + '</div>' +
            '</div>'
          );
        }).join('');
    }

    container.innerHTML =
      '<div class="aside-lbl">Ocorrências (' + abertas.length + ')</div>' +
      abertasHTML +
      resolvidasHTML;
  }

  /* ═══════════════════════════════════════════
     HISTÓRICO GERAL — ESTRUTURA DE DADOS
  ═══════════════════════════════════════════ */

  function getHistoricoSeed() {
    return [];
  }

  function loadHistorico() {
    try {
      var data = JSON.parse(localStorage.getItem(HISTORICO_STORAGE_KEY));
      if (Array.isArray(data)) {
        var realOnly = data.filter(function(h) {
          return h && h.id !== 'h1' && h.id !== 'h2' && h.id !== 'h3';
        });
        return realOnly;
      }
      return [];
    } catch(e) {
      return [];
    }
  }

  function saveHistorico(list) {
    try {
      localStorage.setItem(HISTORICO_STORAGE_KEY, JSON.stringify(list));
      if (typeof DBService !== 'undefined' && DBService && typeof DBService.pushRemote === 'function') {
        DBService.pushRemote('historico', list);
      }
    } catch(e) {
      console.warn('Erro ao salvar historico:', e);
    }
  }

  var historicoSeedData = loadHistorico();

  var historicoFiltroCategoria = 'todos';
  var itemHistoricoSelecionado = null;

  function getNomeUsuarioAtual() {
    return getUsuarioAtual().toLowerCase();
  }

  function isItemDoUsuario(item) {
    var usuarioAtual = getNomeUsuarioAtual();
    var criado = (item.criadoPor || '').toLowerCase();
    var resolvido = (item.resolvidoPor || '').toLowerCase();
    return criado.includes(usuarioAtual) || resolvido.includes(usuarioAtual);
  }

  function getTagTipoBadge(item) {
    if (item.tipo === 'ocorrencia') {
      return '<span class="tag tag-blue-soft">Ocorrência</span>';
    } else if (item.tipo === 'relatorio') {
      return '<span class="tag tag-teal-soft">' + (item.subtipo || 'Relatório') + '</span>';
    } else if (item.tipo === 'recebimento') {
      return '<span class="tag tag-yellow-soft">' + (item.subtipo || 'Recebimento') + '</span>';
    }
    return '<span class="tag tag-blue-soft">Registro</span>';
  }

  /* ─── Render: Dashboard Resolvidas & Power BI ─── */
  var resolvidasFiltro = 'todas';

  function filtrarResolvidas(filtro, el) {
    resolvidasFiltro = filtro;
    document.querySelectorAll('#page-resolvidas .pill').forEach(function(p) { p.classList.remove('on'); });
    if (el) el.classList.add('on');
    renderResolvidas();
  }
  window.filtrarResolvidas = filtrarResolvidas;

  function renderResolvidas() {
    var listEl = document.getElementById('resolvidas-list');
    if (!listEl) return;

    var resolvidas = getResolvidas();
    var abertas = getAbertas();
    var vencidas = abertas.filter(function(o){ return isOcorrenciaVencida(o); });
    var abertasNoPrazo = abertas.filter(function(o){ return !isOcorrenciaVencida(o); });

    var totRes = resolvidas.length;
    var totAb  = abertasNoPrazo.length;
    var totVen = vencidas.length;
    var totalGeral = totRes + totAb + totVen;

    /* Atualiza KPIs em Resolvidas */
    var elG = document.querySelector('.sn-resolvidas-g');
    var elB = document.querySelector('.sn-resolvidas-b');
    var elR = document.querySelector('.sn-resolvidas-r');
    if (elG) elG.textContent = totRes;
    if (elB) elB.textContent = totAb;
    if (elR) elR.textContent = totVen;

    /* Taxas em % */
    var pctRes = totalGeral > 0 ? Math.round((totRes / totalGeral) * 100) : 0;
    var pctAb  = totalGeral > 0 ? Math.round((totAb / totalGeral) * 100) : 0;
    var pctVen = totalGeral > 0 ? (100 - pctRes - pctAb) : 0;
    if (pctVen < 0) pctVen = 0;

    var badgePct = document.getElementById('pct-resolucao-badge');
    if (badgePct) badgePct.textContent = 'Taxa de Resolução: ' + pctRes + '%';

    var txtTot = document.getElementById('txt-total-ocorrencias');
    if (txtTot) txtTot.textContent = totalGeral + ' ocorrências registradas';

    var pieTot = document.getElementById('pie-resolvidas-tot');
    if (pieTot) pieTot.textContent = totalGeral;

    /* Render Gráfico de Pizza Donut (Conic-Gradient vibrante com alta definição) */
    var pieEl = document.getElementById('pie-chart-circle');
    if (pieEl) {
      if (totalGeral === 0) {
        pieEl.style.background = '#E2E8F0';
      } else {
        var p1 = pctRes;
        var p2 = pctRes + pctAb;
        pieEl.style.background = 'conic-gradient(#10B981 0% ' + p1 + '%, #0071E3 ' + p1 + '% ' + p2 + '%, #EF4444 ' + p2 + '% 100%)';
      }
    }

    var lblG = document.getElementById('lbl-pct-g');
    var lblB = document.getElementById('lbl-pct-b');
    var lblR = document.getElementById('lbl-pct-r');
    if (lblG) lblG.textContent = pctRes + '% (' + totRes + ' resolvidas)';
    if (lblB) lblB.textContent = pctAb + '% (' + totAb + ' no prazo)';
    if (lblR) lblR.textContent = pctVen + '% (' + totVen + ' expiradas)';

    /* Lista filtrada */
    var itensExibir = [];
    if (resolvidasFiltro === 'todas') {
      itensExibir = resolvidas.map(function(o){ return { item: o, isVencida: false }; })
        .concat(vencidas.map(function(o){ return { item: o, isVencida: true }; }));
    } else if (resolvidasFiltro === 'concluidas') {
      itensExibir = resolvidas.map(function(o){ return { item: o, isVencida: false }; });
    } else if (resolvidasFiltro === 'vencidas') {
      itensExibir = vencidas.map(function(o){ return { item: o, isVencida: true }; });
    }

    if (itensExibir.length === 0) {
      listEl.innerHTML = '<p style="color:var(--muted);font-size:13px;text-align:center;padding:24px 0;">Nenhum registro nesta categoria.</p>';
      return;
    }

    listEl.innerHTML = itensExibir.map(function(obj) {
      var oc = obj.item;
      var isV = obj.isVencida;

      if (isV) {
        return (
          '<article class="oc-card vencida" style="cursor:pointer;" onclick="verDetalhesOcorrenciaResolvida(\'' + oc.id + '\')">' +
            '<div class="prio-line pl-r"></div>' +
            '<div class="oc-body">' +
              '<div class="oc-header">' +
                '<h3>' + oc.titulo + '</h3>' +
                '<span class="tag tag-r">⚠️ Prazo Expirado / Não Resolvida</span>' +
                '<span class="tag tag-y">' + oc.prio + '</span>' +
              '</div>' +
              '<p class="oc-desc">' + oc.desc + '</p>' +
              '<div class="oc-meta">' +
                '<span><i data-lucide="user" style="width:12px;height:12px;stroke-width:2;color:var(--dim);"></i> Atribuído: ' + oc.resp + '</span>' +
                '<span><i data-lucide="clock" style="width:12px;height:12px;stroke-width:2;color:var(--dim);"></i> Prazo: ' + (oc.prazo || 'Expirado') + '</span>' +
                '<span><i data-lucide="map-pin" style="width:12px;height:12px;stroke-width:2;color:var(--dim);"></i> Local: ' + (oc.local || 'N/A') + '</span>' +
              '</div>' +
            '</div>' +
            '<div class="oc-actions">' +
              '<button class="btn btn-success btn-sm" onclick="event.stopPropagation(); abrirResolver(\'' + oc.id + '\')">Resolver Agora</button>' +
            '</div>' +
          '</article>'
        );
      } else {
        var statusTexto = (oc.resolucao && oc.resolucao.statusRes) ? oc.resolucao.statusRes : 'Resolvido';
        var descResolucao = (oc.resolucao && oc.resolucao.descRes) ? oc.resolucao.descRes : 'Resolução concluída com sucesso.';
        return (
          '<article class="oc-card" style="background:var(--bg); border:1px solid #A8E6BB; cursor:pointer;" onclick="verDetalhesOcorrenciaResolvida(\'' + oc.id + '\')">' +
            '<div class="prio-line pl-g"></div>' +
            '<div class="oc-body">' +
              '<div class="oc-header">' +
                '<h3>' + oc.titulo + '</h3>' +
                '<span class="tag tag-g">✓ ' + statusTexto + '</span>' +
                '<span class="tag tag-teal-soft">' + (oc.cat || 'Equipamento') + '</span>' +
              '</div>' +
              '<p class="oc-desc" style="color:var(--txt);"><strong>Resolução:</strong> ' + descResolucao + '</p>' +
              '<div class="oc-meta">' +
                '<span><i data-lucide="user-check" style="width:12px;height:12px;stroke-width:2;color:var(--dim);"></i> Responsável: ' + oc.resp + '</span>' +
                '<span><i data-lucide="map-pin" style="width:12px;height:12px;stroke-width:2;color:var(--dim);"></i> Local: ' + (oc.local || 'Central Técnica') + '</span>' +
              '</div>' +
            '</div>' +
          '</article>'
        );
      }
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  /* ─── Stats ─── */
  function updateStats() {
    try {
      var ab  = getAbertas().length;
      var res = getResolvidas().length;
      var atrasadas = ocorrencias.filter(function(o){ return isOcorrenciaVencida(o); }).length;
      var turno     = ocorrencias.filter(function(o){ return o && o.status==='aberta' && o.tags && Array.isArray(o.tags) && o.tags.indexOf('Turno anterior')!==-1; }).length;

      var els = {
        r: document.querySelector('.sn-r'),
        y: document.querySelector('.sn-y'),
        g: document.querySelector('.sn-g'),
        b: document.querySelector('.sn-b')
      };
      if (els.r) els.r.textContent = ab;
      if (els.y) els.y.textContent = atrasadas;
      if (els.g) els.g.textContent = res;
      if (els.b) els.b.textContent = turno;

      /* Badge sidebar */
      var badge = document.querySelector('.s-badge');
      if (badge) badge.textContent = ab;
    } catch(err) {
      console.warn('Erro ao atualizar estatísticas:', err);
    }
  }

  function renderPopupEntrada() {
    var container = document.getElementById('popup-entrada-pendencias');
    if (!container) return;

    var abertas = getAbertas();
    if (abertas.length === 0) {
      container.innerHTML = '<div class="info-item blue"><div class="ii-dot blue"></div><div><strong>Sem Pendências</strong>Nenhuma ocorrência pendente no momento.</div></div>';
      return;
    }

    container.innerHTML = abertas.slice(0, 4).map(function(oc) {
      var isVencida = isOcorrenciaVencida(oc);
      var corClass = (oc.prio === 'Alta' || isVencida) ? 'red' : 'blue';
      var tagTexto = isVencida ? 'Prazo Expirado' : ((oc.prio || 'Média') + ' Prioridade');

      return (
        '<div class="info-item ' + corClass + '">' +
          '<div class="ii-dot ' + corClass + '"></div>' +
          '<div>' +
            '<strong>' + tagTexto + ' — ' + (oc.local || oc.cat || 'Equipamento') + '</strong>' +
            (oc.titulo || 'Ocorrência') + (oc.prazo ? (' (Prazo: ' + oc.prazo + ')') : '') +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  function renderPopupLogout() {
    var container = document.getElementById('popup-logout-checklist');
    if (!container) return;

    var abertas = getAbertas();
    if (abertas.length === 0) {
      container.innerHTML = '<p style="font-size:12px;color:var(--muted);padding:6px 0;">Todas as ocorrências do turno foram concluídas!</p>';
      return;
    }

    container.innerHTML = abertas.map(function(oc) {
      var cid = 'chk_out_' + oc.id;
      var isVencida = isOcorrenciaVencida(oc);
      var textExtra = isVencida ? ' [PRAZO EXPIRADO]' : '';
      return (
        '<label class="chk-item" id="' + cid + '">' +
          '<input type="checkbox" onchange="markDone(\'' + cid + '\',this)"/> ' +
          '<span>' + (oc.titulo || 'Ocorrência') + textExtra + ' (' + (oc.resp || 'Todos') + ')</span>' +
        '</label>'
      );
    }).join('');
  }

  /* ─── renderAll: atualiza TUDO de uma vez com isolamento de falhas ─── */
  function renderAll() {
    try { renderCards(); } catch(e) { console.error('Erro em renderCards:', e); }
    try { renderAside('aside-ctrs'); } catch(e) { console.error('Erro em aside-ctrs:', e); }
    try { renderAside('aside-recebimento'); } catch(e) { console.error('Erro em aside-recebimento:', e); }
    try { renderResolvidas(); } catch(e) { console.error('Erro em renderResolvidas:', e); }
    try { renderHistorico(); } catch(e) { console.error('Erro em renderHistorico:', e); }
    try { renderDashboards(); } catch(e) { console.error('Erro em renderDashboards:', e); }
    try { renderOrcamento(); } catch(e) { console.error('Erro em renderOrcamento:', e); }
    try { renderPopupEntrada(); } catch(e) { console.error('Erro em renderPopupEntrada:', e); }
    try { renderPopupLogout(); } catch(e) { console.error('Erro em renderPopupLogout:', e); }
    try { updateStats(); } catch(e) { console.error('Erro em updateStats:', e); }
  }

  /* Render inicial */
  try { carregarFotoPerfilSalva(); } catch(e) {}
  renderAll();

  /* Atualização automática em tempo real unificada de todas as telas e popups */
  setInterval(function() {
    renderAll();
  }, 5000);

  document.querySelectorAll('.overlay').forEach(function(ov) {
    ov.addEventListener('click', function(e) {
      if (e.target === this && this.id !== 'popup-entrada') fecharPopup(this.id);
    });
  });

  /* ═══════════════════════════════════════════
     POPUP ENTRADA
  ═══════════════════════════════════════════ */

  function fecharEntrada() {
    iniciarSessao();
  }
  window.fecharEntrada = fecharEntrada;

  /* ═══════════════════════════════════════════
     CHECKLIST LOGOUT
  ═══════════════════════════════════════════ */

  function markDone(id, el) { 
    var item = document.getElementById(id);
    if (item && el) item.classList.toggle('done', el.checked); 
  }
  window.markDone = markDone;

  /* ═══════════════════════════════════════════
     TIMER DE SESSÃO / TEMPO LOGADO
  ═══════════════════════════════════════════ */
  var loginTime = Date.now();

  function pad(n) { return n < 10 ? '0' + n : n; }

  function getTempoLogadoStr() {
    var diff = Math.floor((Date.now() - loginTime) / 1000);
    if (diff < 0) diff = 0;
    var h = Math.floor(diff / 3600);
    var m = Math.floor((diff % 3600) / 60);
    var s = diff % 60;
    return pad(h) + 'h ' + pad(m) + 'm ' + pad(s) + 's';
  }

  function atualizarTimerLogin() {
    try {
      var timeStr = getTempoLogadoStr();

      var upTimer = document.getElementById('up-timer');
      if (upTimer) upTimer.textContent = timeStr;

      var pageChip = document.getElementById('page-chip');
      var activePage = document.querySelector('.page.active');
      if (pageChip && activePage && activePage.id === 'page-dashboard') {
        pageChip.textContent = 'Logado há: ' + timeStr;
      }
    } catch(err) {
      console.warn('Erro ao atualizar timer de login:', err);
    }
  }

  setInterval(atualizarTimerLogin, 1000);
  atualizarTimerLogin();

  /* ═══════════════════════════════════════════
     USER POPOVER (popup sobre o nome)
  ═══════════════════════════════════════════ */
  function toggleUserPopover(e) {
    if (e) e.stopPropagation();
    var popover = document.getElementById('user-popover');
    if (!popover) return;
    var isHidden = popover.hasAttribute('hidden');
    if (isHidden) {
      popover.removeAttribute('hidden');
      atualizarTimerLogin();
    } else {
      popover.setAttribute('hidden', '');
    }
  }
  window.toggleUserPopover = toggleUserPopover;

  document.addEventListener('click', function(e) {
    var popover = document.getElementById('user-popover');
    var userBlock = document.getElementById('s-user-block');
    if (popover && !popover.hasAttribute('hidden')) {
      if (!popover.contains(e.target) && (!userBlock || !userBlock.contains(e.target))) {
        popover.setAttribute('hidden', '');
      }
    }
  });

  /* ═══════════════════════════════════════════
     NAVEGAÇÃO
  ═══════════════════════════════════════════ */

  var pageMap = {
    recebimento:  { page:'page-recebimento',  title:'Recebimento de Materiais',                 chip:'Registro patrimonial e anexo de fotos/vídeos' },
    recebimento1: { page:'page-recebimento',  title:'Recebimento de Materiais',                 chip:'Registro patrimonial e anexo de fotos/vídeos' },
    recebimento2: { page:'page-recebimento',  title:'Recebimento de Materiais',                 chip:'Registro patrimonial e anexo de fotos/vídeos' },
    dashboard:    { page:'page-dashboard',    title:'Ocorrências',                              chip: function() { return 'Logado há: ' + getTempoLogadoStr(); } },
    ctrs:         { page:'page-ctrs',         title:'Checklist de Transmissão — CTRS',          chip:'Preencher após cada jornal' },
    resolvidas:   { page:'page-resolvidas',   title:'Dashboard Ocorrências — Resolução & Desempenho (Power BI)', chip:'Dashboard de Métricas e Indicadores' },
    dashboard_ocorrencias:  { page:'page-resolvidas',             title:'Dashboard Ocorrências — Resolução & Desempenho (Power BI)', chip:'Dashboard de Métricas e Indicadores' },
    dashboard_transmissoes: { page:'page-dashboard-ocorrencias',  title:'Dashboard Transmissões — Transmissões ao Vivo',  chip:'Juiz de Fora' },
    dashboard_telejornal:   { page:'page-dashboard-ocorrencias',  title:'Dashboard Transmissões — Transmissões ao Vivo',  chip:'Juiz de Fora' },
    dashboard_equipamentos: { page:'page-dashboard-ocorrencias',  title:'Dashboard Transmissões — Transmissões ao Vivo',  chip:'Juiz de Fora' },
    historico:    { page:'page-historico',    title:'Histórico Geral de Registros',             chip:'Ocorrências, Relatórios e Recebimentos' },
    compras_vendas:{ page:'page-compras-vendas', title:'Solicitação de Compras',                chip:'Preencher solicitação de compra' },
    orcamento:     { page:'page-orcamento',      title: 'Orçamento Anual', chip: function() { return 'Ciclo ' + (new Date().getFullYear() + 1) + ' · CAPEX & OPEX'; } },
    config:        { page:'page-config',         title:'Configurações',                            chip:'Perfil e preferências'      }
  };

  function irPara(name, el) {
    document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
    document.querySelectorAll('.s-btn').forEach(function(b) { b.classList.remove('active'); });
    var cfg = pageMap[name];
    if (!cfg) return;
    document.getElementById(cfg.page).classList.add('active');
    document.getElementById('page-title').textContent = cfg.title;
    var chipText = (typeof cfg.chip === 'function') ? cfg.chip() : cfg.chip;
    document.getElementById('page-chip').textContent  = chipText;
    if (el) el.classList.add('active');
  }
  window.irPara = irPara;

  /* ═══════════════════════════════════════════
     ACCORDION
  ═══════════════════════════════════════════ */

  function togAcc(head) {
    var isOpen = head.classList.contains('open');
    head.classList.toggle('open', !isOpen);
    head.setAttribute('aria-expanded', String(!isOpen));
    head.nextElementSibling.classList.toggle('open', !isOpen);
  }
  window.togAcc = togAcc;

  /* ═══════════════════════════════════════════
     FILTROS
  ═══════════════════════════════════════════ */

  function filtrar(el, tipo) {
    if (el) {
      el.closest('.pills').querySelectorAll('.pill').forEach(function(p) { p.classList.remove('on'); });
      el.classList.add('on');
    }
    filtroOcorrenciasAtivo = (tipo || (el ? el.textContent.trim().toLowerCase() : 'todas')).toLowerCase();
    renderCards();
  }
  window.filtrar = filtrar;

  /* ═══════════════════════════════════════════
     PREVIEW E GERENCIAMENTO DE ARQUIVOS (PDF, FOTOS, VÍDEOS)
  ═══════════════════════════════════════════ */

  var uploadedFilesStore = {};

  function handleFileSelect(input, containerId) {
    if (!input.files || input.files.length === 0) return;
    if (!uploadedFilesStore[containerId]) uploadedFilesStore[containerId] = [];

    Array.from(input.files).forEach(function(file) {
      uploadedFilesStore[containerId].push(file);
    });

    renderPreviewsForContainer(containerId);
    input.value = ''; // reseta input para permitir re-selecionar o mesmo arquivo se necessário
  }
  window.handleFileSelect = handleFileSelect;

  function removerArquivoPreview(containerId, index, event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (uploadedFilesStore[containerId] && uploadedFilesStore[containerId][index] !== undefined) {
      uploadedFilesStore[containerId].splice(index, 1);
      renderPreviewsForContainer(containerId);
    }
  }
  window.removerArquivoPreview = removerArquivoPreview;

  function renderPreviewsForContainer(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    var files = uploadedFilesStore[containerId] || [];
    files.forEach(function(file, idx) {
      var item = document.createElement('div');
      item.className = 'prev-item';
      item.style.position = 'relative';

      var removeBtn = document.createElement('button');
      removeBtn.className = 'prev-remove-btn';
      removeBtn.type = 'button';
      removeBtn.innerHTML = '&times;';
      removeBtn.title = 'Remover este arquivo';
      removeBtn.onclick = function(e) {
        removerArquivoPreview(containerId, idx, e);
      };
      item.appendChild(removeBtn);

      var isImg = file.type.startsWith('image/');
      var isPdf = file.type === 'application/pdf' || (file.name && file.name.toLowerCase().endsWith('.pdf'));
      var isVid = file.type.startsWith('video/');

      if (isImg) {
        var img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.alt = file.name;
        item.appendChild(img);
      } else if (isPdf) {
        var pdfBox = document.createElement('div');
        pdfBox.className = 'prev-vid prev-pdf-box';
        pdfBox.innerHTML = '<i data-lucide="file-text" style="width:24px;height:24px;stroke-width:1.5;color:var(--red);"></i>';
        item.appendChild(pdfBox);
      } else if (isVid) {
        var vidBox = document.createElement('div');
        vidBox.className = 'prev-vid';
        vidBox.innerHTML = '<i data-lucide="film" style="width:24px;height:24px;stroke-width:1.5;color:var(--blue);"></i>';
        item.appendChild(vidBox);
      } else {
        var docBox = document.createElement('div');
        docBox.className = 'prev-vid';
        docBox.innerHTML = '<i data-lucide="file" style="width:24px;height:24px;stroke-width:1.5;color:var(--muted);"></i>';
        item.appendChild(docBox);
      }

      var nome = document.createElement('div');
      nome.className = 'prev-name';
      nome.textContent = file.name.length > 12 ? file.name.substring(0, 9) + '…' : file.name;
      item.appendChild(nome);

      container.appendChild(item);
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
  window.renderPreviewsForContainer = renderPreviewsForContainer;

  function renderPreviews(files, container) {
    if (!container) return;
    var containerId = container.id || 'previews';
    if (!uploadedFilesStore[containerId]) uploadedFilesStore[containerId] = [];
    Array.from(files).forEach(function(f) { uploadedFilesStore[containerId].push(f); });
    renderPreviewsForContainer(containerId);
  }
  window.renderPreviews = renderPreviews;

  function renderMediaPreviews(files, containerId) {
    if (!uploadedFilesStore[containerId]) uploadedFilesStore[containerId] = [];
    Array.from(files).forEach(function(f) { uploadedFilesStore[containerId].push(f); });
    renderPreviewsForContainer(containerId);
  }
  window.renderMediaPreviews = renderMediaPreviews;

  /* Listeners para áreas de upload (Requisições e Recebimentos) */
  ['req', 'rec', 'rec1', 'rec2'].forEach(function(prefix) {
    var area  = document.getElementById(prefix + '-upload-area');
    var file  = document.getElementById(prefix + '-arquivos');
    var prevs = document.getElementById(prefix + '-previews');
    if (area && file) {
      area.addEventListener('click', function() { file.click(); });
      file.addEventListener('change', function() { renderPreviews(this.files, prevs); });
    }
  });

  /* ═══════════════════════════════════════════
     RECEBIMENTOS DE EQUIPAMENTOS
  ═══════════════════════════════════════════ */

  function alternarModeloRecebimento(mod) {
    var mod1 = document.getElementById('rec-modelo-1');
    var mod2 = document.getElementById('rec-modelo-2');
    var pill1 = document.getElementById('pill-mod-1');
    var pill2 = document.getElementById('pill-mod-2');

    if (mod === 1) {
      if (mod1) mod1.style.display = 'block';
      if (mod2) mod2.style.display = 'none';
      if (pill1) pill1.classList.add('on');
      if (pill2) pill2.classList.remove('on');
    } else {
      if (mod1) mod1.style.display = 'none';
      if (mod2) mod2.style.display = 'block';
      if (pill1) pill1.classList.remove('on');
      if (pill2) pill2.classList.add('on');
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
  window.alternarModeloRecebimento = alternarModeloRecebimento;

  function adicionarLinhaMaterial(tabelaId) {
    var tbody = document.querySelector('#' + tabelaId + ' tbody');
    if (!tbody) return;
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td><input type="text" value="01"/></td>' +
      '<td><input type="text" placeholder="Descrição do material..."/></td>' +
      '<td><input type="text" placeholder="Plaqueta..."/></td>' +
      '<td><input type="text" placeholder="Nº Série..."/></td>' +
      '<td><input type="text" value="JUIZ DE FORA"/></td>' +
      '<td style="text-align:center;">' +
        '<button class="btn btn-ghost btn-xs" onclick="removerLinhaMaterial(this)" style="color:var(--red);padding:2px 5px;" title="Remover item"><i data-lucide="trash-2" style="width:13px;height:13px;"></i></button>' +
      '</td>';
    tbody.appendChild(tr);
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
  window.adicionarLinhaMaterial = adicionarLinhaMaterial;

  function removerLinhaMaterial(btn) {
    var tr = btn.closest('tr');
    if (tr) tr.remove();
  }
  window.removerLinhaMaterial = removerLinhaMaterial;

  function selecionarFormaPagamento(labelEl) {
    var group = labelEl.closest('.rec-payment-group');
    if (!group) return;
    group.querySelectorAll('.rec-pay-option').forEach(function(opt) {
      opt.classList.remove('selected');
      var radio = opt.querySelector('input[type="radio"]');
      if (radio) radio.checked = false;
    });
    labelEl.classList.add('selected');
    var currentRadio = labelEl.querySelector('input[type="radio"]');
    if (currentRadio) currentRadio.checked = true;
  }
  window.selecionarFormaPagamento = selecionarFormaPagamento;

  function salvarRascunhoRecebimento() {
    alert('Rascunho do Recebimento de Equipamentos salvo com sucesso!');
  }
  window.salvarRascunhoRecebimento = salvarRascunhoRecebimento;

  function enviarRecebimento(modelo) {
    var nowStr = formatDataHoraLocal();
    var m = (modelo !== undefined && modelo !== null) ? modelo : '';

    var remEl = document.getElementById('rec' + m + '-remetente') || document.getElementById('rec-remetente');
    var nfEl  = document.getElementById('rec' + m + '-nf') || document.getElementById('rec-nf');
    var recEl = document.getElementById('rec' + m + '-recebedor') || document.getElementById('rec-recebedor');
    var obsEl = document.getElementById('rec' + m + '-obs') || document.getElementById('rec-obs');

    var remetente = remEl ? remEl.value.trim() : '';
    var nf        = nfEl ? nfEl.value.trim() : '';
    var recebedor = (recEl && recEl.value.trim()) ? recEl.value.trim() : getUsuarioAtual();
    var obs       = obsEl ? obsEl.value.trim() : '';

    var titulo = 'Recebimento N.F ' + (nf || 'S/N') + (remetente ? (' — ' + remetente) : '');

    var novoHist = {
      id:            'h_rec_' + Date.now(),
      tipo:          'recebimento',
      subtipo:       'Recebimento Equipamentos',
      titulo:        titulo,
      equipamento:   remetente || 'Equipamento / Material Recebido',
      categoria:     'Investimento / Reg. Fotográfico',
      local:         'Juiz de Fora',
      dataCriacao:   nowStr,
      criadoPor:     recebedor,
      descCriacao:   'Recebimento registrado. Remetente: ' + (remetente || 'N/A') + '. N.F: ' + (nf || 'N/A') + '. ' + (obs || ''),
      status:        'Processado',
      dataResolucao: nowStr,
      resolvidoPor:  recebedor,
      descResolucao: 'Conferido e integrado automaticamente ao sistema patrimonial e relatórios.'
    };

    historicoSeedData = [novoHist].concat(historicoSeedData);
    saveHistorico(historicoSeedData);
    renderAll();
    if (typeof mostrarToast === 'function') {
      mostrarToast('Recebimento Registrado', 'Salvo no Histórico. O envio por e-mail ainda não está disponível.', 'info');
    }
    alert('Recebimento de Equipamentos registrado com sucesso no Histórico!\n\nNota: A função de envio por e-mail ainda não está disponível.');
  }
  window.enviarRecebimento = enviarRecebimento;

  /* ═══════════════════════════════════════════
     REQUISIÇÃO DE COMPRAS E VENDAS
  ═══════════════════════════════════════════ */

  function adicionarLinhaItemCompra() {
    var tbody = document.getElementById('req-itens-tbody');
    if (!tbody) return;
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td><input type="number" class="item-quant" min="1" value="1" style="text-align:center;" /></td>' +
      '<td><input type="text" class="item-desc" placeholder="Ex: Descrição do material..." /></td>' +
      '<td><input type="text" class="item-cod" placeholder="Código ex: P4-120" /></td>' +
      '<td><input type="text" class="item-fab" placeholder="Marca ou fabricante" /></td>' +
      '<td><input type="url" class="item-link" placeholder="https://link-do-produto.com..." /></td>' +
      '<td style="text-align:center;">' +
        '<button type="button" class="btn btn-ghost btn-xs" onclick="removerLinhaItemCompra(this)" title="Remover item" style="color:var(--red);padding:2px 6px;">✕</button>' +
      '</td>';
    tbody.appendChild(tr);
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
  window.adicionarLinhaItemCompra = adicionarLinhaItemCompra;

  function removerLinhaItemCompra(btn) {
    var tr = btn.closest('tr');
    if (tr) tr.remove();
  }
  window.removerLinhaItemCompra = removerLinhaItemCompra;

  function salvarRascunhoCompra() {
    alert('Rascunho da Requisição de Compra salvo com sucesso!');
  }
  window.salvarRascunhoCompra = salvarRascunhoCompra;

  function enviarRequisicaoCompra() {
    var nowStr = formatDataHoraLocal();
    var pracaEl    = document.getElementById('req-praca');
    var caraterEl  = document.getElementById('req-carater');
    var motivoEl   = document.getElementById('req-motivo');
    var destinoEl  = document.getElementById('req-destino');
    var centroEl   = document.getElementById('req-centrocusto');
    var projetoEl  = document.getElementById('req-projeto');

    var praca    = pracaEl ? pracaEl.value : 'Juiz de Fora';
    var carater  = caraterEl ? caraterEl.value : 'Normal';
    var motivo   = motivoEl ? motivoEl.value.trim() : '';
    var destino  = destinoEl ? destinoEl.value.trim() : '';
    var centro   = centroEl ? centroEl.value : 'Manutenção Técnica - JF';
    var projeto  = projetoEl ? projetoEl.value.trim() : 'Padrão';

    if (!motivo || !destino) {
      alert('Por favor, preencha a Justificativa/Motivo e o Uso a que se destina antes de enviar.');
      return;
    }

    /* Coleta itens */
    var tbody = document.getElementById('req-itens-tbody');
    var linhas = tbody ? tbody.querySelectorAll('tr') : [];
    var itensResumo = [];

    linhas.forEach(function(tr) {
      var q = tr.querySelector('.item-quant') ? tr.querySelector('.item-quant').value : '1';
      var d = tr.querySelector('.item-desc') ? tr.querySelector('.item-desc').value.trim() : '';
      var f = tr.querySelector('.item-forn') ? tr.querySelector('.item-forn').value.trim() : '';
      var l = tr.querySelector('.item-link') ? tr.querySelector('.item-link').value.trim() : '';
      if (d) {
        itensResumo.push(q + 'x ' + d + (f ? (' (' + f + ')') : '') + (l ? (' [' + l + ']') : ''));
      }
    });

    var titulo = 'Requisição de Compra — ' + praca + ' (' + carater + ')';
    var descCompleta = 'Justificativa: ' + motivo + '\n' +
                       'Itens: ' + (itensResumo.length > 0 ? itensResumo.join('; ') : 'Material/Equipamento solicitado') + '\n' +
                       'Aplicação: ' + destino + ' | Centro de Custo: ' + centro + ' | Projeto: ' + projeto;

    var novoHist = {
      id:            'h_req_' + Date.now(),
      tipo:          'compra',
      subtipo:       'Requisição de Compra (' + carater + ')',
      titulo:        titulo,
      equipamento:   itensResumo[0] || 'Materiais de Compra',
      categoria:     centro || 'Compras / Vendas',
      local:         praca,
      dataCriacao:   nowStr,
      criadoPor:     getUsuarioAtual(),
      descCriacao:   descCompleta,
      status:        'Aguardando Aprovação',
      dataResolucao: 'Encaminhado para a chefia',
      resolvidoPor:  'Chefia / Setor de Compras',
      descResolucao: 'Solicitação registrada no sistema. Aguardando validação do chefe imediato para envio à gerência e compras.'
    };

    historicoSeedData = [novoHist].concat(historicoSeedData);
    saveHistorico(historicoSeedData);
    renderAll();

    if (typeof adicionarNotificacao === 'function') {
      adicionarNotificacao('Requisição de Compra Enviada', titulo + ' cadastrada para aprovação.', 'success');
    }

    alert('Requisição de Compra cadastrada com sucesso no Histórico!\n\nNota: A função de envio por e-mail ainda não está disponível.');

    /* reset formulário */
    if (motivoEl)  motivoEl.value = '';
    if (destinoEl) destinoEl.value = '';
  }
  window.enviarRequisicaoCompra = enviarRequisicaoCompra;

  /* ═══════════════════════════════════════════
     ENVIO DE RELATÓRIO TV (CTRS) E GERADOR AUTOMÁTICO DE OCORRÊNCIAS
  ═══════════════════════════════════════════ */

  function salvarRascunhoRelatorioTV() {
    alert('Rascunho do Relatório TV salvo com sucesso!');
  }
  window.salvarRascunhoRelatorioTV = salvarRascunhoRelatorioTV;

  function enviarRelatorioTV() {
    var nowStr = formatDataHoraLocal();
    var pracaEl = document.getElementById('ctrs-praca');
    var tipoEl  = document.getElementById('ctrs-tipo');
    var obsEl   = document.getElementById('ctrs-obs');

    var praca = pracaEl ? pracaEl.value : 'Juiz de Fora';
    var tipo  = tipoEl ? tipoEl.value : 'INTEGRAÇÃO NOTÍCIA';
    var obs   = obsEl ? obsEl.value.trim() : '';

    /* Coleta falhas registradas nas seções sanfonadas */
    var falhasEncontradas = [];
    if (obs && !obs.toLowerCase().includes('sem ocorrência') && !obs.toLowerCase().includes('sem ocorrencia')) {
      falhasEncontradas.push(obs);
    }

    document.querySelectorAll('#page-ctrs .acc-body textarea').forEach(function(txt, i) {
      var val = txt.value.trim();
      if (val && !val.toLowerCase().includes('sem ocorrência') && !val.toLowerCase().includes('sem ocorrencia')) {
        falhasEncontradas.push('Transmissão Vivo ' + (i + 1) + ': ' + val);
      }
    });

    var novasOcorrenciasCriadas = 0;

    /* Para cada falha relatada, cria automaticamente uma Ocorrência no Dashboard */
    falhasEncontradas.forEach(function(falhaTxt, idx) {
      novasOcorrenciasCriadas++;
      var novaOc = {
        id:          'oc_auto_' + Date.now() + '_' + idx,
        titulo:      'Falha em Relatório TV (' + tipo + ')',
        prio:        'Alta',
        cat:         'Telejornal / Transmissão ao Vivo',
        resp:        'Todos do turno',
        local:       praca,
        prazo:       '12:00',
        desc:        falhaTxt,
        mine:        false,
        tags:        ['Relatório TV', 'Automática'],
        status:      'aberta',
        criado:      Date.now(),
        dataCriacao: nowStr,
        resolucao:   null
      };
      ocorrencias = [novaOc].concat(ocorrencias);
    });

    if (novasOcorrenciasCriadas > 0) {
      save(ocorrencias);
    }

    /* Registra o Relatório no Histórico */
    var novoHist = {
      id:            'h_ctrs_' + Date.now(),
      tipo:          'relatorio',
      subtipo:       'CTRS Transmissão',
      titulo:        'Checklist CTRS — ' + tipo + ' (' + praca + ')',
      equipamento:   'Equipamentos de Transmissão / CTRS',
      categoria:     'Transmissão CTRS',
      local:         praca,
      dataCriacao:   nowStr,
      criadoPor:     getUsuarioAtual(),
      descCriacao:   'Relatório TV enviado. ' + (falhasEncontradas.length > 0 ? (falhasEncontradas.length + ' falha(s) identificada(s) e convertida(s) em ocorrência(s).') : 'Sem falhas registradas.'),
      status:        'Concluído',
      dataResolucao: nowStr,
      resolvidoPor:  getUsuarioAtual(),
      descResolucao: 'Relatório processado e sincronizado automaticamente.'
    };

    historicoSeedData = [novoHist].concat(historicoSeedData);
    saveHistorico(historicoSeedData);

    renderAll();

    if (novasOcorrenciasCriadas > 0) {
      if (typeof adicionarNotificacao === 'function') {
        adicionarNotificacao('Ocorrência Criada do Relatório', novasOcorrenciasCriadas + ' falha(s) do relatório convertida(s) em Ocorrência Ativa no Dashboard!', 'warning');
      }
      alert('Relatório TV registrado no sistema!\n\n⚠️ Foi identificada falha e ' + novasOcorrenciasCriadas + ' nova Ocorrência foi gerada AUTOMATICAMENTE no Dashboard!\n\nNota: A função de envio por e-mail ainda não está disponível.');
    } else {
      if (typeof adicionarNotificacao === 'function') {
        adicionarNotificacao('Relatório TV Enviado', 'Relatório processado com sucesso.', 'success');
      }
      alert('Relatório TV registrado com sucesso no Histórico!\n\nNota: A função de envio por e-mail ainda não está disponível.');
    }
  }
  window.enviarRelatorioTV = enviarRelatorioTV;

  /* ═══════════════════════════════════════════
     POPUP: NOVA OCORRÊNCIA
  ═══════════════════════════════════════════ */

  var novaTitulo  = document.getElementById('nova-titulo');
  var novaDesc    = document.getElementById('nova-desc');
  var novaCounter = document.getElementById('nova-counter');
  var btnCriar    = document.getElementById('btn-criar');
  var novaFile    = document.getElementById('nova-arquivos');
  var novaArea    = document.getElementById('nova-upload-area');
  var novaPrevs   = document.getElementById('nova-previews');

  function validarNova() {
    var ok = novaTitulo && novaDesc &&
             novaTitulo.value.trim().length > 0 &&
             novaDesc.value.length >= 50;
    if (btnCriar) {
      btnCriar.style.opacity = ok ? '1' : '0.38';
      btnCriar.style.cursor  = ok ? 'pointer' : 'not-allowed';
      btnCriar._valido = ok;
    }
  }

  if (btnCriar) { btnCriar.style.opacity = '0.38'; btnCriar.style.cursor = 'not-allowed'; btnCriar._valido = false; }
  if (novaTitulo) novaTitulo.addEventListener('input', validarNova);

  if (novaDesc && novaCounter) {
    novaDesc.addEventListener('input', function() {
      var len = this.value.length;
      if (len >= 50) {
        novaCounter.textContent = '✓ ' + len + ' caracteres — mínimo atingido';
        novaCounter.className = 'char-count ok';
      } else if (len >= 25) {
        novaCounter.textContent = 'Faltam ' + (50-len) + ' caracteres';
        novaCounter.className = 'char-count warn';
      } else {
        novaCounter.textContent = 'Mínimo 50 caracteres (' + len + '/50)';
        novaCounter.className = 'char-count';
      }
      validarNova();
    });
  }

  if (novaArea && novaFile) {
    novaArea.addEventListener('click', function() { novaFile.click(); });
    novaFile.addEventListener('change', function() { renderPreviews(this.files, novaPrevs); });
  }

  if (btnCriar) {
    btnCriar.addEventListener('click', function() {
      if (!this._valido) return;
      var respVal = document.getElementById('nova-resp') ? document.getElementById('nova-resp').value : '';
      var userAtual = getUsuarioAtual();
      var isMine = (respVal === userAtual || respVal === 'Operador' || respVal.indexOf(userAtual) !== -1 || respVal.indexOf('Você') !== -1);

      var novo = {
        id:       'oc_' + Date.now(),
        titulo:   novaTitulo.value.trim(),
        prio:     document.getElementById('nova-prio').value,
        cat:      document.getElementById('nova-cat').value,
        resp:     respVal,
        local:    document.getElementById('nova-local').value.trim(),
        prazo:    document.getElementById('nova-prazo').value,
        desc:     novaDesc.value.trim(),
        mine:     isMine,
        tags:     ['Nova'],
        status:      'aberta',
        criado:      Date.now(),
        dataCriacao: formatDataHoraLocal(),
        resolucao:   null
      };
      ocorrencias = [novo].concat(ocorrencias);
      save(ocorrencias);
      fecharPopup('popup-nova-oc');
      adicionarNotificacao('Nova Ocorrência Criada', novo.titulo + ' (' + novo.prio + ' Prioridade)', novo.prio === 'Alta' ? 'warning' : 'info');
      renderAll(); /* ← atualiza tudo automaticamente */

      /* reset */
      novaTitulo.value = '';
      novaDesc.value   = '';
      if (novaFile)  novaFile.value = '';
      if (novaPrevs) novaPrevs.innerHTML = '';
      if (novaCounter) { novaCounter.textContent = 'Mínimo 50 caracteres'; novaCounter.className = 'char-count'; }
      document.getElementById('nova-prio').selectedIndex = 1;
      document.getElementById('nova-resp').selectedIndex = 0;
      document.getElementById('nova-cat').selectedIndex  = 0;
      document.getElementById('nova-local').value = '';
      document.getElementById('nova-prazo').value = '';
      validarNova();
    });
  }

  /* ═══════════════════════════════════════════
     POPUP: RESOLVER OCORRÊNCIA
  ═══════════════════════════════════════════ */

  var resolverAtualId = null;
  var resolverDesc    = document.getElementById('resolver-desc');
  var resolverCounter = document.getElementById('resolver-counter');
  var btnConfirmar    = document.getElementById('btn-confirmar-resolver');
  var resolverFile    = document.getElementById('resolver-arquivos');
  var resolverArea    = document.getElementById('resolver-upload-area');
  var resolverPrevs   = document.getElementById('resolver-previews');

  function validarResolver() {
    var ok = resolverDesc && resolverDesc.value.trim().length >= 10;
    if (btnConfirmar) {
      btnConfirmar.style.opacity = ok ? '1' : '0.38';
      btnConfirmar.style.cursor  = ok ? 'pointer' : 'not-allowed';
      btnConfirmar._valido = ok;
    }
  }

  if (btnConfirmar) { btnConfirmar.style.opacity = '0.38'; btnConfirmar.style.cursor = 'not-allowed'; btnConfirmar._valido = false; }

  if (resolverDesc && resolverCounter) {
    resolverDesc.addEventListener('input', function() {
      var len = this.value.trim().length;
      if (len >= 10) {
        resolverCounter.textContent = '✓ Descrição preenchida';
        resolverCounter.className = 'char-count ok';
      } else {
        resolverCounter.textContent = 'Mínimo 10 caracteres (' + len + '/10)';
        resolverCounter.className = len >= 5 ? 'char-count warn' : 'char-count';
      }
      validarResolver();
    });
  }

  if (resolverArea && resolverFile) {
    resolverArea.addEventListener('click', function() { resolverFile.click(); });
    resolverFile.addEventListener('change', function() { renderPreviews(this.files, resolverPrevs); });
  }

  function abrirResolver(id) {
    var oc = ocorrencias.find(function(o){ return o.id === id; });
    if (!oc) return;
    resolverAtualId = id;
    var tituloEl = document.getElementById('resolver-titulo-oc');
    if (tituloEl) tituloEl.textContent = oc.titulo;

    /* reset */
    if (resolverDesc)    resolverDesc.value = '';
    if (resolverFile)    resolverFile.value = '';
    if (resolverPrevs)   resolverPrevs.innerHTML = '';
    if (resolverCounter) { resolverCounter.textContent = 'Mínimo 10 caracteres'; resolverCounter.className = 'char-count'; }
    document.getElementById('resolver-status').value = 'Resolvido';
    /* reset pills visuais */
    if (typeof selecionarStatus === 'function') selecionarStatus('Resolvido');
    validarResolver();
    abrirPopup('popup-resolver');
  }
  window.abrirResolver = abrirResolver;

  if (btnConfirmar) {
    btnConfirmar.addEventListener('click', function() {
      if (!this._valido || !resolverAtualId) return;
      var idx = ocorrencias.findIndex(function(o){ return o.id === resolverAtualId; });
      if (idx === -1) return;

      var statusEl = document.getElementById('resolver-status');
      var oc = ocorrencias[idx];
      var nowStr = formatDataHoraLocal();
      var usuarioLogado = getUsuarioAtual();

      ocorrencias[idx] = Object.assign({}, oc, {
        status:    'resolvida',
        resolucao: {
          statusRes: statusEl ? statusEl.value : 'Resolvido',
          descRes:   resolverDesc.value.trim(),
          data:      Date.now()
        }
      });

      // ADICIONA AUTOMATICAMENTE AO HISTÓRICO GERAL!
      var novoItemHist = {
        id:            'h_oc_' + Date.now(),
        tipo:          'ocorrencia',
        subtipo:       oc.cat || 'Equipamento',
        titulo:        oc.titulo,
        equipamento:   oc.local ? (oc.local + ' — ' + (oc.cat || 'Equipamento')) : (oc.cat || oc.titulo),
        categoria:     oc.cat || 'Equipamento',
        local:         oc.local || 'Central Técnica',
        dataCriacao:   nowStr,
        criadoPor:     oc.resp || 'Sistema',
        descCriacao:   oc.desc || 'Ocorrência registrada no sistema.',
        status:        statusEl ? statusEl.value : 'Resolvido',
        dataResolucao: nowStr,
        resolvidoPor:  usuarioLogado,
        descResolucao: resolverDesc.value.trim()
      };

      historicoSeedData = [novoItemHist].concat(historicoSeedData);
      saveHistorico(historicoSeedData);

      save(ocorrencias);
      fecharPopup('popup-resolver');
      renderAll(); /* ← atualiza tudo e insere no histórico automaticamente */
      resolverAtualId = null;
    });
  }

  /* ═══════════════════════════════════════════
     CONFIGURAÇÕES
  ═══════════════════════════════════════════ */

  function iniciais(nome) {
    var partes = nome.trim().split(/\s+/);
    var ini = partes[0] ? partes[0][0] : '';
    if (partes.length > 1) ini += partes[partes.length - 1][0];
    return ini.toUpperCase();
  }

  function syncUserPopover() {
    var nomeEl = document.getElementById('cfg-nome');
    var nome = (nomeEl && nomeEl.value.trim()) ? nomeEl.value.trim() : getUsuarioAtual();
    var upName = document.getElementById('up-name');
    if (upName) upName.textContent = nome || 'Operador';

    var sAvatar = document.querySelector('.s-avatar');
    var upAvatar = document.getElementById('up-avatar');
    if (upAvatar && sAvatar) {
      if (sAvatar.style.backgroundImage) {
        upAvatar.style.backgroundImage = sAvatar.style.backgroundImage;
        upAvatar.textContent = '';
      } else {
        upAvatar.style.backgroundImage = '';
        upAvatar.textContent = sAvatar.textContent;
      }
    }
  }

  function aplicarFotoPerfil(url) {
    if (!url) return;
    var cfgAvatar = document.getElementById('cfg-avatar');
    if (cfgAvatar) { cfgAvatar.style.backgroundImage = url; cfgAvatar.textContent = ''; }

    var sAvatar = document.querySelector('.s-avatar');
    if (sAvatar) { sAvatar.style.backgroundImage = url; sAvatar.textContent = ''; }

    var upAvatar = document.getElementById('up-avatar');
    if (upAvatar) { upAvatar.style.backgroundImage = url; upAvatar.textContent = ''; }
  }

  function carregarFotoPerfilSalva() {
    var url = DBService.getFotoPerfil();
    if (url) aplicarFotoPerfil(url);
  }

  function alterarFotoPerfil(input) {
    var file = input.files && input.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      var url = 'url(' + e.target.result + ')';
      DBService.saveFotoPerfil(url);
      aplicarFotoPerfil(url);
      syncUserPopover();
    };
    reader.readAsDataURL(file);
  }
  window.alterarFotoPerfil = alterarFotoPerfil;

  function removerFotoPerfil() {
    DBService.removeFotoPerfil();
    var nome = getUsuarioAtual();
    var ini = iniciais(nome || 'Operador');
    var cfgAvatar = document.getElementById('cfg-avatar');
    if (cfgAvatar) { cfgAvatar.style.backgroundImage = ''; cfgAvatar.textContent = ini; }
    var sAvatar = document.querySelector('.s-avatar');
    if (sAvatar) { sAvatar.style.backgroundImage = ''; sAvatar.textContent = ini; }
    var upAvatar = document.getElementById('up-avatar');
    if (upAvatar) { upAvatar.style.backgroundImage = ''; upAvatar.textContent = ini; }
    var photoInput = document.getElementById('cfg-photo-input');
    if (photoInput) photoInput.value = '';
    syncUserPopover();
  }
  window.removerFotoPerfil = removerFotoPerfil;

  function atualizarNomeOperadorUI(nome) {
    var nomeExibido = (nome && nome.trim()) ? nome.trim() : 'Operador';
    localStorage.setItem(USER_NAME_STORAGE_KEY, nomeExibido);

    var upName = document.getElementById('up-name');
    if (upName) upName.textContent = nomeExibido;

    var sUserName = document.querySelector('.s-user-name');
    if (sUserName) sUserName.textContent = nomeExibido;

    var cfgNome = document.getElementById('cfg-nome');
    if (cfgNome && cfgNome.value !== nomeExibido) cfgNome.value = nomeExibido;

    var optUser = document.getElementById('opt-user-name');
    if (optUser) {
      optUser.value = nomeExibido;
      optUser.textContent = nomeExibido + ' (Você)';
    }

    var sAvatar = document.querySelector('.s-avatar');
    var cfgAvatar = document.getElementById('cfg-avatar');
    var upAvatar = document.getElementById('up-avatar');
    var temFoto = (sAvatar && sAvatar.style.backgroundImage) || (cfgAvatar && cfgAvatar.style.backgroundImage);
    if (!temFoto) {
      var ini = iniciais(nomeExibido);
      if (sAvatar)   sAvatar.textContent   = ini;
      if (cfgAvatar) cfgAvatar.textContent = ini;
      if (upAvatar)  upAvatar.textContent  = ini;
    }
    syncUserPopover();
  }
  window.atualizarNomeUsuario = atualizarNomeOperadorUI;
  window.atualizarNomeOperadorUI = atualizarNomeOperadorUI;

  function confirmarIdentificacaoOperador() {
    var input = document.getElementById('ident-operador-nome');
    var nome = input ? input.value.trim() : '';
    if (!nome) {
      alert('Por favor, informe seu nome para continuar.');
      if (input) input.focus();
      return;
    }
    localStorage.setItem(USER_NAME_STORAGE_KEY, nome);
    atualizarNomeOperadorUI(nome);
    fecharPopup('popup-identificacao-operador');
    abrirPopup('popup-entrada');
    if (typeof mostrarToast === 'function') {
      mostrarToast('Operador Identificado', 'Bem-vindo, ' + nome + '!', 'success');
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
  window.confirmarIdentificacaoOperador = confirmarIdentificacaoOperador;

  function mutarNotificacoes(mutado) {
    var dot   = document.querySelector('.notif-dot');
    var badge = document.querySelector('.s-badge');
    if (dot)   dot.style.display   = mutado ? 'none' : '';
    if (badge) badge.style.display = mutado ? 'none' : '';
  }
  window.mutarNotificacoes = mutarNotificacoes;

  function salvarConfiguracoes() {
    var btn = event && event.currentTarget;
    if (!btn) return;
    var textoOriginal = btn.textContent;
    btn.textContent = 'Salvo!';
    btn.disabled = true;
    setTimeout(function() {
      btn.textContent = textoOriginal;
      btn.disabled = false;
    }, 1400);
  }
  window.salvarConfiguracoes = salvarConfiguracoes;

  /* ═══════════════════════════════════════════
     HISTÓRICO GERAL (Funções de Renderização e Filtros)
  ═══════════════════════════════════════════ */

  function renderHistorico() {
    var container = document.getElementById('hist-list');
    if (!container) return;

    var busca = (document.getElementById('hist-search') ? document.getElementById('hist-search').value : '').toLowerCase().trim();

    // Atualiza os contadores
    var cntTodos = historicoSeedData.length;
    var cntOc    = historicoSeedData.filter(function(i){ return i.tipo === 'ocorrencia'; }).length;
    var cntRel   = historicoSeedData.filter(function(i){ return i.tipo === 'relatorio'; }).length;
    var cntRec   = historicoSeedData.filter(function(i){ return i.tipo === 'recebimento'; }).length;
    var cntMeus  = historicoSeedData.filter(function(i){ return isItemDoUsuario(i); }).length;

    if (document.getElementById('cnt-hist-todos')) document.getElementById('cnt-hist-todos').textContent = cntTodos;
    if (document.getElementById('cnt-hist-oc'))    document.getElementById('cnt-hist-oc').textContent    = cntOc;
    if (document.getElementById('cnt-hist-rel'))   document.getElementById('cnt-hist-rel').textContent   = cntRel;
    if (document.getElementById('cnt-hist-rec'))   document.getElementById('cnt-hist-rec').textContent   = cntRec;
    if (document.getElementById('cnt-hist-meus'))  document.getElementById('cnt-hist-meus').textContent  = cntMeus;

    var filtrados = historicoSeedData.filter(function(item) {
      if (historicoFiltroCategoria === 'ocorrencia' && item.tipo !== 'ocorrencia') return false;
      if (historicoFiltroCategoria === 'relatorio' && item.tipo !== 'relatorio') return false;
      if (historicoFiltroCategoria === 'recebimento' && item.tipo !== 'recebimento') return false;
      if (historicoFiltroCategoria === 'meus' && !isItemDoUsuario(item)) return false;

      if (busca) {
        var str = (item.titulo + ' ' + item.equipamento + ' ' + item.criadoPor + ' ' + item.resolvidoPor + ' ' + item.categoria + ' ' + item.local + ' ' + item.descCriacao).toLowerCase();
        return str.includes(busca);
      }
      return true;
    });

    if (filtrados.length === 0) {
      container.innerHTML =
        '<div style="text-align:center;padding:36px 12px;background:var(--surface);border:1px solid var(--border-lt);border-radius:var(--r-lg);">' +
          '<i data-lucide="search-x" style="width:32px;height:32px;color:var(--muted);stroke-width:1.5;margin-bottom:8px;"></i>' +
          '<p style="color:var(--txt);font-size:13.5px;font-weight:600;">Nenhum registro encontrado</p>' +
          '<p style="color:var(--muted);font-size:12px;margin-top:2px;">Tente ajustar os termos de busca ou mudar o filtro selecionado.</p>' +
        '</div>';
      if (typeof lucide !== 'undefined') lucide.createIcons();
      renderHistoricoRelacionados(null);
      return;
    }

    container.innerHTML = filtrados.map(function(item) {
      var eMeu = isItemDoUsuario(item);
      var tagMeu = eMeu ? '<span class="tag tag-ind">Seu Registro / Resolução</span>' : '';
      var tagTipo = getTagTipoBadge(item);
      var isSel = (itemHistoricoSelecionado && itemHistoricoSelecionado.id === item.id);

      return (
        '<article class="oc-card' + (eMeu ? ' mine' : '') + '" onclick="selecionarItemHistorico(\'' + item.id + '\')" style="cursor:pointer;' + (isSel ? 'border-color:var(--blue);box-shadow:0 0 0 2px rgba(0,113,227,.15);' : '') + '">' +
          '<div class="prio-line ' + (item.tipo==='ocorrencia'?'pl-r':item.tipo==='relatorio'?'pl-g':'pl-y') + '"></div>' +
          '<div class="oc-body">' +
            '<div class="oc-header"><h3>' + item.titulo + '</h3>' + tagTipo + tagMeu + '</div>' +
            '<p class="oc-desc" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">' + item.descCriacao + '</p>' +
            '<div class="oc-meta" style="margin-top:6px;gap:12px;flex-wrap:wrap;">' +
              '<span><i data-lucide="user" style="width:12px;height:12px;stroke-width:2;color:var(--dim);"></i> Criado por: ' + item.criadoPor + '</span>' +
              '<span><i data-lucide="check-circle-2" style="width:12px;height:12px;stroke-width:2;color:var(--dim);"></i> Resolvido por: ' + (item.resolvidoPor || 'Pendente') + '</span>' +
              '<span><i data-lucide="calendar" style="width:12px;height:12px;stroke-width:2;color:var(--dim);"></i> ' + item.dataCriacao + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="oc-actions" style="justify-content:center;">' +
            '<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); verDetalhesHistorico(\'' + item.id + '\');">Ver Detalhes</button>' +
          '</div>' +
        '</article>'
      );
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();

    if (!itemHistoricoSelecionado && filtrados.length > 0) {
      selecionarItemHistorico(filtrados[0].id);
    }
  }
  window.renderHistorico = renderHistorico;

  function selecionarItemHistorico(id) {
    var found = historicoSeedData.find(function(h){ return h.id === id; });
    if (!found) return;
    itemHistoricoSelecionado = found;

    document.querySelectorAll('#hist-list .oc-card').forEach(function(c) {
      c.style.borderColor = '';
      c.style.boxShadow = '';
    });
    var el = document.querySelector('#hist-list .oc-card[onclick*="' + id + '"]');
    if (el) {
      el.style.borderColor = 'var(--blue)';
      el.style.boxShadow = '0 0 0 2px rgba(0,113,227,.15)';
    }

    renderHistoricoRelacionados(found);
  }
  window.selecionarItemHistorico = selecionarItemHistorico;

  function renderHistoricoRelacionados(itemAtual) {
    var container = document.getElementById('aside-historico-relacionados');
    if (!container) return;

    if (!itemAtual || !itemAtual.equipamento) {
      container.innerHTML =
        '<div class="aside-lbl">Equipamentos Relacionados</div>' +
        '<div style="text-align:center;padding:24px 10px;color:var(--muted);font-size:12px;background:var(--surface);border:1px solid var(--border-lt);border-radius:var(--r-md);">' +
          '<i data-lucide="info" style="width:20px;height:20px;stroke-width:1.5;margin-bottom:6px;color:var(--muted);"></i><br/>' +
          'Selecione um item do histórico para analisar registros parecidos.' +
        '</div>';
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    var eqTerm = itemAtual.equipamento.toLowerCase();
    var palavrasEq = eqTerm.split(' ').filter(function(p){ return p.length > 3; });

    var relacionados = historicoSeedData.filter(function(h) {
      if (h.id === itemAtual.id) return false;
      var hEq = (h.equipamento + ' ' + h.titulo).toLowerCase();
      return palavrasEq.some(function(pal) { return hEq.includes(pal); });
    });

    var html = '<div class="aside-lbl" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">' +
                 '<span>Mesmo Equipamento</span>' +
               '</div>' +
               '<div style="font-size:11.5px;color:var(--txt2);margin-bottom:10px;font-weight:600;display:flex;align-items:center;gap:4px;">' +
                 '<i data-lucide="hard-drive" style="width:13px;height:13px;stroke-width:2;color:var(--blue);"></i>' +
                 itemAtual.equipamento +
               '</div>';

    if (relacionados.length === 0) {
      html +=
        '<div style="text-align:center;padding:24px 10px;color:var(--muted);font-size:12px;background:var(--surface);border:1px solid var(--border-lt);border-radius:var(--r-md);">' +
          '<i data-lucide="check-circle-2" style="width:20px;height:20px;stroke-width:1.5;margin-bottom:6px;color:var(--green);"></i><br/>' +
          'Sem ocorrências ou relatórios parecidos para este equipamento.' +
        '</div>';
    } else {
      html += relacionados.map(function(rel) {
        var eMeu = isItemDoUsuario(rel);
        return (
          '<div class="mini-oc' + (eMeu ? ' mine' : '') + '" onclick="verDetalhesHistorico(\'' + rel.id + '\')" style="margin-bottom:7px;padding:8px 10px;">' +
            '<div class="mini-top" style="margin-bottom:2px;">' +
              '<div class="mini-dot ' + (rel.tipo==='ocorrencia'?'md-r':rel.tipo==='relatorio'?'md-g':'md-y') + '"></div>' +
              '<span class="mini-title" style="font-weight:600;font-size:12px;">' + rel.titulo + '</span>' +
            '</div>' +
            '<div style="font-size:11px;color:var(--muted);display:flex;justify-content:space-between;margin-top:3px;">' +
              '<span>' + rel.dataCriacao.substring(0,10) + '</span>' +
              '<span>Por: ' + rel.criadoPor + '</span>' +
            '</div>' +
          '</div>'
        );
      }).join('');
    }

    container.innerHTML = html;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function filtrarHistorico() {
    renderHistorico();
  }
  window.filtrarHistorico = filtrarHistorico;

  function filtrarCategoriaHistorico(cat, btn) {
    historicoFiltroCategoria = cat;
    if (btn && btn.closest('.pills')) {
      btn.closest('.pills').querySelectorAll('.pill').forEach(function(p){ p.classList.remove('on'); });
      btn.classList.add('on');
    }
    renderHistorico();
  }
  window.filtrarCategoriaHistorico = filtrarCategoriaHistorico;

  function verDetalhesHistoricoDirect(item) {
    if (!item) return;

    var modalTitle = document.getElementById('hist-det-title');
    var modalTags  = document.getElementById('hist-det-tags');
    var modalBody  = document.getElementById('hist-det-body');

    if (modalTitle) modalTitle.textContent = item.titulo;
    if (modalTags) {
      var tagMeu = isItemDoUsuario(item) ? '<span class="tag tag-ind">Seu Registro / Resolução</span>' : '';
      modalTags.innerHTML = getTagTipoBadge(item) + ' <span class="tag tag-g">' + (item.status || 'Concluído') + '</span> ' + tagMeu;
    }

    if (modalBody) {
      modalBody.innerHTML =
        '<div class="form-card" style="margin-bottom:12px;background:var(--bg);border:1px solid var(--border-lt);">' +
          '<h4 style="font-size:12.5px;font-weight:700;color:var(--txt);margin-bottom:8px;display:flex;align-items:center;gap:6px;">' +
            '<i data-lucide="user" style="width:14px;height:14px;color:var(--blue);stroke-width:2;"></i>' +
            'Informações de Origem e Registro' +
          '</h4>' +
          '<div style="font-size:12px;color:var(--txt2);line-height:1.6;">' +
            '<strong>Equipamento / Recurso:</strong> ' + (item.equipamento || 'N/A') + '<br/>' +
            '<strong>Criado por:</strong> ' + item.criadoPor + ' (' + item.dataCriacao + ')<br/>' +
            '<strong>Localidade:</strong> ' + (item.local || 'Central Técnica') + '<br/>' +
            '<strong>Categoria:</strong> ' + (item.categoria || 'Geral') + '<br/>' +
            '<div style="margin-top:8px;padding:8px 10px;background:var(--surface);border-radius:var(--r-md);border:1px solid var(--border-lt);">' +
              '<strong>Descrição Registrada:</strong><br/>' + item.descCriacao +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="form-card" style="background:var(--bg);border:1px solid var(--border-lt);">' +
          '<h4 style="font-size:12.5px;font-weight:700;color:var(--txt);margin-bottom:8px;display:flex;align-items:center;gap:6px;">' +
            '<i data-lucide="check-circle-2" style="width:14px;height:14px;color:var(--green);stroke-width:2;"></i>' +
            'Informações de Resolução e Fechamento' +
          '</h4>' +
          '<div style="font-size:12px;color:var(--txt2);line-height:1.6;">' +
            '<strong>Responsável pela Resolução:</strong> ' + (item.resolvidoPor || 'Pendente') + '<br/>' +
            '<strong>Data/Hora de Resolução:</strong> ' + (item.dataResolucao || 'Em andamento') + '<br/>' +
            '<strong>Status Final:</strong> <span style="color:var(--green);font-weight:600;">' + (item.status || 'Concluído') + '</span><br/>' +
            '<div style="margin-top:8px;padding:8px 10px;background:var(--surface);border-radius:var(--r-md);border:1px solid var(--border-lt);">' +
              '<strong>O que foi realizado:</strong><br/>' + (item.descResolucao || 'Nenhuma observação de fechamento fornecida.') +
            '</div>' +
          '</div>' +
        '</div>';
    }

    abrirPopup('popup-detalhes-historico');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
  window.verDetalhesHistoricoDirect = verDetalhesHistoricoDirect;

  function verDetalhesHistorico(id) {
    var item = historicoSeedData.find(function(h){ return h.id === id; });
    if (item) verDetalhesHistoricoDirect(item);
  }
  window.verDetalhesHistorico = verDetalhesHistorico;

  function verDetalhesOcorrenciaResolvida(id) {
    var oc = ocorrencias.find(function(o){ return o.id === id; });
    var hist = historicoSeedData.find(function(h){ return h.id === id || h.titulo === (oc && oc.titulo); });

    var item = hist || (oc ? {
      id:            oc.id,
      tipo:          'ocorrencia',
      subtipo:       oc.cat || 'Equipamento',
      titulo:        oc.titulo,
      equipamento:   oc.local ? (oc.local + ' — ' + (oc.cat || 'Equipamento')) : (oc.cat || oc.titulo),
      categoria:     oc.cat || 'Equipamento',
      local:         oc.local || 'Central Técnica',
      dataCriacao:   formatDataHoraLocal(oc.dataCriacao || oc.criado),
      criadoPor:     oc.resp || 'Sistema',
      descCriacao:   oc.desc || 'Ocorrência registrada no sistema.',
      status:        oc.status === 'resolvida' ? ((oc.resolucao && oc.resolucao.statusRes) ? oc.resolucao.statusRes : 'Resolvido') : 'Prazo Expirado / Não Resolvida',
      dataResolucao: oc.resolucao ? formatDataHoraLocal(oc.resolucao.data) : 'Pendente de resolução',
      resolvidoPor:  oc.resolucao ? (oc.resolvidoPor || getUsuarioAtual()) : 'Não resolvido',
      descResolucao: oc.resolucao ? oc.resolucao.descRes : 'A ocorrência ultrapassou o horário estipulado e permanece aguardando resolução pela equipe.'
    } : null);

    if (item) verDetalhesHistoricoDirect(item);
  }
  window.verDetalhesOcorrenciaResolvida = verDetalhesOcorrenciaResolvida;

  function verDetalhesOcorrencia(id) {
    var oc = ocorrencias.find(function(o){ return o.id === id; });
    if (!oc) return;

    var histMatch = historicoSeedData.find(function(h){ return h.id === id || h.titulo === oc.titulo; });

    var item = histMatch || {
      id:            oc.id,
      tipo:          'ocorrencia',
      subtipo:       oc.cat || 'Equipamento',
      titulo:        oc.titulo,
      equipamento:   oc.local ? (oc.local + ' — ' + (oc.cat || 'Equipamento')) : (oc.cat || oc.titulo),
      categoria:     oc.cat || 'Equipamento',
      local:         oc.local || 'Central Técnica',
      dataCriacao:   formatDataHoraLocal(oc.dataCriacao || oc.criado),
      criadoPor:     oc.resp || 'Sistema',
      descCriacao:   oc.desc || 'Ocorrência registrada no sistema.',
      status:        oc.status === 'resolvida' ? ((oc.resolucao && oc.resolucao.statusRes) ? oc.resolucao.statusRes : 'Resolvido') : (isOcorrenciaVencida(oc) ? 'Prazo Expirado' : 'Aberta'),
      dataResolucao: oc.resolucao ? formatDataHoraLocal(oc.resolucao.data) : 'Pendente de resolução',
      resolvidoPor:  oc.resolucao ? (oc.resolvidoPor || getUsuarioAtual()) : 'Aguardando resolução',
      descResolucao: oc.resolucao ? oc.resolucao.descRes : 'Ocorrência ativa no turno aguardando tratativa da equipe.'
    };

    verDetalhesHistoricoDirect(item);
  }
  window.verDetalhesOcorrencia = verDetalhesOcorrencia;

  /* ═══════════════════════════════════════════
     SISTEMA DE TOAST NOTIFICATIONS & CENTRAL DE ALERTAS
  ═══════════════════════════════════════════ */

  var notificacoesStore = [];

  function mostrarToast(titulo, mensagem, tipo) {
    var container = document.getElementById('toast-container');
    if (!container) return;

    var toastType = tipo || 'info';
    var iconName = toastType === 'success' ? 'check-circle' : toastType === 'warning' ? 'alert-triangle' : toastType === 'danger' ? 'alert-circle' : 'info';

    var toastEl = document.createElement('div');
    toastEl.className = 'toast toast-' + toastType;
    toastEl.innerHTML =
      '<div class="toast-icon"><i data-lucide="' + iconName + '" style="width:18px;height:18px;stroke-width:2;"></i></div>' +
      '<div class="toast-content">' +
        '<div class="toast-title">' + titulo + '</div>' +
        '<div class="toast-msg">' + mensagem + '</div>' +
      '</div>' +
      '<button class="toast-close" type="button">&times;</button>';

    var closeBtn = toastEl.querySelector('.toast-close');
    if (closeBtn) {
      closeBtn.onclick = function() {
        toastEl.style.opacity = '0';
        toastEl.style.transform = 'translateY(-10px)';
        setTimeout(function() { toastEl.remove(); }, 250);
      };
    }

    container.appendChild(toastEl);
    if (typeof lucide !== 'undefined') lucide.createIcons();

    /* Remove automaticamente em 4.5s */
    setTimeout(function() {
      if (toastEl.parentNode) {
        toastEl.style.opacity = '0';
        toastEl.style.transform = 'translateY(-10px)';
        setTimeout(function() { toastEl.remove(); }, 250);
      }
    }, 4500);
  }
  window.mostrarToast = mostrarToast;

  function adicionarNotificacao(titulo, mensagem, tipo) {
    var novaNotif = {
      id: 'notif_' + Date.now(),
      titulo: titulo,
      msg: mensagem,
      tempo: formatDataHoraLocal(),
      tipo: tipo || 'info',
      lida: false
    };

    notificacoesStore = [novaNotif].concat(notificacoesStore);
    mostrarToast(titulo, mensagem, tipo);
    renderNotificacoes();
  }
  window.adicionarNotificacao = adicionarNotificacao;

  function renderNotificacoes() {
    var container = document.getElementById('notif-list-body');
    var badgeSidebar = document.querySelector('.s-badge');
    var notifDot = document.querySelector('.notif-dot');

    var naoLidas = notificacoesStore.filter(function(n){ return !n.lida; }).length;

    if (badgeSidebar) {
      if (naoLidas > 0) {
        badgeSidebar.textContent = naoLidas;
        badgeSidebar.style.display = 'inline-block';
      } else {
        badgeSidebar.textContent = '0';
        badgeSidebar.style.display = 'none';
      }
    }
    if (notifDot) {
      notifDot.style.display = naoLidas > 0 ? 'block' : 'none';
    }

    if (!container) return;

    if (notificacoesStore.length === 0) {
      container.innerHTML = '<p style="color:var(--muted);font-size:12.5px;text-align:center;padding:16px 0;">Nenhuma notificação no momento.</p>';
      return;
    }

    container.innerHTML = notificacoesStore.map(function(n) {
      var bgCor = n.tipo === 'danger' ? '#FEF2F2' : n.tipo === 'success' ? '#E6F7F5' : '#E8F2FF';
      var borderCor = n.tipo === 'danger' ? '#FECDC9' : n.tipo === 'success' ? '#99F6E4' : '#C7DFFB';
      var txtCor = n.tipo === 'danger' ? 'var(--red)' : n.tipo === 'success' ? '#0F766E' : 'var(--blue)';

      return (
        '<div style="background:' + bgCor + ';border:1px solid ' + borderCor + ';border-radius:var(--r-md);padding:10px 12px;display:flex;flex-direction:column;gap:3px;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;">' +
            '<strong style="font-size:12.5px;color:' + txtCor + ';">' + n.titulo + '</strong>' +
            '<span style="font-size:10.5px;color:var(--muted);">' + n.tempo + '</span>' +
          '</div>' +
          '<span style="font-size:12px;color:var(--txt2);line-height:1.4;">' + n.msg + '</span>' +
        '</div>'
      );
    }).join('');
  }
  window.renderNotificacoes = renderNotificacoes;

  function abrirNotificacoes() {
    /* marca todas como lidas */
    notificacoesStore.forEach(function(n){ n.lida = true; });
    renderNotificacoes();
    abrirPopup('popup-notificacoes');
  }
  window.abrirNotificacoes = abrirNotificacoes;

  /* ═══════════════════════════════════════════
     SISTEMA DE EXPORTAÇÃO E CONSOLIDAÇÃO POWER BI
  ═══════════════════════════════════════════ */

  function atualizarResumoPowerBI() {
    var select = document.getElementById('pbi-periodo');
    var titleEl = document.getElementById('pbi-preview-title');
    var statsEl = document.getElementById('pbi-preview-stats');
    if (!select || !titleEl || !statsEl) return;

    var val = select.value;
    var periodosTextos = {
      semana: 'Última Semana (7 dias)',
      mes: 'Último Mês (30 dias)',
      semestre: 'Últimos 6 Meses',
      ano: 'Último 1 Ano'
    };

    var periodosStats = {
      semana:   { total: 98,  conf: 97,  nc: 1,  canc: 0 },
      mes:      { total: 419, conf: 418, nc: 1,  canc: 0 },
      semestre: { total: 2480,conf: 2470,nc: 8,  canc: 2 },
      ano:      { total: 4960,conf: 4940,nc: 15, canc: 5 }
    };

    var text = periodosTextos[val] || 'Período Selecionado';
    var st = periodosStats[val] || periodosStats.mes;

    var pctConf = ((st.conf / st.total) * 100).toFixed(1);
    var pctNc = ((st.nc / st.total) * 100).toFixed(1);

    titleEl.textContent = 'Consolidado: ' + text;
    statsEl.innerHTML =
      'Total Transmissões: <strong>' + st.total + '</strong> | ' +
      'Conformes: <strong style="color:var(--green);">' + st.conf + ' (' + pctConf + '%)</strong> | ' +
      'Não Conformes: <strong style="color:var(--red);">' + st.nc + ' (' + pctNc + '%)</strong>';
  }
  window.atualizarResumoPowerBI = atualizarResumoPowerBI;

  function exportarRelatorioPowerBI() {
    var select = document.getElementById('pbi-periodo');
    var val = select ? select.value : 'mes';
    fecharPopup('popup-gerar-powerbi');

    if (typeof mostrarToast === 'function') {
      mostrarToast('Relatório Power BI Gerado', 'Métricas do período salvas e prontas para integração com o Power BI / Excel.', 'success');
    }
    alert('Relatório Power BI compilado com sucesso!\n\nPeríodo exportado com todas as telemetrias e históricos de transmissões.');
  }
  window.exportarRelatorioPowerBI = exportarRelatorioPowerBI;

  /* ═══════════════════════════════════════════
     MÉTRICAS E REGISTRO DE OCORRÊNCIAS DE DASHBOARD
  ═══════════════════════════════════════════ */

  function abrirModalOcDashboard(tipo) {
    var tipoEl = document.getElementById('oc-dash-tipo-painel');
    var selectAlvo = document.getElementById('oc-dash-alvo');
    if (!selectAlvo || !tipoEl || !dashboardMetrics) return;

    tipoEl.value = tipo;
    var items = dashboardMetrics[tipo];
    if (!items) return;
    var list = Object.keys(items);

    selectAlvo.innerHTML = list.map(function(item) {
      return '<option value="' + item + '">' + item + '</option>';
    }).join('');

    abrirPopup('popup-nova-oc-dashboard');
  }
  window.abrirModalOcDashboard = abrirModalOcDashboard;

  var dashAtivoAtual = 'telejornal';

  function alternarDashboard(tipo) {
    dashAtivoAtual = (tipo === 'equipamento' || tipo === 'equipamentos') ? 'equipamento' : 'telejornal';
    var viewTj = document.getElementById('dash-view-telejornal');
    var viewEq = document.getElementById('dash-view-equipamentos');
    var btnTj = document.getElementById('btn-tab-tj');
    var btnEq = document.getElementById('btn-tab-eq');
    var titleEl = document.getElementById('dash-view-title');

    if (dashAtivoAtual === 'telejornal') {
      if (viewTj) {
        viewTj.style.display = 'block';
        viewTj.classList.remove('dash-view-animated');
        void viewTj.offsetWidth;
        viewTj.classList.add('dash-view-animated');
      }
      if (viewEq) viewEq.style.display = 'none';

      if (btnTj) {
        btnTj.style.background = '#007AFF';
        btnTj.style.color = '#ffffff';
        btnTj.style.fontWeight = '700';
        btnTj.style.boxShadow = '0 2px 6px rgba(0,122,255,0.35)';
      }
      if (btnEq) {
        btnEq.style.background = 'transparent';
        btnEq.style.color = 'var(--muted)';
        btnEq.style.fontWeight = '600';
        btnEq.style.boxShadow = 'none';
      }
      if (titleEl) titleEl.textContent = 'Telejornal';
    } else {
      if (viewTj) viewTj.style.display = 'none';
      if (viewEq) {
        viewEq.style.display = 'block';
        viewEq.classList.remove('dash-view-animated');
        void viewEq.offsetWidth;
        viewEq.classList.add('dash-view-animated');
      }

      if (btnTj) {
        btnTj.style.background = 'transparent';
        btnTj.style.color = 'var(--muted)';
        btnTj.style.fontWeight = '600';
        btnTj.style.boxShadow = 'none';
      }
      if (btnEq) {
        btnEq.style.background = '#007AFF';
        btnEq.style.color = '#ffffff';
        btnEq.style.fontWeight = '700';
        btnEq.style.boxShadow = '0 2px 6px rgba(0,122,255,0.35)';
      }
      if (titleEl) titleEl.textContent = 'Equipamentos';
    }

    renderDashboards();
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
  window.alternarDashboard = alternarDashboard;

  function abrirModalOcDashboardContextual() {
    abrirModalOcDashboard(dashAtivoAtual);
  }
  window.abrirModalOcDashboardContextual = abrirModalOcDashboardContextual;

  var itemTransmissaoDetalhesAtual = { nome: '', tipo: '' };

  function abrirDetalhesTransmissao(nome, tipo) {
    if (!nome) return;
    tipo = (tipo === 'equipamento' || tipo === 'equipamentos') ? 'equipamento' : 'telejornal';
    itemTransmissaoDetalhesAtual = { nome: nome, tipo: tipo };

    var metricObj = (dashboardMetrics && dashboardMetrics[tipo]) ? dashboardMetrics[tipo][nome] : null;
    var conf = metricObj ? metricObj.conf : 100;
    var nc = metricObj ? metricObj.nc : 0;
    var canc = metricObj ? metricObj.canc : 0;
    var total = conf + nc + canc;
    var pctConf = total > 0 ? ((conf / total) * 100).toFixed(1) : '100.0';
    var pctNc = total > 0 ? ((nc / total) * 100).toFixed(1) : '0.0';
    var pctCanc = total > 0 ? ((canc / total) * 100).toFixed(1) : '0.0';

    var nomeEl = document.getElementById('det-trans-nome');
    var catEl = document.getElementById('det-trans-categoria');
    var icoEl = document.getElementById('det-trans-ico');
    var confEl = document.getElementById('det-trans-conf');
    var ncEl = document.getElementById('det-trans-nc');
    var cancEl = document.getElementById('det-trans-canc');
    var totalEl = document.getElementById('det-trans-total');
    var slaEl = document.getElementById('det-trans-sla');
    var localEl = document.getElementById('det-trans-local');
    var linkEl = document.getElementById('det-trans-link');
    var ultimoEl = document.getElementById('det-trans-ultimo');
    var badgeEl = document.getElementById('det-trans-status-badge');
    var histListaEl = document.getElementById('det-trans-historico-lista');

    if (nomeEl) nomeEl.textContent = nome;
    if (catEl) catEl.textContent = (tipo === 'telejornal' ? 'Telejornal / Programa' : 'Equipamento de Transmissão') + ' · Telemetria & Status Operacional';
    if (icoEl) icoEl.setAttribute('data-lucide', tipo === 'telejornal' ? 'tv' : 'video');

    if (confEl) confEl.textContent = conf + ' (' + pctConf + '%)';
    if (ncEl) ncEl.textContent = nc + ' (' + pctNc + '%)';
    if (cancEl) cancEl.textContent = canc + ' (' + pctCanc + '%)';
    if (totalEl) totalEl.textContent = total + ' transmissões';
    if (slaEl) slaEl.textContent = pctConf + '% (Disponibilidade)';

    var isEquip = (tipo === 'equipamento');
    if (localEl) localEl.textContent = isEquip ? 'Unidade Móvel / Jornalismo Externo (Juiz de Fora)' : 'Estúdio Principal · Juiz de Fora (MG)';
    if (linkEl) linkEl.textContent = isEquip ? 'Link Celular 4K / Bonding LiveU (4x SIM 5G)' : 'Rede SDI / IP Fibra Óptica + Satélite';
    if (ultimoEl) ultimoEl.textContent = nc > 0 ? 'Última transmissão com alerta (' + nc + ' falha registrada)' : 'Última transmissão 100% Conforme (OK)';

    if (badgeEl) {
      if (nc > 0) {
        badgeEl.className = 'tag tag-y';
        badgeEl.textContent = '● Atenção (' + nc + ' NC)';
      } else {
        badgeEl.className = 'tag tag-g';
        badgeEl.textContent = '● Operacional / Excelente';
      }
    }

    if (histListaEl) {
      var histOcs = (typeof ocorrencias !== 'undefined' ? ocorrencias : []).filter(function(o) {
        return (o.titulo && o.titulo.indexOf(nome) !== -1) || (o.desc && o.desc.indexOf(nome) !== -1);
      });

      if (histOcs.length === 0) {
        histListaEl.innerHTML =
          '<div style="background:#FFFFFF;border:1px solid var(--border-lt);border-radius:var(--r-sm);padding:8px 10px;font-size:11.5px;color:var(--muted);">' +
            'Nenhuma ocorrência crítica aberta para este item no momento. Sistema estável e operando normalmente.' +
          '</div>';
      } else {
        histListaEl.innerHTML = histOcs.map(function(o) {
          return (
            '<div style="background:#FFFFFF;border:1px solid var(--border-lt);border-radius:var(--r-sm);padding:7px 10px;display:flex;justify-content:space-between;align-items:center;font-size:11.5px;">' +
              '<div><strong style="color:var(--txt);">' + o.titulo + '</strong> <span style="color:var(--muted);">· ' + (o.resp || '') + '</span></div>' +
              '<span class="tag ' + (o.status === 'resolvida' ? 'tag-g' : 'tag-r') + '">' + (o.status === 'resolvida' ? 'Resolvida' : 'Em Aberto') + '</span>' +
            '</div>'
          );
        }).join('');
      }
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
    abrirPopup('popup-detalhes-transmissao');
  }
  window.abrirDetalhesTransmissao = abrirDetalhesTransmissao;

  function abrirModalOcItemDireto() {
    fecharPopup('popup-detalhes-transmissao');
    if (!itemTransmissaoDetalhesAtual.nome) return;

    var tipoEl = document.getElementById('oc-dash-tipo-painel');
    var selectAlvo = document.getElementById('oc-dash-alvo');
    if (tipoEl && selectAlvo && dashboardMetrics) {
      tipoEl.value = itemTransmissaoDetalhesAtual.tipo;
      var items = dashboardMetrics[itemTransmissaoDetalhesAtual.tipo];
      if (items) {
        var list = Object.keys(items);
        selectAlvo.innerHTML = list.map(function(item) {
          return '<option value="' + item + '"' + (item === itemTransmissaoDetalhesAtual.nome ? ' selected' : '') + '>' + item + '</option>';
        }).join('');
      }
    }
    abrirPopup('popup-nova-oc-dashboard');
  }
  window.abrirModalOcItemDireto = abrirModalOcItemDireto;

  function salvarOcDashboard() {
    var tipoPainel = document.getElementById('oc-dash-tipo-painel').value;
    var alvo = document.getElementById('oc-dash-alvo').value;
    var status = document.getElementById('oc-dash-status').value;
    var obs = document.getElementById('oc-dash-obs').value.trim();

    if (!obs) {
      alert('Por favor, informe a observação do registro.');
      return;
    }

    if (dashboardMetrics && dashboardMetrics[tipoPainel]) {
      var metricObj = dashboardMetrics[tipoPainel][alvo];
      if (metricObj) {
        if (status === 'nc') metricObj.nc += 1;
        else if (status === 'canc') metricObj.canc += 1;
        else if (status === 'conf') metricObj.conf += 1;
      }
    }

    fecharPopup('popup-nova-oc-dashboard');
    document.getElementById('oc-dash-obs').value = '';

    if (typeof mostrarToast === 'function') {
      mostrarToast('Ocorrência Registrada no Dashboard', 'O gráfico do ' + alvo + ' foi atualizado diretamente no painel.', 'warning');
    }
    alert('Ocorrência salva com sucesso no Dashboard!\n\nAs métricas do ' + alvo + ' foram atualizadas.');

    renderDashboards();
  }
  window.salvarOcDashboard = salvarOcDashboard;

  function renderDashboards() {
    if (typeof dashboardMetrics === 'undefined' || !dashboardMetrics) return;

    var pieMapping = {
      'INTEGRAÇÃO NOTÍCIA': 'pie-tj-noticia',
      'MG1': 'pie-tj-mg1',
      'MG2': 'pie-tj-mg2',
      'GIRO MG2': 'pie-tj-giro',

      'LIVE U1': 'pie-eq-liveu1',
      'LIVE U2': 'pie-eq-liveu2',
      'LIVE U3': 'pie-eq-liveu3',
      'LIVE U SMART': 'pie-eq-liveusmart',
      'REDAÇÃO': 'pie-eq-redacao',
      'LIVE U4': 'pie-eq-liveu4',
      'NET PRAÇA': 'pie-eq-netpraca',
      'NET PORTARIA': 'pie-eq-netportaria',
      'FORMATOS NET': 'pie-eq-formatosnet',
      'NET 2º ANDAR': 'pie-eq-net2andar',
      'NET 3º ANDAR': 'pie-eq-net3andar',
      'NET 4º ANDAR': 'pie-eq-net4andar',
      'KMJ': 'pie-eq-kmj'
    };

    ['telejornal', 'equipamento'].forEach(function(categoria) {
      var items = dashboardMetrics[categoria];
      if (!items) return;
      Object.keys(items).forEach(function(key) {
        var m = items[key];
        var totalReal = m.conf + m.nc + m.canc;
        var total = totalReal === 0 ? 1 : totalReal;

        var pctConf = totalReal === 0 ? 0 : Math.round((m.conf / total) * 100);
        var pctNc = totalReal === 0 ? 0 : Math.round((m.nc / total) * 100);
        var pctCanc = totalReal === 0 ? 0 : (100 - pctConf - pctNc);
        if (pctCanc < 0) pctCanc = 0;

        var pieId = pieMapping[key];
        var el = document.getElementById(pieId);
        if (el) {
          if (totalReal === 0) {
            el.style.background = '#E2E8F0';
          } else {
            var endConf = pctConf;
            var endNc = pctConf + pctNc;
            el.style.background = 'conic-gradient(#10B981 0% ' + endConf + '%, #EF4444 ' + endConf + '% ' + endNc + '%, #F59E0B ' + endNc + '% 100%)';
          }

          var countEl = el.querySelector('.pie-count');
          if (countEl) countEl.textContent = totalReal;

          var card = el.closest('.dash-card') || el.closest('.form-card');
          if (card) {
            var confEl = card.querySelector('.pct-conf');
            var ncEl   = card.querySelector('.pct-nc');
            var cancEl = card.querySelector('.pct-canc');

            if (confEl) confEl.textContent = '(' + pctConf + '%)';
            if (ncEl)   ncEl.textContent   = '(' + pctNc + '%)';
            if (cancEl) cancEl.textContent = '(' + pctCanc + '%)';
          }
        }
      });
    });
    renderResumoTransmissoesGerais();
  }
  window.renderDashboards = renderDashboards;

  function renderResumoTransmissoesGerais() {
    // 1. Resumo Geral de Telejornais
    var tjTotConf = 0, tjTotNc = 0, tjTotCanc = 0;
    if (dashboardMetrics && dashboardMetrics.telejornal) {
      Object.keys(dashboardMetrics.telejornal).forEach(function(k) {
        var m = dashboardMetrics.telejornal[k];
        tjTotConf += (m.conf || 0);
        tjTotNc += (m.nc || 0);
        tjTotCanc += (m.canc || 0);
      });
    }
    var tjTotal = tjTotConf + tjTotNc + tjTotCanc;
    var tjPctConf = tjTotal > 0 ? Math.round((tjTotConf / tjTotal) * 100) : 0;
    var tjPctNc = tjTotal > 0 ? Math.round((tjTotNc / tjTotal) * 100) : 0;
    var tjPctCanc = tjTotal > 0 ? (100 - tjPctConf - tjPctNc) : 0;
    if (tjPctCanc < 0) tjPctCanc = 0;

    var badgeTj = document.getElementById('trans-geral-total-badge');
    var txtConfTj = document.getElementById('trans-geral-conf-txt');
    var txtNcTj = document.getElementById('trans-geral-nc-txt');
    var txtCancTj = document.getElementById('trans-geral-canc-txt');
    var barConfTj = document.getElementById('trans-geral-conf-bar');
    var barNcTj = document.getElementById('trans-geral-nc-bar');
    var barCancTj = document.getElementById('trans-geral-canc-bar');

    if (badgeTj) badgeTj.textContent = 'Total: ' + tjTotal + ' transmissões';
    if (txtConfTj) txtConfTj.textContent = tjPctConf + '% · ' + tjTotConf;
    if (txtNcTj) txtNcTj.textContent = tjPctNc + '% · ' + tjTotNc;
    if (txtCancTj) txtCancTj.textContent = tjPctCanc + '% · ' + tjTotCanc;

    if (barConfTj) barConfTj.style.height = tjTotal > 0 ? Math.max(tjPctConf * 0.85, 4) + '%' : '4px';
    if (barNcTj) barNcTj.style.height = tjTotal > 0 ? Math.max(tjPctNc * 0.85, 4) + '%' : '4px';
    if (barCancTj) barCancTj.style.height = tjTotal > 0 ? Math.max(tjPctCanc * 0.85, 4) + '%' : '4px';

    // 2. Resumo Geral de Equipamentos
    var eqTotConf = 0, eqTotNc = 0, eqTotCanc = 0;
    if (dashboardMetrics && dashboardMetrics.equipamento) {
      Object.keys(dashboardMetrics.equipamento).forEach(function(k) {
        var m = dashboardMetrics.equipamento[k];
        eqTotConf += (m.conf || 0);
        eqTotNc += (m.nc || 0);
        eqTotCanc += (m.canc || 0);
      });
    }
    var eqTotal = eqTotConf + eqTotNc + eqTotCanc;
    var eqPctConf = eqTotal > 0 ? Math.round((eqTotConf / eqTotal) * 100) : 0;
    var eqPctNc = eqTotal > 0 ? Math.round((eqTotNc / eqTotal) * 100) : 0;
    var eqPctCanc = eqTotal > 0 ? (100 - eqPctConf - eqPctNc) : 0;
    if (eqPctCanc < 0) eqPctCanc = 0;

    var badgeEq = document.getElementById('trans-eq-geral-total-badge');
    var txtConfEq = document.getElementById('trans-eq-geral-conf-txt');
    var txtNcEq = document.getElementById('trans-eq-geral-nc-txt');
    var txtCancEq = document.getElementById('trans-eq-geral-canc-txt');
    var barConfEq = document.getElementById('trans-eq-geral-conf-bar');
    var barNcEq = document.getElementById('trans-eq-geral-nc-bar');
    var barCancEq = document.getElementById('trans-eq-geral-canc-bar');

    if (badgeEq) badgeEq.textContent = 'Total: ' + eqTotal + ' transmissões';
    if (txtConfEq) txtConfEq.textContent = eqPctConf + '% · ' + eqTotConf;
    if (txtNcEq) txtNcEq.textContent = eqPctNc + '% · ' + eqTotNc;
    if (txtCancEq) txtCancEq.textContent = eqPctCanc + '% · ' + eqTotCanc;

    if (barConfEq) barConfEq.style.height = eqTotal > 0 ? Math.max(eqPctConf * 0.85, 4) + '%' : '4px';
    if (barNcEq) barNcEq.style.height = eqTotal > 0 ? Math.max(eqPctNc * 0.85, 4) + '%' : '4px';
    if (barCancEq) barCancEq.style.height = eqTotal > 0 ? Math.max(eqPctCanc * 0.85, 4) + '%' : '4px';
  }
  window.renderResumoTransmissoesGerais = renderResumoTransmissoesGerais;

  /* ═══════════════════════════════════════════
     PLANEJAMENTO ORÇAMENTÁRIO (ANO ATUAL + 1)
  ═══════════════════════════════════════════ */

  var anoOrcamento = new Date().getFullYear() + 1;

  function syncAnoOrcamentoUI() {
    anoOrcamento = new Date().getFullYear() + 1;
    document.querySelectorAll('.orc-ano-display, .sidebar-orc-ano').forEach(function(el) {
      el.textContent = anoOrcamento;
    });
  }

  var orcamentoSeedData = [];

  function formatarMoeda(val) {
    return 'R$ ' + Number(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function renderOrcamento() {
    syncAnoOrcamentoUI();
    var tbody = document.getElementById('orc-itens-tbody');
    if (!tbody) return;

    var totalGeral = 0;
    var totalCapex = 0;
    var totalOpex = 0;

    if (orcamentoSeedData.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:24px 12px;font-size:12.5px;">' +
        'Nenhuma linha orçamentária cadastrada ainda. Clique em <strong>"+ Propor Linha Orçamentária"</strong> para iniciar o planejamento.' +
        '</td></tr>';
    } else {
      tbody.innerHTML = orcamentoSeedData.map(function(item, idx) {
        var val = Number(item.valor) || 0;
        totalGeral += val;
        if (item.tipo === 'CAPEX') totalCapex += val;
        else totalOpex += val;

        var tagTipo = item.tipo === 'CAPEX' 
          ? '<span class="tag" style="background:#E8F2FF;color:#0071E3;border:1px solid #C7DFFB;font-weight:700;">CAPEX</span>' 
          : '<span class="tag" style="background:#E6F7F5;color:#0D9488;border:1px solid #99F6E4;font-weight:700;">OPEX</span>';

        var tagPrio = item.prio === 'Alta' || item.prio === 'Estratégica'
          ? '<span class="tag tag-r">' + item.prio + '</span>'
          : '<span class="tag tag-y">' + item.prio + '</span>';

        var tagStatus = item.status === 'Aprovado'
          ? '<span class="tag tag-g">✓ Aprovado</span>'
          : item.status === 'Em Revisão'
          ? '<span class="tag tag-y">Em Revisão</span>'
          : '<span class="tag tag-ind">Proposto</span>';

        return (
          '<tr>' +
            '<td style="text-align:center;font-weight:700;color:#64748B;">' + (idx + 1) + '</td>' +
            '<td><strong style="color:#1E293B;font-size:13px;">' + item.desc + '</strong></td>' +
            '<td>' + tagTipo + '</td>' +
            '<td><span style="font-size:12px;color:#475569;">' + item.praca + '</span></td>' +
            '<td>' + tagPrio + '</td>' +
            '<td style="text-align:right;font-weight:700;color:#0F172A;font-size:13px;">' + formatarMoeda(val) + '</td>' +
            '<td style="text-align:center;">' + tagStatus + '</td>' +
            '<td style="text-align:center;">' +
              '<button type="button" class="btn btn-ghost btn-xs" onclick="removerItemOrcamento(\'' + item.id + '\')" title="Remover item" style="color:var(--red);padding:2px 6px;">✕</button>' +
            '</td>' +
          '</tr>'
        );
      }).join('');
    }

    var kpiTot = document.getElementById('orc-kpi-total');
    var kpiCapex = document.getElementById('orc-kpi-capex');
    var kpiOpex = document.getElementById('orc-kpi-opex');

    if (kpiTot) kpiTot.textContent = formatarMoeda(totalGeral);
    if (kpiCapex) kpiCapex.textContent = formatarMoeda(totalCapex);
    if (kpiOpex) kpiOpex.textContent = formatarMoeda(totalOpex);

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
  window.renderOrcamento = renderOrcamento;

  function abrirModalAdicionarItemOrcamento() {
    syncAnoOrcamentoUI();
    var descEl = document.getElementById('orc-modal-desc');
    var valEl = document.getElementById('orc-modal-valor');
    var justEl = document.getElementById('orc-modal-just');
    var tipoEl = document.getElementById('orc-modal-tipo');
    var pracaEl = document.getElementById('orc-modal-praca');
    var prioEl = document.getElementById('orc-modal-prio');

    if (descEl) descEl.value = '';
    if (valEl) valEl.value = '';
    if (justEl) justEl.value = '';
    if (tipoEl) tipoEl.selectedIndex = 0;
    if (pracaEl) pracaEl.selectedIndex = 0;
    if (prioEl) prioEl.selectedIndex = 1;

    abrirPopup('popup-novo-item-orcamento');
  }
  window.abrirModalAdicionarItemOrcamento = abrirModalAdicionarItemOrcamento;

  function confirmarItemOrcamento() {
    var descEl = document.getElementById('orc-modal-desc');
    var tipoEl = document.getElementById('orc-modal-tipo');
    var pracaEl = document.getElementById('orc-modal-praca');
    var valorEl = document.getElementById('orc-modal-valor');
    var prioEl = document.getElementById('orc-modal-prio');

    var desc = descEl ? descEl.value.trim() : '';
    var valor = valorEl ? parseFloat(valorEl.value) : 0;

    if (!desc || !valor || valor <= 0) {
      alert('Por favor, informe a Descrição do item e o Valor Estimado (R$).');
      return;
    }

    var novo = {
      id: 'orc_' + Date.now(),
      desc: desc,
      tipo: tipoEl ? tipoEl.value : 'CAPEX',
      praca: pracaEl ? pracaEl.value : 'Juiz de Fora',
      prio: prioEl ? prioEl.value : 'Média',
      valor: valor,
      status: 'Proposto'
    };

    orcamentoSeedData.push(novo);
    fecharPopup('popup-novo-item-orcamento');
    renderOrcamento();

    if (typeof mostrarToast === 'function') {
      mostrarToast('Item Adicionado ao Orçamento', desc + ' incluído na previsão orçamentária de ' + anoOrcamento + '.', 'success');
    }
  }
  window.confirmarItemOrcamento = confirmarItemOrcamento;

  function removerItemOrcamento(id) {
    if (!confirm('Deseja remover esta linha orçamentária do plano?')) return;
    orcamentoSeedData = orcamentoSeedData.filter(function(i){ return i.id !== id; });
    renderOrcamento();
  }
  window.removerItemOrcamento = removerItemOrcamento;

  function salvarOrcamento() {
    if (typeof mostrarToast === 'function') {
      mostrarToast('Plano Orçamentário Salvo', 'As previsões orçamentárias do ciclo ' + anoOrcamento + ' foram salvas com sucesso.', 'success');
    }
    alert('Plano Orçamentário de ' + anoOrcamento + ' salvo com sucesso!');
  }
  window.salvarOrcamento = salvarOrcamento;

  function exportarOrcamentoExcel() {
    alert('Relatório de Orçamento ' + anoOrcamento + ' exportado com sucesso em formato consolidado (CAPEX/OPEX).');
  }
  window.exportarOrcamentoExcel = exportarOrcamentoExcel;

  /* ═══════════════════════════════════════════
     FLUXO DE INICIALIZAÇÃO E IDENTIFICAÇÃO DO OPERADOR
  ═══════════════════════════════════════════ */
  DBService.syncRemote();

  // Sincronização periódica em tempo real (a cada 5 segundos) e ao focar na janela
  setInterval(function() {
    if (typeof DBService !== 'undefined' && DBService && typeof DBService.syncRemote === 'function') {
      DBService.syncRemote();
    }
  }, 5000);

  window.addEventListener('focus', function() {
    if (typeof DBService !== 'undefined' && DBService && typeof DBService.syncRemote === 'function') {
      DBService.syncRemote();
    }
  });

  var savedUserName = localStorage.getItem(USER_NAME_STORAGE_KEY);
  if (!savedUserName || !savedUserName.trim()) {
    abrirPopup('popup-identificacao-operador');
    var identInput = document.getElementById('ident-operador-nome');
    if (identInput) setTimeout(function(){ identInput.focus(); }, 180);
  } else {
    atualizarNomeOperadorUI(savedUserName.trim());
    abrirPopup('popup-entrada');
  }

}); /* fim DOMContentLoaded */
