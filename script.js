/*
  Script de interatividade para o roteiro de Buenos Aires.

  A principal funcionalidade implementada aqui é a possibilidade de
  recolher ou expandir os horários de cada dia. Ao clicar no cabeçalho
  do dia, a lista de programação (ul.schedule) alterna entre visível
  e oculta, melhorando a navegação em dispositivos menores ou para
  quem deseja consultar o roteiro de forma mais compacta.
*/

document.addEventListener('DOMContentLoaded', () => {
  // Seleciona todos os cartões de dia
  const dayCards = document.querySelectorAll('.day-card');

  dayCards.forEach((card) => {
    const header = card.querySelector('.day-header');
    const schedule = card.querySelector('.schedule');
    if (!header || !schedule) return;

    // Inicialmente, a agenda está visível. Se preferir iniciar
    // recolhida, adicione a classe 'hidden' ao schedule aqui.
    // Para melhorar a experiência em dispositivos móveis, iniciamos
    // todas as agendas recolhidas. O usuário pode expandir ao clicar.
    schedule.classList.add('hidden');

    // Define o cursor e um título para acessibilidade
    header.setAttribute('title', 'Clique para expandir/recolher');

    header.addEventListener('click', () => {
      schedule.classList.toggle('hidden');
    });
  });

  // Expande o primeiro dia por padrão para servir de exemplo
  if (dayCards.length > 0) {
    const firstSchedule = dayCards[0].querySelector('.schedule');
    if (firstSchedule) firstSchedule.classList.remove('hidden');
  }

  // Inicializa a contagem regressiva até a viagem
  initCountdown();
  // Adiciona botões de concluir e notas a cada item do roteiro
  initScheduleItems();
  // Constrói a barra de navegação dos dias com base nos cartões
  initDayNavigation(dayCards);
  // Registra o service worker para disponibilizar o app offline
  registerServiceWorker();
});

/**
 * Calcula e exibe a contagem regressiva até o início da viagem.
 * A data alvo é 16 de janeiro de 2026. Caso já tenha passado,
 * exibe uma mensagem alternativa.
 */
function initCountdown() {
  const countdownEl = document.getElementById('countdown');
  if (!countdownEl) return;
  // Define o início da viagem (adapte se necessário)
  const target = new Date('2026-01-16T00:00:00-03:00');
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  if (diff > 0) {
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    countdownEl.textContent = `${days} ${days === 1 ? 'dia' : 'dias'}`;
  } else {
    countdownEl.textContent = 'a viagem já começou!';
  }
}

/**
 * Cria itens de navegação para cada dia. A navegação aparece logo abaixo
 * da seção hero e permite pular rapidamente para qualquer dia do roteiro.
 * Os itens são destacados conforme o dia correspondente aparece na viewport.
 *
 * @param {NodeListOf<HTMLElement>} dayCards Lista de elementos .day-card
 */
function initDayNavigation(dayCards) {
  const nav = document.getElementById('day-nav');
  if (!nav || !dayCards || dayCards.length === 0) return;
  const items = [];
  dayCards.forEach((card) => {
    const dayNumber = card.dataset.day;
    const navBtn = document.createElement('button');
    navBtn.className = 'nav-item';
    navBtn.textContent = `Dia ${dayNumber}`;
    navBtn.addEventListener('click', () => {
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    nav.appendChild(navBtn);
    items.push({ btn: navBtn, card });
  });
  // Adiciona item de navegação para o diário de bordo, se existir
  const diarySection = document.getElementById('diary');
  if (diarySection) {
    const diaryBtn = document.createElement('button');
    diaryBtn.className = 'nav-item';
    diaryBtn.textContent = 'Diário';
    diaryBtn.addEventListener('click', () => {
      diarySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    nav.appendChild(diaryBtn);
    items.push({ btn: diaryBtn, card: diarySection });
  }
  // Usa IntersectionObserver para marcar o dia ativo conforme scroll.
  const observerOptions = {
    root: null,
    rootMargin: '-40% 0px -40% 0px',
    threshold: 0.1,
  };
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const item = items.find((obj) => obj.card === entry.target);
      if (!item) return;
      if (entry.isIntersecting) {
        items.forEach((i) => i.btn.classList.remove('active'));
        item.btn.classList.add('active');
      }
    });
  }, observerOptions);
  items.forEach((item) => observer.observe(item.card));
}

