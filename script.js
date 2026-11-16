document.addEventListener('DOMContentLoaded', () => {
  const CLAVE_DIRECTIVA = 'Chipa2026*';
  let modoAdmin = sessionStorage.getItem('mlge_admin_ok') === 'true';

  function notificar(msg) {
    const box = document.getElementById('toastContainer');
    const div = document.createElement('div');
    div.className = 'toast';
    div.textContent = msg;
    box.appendChild(div);
    setTimeout(() => div.remove(), 3500);
  }

  // Menú móvil
  const btnHam = document.getElementById('btnHamburguesa');
  const menuPrin = document.getElementById('menuPrincipal');
  btnHam.addEventListener('click', () => menuPrin.classList.toggle('abierto'));
  document.querySelectorAll('.menu-principal a').forEach(a => {
    a.addEventListener('click', () => menuPrin.classList.remove('abierto'));
  });

  // =========================================================================
  // GESTOR DE FOTOS (INSIGNIA, PORTADA, UNIFORMES, ESCOLTAS, PROMOS Y LOGROS)
  // =========================================================================
  function obtenerFotosGuardadas() {
    const raw = localStorage.getItem('mlge_fotos_v1');
    return raw ? JSON.parse(raw) : {};
  }

  function guardarFotoLocal(clave, dataUrl) {
    const fotos = obtenerFotosGuardadas();
    fotos[clave] = dataUrl;
    try {
      localStorage.setItem('mlge_fotos_v1', JSON.stringify(fotos));
      return true;
    } catch (e) {
      notificar('La foto es muy pesada. Usa una imagen más ligera.');
      return false;
    }
  }

  // Comprime la imagen antes de guardarla para que no llene memoria
  function comprimirImagen(file, callback) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxAncho = 900;
        const escala = img.width > maxAncho ? maxAncho / img.width : 1;
        canvas.width = img.width * escala;
        canvas.height = img.height * escala;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        callback(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Carga una imagen intentando varias rutas/extensiones y mostrando placeholder si no existe
  function configurarImagenConRespaldo(imgEl, placeholderEl, claveStorage, rutasCandidatas, esEmblema = false) {
    const guardadas = obtenerFotosGuardadas();
    if (guardadas[claveStorage]) {
      imgEl.src = guardadas[claveStorage];
      imgEl.style.display = 'block';
      if (placeholderEl) placeholderEl.style.display = 'none';
      return;
    }

    let idx = 0;
    function probarSiguiente() {
      if (idx >= rutasCandidatas.length) {
        imgEl.style.display = 'none';
        if (placeholderEl) placeholderEl.style.display = 'flex';
        return;
      }
      imgEl.src = rutasCandidatas[idx++];
    }

    imgEl.onload = () => {
      imgEl.style.display = 'block';
      if (placeholderEl) placeholderEl.style.display = 'none';
    };
    imgEl.onerror = probarSiguiente;
    probarSiguiente();
  }

  function aplicarFotosFijas() {
    // 1. Insignia (Nav, Hero y Footer)
    ['imgInsigniaNav', 'imgInsigniaHero', 'imgInsigniaFooter'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        configurarImagenConRespaldo(
          el,
          el.nextElementSibling,
          'insignia',
          ['insignia.png', 'insignia.jpg', 'insignia.jpeg', 'img/insignia.png', 'img/insignia.jpg'],
          true
        );
      }
    });

    // 2. Portada Educación Secundaria de Menores
    configurarImagenConRespaldo(
      document.getElementById('imgFotoPortada'),
      document.getElementById('placeholderPortada'),
      'portada',
      ['portada.jpg', 'portada.png', 'colegio-chipa.jpg', 'img/portada.jpg', 'img/colegio-chipa.jpg']
    );

    // 3. Uniformes
    configurarImagenConRespaldo(
      document.getElementById('imgUniformeDiario'),
      document.getElementById('placeholderUniformeDiario'),
      'uniformeDiario',
      ['uniforme-diario.jpg', 'uniforme-diario.png', 'uniforme.jpg', 'alumnos-chipa.jpg', 'img/uniforme.jpg']
    );

    configurarImagenConRespaldo(
      document.getElementById('imgBuzoDeportivo'),
      document.getElementById('placeholderBuzoDeportivo'),
      'buzoDeportivo',
      ['buzo-deportivo.jpg', 'buzo-deportivo.png', 'buzo.jpg', 'img/buzo.jpg']
    );
  }

  let claveFotoDestino = '';
  const selectorGlobal = document.getElementById('selectorFotoGlobal');

  window.abrirSelectorFoto = (clave) => {
    if (!modoAdmin) {
      document.getElementById('modalLoginAdmin').classList.remove('oculto');
      return;
    }
    claveFotoDestino = clave;
    selectorGlobal.click();
  };

  window.abrirAdminGlobal = () => {
    if (modoAdmin) {
      actualizarPanelesAdmin();
      notificar('Modo edición activo: usa los botones "Subir Foto" en cada tarjeta.');
    } else {
      document.getElementById('modalLoginAdmin').classList.remove('oculto');
    }
  };

  selectorGlobal.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file || !claveFotoDestino) return;
    comprimirImagen(file, (dataUrl) => {
      if (guardarFotoLocal(claveFotoDestino, dataUrl)) {
        aplicarFotosFijas();
        seleccionarPromocion(anioPromoActivo);
        notificar('Fotografía actualizada correctamente.');
      }
    });
    e.target.value = '';
  });

  aplicarFotosFijas();

  // =========================================================================
  // 1. FILTRO DE DOCENTES POR ÁREA
  // =========================================================================
  document.querySelectorAll('#filtrosDocentes .pill-filtro').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#filtrosDocentes .pill-filtro').forEach(b => b.classList.remove('activo'));
      btn.classList.add('activo');
      const area = btn.dataset.area;

      document.querySelectorAll('#gridDocentes .docente-item').forEach(card => {
        card.style.display = (area === 'todos' || card.dataset.area === area) ? 'block' : 'none';
      });
    });
  });

  // =========================================================================
  // 2. PROMOCIONES Y ESCOLTAS AUTOMÁTICAS DESDE 2003 CON FOTOS
  // =========================================================================
  const ANIO_FUNDACION = 2003;
  const anioActual = Math.max(2026, new Date().getFullYear());
  const totalPromociones = anioActual - ANIO_FUNDACION;
  let anioPromoActivo = anioActual;

  const textosAuto = {
    cintaPromos: `FUNDADA EN 2003 • ${totalPromociones} PROMOCIONES:`,
    selloAniosHero: `Creada en 2003 • ${totalPromociones} Años de Trayectoria Educativa`,
    metricaRangoAnios: `2003 – ${anioActual}`,
    metricaTotalPromos: `${totalPromociones} Promociones Egresadas`,
    flotantePromosTexto: `${totalPromociones} Promociones • Estudio, Responsabilidad y Patriotismo`,
    bentoPromoTitulo: `${totalPromociones} Promociones`,
    tituloHistoriaAnios: `${totalPromociones} Años Formando a la Juventud de Chipa`,
    subtituloRangoPromos: `Memoria Histórica (${ANIO_FUNDACION} – ${anioActual})`,
    tituloTotalPromos: `Nuestras ${totalPromociones} Promociones y Escoltas`,
    footerInfoPromos: `Fundada en 2003 • ${totalPromociones} Promociones • Centro Poblado de Chipa, Ninacaca - Pasco`
  };

  Object.entries(textosAuto).forEach(([id, txt]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  });

  const barraPromos = document.getElementById('barraPromociones');
  const visorPromo = document.getElementById('visorPromocion');

  function seleccionarPromocion(anio) {
    anioPromoActivo = anio;
    document.querySelectorAll('.btn-promo-anio').forEach(b => {
      b.classList.toggle('activo', Number(b.dataset.anio) === anio);
    });

    const numPromo = anio - ANIO_FUNDACION;
    const textoPromo = anio === ANIO_FUNDACION
      ? `Año de Fundación Institucional (${ANIO_FUNDACION})`
      : `Promoción N.° ${numPromo} — Egresados ${anio}`;

    const claveEscolta = `escolta_${anio}`;
    const clavePromo = `promo_${anio}`;
    const claseBotonAdmin = modoAdmin ? 'btn-subir-foto-flotante solo-admin' : 'btn-subir-foto-flotante solo-admin oculto';

    visorPromo.innerHTML = `
      <div class="flex-row" style="margin-bottom:16px;flex-wrap:wrap;gap:8px;">
        <div>
          <span class="badge-crema">${textoPromo}</span>
          <h3 style="color:#4A0B18;margin-top:4px;">I.E. María Luz Guillén Espinoza — ${anio}</h3>
        </div>
        <span style="font-size:0.85rem;color:#5D4A4E;font-weight:600;">C.P. de Chipa • Ninacaca, Pasco</span>
      </div>
      <div class="grid-dos">
        <div class="tarjeta-con-foto">
          <div class="marco-foto-tarjeta">
            <img id="imgEscoltaAnio" alt="Escolta ${anio}">
            <div class="placeholder-foto" id="phEscoltaAnio">
              <i class="fa-solid fa-flag"></i>
              <span>Foto Escolta ${anio} (<code>escolta-${anio}.jpg</code>)</span>
            </div>
            <button type="button" class="${claseBotonAdmin}" onclick="abrirSelectorFoto('${claveEscolta}')">
              <i class="fa-solid fa-camera"></i> Subir Foto Escolta
            </button>
          </div>
          <div class="tarjeta-con-foto-body">
            <h4><i class="fa-solid fa-flag"></i> Escolta Oficial (${anio})</h4>
            <p style="font-size:0.9rem;color:#5D4A4E;">
              Representación cívica y custodia del Pabellón Nacional de la I.E. María Luz Guillén Espinoza durante el periodo ${anio}.
            </p>
          </div>
        </div>

        <div class="tarjeta-con-foto">
          <div class="marco-foto-tarjeta">
            <img id="imgPromoAnio" alt="Promoción ${anio}">
            <div class="placeholder-foto" id="phPromoAnio">
              <i class="fa-solid fa-user-graduate"></i>
              <span>Foto Promoción ${anio} (<code>promocion-${anio}.jpg</code>)</span>
            </div>
            <button type="button" class="${claseBotonAdmin}" onclick="abrirSelectorFoto('${clavePromo}')">
              <i class="fa-solid fa-camera"></i> Subir Foto Promoción
            </button>
          </div>
          <div class="tarjeta-con-foto-body">
            <h4><i class="fa-solid fa-user-graduate"></i> ${textoPromo}</h4>
            <p style="font-size:0.9rem;color:#5D4A4E;">
              ${anio === ANIO_FUNDACION
                ? 'Inicio de actividades académicas en el Centro Poblado de Chipa, distrito de Ninacaca - Pasco.'
                : `Generación N.° ${numPromo} de estudiantes egresados de Educación Secundaria en el Centro Poblado de Chipa.`}
            </p>
          </div>
        </div>
      </div>
    `;

    configurarImagenConRespaldo(
      document.getElementById('imgEscoltaAnio'),
      document.getElementById('phEscoltaAnio'),
      claveEscolta,
      [`escolta-${anio}.jpg`, `escolta-${anio}.png`, `img/escolta-${anio}.jpg`]
    );

    configurarImagenConRespaldo(
      document.getElementById('imgPromoAnio'),
      document.getElementById('phPromoAnio'),
      clavePromo,
      [`promocion-${anio}.jpg`, `promocion-${anio}.png`, `img/promocion-${anio}.jpg`]
    );
  }

  for (let y = anioActual; y >= ANIO_FUNDACION; y--) {
    const btn = document.createElement('button');
    btn.className = 'btn-promo-anio' + (y === anioActual ? ' activo' : '');
    btn.dataset.anio = y;
    btn.textContent = y;
    btn.addEventListener('click', () => seleccionarPromocion(y));
    barraPromos.appendChild(btn);
  }

  // =========================================================================
  // 3. HORARIOS PROTEGIDOS POR GRADO + EDICIÓN DIRECTA POR DIRECCIÓN/TUTOR
  // =========================================================================
  let gradoSeleccionado = '1';
  let modoEdicionHorario = false;

  const clavesAula = {
    '1': 'primero-1*',
    '2': 'segundo-2*',
    '3': 'tercer-3*',
    '4': 'cuarto-4*',
    '5': 'quinto-5*'
  };

  const filasHorarioBase = [
    ['08:00 - 08:45', '--', '--', '--', '--', '--'],
    ['08:45 - 09:30', '--', '--', '--', '--', '--'],
    ['09:30 - 10:15', '--', '--', '--', '--', '--'],
    ['10:15 - 10:45', 'RECESO ESCOLAR'],
    ['10:45 - 11:30', '--', '--', '--', '--', '--'],
    ['11:30 - 12:15', '--', '--', '--', '--', '--'],
    ['12:15 - 01:00', '--', '--', '--', '--', '--']
  ];

  function pintarTablaHorario(grado) {
    const tbody = document.getElementById('tbodyHorario');
    const titulo = document.getElementById('tituloHorarioVisible');
    if (!tbody) return;

    if (titulo) titulo.textContent = `Horario Semanal — ${grado}.° Grado`;

    const guardado = localStorage.getItem(`mlge_horario_celdas_${grado}`);
    const datos = guardado ? JSON.parse(guardado) : filasHorarioBase;

    tbody.innerHTML = datos.map((fila, fIdx) => {
      if (fila.length === 2) {
        return `<tr><td><strong>${fila[0]}</strong></td><td colspan="5"><strong>${fila[1]}</strong></td></tr>`;
      }
      const celdasCursos = fila.slice(1).map((curso, idx) => {
        const cIdx = idx + 1;
        const estiloEdit = modoEdicionHorario
          ? 'contenteditable="true" style="background-color:#FFFBEB;outline:1px dashed #800020;"'
          : '';
        return `<td data-f="${fIdx}" data-c="${cIdx}" ${estiloEdit}>${curso}</td>`;
      }).join('');
      return `<tr><td><strong>${fila[0]}</strong></td>${celdasCursos}</tr>`;
    }).join('');
  }

  document.querySelectorAll('#tabsGradoHorario .pill-filtro').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#tabsGradoHorario .pill-filtro').forEach(b => b.classList.remove('activo'));
      btn.classList.add('activo');
      gradoSeleccionado = btn.dataset.g;

      if (modoEdicionHorario) {
        pintarTablaHorario(gradoSeleccionado);
      } else {
        document.getElementById('tituloGradoCandado').textContent = `Horario Protegido — ${gradoSeleccionado}.° Grado`;
        document.getElementById('panelBloqueoHorario').classList.remove('oculto');
        document.getElementById('panelTablaHorario').classList.add('oculto');
      }
    });
  });

  document.getElementById('formClaveHorario').addEventListener('submit', (e) => {
    e.preventDefault();
    const clave = document.getElementById('inputPassHorario').value.trim();
    if (clave === clavesAula[gradoSeleccionado] || clave === CLAVE_DIRECTIVA) {
      document.getElementById('panelBloqueoHorario').classList.add('oculto');
      document.getElementById('panelTablaHorario').classList.remove('oculto');
      pintarTablaHorario(gradoSeleccionado);
      e.target.reset();
      notificar('Horario desbloqueado correctamente.');
    } else {
      notificar('Contraseña incorrecta para este grado.');
    }
  });

  document.getElementById('btnCerrarHorario').addEventListener('click', () => {
    modoEdicionHorario = false;
    const barraEdit = document.getElementById('barraEdicionHorario');
    if (barraEdit) barraEdit.classList.add('oculto');
    document.getElementById('panelBloqueoHorario').classList.remove('oculto');
    document.getElementById('panelTablaHorario').classList.add('oculto');
  });

  const btnAbrirEditorHorarios = document.getElementById('btnAbrirEditorHorarios');
  if (btnAbrirEditorHorarios) {
    btnAbrirEditorHorarios.addEventListener('click', () => {
      const pass = prompt(`Ingrese la clave de Dirección o del ${gradoSeleccionado}.° grado para editar:`);
      if (!pass) return;

      if (pass === CLAVE_DIRECTIVA || pass === clavesAula[gradoSeleccionado]) {
        modoEdicionHorario = true;
        document.getElementById('panelBloqueoHorario').classList.add('oculto');
        document.getElementById('panelTablaHorario').classList.remove('oculto');
        const barraEdit = document.getElementById('barraEdicionHorario');
        if (barraEdit) barraEdit.classList.remove('oculto');
        pintarTablaHorario(gradoSeleccionado);
        notificar(`Modo edición activado para ${gradoSeleccionado}.° grado.`);
      } else {
        notificar('Clave incorrecta.');
      }
    });
  }

  const btnGuardarHorarioTabla = document.getElementById('btnGuardarHorarioTabla');
  if (btnGuardarHorarioTabla) {
    btnGuardarHorarioTabla.addEventListener('click', () => {
      const matriz = [];
      document.querySelectorAll('#tbodyHorario tr').forEach((tr, fIdx) => {
        const celdas = tr.querySelectorAll('td');
        if (celdas.length === 2) {
          matriz[fIdx] = [celdas[0].textContent.trim(), celdas[1].textContent.trim()];
        } else {
          matriz[fIdx] = Array.from(celdas).map(td => td.textContent.trim() || '--');
        }
      });
      localStorage.setItem(`mlge_horario_celdas_${gradoSeleccionado}`, JSON.stringify(matriz));
      notificar(`Horario de ${gradoSeleccionado}.° grado guardado correctamente.`);
    });
  }

  const btnCerrarEditorHorarios = document.getElementById('btnCerrarEditorHorarios');
  if (btnCerrarEditorHorarios) {
    btnCerrarEditorHorarios.addEventListener('click', () => {
      modoEdicionHorario = false;
      const barraEdit = document.getElementById('barraEdicionHorario');
      if (barraEdit) barraEdit.classList.add('oculto');
      pintarTablaHorario(gradoSeleccionado);
      notificar('Edición finalizada.');
    });
  }

  // =========================================================================
  // 4. BRIGADIER GENERAL Y CUADRO DE MÉRITO
  // =========================================================================
  const meritoBase = {
    'escolta': [
      { id: 1, titulo: 'Brigadier General 2026', nombre: 'BRIGADIER GENERAL I.E.', detalle: 'Representación Cívica y Disciplina Escolar' },
      { id: 2, titulo: 'Abanderado de Escolta 2026', nombre: 'ABANDERADO OFICIAL', detalle: 'Custodia del Pabellón Nacional - Chipa' }
    ],
    '1': [
      { id: 3, titulo: 'Primer Puesto • 1.° Grado', nombre: 'ESTUDIANTE DESTACADO 1.° ', detalle: 'Logro Destacado (AD) • Excelencia Académica' },
      { id: 4, titulo: 'Segundo Puesto • 1.° Grado', nombre: 'ESTUDIANTE DESTACADO 2.° ', detalle: 'Logro Destacado (AD) • Disciplina y Puntualidad' }
    ],
    '2': [
      { id: 5, titulo: 'Primer Puesto • 2.° Grado', nombre: 'ESTUDIANTE DESTACADO 1.° ', detalle: 'Logro Destacado (AD) • Excelencia Académica' },
      { id: 6, titulo: 'Segundo Puesto • 2.° Grado', nombre: 'ESTUDIANTE DESTACADO 2.° ', detalle: 'Logro Destacado (AD) • Responsabilidad' }
    ],
    '3': [
      { id: 7, titulo: 'Primer Puesto • 3.° Grado', nombre: 'ESTUDIANTE DESTACADO 1.° ', detalle: 'Logro Destacado (AD) • Excelencia Académica' },
      { id: 8, titulo: 'Segundo Puesto • 3.° Grado', nombre: 'ESTUDIANTE DESTACADO 2.° ', detalle: 'Logro Destacado (AD) • Participación Cívica' }
    ],
    '4': [
      { id: 9, titulo: 'Primer Puesto • 4.° Grado', nombre: 'ESTUDIANTE DESTACADO 1.° ', detalle: 'Logro Destacado (AD) • Excelencia Académica' },
      { id: 10, titulo: 'Segundo Puesto • 4.° Grado', nombre: 'ESTUDIANTE DESTACADO 2.° ', detalle: 'Logro Destacado (AD) • Liderazgo Estudiantil' }
    ],
    '5': [
      { id: 11, titulo: 'Primer Puesto • 5.° Grado', nombre: 'ESTUDIANTE DESTACADO 1.° ', detalle: 'Logro Destacado (AD) • Excelencia Académica' },
      { id: 12, titulo: 'Segundo Puesto • 5.° Grado', nombre: 'ESTUDIANTE DESTACADO 2.° ', detalle: 'Logro Destacado (AD) • Mérito Institucional' }
    ]
  };

  let tabMeritoActual = 'escolta';

  function obtenerMerito() {
    const raw = localStorage.getItem('mlge_merito_v1');
    return raw ? JSON.parse(raw) : meritoBase;
  }

  function pintarDiplomas(clave) {
    tabMeritoActual = clave;
    const datos = obtenerMerito();
    const grid = document.getElementById('gridDiplomas');
    const icono = clave === 'escolta' ? 'fa-shield-halved' : 'fa-award';

    grid.innerHTML = (datos[clave] || []).map(d => `
      <div class="diploma-card">
        <div class="medallon-diploma"><i class="fa-solid ${icono}"></i></div>
        <div style="flex:1;">
          <span class="diploma-cinta"><i class="fa-solid fa-star"></i> ${d.titulo}</span>
          <h4>${d.nombre}</h4>
          <p style="font-size:0.86rem;color:#5D4A4E;">${d.detalle}</p>
          ${modoAdmin ? `<button class="btn-rojo-mini" style="margin-top:8px;" onclick="borrarMerito('${clave}', ${d.id})">Eliminar</button>` : ''}
        </div>
      </div>
    `).join('');
  }

  window.borrarMerito = (clave, id) => {
    const datos = obtenerMerito();
    datos[clave] = (datos[clave] || []).filter(item => item.id !== id);
    localStorage.setItem('mlge_merito_v1', JSON.stringify(datos));
    pintarDiplomas(clave);
    notificar('Registro eliminado.');
  };

  document.querySelectorAll('#tabsMerito .pill-filtro').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#tabsMerito .pill-filtro').forEach(b => b.classList.remove('activo'));
      btn.classList.add('activo');
      pintarDiplomas(btn.dataset.m);
    });
  });

  // =========================================================================
  // 5. COMUNICADOS Y LOGROS CON FOTOS
  // =========================================================================
  const comunicadosBase = [
    {
      id: 1,
      titulo: 'Atención Regular y Matrícula Escolar 2026',
      tipo: 'Dirección',
      fecha: '14/11/2026',
      texto: 'Se informa a los padres de familia del Centro Poblado de Chipa que la atención en Dirección y Secretaría se realiza de lunes a viernes de 08:30 a.m. a 01:30 p.m.'
    },
    {
      id: 2,
      titulo: 'Trayectoria Institucional desde el Año 2003',
      tipo: 'Académico',
      fecha: '10/11/2026',
      texto: 'Invitamos a toda la comunidad educativa y exalumnos de nuestras promociones a participar en nuestras actividades cívicas y culturales.'
    }
  ];

  const logrosBase = [
    {
      id: 101,
      categoria: 'Etapa Distrital',
      titulo: 'Desfile Escolar Ninacaca',
      texto: 'Destacada presentación de gallardía y disciplina de la escolta institucional.',
      fotoDefault: 'logro-1.jpg'
    },
    {
      id: 102,
      categoria: 'UGEL Pasco',
      titulo: 'Juegos Florales Escolares',
      texto: 'Reconocimiento en expresiones artísticas, declamación y cultura altoandina.',
      fotoDefault: 'logro-2.jpg'
    },
    {
      id: 103,
      categoria: 'Ciencia y Tecnología',
      titulo: 'Feria Escolar EUREKA',
      texto: 'Proyectos ambientales y soluciones creativas desarrolladas por nuestros alumnos.',
      fotoDefault: 'logro-3.jpg'
    }
  ];

  function obtenerComunicados() {
    const raw = localStorage.getItem('mlge_avisos_v3');
    return raw ? JSON.parse(raw) : comunicadosBase;
  }

  function obtenerLogros() {
    const raw = localStorage.getItem('mlge_logros_v2');
    return raw ? JSON.parse(raw) : logrosBase;
  }

  function renderizarComunicados() {
    const cont = document.getElementById('contenedorComunicados');
    cont.innerHTML = obtenerComunicados().map(c => `
      <article class="comunicado-card">
        <div class="flex-row" style="margin-bottom:8px;">
          <span class="badge-crema">${c.tipo}</span>
          <small style="color:#5D4A4E;">${c.fecha}</small>
        </div>
        <h4 style="color:#4A0B18;margin-bottom:6px;">${c.titulo}</h4>
        <p style="font-size:0.9rem;color:#5D4A4E;">${c.texto}</p>
        ${modoAdmin ? `<button class="btn-rojo-mini" style="margin-top:10px;" onclick="borrarAviso(${c.id})">Eliminar</button>` : ''}
      </article>
    `).join('');
  }

  function renderizarLogros() {
    const cont = document.getElementById('contenedorLogros');
    const claseBotonAdmin = modoAdmin ? 'btn-subir-foto-flotante solo-admin' : 'btn-subir-foto-flotante solo-admin oculto';

    cont.innerHTML = obtenerLogros().map(l => `
      <div class="tarjeta-con-foto">
        <div class="marco-foto-tarjeta">
          <img id="imgLogro_${l.id}" alt="${l.titulo}">
          <div class="placeholder-foto" id="phLogro_${l.id}">
            <i class="fa-solid fa-trophy"></i>
            <span>Foto del Logro (<code>${l.fotoDefault || 'logro.jpg'}</code>)</span>
          </div>
          <button type="button" class="${claseBotonAdmin}" onclick="cambiarFotoLogro(${l.id})">
            <i class="fa-solid fa-camera"></i> Cambiar Foto
          </button>
        </div>
        <div class="tarjeta-con-foto-body">
          <span class="badge-crema">${l.categoria}</span>
          <h4>${l.titulo}</h4>
          <p style="font-size:0.9rem;color:#5D4A4E;">${l.texto}</p>
          ${modoAdmin ? `<button class="btn-rojo-mini" style="margin-top:12px;" onclick="borrarLogro(${l.id})">Eliminar Logro</button>` : ''}
        </div>
      </div>
    `).join('');

    obtenerLogros().forEach(l => {
      const img = document.getElementById(`imgLogro_${l.id}`);
      const ph = document.getElementById(`phLogro_${l.id}`);
      if (l.fotoData) {
        img.src = l.fotoData;
        img.style.display = 'block';
        ph.style.display = 'none';
      } else {
        configurarImagenConRespaldo(img, ph, `logro_foto_${l.id}`, [l.fotoDefault || 'logro.jpg', `img/${l.fotoDefault}`]);
      }
    });
  }

  window.cambiarFotoLogro = (idLogro) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      comprimirImagen(file, (dataUrl) => {
        const lista = obtenerLogros().map(item => item.id === idLogro ? { ...item, fotoData: dataUrl } : item);
        localStorage.setItem('mlge_logros_v2', JSON.stringify(lista));
        renderizarLogros();
        notificar('Foto del logro actualizada.');
      });
    };
    input.click();
  };

  function actualizarPanelesAdmin() {
    document.querySelectorAll('.solo-admin').forEach(el => {
      el.classList.toggle('oculto', !modoAdmin);
    });

    if (modoAdmin) {
      document.getElementById('boxPublicarAdmin').classList.remove('oculto');
      document.getElementById('boxPublicarLogro').classList.remove('oculto');
      document.getElementById('boxAdminMerito').classList.remove('oculto');
    } else {
      document.getElementById('boxPublicarAdmin').classList.add('oculto');
      document.getElementById('boxPublicarLogro').classList.add('oculto');
      document.getElementById('boxAdminMerito').classList.add('oculto');
    }
    renderizarComunicados();
    renderizarLogros();
    pintarDiplomas(tabMeritoActual);
    seleccionarPromocion(anioPromoActivo);
  }

  window.borrarAviso = (id) => {
    const restantes = obtenerComunicados().filter(x => x.id !== id);
    localStorage.setItem('mlge_avisos_v3', JSON.stringify(restantes));
    renderizarComunicados();
    notificar('Aviso eliminado.');
  };

  window.borrarLogro = (id) => {
    const restantes = obtenerLogros().filter(x => x.id !== id);
    localStorage.setItem('mlge_logros_v2', JSON.stringify(restantes));
    renderizarLogros();
    notificar('Logro eliminado.');
  };

  const modalLogin = document.getElementById('modalLoginAdmin');

  function abrirModalOAdmin() {
    if (modoAdmin) actualizarPanelesAdmin();
    else modalLogin.classList.remove('oculto');
  }

  document.getElementById('btnAdminModal').addEventListener('click', abrirModalOAdmin);
  document.getElementById('btnAdminLogros').addEventListener('click', abrirModalOAdmin);
  document.getElementById('btnAdminMerito').addEventListener('click', abrirModalOAdmin);
  document.getElementById('cerrarModalLogin').addEventListener('click', () => modalLogin.classList.add('oculto'));

  document.getElementById('formCheckAdmin').addEventListener('submit', (e) => {
    e.preventDefault();
    if (document.getElementById('passAdminInput').value === CLAVE_DIRECTIVA) {
      modoAdmin = true;
      sessionStorage.setItem('mlge_admin_ok', 'true');
      modalLogin.classList.add('oculto');
      e.target.reset();
      actualizarPanelesAdmin();
      notificar('Sesión directiva iniciada.');
    } else {
      notificar('Clave incorrecta.');
    }
  });

  function cerrarSesionDirectiva() {
    modoAdmin = false;
    sessionStorage.removeItem('mlge_admin_ok');
    actualizarPanelesAdmin();
    notificar('Sesión cerrada.');
  }

  document.getElementById('btnCerrarAdmin').addEventListener('click', cerrarSesionDirectiva);
  document.getElementById('btnCerrarAdminLogro').addEventListener('click', cerrarSesionDirectiva);
  document.getElementById('btnCerrarAdminMerito').addEventListener('click', cerrarSesionDirectiva);

  document.getElementById('formNuevoComunicado').addEventListener('submit', (e) => {
    e.preventDefault();
    const lista = obtenerComunicados();
    lista.unshift({
      id: Date.now(),
      titulo: document.getElementById('comTitulo').value,
      tipo: document.getElementById('comTipo').value,
      fecha: new Date().toLocaleDateString('es-PE'),
      texto: document.getElementById('comTexto').value
    });
    localStorage.setItem('mlge_avisos_v3', JSON.stringify(lista));
    e.target.reset();
    renderizarComunicados();
    notificar('Comunicado publicado.');
  });

  let fotoLogroTemporal = '';
  document.getElementById('inputFotoLogro').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    document.getElementById('labelFotoLogro').textContent = `Foto lista: ${file.name}`;
    comprimirImagen(file, (dataUrl) => { fotoLogroTemporal = dataUrl; });
  });

  document.getElementById('formNuevoLogro').addEventListener('submit', (e) => {
    e.preventDefault();
    const lista = obtenerLogros();
    lista.unshift({
      id: Date.now(),
      categoria: document.getElementById('logroCategoria').value,
      titulo: document.getElementById('logroTitulo').value,
      texto: document.getElementById('logroTexto').value,
      fotoData: fotoLogroTemporal || ''
    });
    localStorage.setItem('mlge_logros_v2', JSON.stringify(lista));
    fotoLogroTemporal = '';
    document.getElementById('labelFotoLogro').textContent = 'Seleccionar fotografía del logro o trofeo (Opcional)';
    e.target.reset();
    renderizarLogros();
    notificar('Logro publicado.');
  });

  document.getElementById('formActualizarMerito').addEventListener('submit', (e) => {
    e.preventDefault();
    const cat = document.getElementById('meritoCategoria').value;
    const datos = obtenerMerito();
    if (!datos[cat]) datos[cat] = [];
    datos[cat].unshift({
      id: Date.now(),
      titulo: document.getElementById('meritoCargo').value,
      nombre: document.getElementById('meritoNombre').value,
      detalle: document.getElementById('meritoDetalle').value
    });
    localStorage.setItem('mlge_merito_v1', JSON.stringify(datos));
    e.target.reset();
    pintarDiplomas(cat);
    notificar('Cuadro de mérito actualizado.');
  });

  actualizarPanelesAdmin();

  // =========================================================================
  // 6. MESA DE PARTES VIRTUAL
  // =========================================================================
  const selectTipo = document.getElementById('tipoTramite');
  const labelDetalle = document.getElementById('labelDetalleTramite');
  const bloqueEvidencia = document.getElementById('bloqueEvidencia');

  selectTipo.addEventListener('change', () => {
    const val = selectTipo.value;
    if (val === 'justificacion') {
      labelDetalle.textContent = 'Motivo de la inasistencia y fecha(s)';
      bloqueEvidencia.classList.remove('oculto');
    } else if (val === 'cita') {
      labelDetalle.textContent = 'Motivo de la cita y horario sugerido';
      bloqueEvidencia.classList.add('oculto');
    } else {
      labelDetalle.textContent = 'Detalle del documento o constancia solicitada';
      bloqueEvidencia.classList.add('oculto');
    }
  });

  document.getElementById('mpArchivo').addEventListener('change', (e) => {
    if (e.target.files[0]) {
      document.getElementById('textoArchivo').textContent = `Adjunto: ${e.target.files[0].name}`;
    }
  });

  function obtenerDatosTramite() {
    const tipo = selectTipo.options[selectTipo.selectedIndex].text;
    const [telefonoWsp, nombreDestinatario] = document.getElementById('destinatarioTramite').value.split('|');
    const apo = document.getElementById('mpApoderado').value;
    const est = document.getElementById('mpEstudiante').value;
    const dni = document.getElementById('mpDni').value;
    const cel = document.getElementById('mpCelular').value;
    const det = document.getElementById('mpDetalle').value;

    const mensaje = `MESA DE PARTES VIRTUAL - I.E. MARÍA LUZ GUILLÉN ESPINOZA\nTrámite: ${tipo}\nDirigido a: ${nombreDestinatario}\nApoderado: ${apo}\nEstudiante: ${est} (DNI: ${dni})\nCelular Apoderado: ${cel}\nDetalle: ${det}`;
    return { telefonoWsp, tipo, mensaje };
  }

  document.getElementById('formMesaPartes').addEventListener('submit', (e) => {
    e.preventDefault();
    const { telefonoWsp, mensaje } = obtenerDatosTramite();
    window.open(`https://wa.me/${telefonoWsp}?text=${encodeURIComponent(mensaje)}`, '_blank');
  });

  document.getElementById('btnEnviarCorreoMp').addEventListener('click', () => {
    const { tipo, mensaje } = obtenerDatosTramite();
    window.location.href = `mailto:marialuzguillen03@gmail.com?subject=${encodeURIComponent(tipo)}&body=${encodeURIComponent(mensaje)}`;
  });

  // =========================================================================
  // 7. CONSULTA DE NOTAS POR DNI (34 ESTUDIANTES - GOOGLE SHEETS CSV O LOCAL)
  // =========================================================================
  const URL_CSV_NOTAS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT6urcZfSYYLDMT--EWRQsFIzpMCkJFfOrsywH_JSMt18187P1NkA3D_bW3o9WE8XS6h7jVgudeNEFe/pub?gid=0&single=true&output=csv';

  const baseNotasLocal = {
    '12345678': {
      alumno: 'ESTUDIANTE DEMO — 3.° GRADO DE SECUNDARIA',
      periodo: 'Evaluación Bimestral 2026',
      cursos: [
        { area: 'Matemática', nota: 'AD' },
        { area: 'Comunicación', nota: 'A' },
        { area: 'Ciencia y Tecnología', nota: 'AD' },
        { area: 'Ciencias Sociales', nota: 'A' },
        { area: 'Educación para el Trabajo', nota: 'AD' }
      ]
    }
  };

  function parsearCSV(texto) {
    const lineas = texto.trim().split(/\r?\n/);
    const cabeceras = lineas[0].split(',').map(h => h.trim().toUpperCase());
    return lineas.slice(1).map(linea => {
      const valores = linea.split(',').map(v => v.trim());
      const fila = {};
      cabeceras.forEach((col, i) => { fila[col] = valores[i] || '-'; });
      return fila;
    });
  }

  const formNotas = document.getElementById('formNotasDni');
  if (formNotas) formNotas.addEventListener('submit', async (e) => {
    e.preventDefault();
    const dni = document.getElementById('dniAlumnoInput').value.trim();
    const box = document.getElementById('boxResultadoNotas');

    box.classList.remove('oculto');
    box.innerHTML = '<p style="color:#5D4A4E;">Consultando registro académico...</p>';

    if (URL_CSV_NOTAS) {
      try {
        const resp = await fetch(URL_CSV_NOTAS);
        const csvTexto = await resp.text();
        const estudiantes = parsearCSV(csvTexto);
        const alumno = estudiantes.find(est => est.DNI === dni);

        if (alumno) {
          const cursos = [
            { area: 'Matemática', nota: alumno.MATEMATICA },
            { area: 'Comunicación', nota: alumno.COMUNICACION },
            { area: 'Ciencia y Tecnología', nota: alumno.CYT },
            { area: 'Ciencias Sociales', nota: alumno.CCSS },
            { area: 'Desarrollo Personal, Ciudadanía y Cívica', nota: alumno.DPCC },
            { area: 'Educación para el Trabajo', nota: alumno.EPT },
            { area: 'Arte y Cultura', nota: alumno.ARTE },
            { area: 'Inglés', nota: alumno.INGLES },
            { area: 'Educación Física', nota: alumno.ED_FISICA },
            { area: 'Educación Religiosa', nota: alumno.RELIGION }
          ];

          box.innerHTML = `
            <div class="flex-row" style="margin-bottom:8px;flex-wrap:wrap;gap:6px;">
              <div>
                <h4 style="color:#4A0B18;">${alumno.ALUMNO} — ${alumno.GRADO}</h4>
                <small style="color:#5D4A4E;">DNI: ${alumno.DNI} • ${alumno.PERIODO}</small>
              </div>
              <button onclick="window.print()" class="btn-borde-guindo btn-sm">
                <i class="fa-solid fa-print"></i> Imprimir
              </button>
            </div>
            <table class="tabla-mlge" style="margin-top:10px;">
              <thead><tr><th>Área Curricular</th><th>Logro</th></tr></thead>
              <tbody>
                ${cursos.map(c => `<tr><td>${c.area}</td><td><strong>${c.nota}</strong></td></tr>`).join('')}
              </tbody>
            </table>
          `;
        } else {
          box.innerHTML = `<p style="color:#991B1B;font-weight:700;">No hay calificaciones registradas para el DNI ${dni}.</p>`;
        }
      } catch (err) {
        box.innerHTML = `<p style="color:#991B1B;font-weight:700;">No se pudo conectar con la hoja de calificaciones.</p>`;
      }
      return;
    }

    const reg = baseNotasLocal[dni];
    if (reg) {
      box.innerHTML = `
        <h4 style="color:#4A0B18;">${reg.alumno}</h4>
        <small style="color:#5D4A4E;">DNI: ${dni} • ${reg.periodo}</small>
        <table class="tabla-mlge" style="margin-top:10px;">
          <thead><tr><th>Área Curricular</th><th>Logro</th></tr></thead>
          <tbody>
            ${reg.cursos.map(c => `<tr><td>${c.area}</td><td><strong>${c.nota}</strong></td></tr>`).join('')}
          </tbody>
        </table>
      `;
    } else {
      box.innerHTML = `<p style="color:#991B1B;font-weight:700;">No hay calificaciones registradas para el DNI ${dni}.</p>`;
    }
  });
});
