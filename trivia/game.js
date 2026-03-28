/**
 * Trivia Game Engine
 * ==================
 * Reads from /data/current-trivia.json
 * Game logic is completely separated from content.
 */

class TriviaGame {
    constructor() {
        this.triviaData = null;
        this.state = null;
        this.challengeInterval = null;
        this._pendingImportData = null;   // holds imported data awaiting confirmation

        this.init();
    }

    // ─── INITIALIZATION ────────────────────────────────

    init() {
        try {
            if (!window.TRIVIA_DATA) {
                throw new Error('No se encontró la variable TRIVIA_DATA. Asegúrate de que data/current-trivia.js está cargado.');
            }
            this.triviaData = window.TRIVIA_DATA;
            this.validate(this.triviaData);
            this.createGameState();
            this.render();
        } catch (err) {
            this.showError(err.message);
        }
    }

    // ─── VALIDATION ────────────────────────────────────

    validate(data) {
        // A) Structure validation
        if (!data.meta || !data.meta.title) throw new Error('Falta el campo meta.title');
        if (!data.settings) throw new Error('Falta la sección settings');
        if (!data.teams || !Array.isArray(data.teams)) throw new Error('Falta la sección teams');
        if (!data.cards || !Array.isArray(data.cards)) throw new Error('Falta la sección cards');

        // Validate each card
        for (const card of data.cards) {
            if (card.id == null) throw new Error('Una tarjeta no tiene id');
            if (!card.team) throw new Error(`La tarjeta ${card.id} no tiene equipo asignado`);
            if (!card.type) throw new Error(`La tarjeta ${card.id} no tiene tipo`);

            if (card.type === 'multiple_choice') {
                if (!card.question) throw new Error(`La tarjeta ${card.id} no tiene pregunta`);
                if (!card.options || card.options.length !== 4) {
                    throw new Error(`La tarjeta ${card.id} debe tener exactamente 4 opciones`);
                }
                if (card.correctAnswerIndex == null || card.correctAnswerIndex < 0 || card.correctAnswerIndex > 3) {
                    throw new Error(`La tarjeta ${card.id} tiene un correctAnswerIndex inválido`);
                }
            } else if (card.type === 'challenge') {
                if (!card.prompt) throw new Error(`La tarjeta ${card.id} no tiene prompt de desafío`);
            } else {
                throw new Error(`La tarjeta ${card.id} tiene un tipo no reconocido: ${card.type}`);
            }
        }

        // B) Business rules validation
        const totalCards = data.settings.totalCards || 20;
        const cardsPerTeam = data.settings.cardsPerTeam || 10;

        if (data.cards.length !== totalCards) {
            throw new Error(`Se esperaban ${totalCards} tarjetas, pero se encontraron ${data.cards.length}`);
        }

        const redCards = data.cards.filter(c => c.team === 'red');
        const blueCards = data.cards.filter(c => c.team === 'blue');

        if (redCards.length !== cardsPerTeam) {
            throw new Error(`Se esperaban ${cardsPerTeam} tarjetas rojas, se encontraron ${redCards.length}`);
        }
        if (blueCards.length !== cardsPerTeam) {
            throw new Error(`Se esperaban ${cardsPerTeam} tarjetas azules, se encontraron ${blueCards.length}`);
        }

        // Check for duplicate IDs
        const ids = data.cards.map(c => c.id);
        const uniqueIds = new Set(ids);
        if (uniqueIds.size !== ids.length) {
            throw new Error('Se encontraron IDs duplicados en las tarjetas');
        }
    }

    // ─── STATE MANAGEMENT ──────────────────────────────

    createGameState() {
        const d = this.triviaData;
        this.state = {
            currentTeam: d.settings.startingTeam || 'red',
            scoreRed: 0,
            scoreBlue: 0,
            gameOver: false,
            activeCardIndex: null,
            cards: d.cards.map((card, index) => ({
                ...card,
                _index: index,
                status: 'available',   // available | correct | incorrect
            }))
        };
    }

    // ─── RENDERING ─────────────────────────────────────

