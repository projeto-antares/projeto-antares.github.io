/*
 * template.js — modelo-base para simulações do Projeto Antαres.
 * Depende de core.js e dos elementos HTML indicados pelos seletores.
 *
 * Seções:
 * 1. Configuração e estado
 * 2. Interface
 * 3. Modelo físico
 * 4. Controle
 * 5. Integração
 * 6. Texto de situação
 * 7. Desenho
 * 8. Gráficos opcionais
 * 9. Inicialização
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------
  // 1. CONFIGURAÇÃO E ESTADO
  // ---------------------------------------------------------------------

  const { $, rk4, f2, arrow, css } = Sim;
  const DT = 1 / 2000;              // passo fixo da integração
  const P = {};                     // parâmetros: P.<id>
  const cv = $('cv');
  const ctx = cv.getContext('2d');
  const fit = Sim.fit(cv, 0.7, 340, 500); //dimensoes

  // Estado dinâmico. Adapte q ao sistema físico.
  let q = [0, 0];                   // exemplo: [posição, velocidade]
  let t = 0;
  let mode = 'idle';                // 'idle' | 'run' | 'end'
  let paused = false;
  let rows = [];
  let acc = 0;
  let count = 0;
  let su;                           // grandezas derivadas em setup()
  let lastStatus = '';

  Sim.interactive(cv, fit);
  Sim.playbar(cv, () => mode, () => paused);

  // ---------------------------------------------------------------------
  // 2. INTERFACE E CONTROLES
  // ---------------------------------------------------------------------

  // Parâmetros físicos reiniciam a simulação; parâmetros visuais não.
  Sim.controls($('ctl'), [
    { id: 'par1', label: 'Parâmetro 1', unit: '', min: 0, max: 10, step: 0.1, val: 1 },
    { id: 'par2', label: 'Parâmetro 2', unit: '', min: 0, max: 10, step: 0.1, val: 2 },
    { id: 'spd', label: 'Velocidade da animação', unit: '×', min: 0.1, max: 2, step: 0.05, val: 1 }
  ], P, id => {
    if (id === 'spd') return;
    reset();
  });

  // Controles HTML opcionais:
  // $('c_opcao').addEventListener('change', reset);
  // $('seletor').addEventListener('change', e => { /* ... */ reset(); });

  const out = Sim.readouts($('ro'), [
    ['t', 't (s)'],
    ['x', 'x (m)'],
    ['v', 'v (m/s)']
  ]);

  Sim.panel(cv, $('ctl'));
  Sim.panel(cv, $('opt'), { type: 'options' });
  Sim.panel(cv, $('lvet'), { type: 'palette' });
  Sim.panel(cv, $('plt'), { type: 'plot' });
  Sim.panel(cv, $('book'), { type: 'book' });
  Sim.legend('#legenda');
