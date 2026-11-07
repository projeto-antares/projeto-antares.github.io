/* =====================================================================
   portal.js — controlador compartilhado do Projeto Antαres
   Modos:
     data-portal="principal"  → projeto.json
     data-portal="catalogo"   → catalogo.json
   ===================================================================== */

(() => {
    'use strict';

    const $ = (id, root = document) => root.getElementById(id);
    const body = document.body;
    const modo = body.dataset.portal;
    const arquivoDados = body.dataset.dados;
    const baseArquivos = body.dataset.arquivos || '';
    const Sim = window.Sim || {};

    const norm = texto => String(texto ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const math = elemento => {
        if (Sim.math && elemento) Sim.math(elemento);
    };

    const caminho = arquivo => {
        if (!arquivo) return '';
        if (/^(https?:)?\/\//i.test(arquivo) || arquivo.startsWith('/')) {
            return arquivo;
        }
        return baseArquivos + arquivo;
    };

    const paginaInterna = id => {
        const elemento = $(id);
        return elemento && elemento.classList.contains('pagina');
    };

    function criar(tag, classe, conteudo) {
        const el = document.createElement(tag);
        if (classe) el.className = classe;
        if (conteudo !== undefined) el.innerHTML = conteudo;
        return el;
    }

    function aplicarTema(tema) {
        const valor = tema === 'claro' || tema === 'escuro' ? tema : 'auto';

        if (valor === 'auto') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.dataset.theme = valor;
        }

        try {
            localStorage.setItem('antares-tema', valor);
        } catch (e) { }

        const botao = $('tema');
        if (botao) {
            const nomes = {
                auto: 'Tema automático',
                claro: 'Tema claro',
                escuro: 'Tema escuro'
            };
            botao.textContent = nomes[valor];
            botao.setAttribute('aria-label', nomes[valor]);
        }
    }

    function montarTema(container) {
        let tema = 'auto';

        try {
            tema = localStorage.getItem('antares-tema') || 'auto';
        } catch (e) { }

        aplicarTema(tema);

        const botao = criar('button', 'chip');
        botao.id = 'tema';
        botao.type = 'button';

        botao.addEventListener('click', () => {
            const atual = document.documentElement.dataset.theme || 'auto';
            const proximo = {
                auto: 'claro',
                claro: 'escuro',
                escuro: 'auto'
            }[atual];

            aplicarTema(proximo);
        });

        container.appendChild(botao);
    }

    function montarCartao(item, opcoes = {}) {
        const interno = item.id && paginaInterna(item.id);
        const disponivel = item.disponivel !== false;
        const arquivo = caminho(item.arquivo);
        const clicavel = disponivel && (interno || arquivo);

        const tag = clicavel ? 'a' : 'div';
        const card = criar(tag, 'card sim' +
            (item.destaque ? ' destaque' : '') +
            (!disponivel ? ' off' : ''));

        if (clicavel) {
            card.href = interno ? '#' + item.id : arquivo;

            if (opcoes.abrirEmNovaAba && !interno) {
                card.target = '_blank';
                card.rel = 'noopener';
            }
        }

        if (item.imagem) {
            const img = document.createElement('img');
            img.src = caminho(item.imagem);
            img.alt = item.titulo || '';
            img.loading = 'lazy';
            img.className = 'capa';
            card.appendChild(img);
        }

        const generico =
            '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5">' +
            '<circle cx="24" cy="24" r="14"/>' +
            '</svg>';

        if (item.icone || modo === 'catalogo') {
            const icone = criar('div', 'sim-ic', item.icone || generico);
            card.appendChild(icone);
        }

        const titulo = criar('h3', '', item.titulo || '');
        card.appendChild(titulo);

        if (item.descricao) {
            card.appendChild(criar('p', '', item.descricao));
        }

        if (item.tags?.length || !disponivel) {
            const tags = criar('div', 'tags');

            (item.tags || []).forEach(texto => {
                tags.appendChild(criar('span', 'tag', texto));
            });

            if (!disponivel) {
                tags.appendChild(criar('span', 'tag soon', 'em breve'));
            }

            card.appendChild(tags);
        }

        if (item.botao && clicavel) {
            card.appendChild(criar('span', 'card-button', item.botao));
        }

        return card;
    }

    // function montarRodape(dados) {
    //     const rodape = dados.rodape;
    //     const elemento = document.querySelector('footer');

    //     if (!elemento || !rodape) return;

    //     elemento.innerHTML = '';

    //     if (rodape.texto) {
    //         elemento.appendChild(criar('p', '', rodape.texto));
    //     }

    //     if (rodape.links?.length) {
    //         const links = criar('div', 'footer-links');

    //         rodape.links.forEach(item => {
    //             const a = criar('a', '', item.texto || item.titulo || '');
    //             a.href = item.url || item.href || '#';
    //             if (/^https?:\/\//i.test(a.href)) {
    //                 a.target = '_blank';
    //                 a.rel = 'noopener';
    //             }
    //             links.appendChild(a);
    //         });

    //         elemento.appendChild(links);
    //     }
    // }

    /* ================================================================
       MODO PRINCIPAL
       ================================================================ */

    function iniciarPrincipal(dados) {
        const op = dados.opcoes || {};
        const secoes = dados.secoes || [];

        document.title = op.nome || 'Projeto Antαres';

        if ($('tt')) $('tt').innerHTML = op.nome || 'Projeto Antαres';
        if ($('st')) $('st').innerHTML = op.subtitulo || '';

        if ($('sobre')) {
            $('sobre').innerHTML = dados.sobre || '';
        }

        const ferramentas = $('tools');
        const area = $('secoes');

        if (!area) return;

        area.innerHTML = '';

        secoes.forEach(secao => {
            const bloco = criar('section', 'secao');
            bloco.id = secao.id;

            if (secao.titulo) {
                bloco.appendChild(criar('h2', 'tp', secao.titulo));
            }

            if (secao.descricao) {
                bloco.appendChild(criar('div', 'portal-descricao', secao.descricao));
            }

            const grade = criar('div', 'menu');

            (secao.itens || []).forEach(item => {
                grade.appendChild(montarCartao(item, op));
            });

            bloco.appendChild(grade);
            area.appendChild(bloco);
        });

        if (ferramentas) {
            ferramentas.innerHTML = '';

            if (op.mostrarNav !== false) {
                const chips = criar('div', 'chips');

                const inicio = criar('a', 'chip', 'Início');
                inicio.href = '#inicio';
                chips.appendChild(inicio);

                if ($('sobretudo')) {
                    const sobre = criar('a', 'chip', 'Sobre o projeto');
                    sobre.href = '#sobretudo';
                    chips.appendChild(sobre);
                }

                secoes.forEach(secao => {
                    const botao = criar('a', 'chip', secao.titulo || secao.id);
                    botao.href = '#' + secao.id;
                    chips.appendChild(botao);
                });

                ferramentas.appendChild(chips);
            }

            if (op.mostrarTema) montarTema(ferramentas);
        }

        // montarRodape(dados);

        function navegar() {
            const id = decodeURIComponent(location.hash.slice(1));

            document.querySelectorAll('.pagina').forEach(el => {
                el.hidden = true;
            });

            const pagina = $(id);

            if (pagina && pagina.classList.contains('pagina')) {
                pagina.hidden = false;

                if ($('sobre')) $('sobre').hidden = true;
                area.hidden = true;
                window.scrollTo(0, 0);
            } else {
                if ($('sobre')) $('sobre').hidden = false;
                area.hidden = false;

                if (id && id !== 'inicio') {
                    const secao = $(id);
                    if (secao && secao.classList.contains('secao')) {
                        requestAnimationFrame(() => {
                            secao.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        });
                    }
                } else {
                    window.scrollTo(0, 0);
                }
            }

            document.querySelectorAll('.chip[href]').forEach(botao => {
                botao.classList.toggle(
                    'on',
                    botao.getAttribute('href') === (location.hash || '#inicio')
                );
            });

            math(document.body);
        }

        window.addEventListener('hashchange', navegar);
        navegar();
    }

    /* ================================================================
       MODO CATÁLOGO DE SIMULAÇÕES
       ================================================================ */

    function iniciarCatalogo(dados) {
        const op = dados.opcoes;

        const simulacoes = dados.simulacoes || [];
        const topicos = dados.topicos || [];
        const ferramentas = $('tools');
        const lista = $('lista');

        document.title = op.titulo + ' - Projeto Antαres';

        if ($('tt')) $('tt').textContent = op.titulo;
        if ($('st')) $('st').innerHTML = op.subtitulo || '';

        let filtro = decodeURIComponent(location.hash.slice(1)) || 'todos';
        let busca = '';

        if (filtro !== 'todos' && !topicos.some(t => t.id === filtro)) {
            filtro = 'todos';
        }

        const visivel = sim => {
            const disponivel = sim.disponivel !== false || op.mostrarEmBreve;
            const topico = filtro === 'todos' || sim.topico === filtro;
            const texto = norm([
                sim.titulo,
                sim.descricao,
                ...(sim.tags || [])
            ].join(' '));

            return disponivel && topico && (!busca || texto.includes(norm(busca)));
        };

        function montarLista() {
            const visiveis = simulacoes.filter(visivel);
            lista.innerHTML = '';

            if (op.agruparPorTopico) {
                const grupos = topicos.map(topico => ({
                    id: topico.id,
                    nome: topico.nome,
                    descricao: topico.descricao || ''
                }));

                const idsTopicos = new Set(topicos.map(t => t.id));
                const outros = visiveis.filter(s => !idsTopicos.has(s.topico));

                if (outros.length) {
                    grupos.push({
                        id: '__outros',
                        nome: 'Outros',
                        descricao: ''
                    });
                }

                grupos.forEach(grupo => {
                    const itens = grupo.id === '__outros'
                        ? outros
                        : visiveis.filter(s => s.topico === grupo.id);

                    if (!itens.length) return;

                    const bloco = criar('section', 'grupo');
                    bloco.id = 'grupo-' + grupo.id;

                    bloco.appendChild(criar('h2', 'tp', grupo.nome));

                    if (grupo.descricao) {
                        bloco.appendChild(criar('p', 'grupo-desc', grupo.descricao));
                    }

                    const grade = criar('div', 'menu');

                    itens.forEach(sim => {
                        grade.appendChild(montarCartao(sim, op));
                    });

                    bloco.appendChild(grade);
                    lista.appendChild(bloco);
                });
            } else if (visiveis.length) {
                const grade = criar('div', 'menu');

                visiveis.forEach(sim => {
                    grade.appendChild(montarCartao(sim, op));
                });

                lista.appendChild(grade);
            }

            if (!visiveis.length) {
                lista.appendChild(criar('p', 'note', 'Nenhuma simulação encontrada.'));
            }

            document.querySelectorAll('.chip[data-topico]').forEach(botao => {
                botao.classList.toggle('on', botao.dataset.topico === filtro);
            });

            math(lista);
        }

        if (ferramentas) {
            ferramentas.innerHTML = '';

            if (op.mostrarBusca) {
                const buscaInput = document.createElement('input');
                buscaInput.type = 'search';
                buscaInput.placeholder = 'Buscar simulação...';
                buscaInput.setAttribute('aria-label', 'Buscar simulação');

                buscaInput.addEventListener('input', () => {
                    busca = buscaInput.value;
                    montarLista();
                });

                ferramentas.appendChild(buscaInput);
            }

            if (op.mostrarFiltros) {
                const chips = criar('div', 'chips');

                const filtros = [
                    { id: 'todos', nome: 'Todos' },
                    ...topicos
                ];

                filtros.forEach(topico => {
                    const quantidade = topico.id === 'todos'
                        ? simulacoes.filter(s => s.disponivel !== false || op.mostrarEmBreve).length
                        : simulacoes.filter(s =>
                            s.topico === topico.id &&
                            (s.disponivel !== false || op.mostrarEmBreve)
                        ).length;

                    if (!quantidade) return;

                    const botao = criar('button', 'chip');
                    botao.type = 'button';
                    botao.dataset.topico = topico.id;
                    botao.innerHTML = (topico.nome || 'Todos') +
                        '<small>' + quantidade + '</small>';

                    botao.addEventListener('click', () => {
                        filtro = topico.id;

                        const hash = filtro === 'todos' ? '' : '#' + filtro;
                        history.replaceState(null, '', location.pathname + location.search + hash);

                        montarLista();
                    });

                    chips.appendChild(botao);
                });

                ferramentas.appendChild(chips);
            }

            if (op.mostrarTema) montarTema(ferramentas);
        }

        function carregarHash() {
            const id = decodeURIComponent(location.hash.slice(1));
            filtro = topicos.some(t => t.id === id) ? id : 'todos';
            montarLista();
        }

        window.addEventListener('hashchange', carregarHash);

        montarLista();
        // montarRodape(dados);
    }

    /* ================================================================
       INICIALIZAÇÃO
       ================================================================ */

    if (!arquivoDados) {
        console.error('Portal Antαres: atributo data-dados não informado.');
        return;
    }

    fetch(arquivoDados)
        .then(resposta => {
            if (!resposta.ok) {
                throw new Error('Não foi possível carregar ' + arquivoDados);
            }
            return resposta.json();
        })
        .then(dados => {
            if (modo === 'principal') {
                iniciarPrincipal(dados);
            } else if (modo === 'catalogo') {
                iniciarCatalogo(dados);
            } else {
                console.error('Portal Antαres: modo de página desconhecido.');
            }
        })
        .catch(erro => {
            console.error(erro);
            const area = $('secoes') || $('lista');
            if (area) {
                area.textContent = 'Não foi possível carregar o conteúdo desta página.';
            }
        });
})();