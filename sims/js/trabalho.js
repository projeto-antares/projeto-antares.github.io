/*
 * trabalho.js — trabalho realizado por uma força variável.
 *
 * Modelo: bloco sobre superfície horizontal sem atrito, submetido
 * a uma força variável com a posição.
 *
 * Modelos:
 * 1. Linear:     F(x) = F₀ + kx
 * 2. Quadrático: F(x) = F₀ + kx²
 *
 * Gráficos: força, trabalho e energia cinética em função da posição.
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------
  // 1. CONFIGURAÇÃO E ESTADO
  // ---------------------------------------------------------------------

  const { $, rk4, fm, f2, arrow, css } = Sim;
  const DT = 1 / 2000;
  const P = {};
  const cv = $('cv');
  const ctx = cv.getContext('2d');

  const fit = Sim.fit(cv, 0.62, 300, 480);

  let q = [0, 0, 0]; // [posição, velocidade, trabalho]
  let t = 0;
  let mode = 'idle';              // 'idle' | 'run' | 'end'
  let paused = false;
  let rows = [];
  let acc = 0;
  let count = 0;
  let su;
  let lastStatus = '';

  Sim.interactive(cv, fit);
  Sim.playbar(cv, () => mode, () => paused);

  // ---------------------------------------------------------------------
  // 2. INTERFACE E CONTROLES
  // ---------------------------------------------------------------------

  Sim.controls($('ctl'), [
    { id: 'm', label: 'Massa', unit: 'kg', min: 0.5, max: 10, step: 0.5, val: 2 },
    { id: 'f0', label: 'Força inicial (F₀)', unit: 'N', min: 1, max: 20, step: 0.5, val: 4 },
    {
      id: 'ang', label: 'Ângulo da força (θ)', unit: '°',
      min: 0, max: 80, step: 1, val: 30
    },
    { id: 'k', label: 'Coeficiente (k)', unit: 'N/m', min: 0, max: 3, step: 0.1, val: 1 },
    { id: 'xf', label: 'Deslocamento final', unit: 'm', min: 2, max: 10, step: 0.5, val: 5 },
    { id: 'spd', label: 'Velocidade da animação', unit: '×', min: 0.1, max: 2, step: 0.05, val: 1 }
  ], P, id => {
    if (id === 'spd') return;
    reset();
  });

  $('pl').addEventListener('change', e => {
    su.pl = Number(e.target.value);

    Sim.ctl.k.setUnit(su.pl === 1 ? 'N/m' : 'N/m²');

    reset();
  });

  P.pl = Number($('pl').value);


  const out = Sim.readouts($('ro'), [
    ['t', 'Tempo (s)'],
    ['x', 'Posição (m)'],
    ['v', 'Velocidade (m/s)'],
    ['f', 'Força aplicada (N)'],
    ['fx', 'Componente horizontal (N)'],
    ['ang', 'Ângulo (°)'],
    ['w', 'Trabalho da força (J)'],
    ['k', 'Energia cinética (J)']
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

  function setup() {
    return {
      m: P.m,
      f0: P.f0,
      k: P.k,
      xf: P.xf,
      ang: P.ang * Math.PI / 180,
      pl: Number($('pl').value),
      tEnd: 60
    };
  }

  // Intensidade da força aplicada.
  function force(x) {
    switch (su.pl) {
      case 1: // Linear
        return (su.f0 + su.k * x);

      case 2: // Quadrática
        return (su.f0 + su.k * x * x);

      default:
        return 0;
    }
  }

  // Componente horizontal da força.
  function forceX(x) {
    return force(x) * Math.cos(su.ang);
  }

  // Trabalho realizado pela força.
  function work() {
    return q[2];
  }

  function workAt(x) {
    switch (su.pl) {
      case 1:
        return (su.f0 * x + 0.5 * su.k * x * x) *
          Math.cos(su.ang);

      case 2:
        return (su.f0 * x + su.k * x * x * x / 3) *
          Math.cos(su.ang);

      default:
        return 0;
    }
  }
  // return (su.f0 * x + 0.5 * su.k * x * x) * Math.cos(su.ang);

  function kinetic(v) {
    return 0.5 * su.m * v * v;
  }

  // Dados para os gráficos em função da posição:
  // [x, F(x), W(x), K(x)].
  // Sim.Plot usa a coluna 0 como coordenada horizontal independente.
  function row() {
    return [q[0], forceX(q[0]), q[2], kinetic(q[1])];
  }

  function record() {
    const r = row();
    const last = rows[rows.length - 1];
    if (!last || r[0] > last[0] + 1e-10) rows.push(r);
    else rows[rows.length - 1] = r;
  }

  // ---------------------------------------------------------------------
  // 4. CONTROLE DA SIMULAÇÃO
  // ---------------------------------------------------------------------

  function reset() {
    su = setup();
    q = [0, 0, 0];
    t = 0;
    rows = [];
    acc = 0;
    count = 0;
    paused = false;
    mode = 'idle';
    $('bp').textContent = 'Pausar';

    record();
  }

  function launch() {
    reset();
    mode = 'run';
  }

  function end() {
    q[0] = su.xf;
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

  function deriv(z) {
    const x = z[0];
    const v = z[1];
    const F = forceX(x);
    return [v, F / su.m, F * v];
  }

  function step(dt) {
    if (mode !== 'run' || paused) return;

    acc += dt * (P.spd || 1);

    while (acc >= DT) {
      acc -= DT;

      const next = rk4(deriv, q, DT);
      t += DT;
      q = next;

      if (++count % 4 === 0) record();

      if (q[0] >= su.xf) {
        // Ajuste final pela conservação da energia, evitando erro
        // acumulado no último passo de integração.
        q[0] = su.xf;
        q[2] = workAt(su.xf);
        q[1] = Math.sqrt(2 * q[2] / su.m);
        end();
        return;
      }

      if (t >= su.tEnd) {
        end();
        return;
      }
    }
  }

  // ---------------------------------------------------------------------
  // 6. TEXTO DE SITUAÇÃO
  // ---------------------------------------------------------------------

  function status() {
    if (mode === 'end') {
      return `Fim do movimento. O trabalho realizado pela força foi \\(${fm(work(su.xf))}\\,\\mathrm{J}\\).`;
    }

    if (mode === 'idle') {
      return 'O bloco parte do repouso. Inicie a simulação para observar o movimento e o trabalho acumulado.';
    }

    if (paused) return 'Simulação pausada.';

    return `A força aplicada é \\(${fm(force(q[0]))}\\,\\mathrm{N}\\) e o trabalho acumulado é \\(${fm(work(q[0]))}\\,\\mathrm{J}\\).`;
  }

  // ---------------------------------------------------------------------
  // 7. DESENHO
  // ---------------------------------------------------------------------

  function draw() {
    const C = css;
    const W = fit.w;
    const H = fit.h;

    ctx.clearRect(0, 0, W, H);

    const left = 100;
    const right = W - 200;
    const yFloor = H * 0.72;
    const blockW = Math.min(66, W * 0.14);
    const blockH = Math.min(48, H * 0.17);
    const usable = right - left - blockW;
    const xPix = x => left + (x / su.xf) * usable;
    const bx = xPix(q[0]);
    const by = yFloor - blockH;

    // Superfície horizontal.
    ctx.strokeStyle = C('--ground');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(38, yFloor);
    ctx.lineTo(W - 38, yFloor);
    ctx.stroke();

    ctx.lineWidth = 1;
    for (let x = 42; x < W - 38; x += 13) {
      ctx.beginPath();
      ctx.moveTo(x, yFloor + 2);
      ctx.lineTo(x - 6, yFloor + 8);
      ctx.stroke();
    }

    // Marcações do deslocamento.
    ctx.strokeStyle = C('--mut');
    ctx.fillStyle = C('--mut');
    ctx.font = C('--normalfont');
    ctx.textAlign = 'center';

    for (let i = 0; i <= 5; i++) {
      const x = su.xf * i / 5;
      const px = xPix(x);
      ctx.beginPath();
      ctx.moveTo(px, yFloor + 10);
      ctx.lineTo(px, yFloor + 15);
      ctx.stroke();
      ctx.fillText(f2(x), px, yFloor + 28);
    }

    ctx.fillText('x (m)', W - 27, yFloor + 28);

    // Bloco.
    ctx.fillStyle = C('--ink');
    ctx.strokeStyle = C('--line');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bx, by, blockW, blockH, 5);
    ctx.fill();
    // ctx.stroke();

    ctx.fillStyle = C('--card');
    ctx.font = C('--normalfont');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('m', bx + blockW / 2, by + blockH / 2);
    ctx.textBaseline = 'alphabetic';

    // Corda e força de tração.
    const yForce = by + blockH / 2;
    const ropeEnd = bx + blockW + 2;
    ctx.strokeStyle = C('--ink');
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(bx + blockW, yForce);
    ctx.lineTo(ropeEnd, yForce);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.moveTo(bx + blockW, yForce);
    ctx.lineTo(ropeEnd + 100, yForce);
    ctx.stroke();
    ctx.setLineDash([]);


    const f = force(q[0]);
    const fx = forceX(q[0]);
    const ang = su.ang;

    ctx.beginPath();
    ctx.strokeStyle = C('--ink');
    ctx.arc(ropeEnd, yForce, (22 + f * 5) / 1.5, -su.ang, 0, 0);
    ctx.stroke();
    ctx.fillStyle = C('--ink');
    ctx.font = C('--normalfont');
    ctx.textAlign = 'left';

    ctx.fillText(
      `θ`,
      ropeEnd + ((22 + f * 5) / 1.5) * Math.cos(ang / 2) + 5,
      yForce + ((22 + f * 5) / 1.5) * Math.sin(-ang / 2) + 5,
    );

    const arrowLength = Math.min(W * 0.25, 22 + f * 5);
    const arrowLengthX = Math.min(W * 0.25, 22 + fx * 5);

    const dx = arrowLength * Math.cos(ang);
    const dy = -arrowLength * Math.sin(ang);
    arrow(ctx, ropeEnd, yForce, dx, dy, C('--acc'), 2.5);
    arrow(ctx, ropeEnd, yForce, arrowLengthX, 0, C('--vx'), 2.5); //F_X

    ctx.fillStyle = C('--acc');
    ctx.font = C('--normalfont');
    ctx.textAlign = 'left';
    ctx.fillText(
      `F(x) = ${f2(f)} N`,
      ropeEnd + dx + 5,
      yForce + dy - 8
    );
    ctx.fillStyle = C('--vx');
    ctx.fillText(
      `F_x(x) = ${f2(fx)} N`,
      ropeEnd + arrowLengthX + 5,
      yForce,
    );
    // Indicação do deslocamento.
    ctx.strokeStyle = C('--acc');
    ctx.fillStyle = C('--acc');
    ctx.lineWidth = 2;
    arrow(ctx, left, yFloor - blockH - 25, Math.max(0, bx - left), 0, C('--acc'), 2);

    ctx.fillStyle = C('--mut');
    ctx.font = C('normalfont');
    ctx.textAlign = 'left';
    ctx.fillText(`x = ${f2(q[0])} m`, 18, 20);
    ctx.textAlign = 'right';
    ctx.fillText(`x final = ${f2(su.xf)} m`, W - 18, 20);

    // Leituras numéricas.
    out('t', t);
    out('x', q[0]);
    out('v', q[1]);
    out('f', f);
    out('fx', forceX(q[0]));
    out('ang', P.ang);
    out('w', work(q[0]));
    out('k', kinetic(q[1]));

    const s = status();
    if (s !== lastStatus) {
      lastStatus = s;
      $('cmp').textContent = s;
      Sim.math($('cmp'));
    }
  }

  // ---------------------------------------------------------------------
  // 8. GRÁFICOS
  // ---------------------------------------------------------------------

  const plotF = new Sim.Plot($('p1'), {
    // title: 'Componente horizontal da força × posição',
    title: '',
    mt: 8,
    series: [
      { col: 1, name: 'Fₓ(x)', color: '--vx' }
    ]
  }, true);

  const plotW = new Sim.Plot($('p2'), {
    title: '',
    // title: 'Trabalho e energia × posição',
    mt: 8,
    series: [
      { col: 2, name: 'W', color: '--acc' },
      { col: 3, name: 'K', color: '--vx' }
    ]
  });

  function drawPlots() {
    plotF.draw(rows, null, su.xf);
    // plotW.draw(rows, null, su.xf);
  }

  // ---------------------------------------------------------------------
  // 9. INICIALIZAÇÃO E LOOP
  // ---------------------------------------------------------------------

  Sim.urlLoad();
  reset();
  Sim.urlButton(cv);

  Sim.loop(dt => {
    step(dt);
    draw();
    drawPlots();
  });

})();
