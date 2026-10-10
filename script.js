/* =========================================================
   Calculadora Mapache — lógica
   Cada resultado muestra su PROCEDIMIENTO y su RESULTADO
   explicados de forma sencilla para los alumnos.
   ========================================================= */

// ---------- Estado de la calculadora ----------
let actual = '0';      // número que se está escribiendo
let anterior = null;   // primer número de la operación
let operacion = null;  // + - × ÷ %
let reiniciar = false; // el siguiente dígito empieza un número nuevo

// ---------- Caritas del LCD ----------
const caritas = {
  espera: '(=^.^=)',
  pensando: '(•‿•)',
  resuelto: '＼(＾▽＾)／',
  listo: '( ˘ ³˘)♥',
  error: '(｡•́︿•̀｡)'
};

// ---------- Elementos de la pantalla ----------
const pantalla = document.getElementById('main');
const historial = document.getElementById('history');
const procedimiento = document.getElementById('procedure');
const resultado = document.getElementById('result');
const carita = document.getElementById('face');
const animo = document.getElementById('mood');
const franja = document.getElementById('ticker');
const flechaArriba = document.getElementById('hint-up');
const flechaAbajo = document.getElementById('hint-down');

// Palabras para las multiplicaciones explicadas como sumas
const vecesTexto = ['', 'una vez', 'dos veces', 'tres veces', 'cuatro veces', 'cinco veces',
  'seis veces', 'siete veces', 'ocho veces', 'nueve veces'];

// Nombre de cada columna al sumar o restar "por columnas"
const lugares = ['unidades', 'decenas', 'centenas', 'unidades de millar', 'decenas de millar',
  'centenas de millar', 'unidades de millón', 'decenas de millón', 'centenas de millón'];

// Nombre que se muestra de cada operación
const nombres = { '+': 'juntar', '-': 'quitar', '×': 'veces', '÷': 'repartir', '%': 'por ciento' };
const simbolos = { '+': '+', '-': '−', '×': '×', '÷': '÷', '%': '%' };

// ---------- Utilidades ----------
function mostrar() {
  pantalla.textContent = actual;
}

function cambiarAnimo(cara, texto) {
  carita.textContent = cara;
  animo.textContent = texto;
}

// Quita el "ruido" de los decimales (0.1 + 0.2 = 0.3 y no 0.30000000000000004)
function limpiar(n) {
  return Math.round((n + Number.EPSILON) * 1000000) / 1000000;
}

// Escribe un número para la explicación; los negativos van entre paréntesis
function f(n) {
  return n < 0 ? '(' + n + ')' : String(n);
}

// Escribe el número para la pantalla sin que se salga
function paraPantalla(n) {
  const texto = String(n);
  return texto.length > 12 ? Number(n).toPrecision(8) : texto;
}

function explicar(textoProcedimiento, textoResultado) {
  procedimiento.innerHTML = textoProcedimiento ? '<b>Procedimiento:</b> ' + textoProcedimiento : '';
  resultado.innerHTML = textoResultado ? '<b>Resultado:</b> ' + textoResultado : '';
  volverAlInicio();
}

function mensaje(texto) {
  procedimiento.textContent = texto;
  resultado.textContent = '';
  volverAlInicio();
}

// ---------- Desplazamiento de la explicación ----------
// Muestra ▲ o ▼ en la pantalla solo si hay más texto en esa dirección
function actualizarFlechas() {
  const hayArriba = franja.scrollTop > 0;
  const hayAbajo = franja.scrollTop + franja.clientHeight < franja.scrollHeight - 1;
  flechaArriba.classList.toggle('is-visible', hayArriba);
  flechaAbajo.classList.toggle('is-visible', hayAbajo);
}

// Cada explicación nueva empieza desde arriba
function volverAlInicio() {
  franja.scrollTop = 0;
  actualizarFlechas();
}