    render() {
        this.renderHeader();
        this.renderBoard();
        this.updateTurnIndicator();
        this.updateScores();
        this.updateHelpText();
    }

    renderHeader() {
        const elTitle = document.getElementById('game-title');
        elTitle.textContent = this.triviaData.meta.title;

        const elTheme = document.getElementById('game-theme');
        if (elTheme) {
            elTheme.textContent = this.triviaData.meta.theme || '';
        }
    }

    renderBoard() {
        const board = document.getElementById('board');
        board.innerHTML = '';

        this.state.cards.forEach((card, index) => {
            const el = document.createElement('div');
            el.id = `card-${card.id}`;
            el.className = `card card-${card.team}`;
            el.style.animationDelay = `${index * 0.04}s`;
            el.style.animation = `cardAppear 0.4s ease ${index * 0.04}s both`;

            el.innerHTML = `
                <div class="card-inner">
                    <span class="card-icon">${card.type === 'challenge' ? '⚡' : '?'}</span>
                    <span class="card-number">${card.id}</span>
                </div>
            `;

            el.addEventListener('click', () => this.onCardClick(index));
            board.appendChild(el);
        });

        this.updateCardStates();
    }

    updateCardStates() {
        this.state.cards.forEach((card, index) => {
            const el = document.getElementById(`card-${card.id}`);
            if (!el) return;

            // Remove previous state classes
            el.classList.remove('card-disabled', 'card-resolved');

            // Remove previous result icons
            const prevIcon = el.querySelector('.card-result-icon');
            if (prevIcon) prevIcon.remove();

            if (card.status === 'correct' || card.status === 'incorrect') {
                el.classList.add('card-resolved');
                const iconEl = document.createElement('div');
                iconEl.className = `card-result-icon ${card.status === 'correct' ? 'card-result-correct' : 'card-result-incorrect'}`;
                iconEl.textContent = card.status === 'correct' ? '✅' : '❌';
                el.appendChild(iconEl);
            } else if (card.team !== this.state.currentTeam) {
                el.classList.add('card-disabled');
            }
        });
    }

    updateTurnIndicator() {
        const el = document.getElementById('turn-indicator');
        const teamName = this.state.currentTeam === 'red' ? 'Equipo Rojo' : 'Equipo Azul';
        el.textContent = `Turno del ${teamName}`;
        el.className = `turn-indicator turn-${this.state.currentTeam} turn-change`;
    }

    updateScores() {
        document.getElementById('score-red').textContent = this.state.scoreRed;
        document.getElementById('score-blue').textContent = this.state.scoreBlue;
    }

    updateHelpText() {
        const el = document.getElementById('help-text');
        if (this.state.gameOver) {
            el.textContent = '¡Juego terminado!';
        } else {
            const teamName = this.state.currentTeam === 'red' ? 'Equipo Rojo' : 'Equipo Azul';
            const color = this.state.currentTeam === 'red' ? 'roja' : 'azul';
            el.textContent = `El ${teamName} elige una tarjeta ${color}`;
        }
    }

    // ─── CARD INTERACTION ──────────────────────────────

    onCardClick(index) {
        const card = this.state.cards[index];
        if (!card) return;
        if (this.state.gameOver) return;
        if (card.status !== 'available') return;
        if (card.team !== this.state.currentTeam) return;

        this.state.activeCardIndex = index;

        if (card.type === 'multiple_choice') {
            this.openQuestionModal(card);
        } else if (card.type === 'challenge') {
            this.openChallengeModal(card);
        }
    }

    // ─── QUESTION MODAL ────────────────────────────────

    openQuestionModal(card) {
        // Hide all modal contents
        this.hideAllModalContents();

        // Set team badge
        const badge = document.getElementById('modal-team-badge-q');
        const teamName = card.team === 'red' ? 'Equipo Rojo' : 'Equipo Azul';
        badge.textContent = teamName;
        badge.className = `modal-team-badge badge-${card.team}`;

        // Set question text
        document.getElementById('modal-question-text').textContent = card.question;

        // Build options
        const optionsContainer = document.getElementById('modal-options');
        optionsContainer.innerHTML = '';
        const letters = ['A', 'B', 'C', 'D'];

        card.options.forEach((option, i) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.id = `option-${i}`;
            btn.innerHTML = `<span class="option-letter">${letters[i]}</span><span>${option}</span>`;
            btn.addEventListener('click', () => this.onAnswerSelected(i));
            optionsContainer.appendChild(btn);
        });