Sim.panel(cv, $('legenda'), { type: 'legend' });

  // ---------------------------------------------------------------------
  // 3. MODELO FÍSICO
  // ---------------------------------------------------------------------

  // Calcula grandezas derivadas dos parâmetros atuais.
  function setup() {
    // TODO: substituir pelas expressões do modelo.
    const escala = P.par1;
    const taxa = P.par2;

    return {
      escala,
      taxa,
      tEnd: 10                       // duração máxima
    };
  }

  // Formato dos dados: [tempo, grandeza 1, grandeza 2, ...].
  // A coluna 0 é sempre o tempo.
  function row() {
    const x = q[0];
    const v = q[1];
    return [t, x, v];
  }

  function record() {
    rows.push(row());
  }

  // ---------------------------------------------------------------------
  // 4. CONTROLE DA SIMULAÇÃO
  // ---------------------------------------------------------------------

  function reset() {
    su = setup();

    // TODO: condições iniciais.
    q = [0, 0];

    t = 0;
    rows = [];
    acc = 0;
    count = 0;
    paused = false;
    mode = 'idle';
    $('bp').textContent = 'Pausar';
  }

  function launch() {
    reset();
    mode = 'run';
    record();
  }

  function end() {
    record();
    mode = 'end';
  }

  $('bl').onclick = launch;

  $('bp').onclick = () => {
    if (mode !== 'run') return;
    paused = !paused;
    $('bp').textContent = paused ? 'Continuar' : 'Pausar';
  };

  $('bc').onclick = reset;

  // ---------------------------------------------------------------------
  // 5. INTEGRAÇÃO NUMÉRICA
  // ---------------------------------------------------------------------

  /*
   * Exemplo de sistema de segunda ordem:
   *   x' = v
   *   v' = a(x,v)
   *
   * Substitua a segunda derivada pela equação do problema.
   */
  function step(dt) {
    if (mode !== 'run' || paused) return;

    acc += dt * (P.spd || 1);

    while (acc >= DT) {
      acc -= DT;

      const next = rk4(
        z => [
          z[1],
          -su.escala * z[0] - su.taxa * z[1] // TODO: aceleração
        ],
        q,
        DT
      );

      q = next;
      t += DT;

      if (++count % 2 === 0) record();

      if (t >= su.tEnd) {
        end();
        return;
      }
    }
  }

  // ---------------------------------------------------------------------
  // 6. TEXTO DE SITUAÇÃO
  // ---------------------------------------------------------------------

  // Pode retornar texto simples ou LaTeX entre \( ... \).
  function status() {
    if (mode === 'end') return 'Fim da simulação.';
    return `Tempo: ${f2(t)} s; posição: ${f2(q[0])} m; velocidade: ${f2(q[1])} m/s.`;
  }

  // ---------------------------------------------------------------------
  // 7. DESENHO
  // ---------------------------------------------------------------------

  function draw() {
    const C = css;
    const W = fit.w;
    const H = fit.h;

    ctx.clearRect(0, 0, W, H);

    // TODO: defina a transformação das coordenadas físicas para pixels.
    const margin = 35;
    const scaleX = (W - 2 * margin) / 10;
    const X = x => margin + x * scaleX;
    const y0 = H * 0.6;

    // Exemplo de eixo/referência.
    ctx.strokeStyle = C('--ground');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin, y0);
    ctx.lineTo(W - margin, y0);
    ctx.stroke();

    // Exemplo de elemento móvel.
    ctx.fillStyle = C('--acc');
    ctx.beginPath();
    ctx.arc(X(q[0]), y0 - 25, 10, 0, 2 * Math.PI);
    ctx.fill();

    // TODO: desenhar os elementos específicos da simulação.
    // Vetor: arrow(ctx, x, y, dx, dy, cor, espessura).

    // Leituras.
    const r = row();
    out('t', t);
    out('x', r[1]);
    out('v', r[2]);

    // Atualiza MathJax somente quando a mensagem muda.
    const s = status();
    if (s !== lastStatus) {
      lastStatus = s;
      $('cmp').textContent = s;
      Sim.math($('cmp'));
    }
  }

  // ---------------------------------------------------------------------
  // 8. GRÁFICOS (OPCIONAL)
  // ---------------------------------------------------------------------

  /*
   * Exemplo:
   *
   * const plotOpts = [
   *   { tmax: 5, mt: 8, series: [{ col: 1, name: 'x', color: '--acc' }] }
   * ];
   * const plots = [new Sim.Plot($('p1'), plotOpts[0])];
   *
   * Em draw():
   *   plots[0].draw(rows, null, su.tEnd);
   *
   * col: 0 = tempo; col: 1 = primeira grandeza de row();
   * col: 2 = segunda grandeza, e assim por diante.
   */

  // ---------------------------------------------------------------------
  // 9. INICIALIZAÇÃO E LOOP
  // ---------------------------------------------------------------------

  Sim.urlLoad();
  reset();
  Sim.urlButton(cv);

  Sim.loop(dt => {
    step(dt);
    draw();
  });

})();
