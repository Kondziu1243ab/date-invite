import { useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import { KgpBook } from './components/KgpBook';
import { sounds } from './utils/audio';
import { notifyKorneliaAnswer } from './notifyNtfy';
import './App.css';

type AppState = 'idle' | 'flipping' | 'reached_target' | 'stamping' | 'stamped';

export default function App() {
  const [appState, setAppState] = useState<AppState>('idle');
  const [pageIndex, setPageIndex] = useState<number>(0); // 0 = Cover, 1..4 = Pages
  const [hasStamp, setHasStamp] = useState<boolean>(false);
  const [showFinaleModal, setShowFinaleModal] = useState<boolean>(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Prevent multiple overlapping runs
  const isRunningRef = useRef<boolean>(false);

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#d4af37', '#e74c3c', '#2ecc71', '#ffffff', '#f39c12']
      });

      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#ff4d6d', '#ffb3c1', '#d4af37']
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#ff4d6d', '#ffb3c1', '#d4af37']
        });
      }, 250);
    } catch {
      // ignore
    }
  };

  const handleStartMission = () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    // Reset current round
    setHasStamp(false);
    setShowFinaleModal(false);
    setSelectedAnswer(null);

    // Step 1: Open book & start flipping through pages
    setAppState('flipping');
    if (soundEnabled) sounds.playPageFlip();

    // Sequence through pages to create realistic flipping book feeling
    setPageIndex(1); // Rysy

    setTimeout(() => {
      setPageIndex(2); // Babia Góra
      if (soundEnabled) sounds.playPageFlip();
    }, 400);

    setTimeout(() => {
      setPageIndex(3); // Śnieżka
      if (soundEnabled) sounds.playPageFlip();
    }, 750);

    setTimeout(() => {
      // Reached Górka Szczęśliwicka!
      setPageIndex(4);
      if (soundEnabled) sounds.playPageFlip();
      setAppState('reached_target');

      // Step 2: Pause slightly so user sees the page
      setTimeout(() => {
        // Step 3: Stamp tool descends & hits
        setAppState('stamping');

        // Stamp hits down at 500ms
        setTimeout(() => {
          setHasStamp(true);
          if (soundEnabled) sounds.playStamp();
        }, 500);

        // Stamp tool finishes lifting away
        setTimeout(() => {
          setAppState('stamped');
          if (soundEnabled) sounds.playChime();
          triggerConfetti();

          // Step 4: Foreground question reveals: "I co sądzisz Kornelia?"
          setTimeout(() => {
            setShowFinaleModal(true);
            isRunningRef.current = false;
          }, 650);
        }, 1300);

      }, 650);
    }, 1100);
  };

  const handleSelectAnswer = (answerText: string) => {
    setSelectedAnswer(answerText);
    triggerConfetti();
    if (soundEnabled) sounds.playChime();

    // Wyślij powiadomienie ntfy o wyborze Kornelii
    notifyKorneliaAnswer(answerText).catch((err) => {
      console.warn('[ntfy] Błąd podczas wysyłania powiadomienia:', err);
    });
  };

  const handleResetToStart = () => {
    setAppState('idle');
    setPageIndex(0);
    setHasStamp(false);
    setShowFinaleModal(false);
    setSelectedAnswer(null);
    isRunningRef.current = false;
  };

  return (
    <div className="app-viewport">
      {/* TOP BAR */}
      <header className="top-nav">
        <div className="badge-official">
          <span>🏔️</span>
          <span>PTTK / KGP • WARSZAWA</span>
        </div>
        <button
          className="sound-toggle-btn"
          onClick={() => setSoundEnabled(!soundEnabled)}
          title="Przełącz dźwięk"
          type="button"
        >
          {soundEnabled ? '🔊 Dźwięk WŁ' : '🔇 Wycisz'}
        </button>
      </header>

      {/* 3D BOOK & STAMP ANIMATION */}
      <main className="book-stage">
        <KgpBook
          pageIndex={pageIndex}
          isFlipping={appState === 'flipping'}
          isStamping={appState === 'stamping'}
          hasStamp={hasStamp}
        />
      </main>

      {/* BOTTOM ACTION BUTTON */}
      <footer className="bottom-controls">
        {!hasStamp ? (
          <button
            id="stamp-trigger-button"
            className="stamp-trigger-btn"
            onClick={handleStartMission}
            disabled={appState === 'flipping' || appState === 'stamping'}
          >
            <span className="btn-icon-mountain">⛰️</span>
            <span>
              {appState === 'idle'
                ? 'Podbij Górkę Szczęśliwicką'
                : 'Kartkowanie KGP...'}
            </span>
            <span>✍️</span>
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '8px', width: '100%', maxWidth: '380px' }}>
            <button
              className="stamp-trigger-btn"
              style={{ flex: 1 }}
              onClick={() => setShowFinaleModal(true)}
            >
              <span>💬 Pokaż pytanie dla Kornelii</span>
            </button>
            <button
              className="secondary-action-btn"
              onClick={handleResetToStart}
              title="Zacznij od nowa"
            >
              <span>🔄</span>
            </button>
          </div>
        )}
      </footer>

      {/* KORNELIA FINALE OVERLAY (WYŚWIETLA DUŻY NAPIS NA PIERWSZYM PLANIE) */}
      {showFinaleModal && (
        <div className="finale-overlay" onClick={() => {}}>
          <div className="finale-card" onClick={(e) => e.stopPropagation()}>
            <div className="finale-card-decor"></div>

            <div className="finale-tag">Oficjalny meldunek wyprawowy</div>

            {/* USER REQUESTED: "a po animacji niech sie na pierwszym planie wyswietla duzy napis , i co sadzisz Kornelia" */}
            <h2 className="finale-headline">
              I co sądzisz, <span>Kornelia?</span> 😉
            </h2>

            {!selectedAnswer ? (
              <>
                <p className="finale-subhead">
                  Pieczątka z uśmiechem wbita do rejestru KGP, a najwyższy szczyt stolicy czeka na naszą wyprawę! Co robimy?
                </p>

                <div className="response-options-list">
                  <button
                    className="response-choice-btn"
                    onClick={() => handleSelectAnswer('Daj spokój, zróbmy netflix and chill 🍿🎬')}
                  >
                    <span>🍿 Daj spokój, zróbmy netflix and chill!</span>
                    <span className="choice-arrow">→</span>
                  </button>

                  <button
                    className="response-choice-btn"
                    onClick={() => handleSelectAnswer('Tylko jak będą lody i gorąca czekolada 🍦☕')}
                  >
                    <span>🍦 Tylko jak będą lody lub czekolada!</span>
                    <span className="choice-arrow">→</span>
                  </button>

                  <button
                    className="response-choice-btn"
                    onClick={() => handleSelectAnswer('A wnosisz mnie na barana? 😂👟')}
                  >
                    <span>😂 A wnosisz mnie na barana na samą górę?</span>
                    <span className="choice-arrow">→</span>
                  </button>

                  <button
                    className="response-choice-btn"
                    onClick={() => handleSelectAnswer('Nie mam wyjścia, pieczątka przybita! 📜✨')}
                  >
                    <span>📜 Nie mam wyjścia, pieczątka zobowiązuje!</span>
                    <span className="choice-arrow">→</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="finale-success-box">
                <div className="success-emoji-badge">
                  {selectedAnswer?.toLowerCase().includes('netflix') ? '🍿🛋️🎬' : '🎉🏔️🎒'}
                </div>
                <div className="success-title">
                  {selectedAnswer?.toLowerCase().includes('netflix') ? 'Plan doskonały!' : 'Oficjalnie zaklepane!'}
                </div>
                <p className="success-desc">
                  Twoja odpowiedź: <strong>„{selectedAnswer}”</strong>.<br />
                  {selectedAnswer?.toLowerCase().includes('netflix') ? (
                    <span>
                      Zamiast zdobywać 152 m n.p.m. w pocie czoła, wybieramy kocyk, dobry film i pyszne jedzonko! Powiadomienie wysłane. 📨✨
                    </span>
                  ) : (
                    <span>
                      Pakuję dobry humor, coś pysznego i meldujemy się w Parku Szczęśliwickim! Powiadomienie wysłane. 📨✨
                    </span>
                  )}
                </p>

                <div style={{ marginTop: '16px' }}>
                  <button
                    className="stamp-trigger-btn"
                    style={{ padding: '12px 18px', fontSize: '0.95rem' }}
                    onClick={triggerConfetti}
                  >
                    <span>Więcej konfetti! 🎊</span>
                  </button>
                </div>
              </div>
            )}

            <div className="modal-footer-row">
              <button
                className="peek-book-btn"
                onClick={() => setShowFinaleModal(false)}
              >
                Obejrzyj książeczkę i pieczątkę 🔍
              </button>
              <button
                className="peek-book-btn"
                onClick={handleResetToStart}
              >
                Kartkuj jeszcze raz 🔄
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
