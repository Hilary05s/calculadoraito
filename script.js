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

// Palabras para las multiplicaciones explicadas como sumas
const vecesTexto = ['', 'una vez', 'dos veces', 'tres veces', 'cuatro veces', 'cinco veces'];

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
}

function mensaje(texto) {
  procedimiento.textContent = texto;
  resultado.textContent = '';
}

// ---------- Explicación de cada operación ----------
function crearExplicacion(a, op, b, r) {
  switch (op) {
    case '+':
      return {
        proc: 'Juntamos ' + f(a) + ' con ' + f(b) + ': ' + f(a) + ' + ' + f(b) + ' = ' + r,
        res: '¡Tenemos ' + r + ' en total!'
      };

    case '-':
      return {
        proc: 'A ' + f(a) + ' le quitamos ' + f(b) + ': ' + f(a) + ' − ' + f(b) + ' = ' + r,
        res: 'Nos quedan ' + r + '.'
      };

    case '×': {
      if (a === 0 || b === 0) {
        return {
          proc: 'Cualquier número por 0 da 0: ' + f(a) + ' × ' + f(b) + ' = 0',
          res: 'El resultado es 0.'
        };
      }
      // Si uno de los números es un entero chico (1 a 5), lo explicamos como suma repetida
      let veces = null, numero = null;
      if (Number.isInteger(b) && b >= 1 && b <= 5) { veces = b; numero = a; }
      else if (Number.isInteger(a) && a >= 1 && a <= 5) { veces = a; numero = b; }

      if (veces !== null) {
        const suma = Array(veces).fill(f(numero)).join(' + ');
        return {
          proc: 'Sumamos ' + f(numero) + ', ' + vecesTexto[veces] + ': ' + suma + ' = ' + r,
          res: f(a) + ' × ' + f(b) + ' = ' + r + '.'
        };
      }
      return {
        proc: 'Tomamos ' + f(a) + ' un total de ' + f(b) + ' veces: ' + f(a) + ' × ' + f(b) + ' = ' + r,
        res: 'El resultado es ' + r + '.'
      };
    }

    case '÷': {
      const enteros = Number.isInteger(a) && Number.isInteger(b) && a >= 0 && b > 0;
      if (enteros && a % b === 0) {
        return {
          proc: 'Repartimos ' + a + ' en ' + b + ' grupos iguales: ' + a + ' ÷ ' + b + ' = ' + r,
          res: 'A cada grupo le tocan ' + r + ' (comprobamos: ' + r + ' × ' + b + ' = ' + a + ').'
        };
      }
      if (enteros) {
        const cociente = Math.floor(a / b);
        const sobra = a % b;
        return {
          proc: 'Repartimos ' + a + ' en ' + b + ' grupos: a cada uno le tocan ' + cociente + ' y sobran ' + sobra,
          res: 'En decimales, ' + a + ' ÷ ' + b + ' = ' + r + '.'
        };
      }
      return {
        proc: 'Dividimos ' + f(a) + ' entre ' + f(b) + ': ' + f(a) + ' ÷ ' + f(b) + ' = ' + r,
        res: 'El resultado es ' + r + '.'
      };
    }

    case '%': {
      const producto = limpiar(a * b);
      return {
        proc: 'Multiplicamos ' + f(a) + ' × ' + f(b) + ' = ' + producto + ' y lo dividimos entre 100: ' + producto + ' ÷ 100 = ' + r,
        res: 'El ' + b + '% de ' + a + ' es ' + r + '.'
      };
    }
  }
  return { proc: '', res: '' };
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
  if (!encadena) mensaje('Elegiste ' + op + '. ¡Ahora escribe el siguiente número!');
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
  });
});