// Sube (-1) o baja (+1) la explicación una línea
function desplazar(direccion) {
  const linea = parseFloat(getComputedStyle(procedimiento).lineHeight) || 15;
  franja.scrollBy({ top: direccion * linea, behavior: 'smooth' });
}

franja.addEventListener('scroll', actualizarFlechas);
// Las fuentes cambian el alto del texto al cargar
if (document.fonts) document.fonts.ready.then(actualizarFlechas);

// ---------- Ayudas para las explicaciones ----------
function lugar(i) { return lugares[i] || 'columna ' + (i + 1); }
function mayuscula(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
function plural(n, uno, varios) { return n === 1 ? uno : varios; }
function seguro(n) { return Number.isSafeInteger(n); }

// Cuántos decimales tiene un número (1.25 → 2)
function decimales(n) {
  const t = String(Math.abs(n));
  const i = t.indexOf('.');
  return i === -1 || t.includes('e') ? 0 : t.length - i - 1;
}

// Mueve el punto k lugares a la derecha (1.25 con k = 2 → 125)
function escalar(n, k) { return Math.round(n * Math.pow(10, k)); }
function sinPunto(n) { return escalar(n, decimales(n)); }

// Vuelve a poner el punto k lugares desde la derecha, sin errores de redondeo (175, 2 → "1.75")
function conPunto(n, k) {
  if (k === 0) return String(n);
  const t = String(Math.abs(n)).padStart(k + 1, '0');
  const texto = (t.slice(0, -k) + '.' + t.slice(-k)).replace(/0+$/, '').replace(/\.$/, '');
  return (n < 0 ? '-' : '') + texto;
}

// Divide s entre b (s < b) como en la división larga y busca los decimales que se repiten
function decimalesDe(s, b) {
  const vistos = new Map();
  let digitos = '', resto = s;
  while (resto !== 0 && !vistos.has(resto) && digitos.length < 40) {
    vistos.set(resto, digitos.length);
    resto *= 10;
    digitos += Math.floor(resto / b);
    resto %= b;
  }
  if (resto === 0) return { fijos: digitos, periodo: '' };
  if (vistos.has(resto)) {
    const i = vistos.get(resto);
    return { fijos: digitos.slice(0, i), periodo: digitos.slice(i) };
  }
  return { fijos: digitos, periodo: null }; // se repite, pero después de muchísimos decimales
}

// Texto de los decimales: "3333…" si se repiten, "75" si terminan
function textoDecimales(d) {
  if (d.periodo === '') return d.fijos;
  if (d.periodo === null) return d.fijos + '…';
  const veces = d.periodo.length > 3 ? 1 : Math.ceil(4 / d.periodo.length);
  return d.fijos + d.periodo.repeat(veces) + '…';
}

function generico(a, op, b) {
  return ['Estos números son muy grandes para explicarlos paso a paso, así que la calculadora hace ' +
    f(a) + ' ' + simbolos[op] + ' ' + f(b) + ' por nosotros.'];
}

// ---------- Suma ----------
function pasosSuma(a, b, ctx) {
  if (a < 0 && b < 0) {
    return ['Los dos números son negativos: juntamos ' + (-a) + ' y ' + (-b) + ' y al final ponemos el signo menos.']
      .concat(pasosSuma(-a, -b, ctx), ['Con el signo menos queda negativo.']);
  }
  if (b < 0) {
    return ['Sumar un número negativo es lo mismo que restar: ' + f(a) + ' + ' + f(b) + ' es ' + a + ' − ' + (-b) + '.']
      .concat(pasosResta(a, -b, ctx));
  }
  if (a < 0) {
    return ['Cambiamos el orden para que sea más fácil: ' + f(a) + ' + ' + b + ' es ' + b + ' − ' + (-a) + '.']
      .concat(pasosResta(b, -a, ctx));
  }

  const k = Math.max(decimales(a), decimales(b));
  if (k > 0) {
    const A = escalar(a, k), B = escalar(b, k);
    if (!seguro(A + B)) return generico(a, '+', b);
    return [
      'Alineamos los puntos decimales y completamos con ceros: ' + a.toFixed(k) + ' + ' + b.toFixed(k) + '.',
      'Sumamos como si no hubiera punto: ' + A + ' + ' + B + ' = ' + (A + B) + '.',
      'Volvemos a poner el punto con ' + k + ' ' + plural(k, 'decimal', 'decimales') + ': ' + conPunto(A + B, k) + '.'
    ];
  }

  const chico = Math.min(a, b), grande = Math.max(a, b);
  if (chico === 0) return ['Sumar 0 no cambia nada: el resultado es ' + grande + '.'];
  if (chico <= 5 && grande <= 20) {
    const cuenta = [];
    for (let i = 1; i <= chico; i++) cuenta.push(grande + i);
    return ['Empezamos en ' + grande + ' y contamos ' + chico + ' más: ' + cuenta.join(', ') + '.'];
  }
  if (!seguro(a + b)) return generico(a, '+', b);

  // Suma por columnas, llevando cuando pasa de 9
  const da = String(a).split('').reverse().map(Number);
  const db = String(b).split('').reverse().map(Number);
  const pasos = ['Sumamos por columnas, de derecha a izquierda:'];
  let llevo = 0;
  for (let i = 0; i < Math.max(da.length, db.length); i++) {
    const x = da[i], y = db[i];
    if ((x === undefined || y === undefined) && !llevo) {
      pasos.push(mayuscula(lugar(i)) + ': bajamos el ' + (x === undefined ? y : x) + '.');
      continue;
    }
    const s = (x || 0) + (y || 0) + llevo;
    let t = mayuscula(lugar(i)) + ': ' + (x || 0) + ' + ' + (y || 0) + (llevo ? ' + 1 (que llevamos)' : '') + ' = ' + s;
    t += s >= 10 ? ', escribimos ' + (s % 10) + ' y llevamos 1.' : '.';
    pasos.push(t);
    llevo = s >= 10 ? 1 : 0;
  }
  if (llevo) pasos.push(mayuscula(lugar(Math.max(da.length, db.length))) + ': bajamos el 1 que llevamos.');
  return pasos;
}

// ---------- Resta ----------
function pasosResta(a, b, ctx) {
  if (b < 0) {
    return ['Restar un número negativo es lo mismo que sumar: ' + f(a) + ' − ' + f(b) + ' es ' + f(a) + ' + ' + (-b) + '.']
      .concat(pasosSuma(a, -b, ctx));
  }
  if (a < 0) {
    return ['Ya estamos debajo del 0 y quitamos más, así que bajamos todavía más: juntamos ' + (-a) + ' y ' + b + ' y ponemos el signo menos.']
      .concat(pasosSuma(-a, b, ctx), ['Con el signo menos queda negativo.']);
  }
  if (a < b) {
    return ['Como ' + a + ' es menor que ' + b + ', el resultado será negativo: restamos al revés, ' + b + ' − ' + a + ', y al final ponemos el signo menos.']
      .concat(pasosResta(b, a, ctx), ['Con el signo menos queda negativo.']);
  }

  const k = Math.max(decimales(a), decimales(b));
  if (k > 0) {
    const A = escalar(a, k), B = escalar(b, k);
    if (!seguro(A)) return generico(a, '-', b);
    return [
      'Alineamos los puntos decimales y completamos con ceros: ' + a.toFixed(k) + ' − ' + b.toFixed(k) + '.',
      'Restamos como si no hubiera punto: ' + A + ' − ' + B + ' = ' + (A - B) + '.',
      'Volvemos a poner el punto con ' + k + ' ' + plural(k, 'decimal', 'decimales') + ': ' + conPunto(A - B, k) + '.',
      'Comprobamos: ' + conPunto(A - B, k) + ' + ' + b + ' = ' + a + ' ✓'
    ];
  }

  if (b === 0) return ['Quitar 0 no cambia nada: nos quedamos con ' + a + '.'];
  if (b <= 5 && a <= 20) {
    const cuenta = [];
    for (let i = 1; i <= b; i++) cuenta.push(a - i);
    return ['Empezamos en ' + a + ' y contamos ' + b + ' hacia atrás: ' + cuenta.join(', ') + '.'];
  }
  if (!seguro(a)) return generico(a, '-', b);

  // Resta por columnas, pidiendo prestado cuando no alcanza
  const da = String(a).split('').reverse().map(Number);
  const db = String(b).split('').reverse().map(Number);
  const pasos = ['Restamos por columnas, de derecha a izquierda:'];
  let presto = 0;
  for (let i = 0; i < da.length; i++) {
    const y = db[i] || 0;
    const sig = lugar(i + 1);
    let t = mayuscula(lugar(i)) + ': ';
    if (presto && da[i] === 0) {
      // un 0 que ya prestó: también pide prestado y se vuelve 9
      t += 'el 0 ya prestó 1, así que pide 1 a las ' + sig + ' y se vuelve 9; 9 − ' + y + ' = ' + (9 - y) + '.';
      presto = 1;
    } else {
      let x = da[i];
      if (presto) { t += da[i] + ' − 1 (que prestó) = ' + (da[i] - 1) + '; '; x = da[i] - 1; }
      if (x < y) {
        t += x + ' − ' + y + ' no alcanza, pedimos 1 prestado a las ' + sig + ': ' + (x + 10) + ' − ' + y + ' = ' + (x + 10 - y) + '.';
        presto = 1;
      } else {
        t += (i >= db.length && !presto ? 'bajamos el ' + x : x + ' − ' + y + ' = ' + (x - y)) + '.';
        presto = 0;
      }
    }
    pasos.push(t);
  }
  pasos.push('Comprobamos: ' + (a - b) + ' + ' + b + ' = ' + a + ' ✓');
  return pasos;
}

// ---------- Multiplicación ----------
function pasosMult(a, b, ctx) {
  if (a < 0 || b < 0) {
    const regla = a < 0 && b < 0 ? 'menos por menos da más, así que el resultado es positivo'
      : 'menos por más da menos, así que el resultado es negativo';
    return ['Regla de los signos: ' + regla + '.', 'Multiplicamos sin los signos: ' + Math.abs(a) + ' × ' + Math.abs(b) + '.']
      .concat(pasosMult(Math.abs(a), Math.abs(b), ctx), ['Al final le ponemos el signo que dice la regla.']);
  }
  if (a === 0 || b === 0) return ['Cualquier número por 0 da 0: si no tomamos nada, no tenemos nada.'];
  if (a === 1 || b === 1) return ['Cualquier número por 1 queda igual: lo tomamos una sola vez.'];

  const k = decimales(a) + decimales(b);
  if (k > 0) {
    const A = sinPunto(a), B = sinPunto(b);
    if (!seguro(A * B)) return generico(a, '×', b);
    return ['Multiplicamos sin el punto: ' + A + ' × ' + B + '.']
      .concat(pasosMult(A, B, ctx), [
        'Entre los dos números hay ' + k + ' ' + plural(k, 'decimal', 'decimales') + ', así que movemos el punto ' +
        k + ' ' + plural(k, 'lugar', 'lugares') + ' a la izquierda: ' + conPunto(A * B, k) + '.'
      ]);
  }
  if (!seguro(a * b)) return generico(a, '×', b);

  const m = Math.min(a, b), n = Math.max(a, b);
  // Números chicos: suma repetida
  if (m <= 5 || n <= 9) {
    return ['Sumamos ' + n + ', ' + vecesTexto[m] + ': ' + Array(m).fill(n).join(' + ') + ' = ' + (a * b) + '.'];
  }

  // Números grandes: separamos uno en unidades, decenas, centenas… y multiplicamos cada parte
  const x = m >= 10 ? m : n;
  const y = x === m ? n : m;
  const digitos = String(x);
  const partes = [];
  for (let i = 0; i < digitos.length; i++) {
    const d = Number(digitos[i]);
    if (d) partes.push(d * Math.pow(10, digitos.length - i - 1));
  }
  if (partes.length === 1) {
    const ceros = digitos.length - 1;
    const d = x / Math.pow(10, ceros);
    return [
      'Primero multiplicamos ' + d + ' × ' + y + ' = ' + (d * y) + '.',
      'Como ' + x + ' tiene ' + ceros + ' ' + plural(ceros, 'cero', 'ceros') + ', se ' + plural(ceros, 'lo', 'los') +
      ' agregamos al final: ' + (x * y) + '.'
    ];
  }
  return ['Separamos ' + x + ' en partes: ' + x + ' = ' + partes.join(' + ') + '.', 'Multiplicamos cada parte por ' + y + ':']
    .concat(partes.map(function (p) { return p + ' × ' + y + ' = ' + (p * y); }),
      ['Sumamos los resultados: ' + partes.map(function (p) { return p * y; }).join(' + ') + ' = ' + (x * y) + '.']);
}

// ---------- División ----------
function pasosDiv(a, b, ctx) {
  if (a < 0 || b < 0) {
    const regla = a < 0 && b < 0 ? 'menos entre menos da más, así que el resultado es positivo'
      : 'si los signos son distintos, el resultado es negativo';
    return ['Regla de los signos: ' + regla + '.', 'Dividimos sin los signos: ' + Math.abs(a) + ' ÷ ' + Math.abs(b) + '.']
      .concat(pasosDiv(Math.abs(a), Math.abs(b), ctx), ['Al final le ponemos el signo que dice la regla.']);
  }
  if (a === 0) return ['Si repartimos 0 en ' + b + ' grupos, a cada grupo le toca 0: no hay nada que repartir.'];

  const k = Math.max(decimales(a), decimales(b));
  if (k > 0) {
    const A = escalar(a, k), B = escalar(b, k);
    if (!seguro(A) || !seguro(B)) return generico(a, '÷', b);
    return ['Para quitar los decimales, movemos el punto ' + k + ' ' + plural(k, 'lugar', 'lugares') +
      ' a la derecha en los dos números (el resultado no cambia): ' + A + ' ÷ ' + B + '.']
      .concat(pasosDiv(A, B, ctx));
  }
  if (!seguro(a) || !seguro(b)) return generico(a, '÷', b);
  if (b === 1) return ['Si repartimos ' + a + ' en 1 solo grupo, ese grupo se queda con todo: ' + a + '.'];

  const q = Math.floor(a / b);
  const s = a % b;
  if (s === 0) {
    return ['Repartimos ' + a + ' en ' + b + ' grupos iguales: a cada grupo le tocan ' + q + '.',
      'Comprobamos: ' + q + ' × ' + b + ' = ' + a + ' ✓'];
  }

  const pasos = [];
  if (q === 0) {
    pasos.push(a + ' es menor que ' + b + ': no alcanza para darle un entero a cada grupo, así que lo repartimos en pedacitos.');
  } else {
    pasos.push('Repartimos ' + a + ' en ' + b + ' grupos: a cada uno le ' + plural(q, 'toca ', 'tocan ') + q +
      ' (' + q + ' × ' + b + ' = ' + (q * b) + ') y ' + plural(s, 'sobra ', 'sobran ') + s + '.');
  }

  // De dónde salen los decimales: lo que sobra se parte en décimos y se sigue repartiendo
  const decimos = s * 10;
  const primero = Math.floor(decimos / b);
  const resto = decimos % b;
  const lo = plural(s, 'lo', 'los');
  const inicio = q === 0 ? 'Para repartir el ' + s + ', ' + lo
    : plural(s, 'El ' + s + ' que sobra también se reparte', 'Los ' + s + ' que sobran también se reparten') +
      ' entre ' + b + '. Para hacerlo, ' + lo;
  pasos.push(inicio + ' convertimos en décimos: ' + s + ' = ' + decimos + ' décimos, y ' + decimos + ' ÷ ' + b + ' = ' +
    primero + ' ' + plural(primero, 'décimo', 'décimos') + (resto ? ' (y ' + plural(resto, 'sobra ', 'sobran ') + resto + ').' : '.'));

  const d = decimalesDe(s, b);
  const texto = textoDecimales(d);
  const punto = texto.endsWith('…') ? '' : '.'; // sin punto final después de "…"
  if (d.periodo !== '' || d.fijos.length > 1) {
    pasos.push('Seguimos repartiendo lo que sobra en centésimos, milésimos… y obtenemos ' + s + ' ÷ ' + b + ' = 0.' + texto + punto);
  }
  if (q > 0) pasos.push('Juntamos: ' + q + ' + 0.' + texto + ' = ' + q + '.' + texto + punto);

  if (d.periodo) {
    pasos.push('Los decimales nunca terminan: siempre vuelve a sobrar lo mismo, así que el ' + d.periodo + ' se repite para siempre.');
    ctx.aprox = true;
    ctx.nota = d.periodo.length <= 6 ? '(el ' + d.periodo + ' se repite para siempre)' : '(los decimales nunca terminan)';
  } else if (d.periodo === null) {
    ctx.aprox = true;
    ctx.nota = '(los decimales nunca terminan)';
  } else if (d.fijos.length > 6) {
    ctx.aprox = true;
    ctx.nota = '(redondeado a 6 decimales)';
  }
  return pasos;
}

// ---------- Porcentaje ----------
function pasosPorc(a, b) {
  const pasos = [b + '% significa ' + b + ' de cada 100.'];
  const trucos = {
    100: '100% es todo el número.',
    50: '50% es la mitad: ' + f(a) + ' ÷ 2.',
    25: '25% es la cuarta parte: ' + f(a) + ' ÷ 4.',
    10: '10% es dividir entre 10.',
    200: '200% es el doble: ' + f(a) + ' × 2.'
  };
  if (trucos[b]) pasos.push('Truco: ' + trucos[b]);

  const k = decimales(a) + decimales(b);
  const P = sinPunto(a) * sinPunto(b);
  if (!seguro(P)) return pasos.concat(generico(a, '%', b));
  return pasos.concat([
    'Paso 1: multiplicamos ' + f(a) + ' × ' + f(b) + ' = ' + conPunto(P, k) + '.',
    'Paso 2: dividimos entre 100, que es mover el punto 2 lugares a la izquierda: ' +
    conPunto(P, k) + ' ÷ 100 = ' + conPunto(P, k + 2) + '.'
  ]);
}

// ---------- Explicación completa: procedimiento paso a paso + resultado ----------
function crearExplicacion(a, op, b, r) {
  const ctx = { aprox: false, nota: '' };
  const pasos = { '+': pasosSuma, '-': pasosResta, '×': pasosMult, '÷': pasosDiv, '%': pasosPorc }[op](a, b, ctx);

  // El resultado de la pantalla se redondea a 6 decimales
  const usados = op === '×' ? decimales(a) + decimales(b)
    : op === '%' ? decimales(a) + decimales(b) + 2
    : op === '÷' ? 0 : Math.max(decimales(a), decimales(b));
  if (!ctx.aprox && usados > 6) {
    ctx.aprox = true;
    ctx.nota = '(redondeado a 6 decimales)';
  }

  const igual = ctx.aprox ? ' ≈ ' : ' = ';
  const res = op === '%'
    ? 'El ' + b + '% de ' + f(a) + (ctx.aprox ? ' es aproximadamente ' : ' es ') + r + (ctx.nota ? ' ' + ctx.nota : '') + '.'
    : f(a) + ' ' + simbolos[op] + ' ' + f(b) + igual + r + (ctx.nota ? ' ' + ctx.nota : '') + '.';
  return { proc: pasos.join('<br>'), res: res };
}

// ---------- Acciones de las teclas ----------
function escribirDigito(d) {
  if (reiniciar) { actual = d; reiniciar = false; }
  else if (actual === '0') actual = d;
  else if (actual.length < 10) actual += d;
  cambiarAnimo(caritas.pensando, 'PENSANDO...');
  mostrar();
}

function escribirPunto() {
  if (reiniciar) { actual = '0.'; reiniciar = false; }
  else if (!actual.includes('.')) actual += '.';
  mostrar();
}

function elegirOperacion(op) {
  // Si ya había una operación pendiente, la resolvemos primero (encadenar)
  const encadena = operacion !== null && !reiniciar;
  if (encadena) {
    if (!calcular(false)) return;
  }
  anterior = parseFloat(actual);
  operacion = op;
  reiniciar = true;
  historial.textContent = anterior + ' ' + op;
  if (!encadena) mensaje('Elegiste ' + simbolos[op] + ' (' + nombres[op] + '). ¡Ahora escribe el siguiente número!');
  cambiarAnimo(caritas.espera, 'SIGUE ASÍ');
}

// final = true cuando se presiona "="; devuelve false si hubo error
function calcular(final) {
  if (operacion === null || anterior === null) return true;

  const a = anterior;
  const b = parseFloat(actual);
  let r;

  switch (operacion) {
    case '+': r = a + b; break;
    case '-': r = a - b; break;
    case '×': r = a * b; break;
    case '÷':
      if (b === 0) {
        pantalla.textContent = 'Error :(';
        historial.textContent = a + ' ÷ 0';
        explicar('¡Ups! No podemos repartir entre 0 grupos.', 'No se puede dividir entre 0.');
        cambiarAnimo(caritas.error, '¡CUIDADO!');
        actual = '0'; anterior = null; operacion = null; reiniciar = true;
        return false;
      }
      r = a / b; break;
    case '%': r = (a * b) / 100; break;
    default: return true;
  }

  r = limpiar(r);
  const exp = crearExplicacion(a, operacion, b, r);
  explicar(exp.proc, exp.res);
  historial.textContent = a + ' ' + operacion + ' ' + b + ' =';
  actual = paraPantalla(r);
  mostrar();

  if (final) {
    cambiarAnimo(caritas.resuelto, '¡GENIAL!');
    anterior = null;
    operacion = null;
  } else {
    anterior = r;
  }
  reiniciar = true;
  return true;
}

function borrarTodo() {
  actual = '0'; anterior = null; operacion = null; reiniciar = false;
  historial.textContent = 'En blanco ♪';
  mensaje('¡Pizarra limpia! ¿Qué vamos a calcular hoy?');
  cambiarAnimo(caritas.listo, 'LISTO');
  mostrar();
}

function borrarUno() {
  if (reiniciar) return;
  actual = actual.length > 1 ? actual.slice(0, -1) : '0';
  mostrar();
}

// ---------- Conectar los botones ----------
document.querySelectorAll('[data-key]').forEach(function (boton) {
  boton.addEventListener('click', function () {
    const tipo = boton.dataset.key;
    const valor = boton.dataset.val;

    if (navigator.vibrate) navigator.vibrate(20);

    if (tipo === 'num') escribirDigito(valor);
    else if (tipo === 'dot') escribirPunto();
    else if (tipo === 'op') elegirOperacion(valor);
    else if (tipo === 'equals') calcular(true);
    else if (tipo === 'clear') borrarTodo();
    else if (tipo === 'backspace') borrarUno();
    else if (tipo === 'scroll-up') desplazar(-1);
    else if (tipo === 'scroll-down') desplazar(1);
  });
});