/**
 * Para cada item do roteiro, adiciona botões para marcar como concluído
 * e registrar notas pessoais. O estado é armazenado no localStorage
 * com base no dia e no índice do item para persistência entre sessões.
 */
function initScheduleItems() {
  const dayCards = document.querySelectorAll('.day-card');
  dayCards.forEach((card) => {
    const dayId = card.dataset.day;
    const listItems = card.querySelectorAll('.schedule li');
    listItems.forEach((li, index) => {
      // Gera chave única para armazenamento
      const itemKey = `day-${dayId}-item-${index}`;
      // Cria contêiner de ações
      const actions = document.createElement('span');
      actions.className = 'item-actions';
      // Botão de concluir
      const doneBtn = document.createElement('button');
      doneBtn.className = 'done-btn';
      doneBtn.innerHTML = '✔';
      actions.appendChild(doneBtn);
      // Botão de nota
      const noteBtn = document.createElement('button');
      noteBtn.className = 'note-btn';
      noteBtn.innerHTML = '📝';
      actions.appendChild(noteBtn);
      // Insere ações no item
      li.appendChild(actions);
      // Cria contêiner para exibir nota
      const noteDisplay = document.createElement('div');
      noteDisplay.className = 'note-display hidden';
      li.appendChild(noteDisplay);
      // Recupera estado salvo
      let saved;
      try {
        saved = JSON.parse(localStorage.getItem(itemKey)) || {};
      } catch (e) {
        saved = {};
      }
      if (saved.completed) {
        li.classList.add('completed');
      }
      if (saved.note) {
        noteDisplay.innerHTML = `<strong>Nota:</strong> ${saved.note}`;
        noteDisplay.classList.remove('hidden');
      }
      // Evento de concluir
      doneBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        li.classList.toggle('completed');
        saved.completed = li.classList.contains('completed');
        localStorage.setItem(itemKey, JSON.stringify(saved));
      });
      // Evento de nota
      noteBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const current = saved.note || '';
        const note = prompt('Escreva sua nota ou memória para este momento:', current);
        if (note !== null) {
          const trimmed = note.trim();
          if (trimmed === '') {
            delete saved.note;
            noteDisplay.innerHTML = '';
            noteDisplay.classList.add('hidden');
          } else {
            saved.note = trimmed;
            noteDisplay.innerHTML = `<strong>Nota:</strong> ${saved.note}`;
            noteDisplay.classList.remove('hidden');
          }
          localStorage.setItem(itemKey, JSON.stringify(saved));
          // Atualiza o diário após salvar ou remover uma nota
          updateDiary();
        }
      });
    });
  });
  // Atualiza o diário na inicialização para refletir notas existentes
  updateDiary();
}

/**
 * Atualiza a seção do diário de bordo com todas as notas salvas. Cada
 * nota é recuperada do localStorage e agrupada pelo dia. Se não
 * houver nenhuma nota, a seção permanece oculta.
 */
function updateDiary() {
  const diarySection = document.getElementById('diary');
  const diaryList = document.getElementById('diary-list');
  if (!diarySection || !diaryList) return;
  // Coleta todas as notas salvas no localStorage
  const entries = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith('day-')) continue;
    try {
      const data = JSON.parse(localStorage.getItem(key));
      if (data && data.note) {
        const match = key.match(/^day-(\d+)-item-(\d+)$/);
        if (match) {
          entries.push({
            day: parseInt(match[1], 10),
            note: data.note,
          });
        }
      }
    } catch (e) {
      // ignore parsing errors
    }
  }
  // Ordena por dia
  entries.sort((a, b) => a.day - b.day);
  // Limpa lista
  diaryList.innerHTML = '';
  entries.forEach((entry) => {
    const div = document.createElement('div');
    div.className = 'diary-entry';
    const daySpan = document.createElement('span');
    daySpan.className = 'entry-day';
    daySpan.textContent = `Dia ${entry.day}:`;
    const noteSpan = document.createElement('span');
    noteSpan.className = 'entry-note';
    noteSpan.textContent = ` ${entry.note}`;
    div.appendChild(daySpan);
    div.appendChild(noteSpan);
    diaryList.appendChild(div);
  });
  // Mostra ou oculta a seção
  if (entries.length > 0) {
    diarySection.classList.remove('hidden');
  } else {
    diarySection.classList.add('hidden');
  }
}

/**
 * Registra o service worker para que os recursos do app possam ser
 * armazenados em cache e acessados offline (PWA).
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch((err) => {
      console.error('Falha ao registrar service worker', err);
    });
  }
}