        // Show
        document.getElementById('modal-question').classList.remove('hidden');
        document.getElementById('modal-overlay').classList.remove('hidden');
    }

    onAnswerSelected(selectedIndex) {
        const cardIndex = this.state.activeCardIndex;
        const card = this.state.cards[cardIndex];
        const isCorrect = selectedIndex === card.correctAnswerIndex;

        // Disable all options
        const options = document.querySelectorAll('.option-btn');
        options.forEach((btn, i) => {
            btn.style.pointerEvents = 'none';
            if (i === card.correctAnswerIndex) {
                btn.classList.add('option-correct');
            } else if (i === selectedIndex && !isCorrect) {
                btn.classList.add('option-incorrect');
            } else {
                btn.classList.add('option-dimmed');
            }
        });

        // Update state
        card.status = isCorrect ? 'correct' : 'incorrect';
        if (isCorrect) {
            if (card.team === 'red') this.state.scoreRed++;
            else this.state.scoreBlue++;
        }

        // Show feedback after a brief pause
        setTimeout(() => {
            this.showFeedback(isCorrect, card);
        }, 1200);
    }

    showFeedback(isCorrect, card) {
        this.hideAllModalContents();

        const icon = document.getElementById('feedback-icon');
        const text = document.getElementById('feedback-text');
        const correctAnswer = document.getElementById('feedback-correct-answer');

        if (isCorrect) {
            icon.textContent = '🎉';
            text.textContent = '¡Correcto!';
            text.className = 'feedback-text text-correct';
            correctAnswer.textContent = '';
            this._playCorrectSound();
        } else {
            icon.textContent = '😔';
            text.textContent = 'Incorrecto';
            text.className = 'feedback-text text-incorrect';
            if (card.type === 'multiple_choice') {
                correctAnswer.textContent = `La respuesta correcta era: ${card.options[card.correctAnswerIndex]}`;
            } else {
                correctAnswer.textContent = '';
            }
            this._playIncorrectSound();
        }

        document.getElementById('modal-feedback').classList.remove('hidden');

        // Auto-close after delay
        setTimeout(() => {
            this.closeModalAndAdvance();
        }, 2000);
    }

    // ─── CHALLENGE MODAL ───────────────────────────────

    openChallengeModal(card) {
        this.hideAllModalContents();

        // Set team badge
        const badge = document.getElementById('modal-team-badge-c');
        const teamName = card.team === 'red' ? 'Equipo Rojo' : 'Equipo Azul';
        badge.textContent = teamName;
        badge.className = `modal-team-badge badge-${card.team}`;

        // Set challenge text (hidden until revealed)
        document.getElementById('modal-challenge-text').textContent = card.prompt;

        // Reset timer
        const seconds = card.seconds || this.triviaData.settings.defaultChallengeSeconds || 5;
        document.getElementById('timer-value').textContent = seconds;
        document.getElementById('timer-value').className = 'timer-value';

        // Reset ring
        const ring = document.getElementById('timer-ring-progress');
        ring.style.strokeDashoffset = '0';
        ring.setAttribute('class', 'timer-ring-progress');

        // Show pre-reveal phase, hide revealed phase
        document.getElementById('challenge-pre-reveal').classList.remove('hidden');
        document.getElementById('challenge-revealed').classList.add('hidden');
        document.getElementById('btn-start-challenge').classList.remove('hidden');
        document.getElementById('challenge-timer').classList.add('hidden');
        document.getElementById('challenge-result-buttons').classList.add('hidden');

        // Show
        document.getElementById('modal-challenge').classList.remove('hidden');
        document.getElementById('modal-overlay').classList.remove('hidden');
    }

    revealChallenge() {
        document.getElementById('challenge-pre-reveal').classList.add('hidden');
        document.getElementById('challenge-revealed').classList.remove('hidden');
        // Arranca el contador inmediatamente, sin esperar al botón "Iniciar"
        this.startChallengeTimer();
    }

    startChallengeTimer() {
        const cardIndex = this.state.activeCardIndex;
        const card = this.state.cards[cardIndex];
        const totalSeconds = card.seconds || this.triviaData.settings.defaultChallengeSeconds || 5;
        let remaining = totalSeconds;

        // Hide start button, show timer
        document.getElementById('btn-start-challenge').classList.add('hidden');
        document.getElementById('challenge-timer').classList.remove('hidden');

        const timerValue = document.getElementById('timer-value');
        const ringProgress = document.getElementById('timer-ring-progress');
        const circumference = 2 * Math.PI * 54; // r=54

        ringProgress.style.strokeDasharray = circumference;
        ringProgress.style.strokeDashoffset = '0';

        // Función que ejecuta cada tick (inclusive el primero de inmediato)
        const tick = () => {
            remaining--;

            // Update ring
            const progress = (totalSeconds - remaining) / totalSeconds;
            ringProgress.style.strokeDashoffset = circumference * progress;

            if (remaining > 0) {
                timerValue.textContent = remaining;

                // Countdown beep
                this._playBeep(remaining <= 2 ? 660 : 440, 0.08, 0.12);

                // Warning state (last 2 seconds)
                if (remaining <= 2) {
                    timerValue.classList.add('timer-warning');
                    ringProgress.classList.add('ring-warning');
                }
            } else {
                // remaining === 0
                clearInterval(this.challengeInterval);
                this.challengeInterval = null;

                timerValue.textContent = '0';
                timerValue.classList.remove('timer-warning');
                timerValue.classList.add('timer-done');

                // Wait for the ring CSS transition (1s) to finish before showing buttons
                setTimeout(() => {
                    this._showTimeUp();
                    setTimeout(() => {
                        document.getElementById('challenge-result-buttons').classList.remove('hidden');
                    }, 800);
                }, 1050);
            }
        };

        // Primer beep al mostrar el número inicial
        timerValue.textContent = remaining;
        this._playBeep(440, 0.08, 0.12);

        // El primer tick ocurre exactamente 1s después → duración total = totalSeconds segundos reales
        this.challengeInterval = setInterval(tick, 1000);
    }

    /** Web Audio: ascending arpeggio for correct answer (C4-E4-G4-C5) */
    _playCorrectSound() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            // C4=261, E4=329, G4=392, C5=523
            const notes = [261, 329, 392, 523];
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const vol = ctx.createGain();
                osc.connect(vol);
                vol.connect(ctx.destination);
                osc.frequency.value = freq;
                osc.type = 'sine';
                const t = ctx.currentTime + i * 0.13;
                vol.gain.setValueAtTime(0, t);
                vol.gain.linearRampToValueAtTime(0.2, t + 0.04);
                vol.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
                osc.start(t);
                osc.stop(t + 0.3);
                if (i === notes.length - 1) osc.onended = () => ctx.close();
            });
        } catch (e) { /* audio not available */ }
    }

    /** Web Audio: descending dull tones for incorrect answer */
    _playIncorrectSound() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            // Two short descending buzzy tones
            const notes = [
                { freq: 280, type: 'sawtooth', delay: 0,    dur: 0.25 },
                { freq: 220, type: 'sawtooth', delay: 0.28, dur: 0.4  },
            ];
            notes.forEach(({ freq, type, delay, dur }) => {
                const osc = ctx.createOscillator();
                const vol = ctx.createGain();
                osc.connect(vol);
                vol.connect(ctx.destination);
                osc.frequency.value = freq;
                osc.type = type;
                const t = ctx.currentTime + delay;
                vol.gain.setValueAtTime(0.12, t);
                vol.gain.exponentialRampToValueAtTime(0.001, t + dur);
                osc.start(t);
                osc.stop(t + dur);
                osc.onended = () => ctx.close();
            });
        } catch (e) { /* audio not available */ }
    }

    /** Show ¡TIEMPO! overlay and play the time-up sound */
    _showTimeUp() {
        const overlay = document.getElementById('timeup-overlay');
        overlay.classList.remove('hidden');
        overlay.classList.add('timeup-animate');
        this._playTimeUpSound();
        setTimeout(() => {
            overlay.classList.add('hidden');
            overlay.classList.remove('timeup-animate');
        }, 1400);
    }

    /** Web Audio: simple beep */
    _playBeep(freq = 440, gain = 0.08, duration = 0.12) {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const vol = ctx.createGain();
            osc.connect(vol);
            vol.connect(ctx.destination);
            osc.frequency.value = freq;
            osc.type = 'sine';
            vol.gain.setValueAtTime(gain, ctx.currentTime);
            vol.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + duration);
            osc.onended = () => ctx.close();
        } catch (e) { /* audio not available */ }
    }

    /** Web Audio: descending chime for time-up */
    _playTimeUpSound() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const notes = [880, 740, 587, 440];
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const vol = ctx.createGain();
                osc.connect(vol);
                vol.connect(ctx.destination);
                osc.frequency.value = freq;
                osc.type = 'sine';
                const t = ctx.currentTime + i * 0.18;
                vol.gain.setValueAtTime(0.18, t);
                vol.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
                osc.start(t);
                osc.stop(t + 0.35);
                if (i === notes.length - 1) osc.onended = () => ctx.close();
            });
        } catch (e) { /* audio not available */ }
    }

    resolveChallengeResult(success) {
        const cardIndex = this.state.activeCardIndex;
        const card = this.state.cards[cardIndex];

        card.status = success ? 'correct' : 'incorrect';
        if (success) {
            if (card.team === 'red') this.state.scoreRed++;
            else this.state.scoreBlue++;
        }

        // Clean up any leftover interval
        if (this.challengeInterval) {
            clearInterval(this.challengeInterval);
            this.challengeInterval = null;
        }

        this.showFeedback(success, card);
    }

    // ─── MODAL HELPERS ─────────────────────────────────

    hideAllModalContents() {
        document.querySelectorAll('.modal-content').forEach(el => el.classList.add('hidden'));
    }

    closeModalAndAdvance() {
        document.getElementById('modal-overlay').classList.add('hidden');
        this.hideAllModalContents();

        // Update board and scores
        this.updateScores();
        this.updateCardStates();

        // Animate score
        const scoreEl = this.state.currentTeam === 'red'
            ? document.getElementById('score-red')
            : document.getElementById('score-blue');
        scoreEl.classList.remove('score-bump');
        void scoreEl.offsetWidth; // trigger reflow
        scoreEl.classList.add('score-bump');

        // Check game over
        const allResolved = this.state.cards.every(c => c.status !== 'available');
        if (allResolved) {
            this.state.gameOver = true;
            this.updateHelpText();
            setTimeout(() => this.showGameOver(), 600);
            return;
        }

        // Switch turn
        this.state.currentTeam = this.state.currentTeam === 'red' ? 'blue' : 'red';
        this.updateTurnIndicator();
        this.updateCardStates();
        this.updateHelpText();
    }

    // ─── GAME OVER ─────────────────────────────────────

    showGameOver() {
        const { scoreRed, scoreBlue } = this.state;

        document.getElementById('gameover-score-red').textContent = scoreRed;
        document.getElementById('gameover-score-blue').textContent = scoreBlue;

        let resultText;
        let icon;
        if (scoreRed > scoreBlue) {
            resultText = '🔴 ¡Ganó el Equipo Rojo!';
            icon = '🏆';
        } else if (scoreBlue > scoreRed) {
            resultText = '🔵 ¡Ganó el Equipo Azul!';
            icon = '🏆';
        } else {
            resultText = '🤝 ¡Empate!';
            icon = '🤝';
        }

        document.getElementById('gameover-result').textContent = resultText;
        document.getElementById('gameover-icon').textContent = icon;
        document.getElementById('gameover-overlay').classList.remove('hidden');
    }

    // ─── RESTART ───────────────────────────────────────

    restart() {
        // Clean up
        if (this.challengeInterval) {
            clearInterval(this.challengeInterval);
            this.challengeInterval = null;
        }

        document.getElementById('modal-overlay').classList.add('hidden');
        document.getElementById('gameover-overlay').classList.add('hidden');
        this.hideAllModalContents();

        // Rebuild state from original data
        this.createGameState();
        this.render();
    }

    // ─── DOWNLOAD TEMPLATE ─────────────────────────────────────────────────

    openDownloadTemplateModal() {
        document.getElementById('template-overlay').classList.remove('hidden');
    }

    closeDownloadTemplateModal() {
        document.getElementById('template-overlay').classList.add('hidden');
    }

    downloadTemplate() {
        // Fetch the template file and trigger a download
        fetch('data/templatePreguntas-LLM.js')
            .then(r => r.blob())
            .then(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'templatePreguntas-LLM.js';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                this.closeDownloadTemplateModal();
            })
            .catch(() => {
                // Fallback: open the file directly
                window.open('data/templatePreguntas-LLM.js', '_blank');
                this.closeDownloadTemplateModal();
            });
    }

    copyTemplate() {
        const btn = document.getElementById('btn-copy-template');
        fetch('data/templatePreguntas-LLM.js')
            .then(r => r.text())
            .then(text => {
                return navigator.clipboard.writeText(text).then(() => {
                    // Visual feedback
                    const original = btn.innerHTML;
                    btn.innerHTML = '✅ ¡Copiado!';
                    btn.disabled = true;
                    setTimeout(() => {
                        btn.innerHTML = original;
                        btn.disabled = false;
                        this.closeDownloadTemplateModal();
                    }, 1800);
                });
            })
            .catch(() => {
                // Fallback: open file in new tab so user can copy manually
                window.open('data/templatePreguntas-LLM.js', '_blank');
                this.closeDownloadTemplateModal();
            });
    }

    // ─── IMPORT SYSTEM ─────────────────────────────────────────────────────

    /** Opens the tabbed "Cargar Trivia" modal and resets its state. */
    openImportModal() {
        this._pendingImportData = null;
        // Reset info box and confirm button
        document.getElementById('import-info-box').innerHTML = '';
        const confirmBtn = document.getElementById('btn-import-confirm');
        confirmBtn.disabled = true;
        confirmBtn.style.opacity = '0.4';
        confirmBtn.style.cursor = 'not-allowed';
        // Reset file name label
        document.getElementById('import-file-name').textContent = 'Ningún archivo seleccionado';
        // Reset paste textarea
        document.getElementById('import-code-input').value = '';
        // Always start on file tab
        this.switchImportTab('file');
        document.getElementById('import-overlay').classList.remove('hidden');
    }

    /** Switch between file-upload and paste-code tabs. */
    switchImportTab(tab) {
        const fileTab   = document.getElementById('import-tab-file');
        const codeTab   = document.getElementById('import-tab-code');
        const btnFile   = document.getElementById('tab-file');
        const btnCode   = document.getElementById('tab-code');

        if (tab === 'file') {
            fileTab.classList.remove('hidden');
            codeTab.classList.add('hidden');
            btnFile.classList.add('active');
            btnCode.classList.remove('active');
        } else {
            codeTab.classList.remove('hidden');
            fileTab.classList.add('hidden');
            btnCode.classList.add('active');
            btnFile.classList.remove('active');
        }
    }

    /**
     * Called when the user picks a file via the hidden <input type="file">.
     * Reads the JS file, executes it in an isolated scope to extract
     * TRIVIA_DATA, validates it, then updates the confirmation area.
     */
    handleImportFile(inputEl) {
        const file = inputEl.files[0];
        if (!file) return;

        // Show selected file name
        document.getElementById('import-file-name').textContent = file.name;

        // Reset the input so the same file can be re-selected later
        inputEl.value = '';

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsed = this._parseJsFile(e.target.result);
                this.validate(parsed);
                this._pendingImportData = parsed;
                this._updateImportPreview(parsed, null);
            } catch (err) {
                this._pendingImportData = null;
                this._updateImportPreview(null, err.message);
            }
        };
        reader.readAsText(file);
    }

    /**
     * Called on every keystroke in the paste-code textarea.
     * Tries to parse and validate the pasted code in real time.
     */
    handleImportCode(code) {
        if (!code || !code.trim()) {
            this._pendingImportData = null;
            document.getElementById('import-info-box').innerHTML = '';
            const confirmBtn = document.getElementById('btn-import-confirm');
            confirmBtn.disabled = true;
            confirmBtn.style.opacity = '0.4';
            confirmBtn.style.cursor = 'not-allowed';
            return;
        }
        try {
            const parsed = this._parseJsFile(code);
            this.validate(parsed);
            this._pendingImportData = parsed;
            this._updateImportPreview(parsed, null);
        } catch (err) {
            this._pendingImportData = null;
            this._updateImportPreview(null, err.message);
        }
    }

    /**
     * Executes the JS source in an isolated Function scope.
     * The file should assign window.TRIVIA_DATA = {...};
     * We intercept that by providing a fake window object.
     */
    _parseJsFile(source) {
        const fakeWindow = {};
        const fn = new Function('__fakeWindow__', `(function(window){ ${source} })(__fakeWindow__);`);
        fn(fakeWindow);
        if (!fakeWindow.TRIVIA_DATA) {
            throw new Error('El código no contiene window.TRIVIA_DATA. Asegúrate de que sigue la misma estructura que el template.');
        }
        return fakeWindow.TRIVIA_DATA;
    }

    /** Update the info preview panel inside the import modal. */
    _updateImportPreview(data, errorMsg) {
        const infoBox    = document.getElementById('import-info-box');
        const confirmBtn = document.getElementById('btn-import-confirm');

        if (errorMsg) {
            infoBox.classList.add('import-error');
            infoBox.innerHTML = `<p class="import-error-msg">❌ ${errorMsg}</p>`;
            confirmBtn.disabled = true;
            confirmBtn.style.opacity = '0.4';
            confirmBtn.style.cursor = 'not-allowed';
        } else {
            infoBox.classList.remove('import-error');
            infoBox.innerHTML = `
                <div class="import-info-row">
                    <span class="import-info-label">Título</span>
                    <span class="import-info-value">${data.meta.title || '—'}</span>
                </div>
                <div class="import-info-row">
                    <span class="import-info-label">Tema</span>
                    <span class="import-info-value">${data.meta.theme || '—'}</span>
                </div>
                <div class="import-info-row">
                    <span class="import-info-label">Tarjetas</span>
                    <span class="import-info-value">${data.cards.length} tarjetas</span>
                </div>
                <div class="import-info-row">
                    <span class="import-info-label">Versión</span>
                    <span class="import-info-value">${data.meta.version || '—'}</span>
                </div>
            `;
            confirmBtn.disabled = false;
            confirmBtn.style.opacity = '';
            confirmBtn.style.cursor = '';
        }
    }

    cancelImport() {
        this._pendingImportData = null;
        document.getElementById('import-overlay').classList.add('hidden');
    }

    /**
     * User confirmed: swap triviaData in memory and restart.
     * window.TRIVIA_DATA (current-trivia.js) is never touched.
     */
    confirmImport() {
        if (!this._pendingImportData) return;

        this.triviaData = this._pendingImportData;
        this._pendingImportData = null;

        document.getElementById('import-overlay').classList.add('hidden');

        // Clean up any ongoing game state
        if (this.challengeInterval) {
            clearInterval(this.challengeInterval);
            this.challengeInterval = null;
        }
        document.getElementById('modal-overlay').classList.add('hidden');
        document.getElementById('gameover-overlay').classList.add('hidden');
        this.hideAllModalContents();

        // Rebuild state from the imported trivia (not from window.TRIVIA_DATA)
        this.createGameState();
        this.render();
    }

    showError(message) {
        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('error-screen').classList.remove('hidden');
        document.getElementById('error-message').textContent = message;
    }
}

// ─── START ─────────────────────────────────────────
const game = new TriviaGame();
