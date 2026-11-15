import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  Difficulty,
  EndingPhase,
  GenieMood,
  SecretLetter,
  VeilGameProps,
} from './game/types'
import {
  DIFFICULTY_CONFIGS,
  SECRET_LETTERS,
  SPAWN_LETTER_ORDER,
  scrambleLetters,
} from './game/constants'
import { usePixiGame } from './game/hooks/usePixiGame'
import {
  GameControls,
  GameEventBanner,
  GameHud,
  GameOverModal,
  GamePauseModal,
  GameReadyModal,
  GuardianRiddleModal,
  InvisibleExhibitionCheckpointModal,
  MuseumCheckpointModal,
  SarcophagusStage,
} from './game/components'
import type { Question1Option, Question2Option } from './game/components/ending/GuardianRiddleModal'
import {
  getSoundMuted,
  playCardUse,
  playDoorStoneOpen,
  playKeyTurn,
  playRightAnswer,
  playSarcophagusOpen,
  playWrongAnswer,
  startMuseumJazzMusic,
  toggleSoundMuted,
} from './soundEffects'
import {
  notifyDiamondCardUsed,
  notifyGuardianDefeat,
  notifyGuardianQuestion1,
  notifyGuardianQuestion2,
  notifyGuardianRiddleAnswered,
} from './notifyNtfy'

export type {
  Difficulty,
  DifficultyConfig,
  BiomeId,
  SecretLetter,
  VeilGameResult,
} from './game/types'
export {
  DIFFICULTY_CONFIGS,
  SECRET_LETTERS,
  SPAWN_LETTER_ORDER,
  getBiomesForDifficulty,
} from './game/constants'

export default function VeilGame({ onComplete, skipToEndTest }: VeilGameProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [soundMuted, setSoundMuted] = useState(getSoundMuted())
  const [doorOpening, setDoorOpening] = useState(false)

  // Ending Sarcophagus & Guardian States
  const [endingPhase, setEndingPhase] = useState<EndingPhase>('none')
  const [guardianHearts, setGuardianHearts] = useState<number>(3)
  const [currentQuestion, setCurrentQuestion] = useState<number>(0)
  const [genieMood, setGenieMood] = useState<GenieMood>('idle')
  const [speechText, setSpeechText] = useState<string | null>(null)
  const [q2HasClickedNaMoim, setQ2HasClickedNaMoim] = useState(false)
  const [q2HasTriggeredWarning, setQ2HasTriggeredWarning] = useState(false)
  const [selectedHotValue, setSelectedHotValue] = useState<number | null>(null)
  const [placedCollectedIds, setPlacedCollectedIds] = useState<number[]>([])
  const [activeFlyingId, setActiveFlyingId] = useState<number | null>(null)
  const [showGrayout, setShowGrayout] = useState(false)
  const [isFlashing, setIsFlashing] = useState(false)
  const [skyLetters, setSkyLetters] = useState<SecretLetter[]>([])
  const [usedCardQuestion, setUsedCardQuestion] = useState<number | null>(null)
  const guardianAttemptsRef = useRef<number[]>([])

  const handleToggleSound = useCallback(() => {
    const next = toggleSoundMuted()
    setSoundMuted(next)
  }, [])

  // Rozpoczęcie sekwencji przelotu zebranych liter do slotów sarkofagu
  const startLettersFlight = useCallback((scrambled: SecretLetter[]) => {
    if (scrambled.length === 0) {
      setTimeout(() => {
        setIsFlashing(true)
        setTimeout(() => {
          setShowGrayout(true)
        }, 250)
        setTimeout(() => {
          setIsFlashing(false)
          setEndingPhase('complete')
        }, 1500)
      }, 900)
      return
    }

    const flyNextLetter = (index: number) => {
      if (index >= scrambled.length) {
        setActiveFlyingId(null)
        setTimeout(() => {
          setIsFlashing(true)
          setTimeout(() => {
            setShowGrayout(true)
          }, 300)
          setTimeout(() => {
            setIsFlashing(false)
            setEndingPhase('complete')
          }, 1600)
        }, 1000)
        return
      }

      const currentItem = scrambled[index]
      setActiveFlyingId(currentItem.id)

      setTimeout(() => {
        setPlacedCollectedIds((prev) => [...prev, currentItem.id])
        setTimeout(() => {
          flyNextLetter(index + 1)
        }, 350)
      }, 1150)
    }

    flyNextLetter(0)
  }, [])

  // Krok 1: Przygotowanie zamkniętego sarkofagu z zamkiem (oczekuje na kliknięcie gracza)
  const prepareLockedSarcophagus = useCallback((initialLetters: SecretLetter[]) => {
    startMuseumJazzMusic()
    setEndingPhase('sarcophagus_locked')
    setPlacedCollectedIds([])
    setActiveFlyingId(null)
    setShowGrayout(false)
    setIsFlashing(false)

    // Losowa chmura liter w powietrzu
    const scrambled = scrambleLetters(initialLetters)
    setSkyLetters(scrambled)
  }, [])

  // Krok 2: Użytkownik klika "Włóż klucz i otwórz sarkofag"
  const handleInsertKey = useCallback(() => {
    if (endingPhase !== 'sarcophagus_locked') return
    setEndingPhase('key_inserting')
    playKeyTurn()

    // Po animacji przekręcenia klucza (~1.3s) otwórz wieko
    setTimeout(() => {
      playSarcophagusOpen()
      setEndingPhase('sarcophagus_opening')

      // Po otwarciu wieka (~1.2s) wlatują litery
      setTimeout(() => {
        setEndingPhase('flying_letters')
        startLettersFlight(skyLetters)
      }, 1200)
    }, 1300)
  }, [endingPhase, skyLetters, startLettersFlight])

  // Start the Sarcophagus ending sequence
  const startEndingChoreography = useCallback((collected: SecretLetter[], livesAtEnding = 3) => {
    startMuseumJazzMusic()
    setEndingPhase('guardian_intro')
    setGuardianHearts(livesAtEnding > 0 ? livesAtEnding : 3)
    setCurrentQuestion(0)
    setGenieMood('idle')
    setSpeechText(null)
    setSelectedHotValue(null)
    setQ2HasClickedNaMoim(false)
    setQ2HasTriggeredWarning(false)
    setPlacedCollectedIds([])
    setActiveFlyingId(null)
    setShowGrayout(false)
    setIsFlashing(false)
    setUsedCardQuestion(null)
    setSkyLetters(scrambleLetters(collected))
  }, [])

  const {
    gameState,
    setGameState,
    lives,
    collectedLetters,
    setCollectedLetters,
    hasCheckpoint,
    checkpointStage,
    biome,
    progress,
    toast,
    eventBanner,
    hasDiamondCard,
    error,
    startGame,
    resumeCheckpoint,
    togglePause,
    steer,
    skipGame,
    getCollectedLetters,
    getStats,
  } = usePixiGame({
    hostRef,
    difficulty,
    onTriggerEnding: startEndingChoreography,
  })

  const handleStartGame = useCallback(() => {
    guardianAttemptsRef.current = []
    setEndingPhase('none')
    setDoorOpening(false)
    setUsedCardQuestion(null)
    startGame()
  }, [startGame])

  // Użycie Damy Karo podczas pytań u Dżina (karta jednorazowa)
  const handleUseDiamondCard = useCallback(() => {
    if (!hasDiamondCard || usedCardQuestion !== null) return
    playCardUse()
    setUsedCardQuestion(currentQuestion)
    void notifyDiamondCardUsed(currentQuestion + 1)
  }, [hasDiamondCard, usedCardQuestion, currentQuestion])

  // Pomiń aktualny poziom gry / muzeum
  const handleSkipGame = useCallback(() => {
    skipGame()
  }, [skipGame])

  // Checkpoint: Wejście do Muzeum
  const handleEnterMuseum = useCallback(() => {
    setDoorOpening(true)
    playDoorStoneOpen()
    setTimeout(() => {
      setDoorOpening(false)
      resumeCheckpoint()
    }, 900)
  }, [resumeCheckpoint])

  // Checkpoint: Wejście na Niewidzialną Wystawę
  const handleEnterExhibition = useCallback(() => {
    resumeCheckpoint()
  }, [resumeCheckpoint])

  // Rozpoczęcie zagadek po kliknięciu "Podejmij wyzwanie"
  const handleStartQuestions = useCallback(() => {
    setEndingPhase('guardian_question')
    setCurrentQuestion(0)
    setGenieMood('idle')
    setSpeechText(null)
  }, [])

  // Porażka u Dżina – powrót do ostatniego etapu gry (Muzeum)
  const handleGuardianDefeat = useCallback(() => {
    void notifyGuardianDefeat()
    setTimeout(() => {
      setEndingPhase('none')
      setGameState('playing')
      setGuardianHearts(3)
      setUsedCardQuestion(null)
      resumeCheckpoint()
    }, 1800)
  }, [resumeCheckpoint, setGameState])

  const handleManualReturnToMuseum = useCallback(() => {
    setEndingPhase('none')
    setGameState('playing')
    setGuardianHearts(3)
    setUsedCardQuestion(null)
    resumeCheckpoint()
  }, [resumeCheckpoint, setGameState])

  // Pytanie 1: Pozycja w piłce nożnej (Poprawna: Bramkarz)
  const handleAnswerQuestion1 = (option: Question1Option) => {
    if (option === 'bramkarz') {
      playRightAnswer()
      setGenieMood('correct')
      setSpeechText(null)
      void notifyGuardianQuestion1('Bramkarz', true)
      setTimeout(() => {
        setCurrentQuestion(1)
        setGenieMood('idle')
      }, 1800)
    } else {
      playWrongAnswer()
      setGenieMood('wrong')
      setEndingPhase('guardian_wrong')
      setSpeechText(null)
      const nextHearts = guardianHearts - 1
      setGuardianHearts(nextHearts)
      const label = option === 'napastnik' ? 'Napastnik' : 'Obrońca'
      void notifyGuardianQuestion1(label, false)
      if (nextHearts <= 0) {
        handleGuardianDefeat()
      } else {
        setTimeout(() => {
          setEndingPhase('guardian_question')
          setGenieMood('idle')
        }, 1800)
      }
    }
  }

  // Pytanie 2: Obsesja twórcy (Poprawna: Siłka; Easter Egg: Na moim)
  const handleAnswerQuestion2 = (option: Question2Option) => {
    // 1. Jeśli użytkownik za pierwszym razem nie kliknął "Na moim" (SPECJALNY MOMENT - dymek Dżina)
    if (option !== 'na_moim' && !q2HasClickedNaMoim && !q2HasTriggeredWarning) {
      setQ2HasTriggeredWarning(true)
      setGenieMood('warning')
      setSpeechText('Czy jesteś pewna, że to poprawna odpowiedź? Ja myślę inaczej... 😏')
      const label = option === 'silka' ? 'Siłka' : option === 'podroze' ? 'Podróże' : 'Gry'
      void notifyGuardianQuestion2('first_warning', label)
      setTimeout(() => {
        setGenieMood('idle')
        setSpeechText(null)
      }, 3200)
      return
    }

    // 2. Kliknięcie "Na moim" (SPECJALNY MOMENT - sympatyczny żart z dymkiem Dżina)
    if (option === 'na_moim') {
      setQ2HasClickedNaMoim(true)
      setGenieMood('playful')
      setSpeechText('Hej hej, lubię Cię, ale to jeszcze nie obsesja! 😉')
      void notifyGuardianQuestion2('na_moim', 'Na moim')
      setTimeout(() => {
        setGenieMood('idle')
        setSpeechText(null)
      }, 3200)
      return
    }

    // 3. Właściwa odpowiedź: Siłka (bez dymku rozpychającego ekran - sama animacja sukcesu)
    if (option === 'silka') {
      playRightAnswer()
      setGenieMood('correct')
      setSpeechText(null)
      void notifyGuardianQuestion2('correct', 'Siłka')
      setTimeout(() => {
        setCurrentQuestion(2)
        setGenieMood('idle')
      }, 1800)
      return
    }

    // 4. Błędna odpowiedź (Podróże lub Gry) - bez dymku, czysta animacja błędu
    playWrongAnswer()
    setGenieMood('wrong')
    setEndingPhase('guardian_wrong')
    setSpeechText(null)
    const nextHearts = guardianHearts - 1
    setGuardianHearts(nextHearts)
    const label = option === 'podroze' ? 'Podróże' : 'Gry'
    void notifyGuardianQuestion2('wrong', label)
    if (nextHearts <= 0) {
      handleGuardianDefeat()
    } else {
      setTimeout(() => {
        setEndingPhase('guardian_question')
        setGenieMood('idle')
      }, 1800)
    }
  }

  // Pytanie 3: Skala Hot 1 do 10 (Poprawna: 10)
  const handleAnswerHotQuestion = (value: number) => {
    setSelectedHotValue(value)
    guardianAttemptsRef.current.push(value)
    if (value !== 10) {
      playWrongAnswer()
      setGenieMood('wrong')
      setEndingPhase('guardian_wrong')
      setSpeechText(null)
      const nextHearts = guardianHearts - 1
      setGuardianHearts(nextHearts)
      if (nextHearts <= 0) {
        handleGuardianDefeat()
      } else {
        setTimeout(() => {
          setEndingPhase('guardian_question')
          setGenieMood('idle')
          setSelectedHotValue(null)
        }, 1800)
      }
    } else {
      playRightAnswer()
      setGenieMood('triumph')
      setEndingPhase('guardian_correct')
      setSpeechText(null)
      void notifyGuardianRiddleAnswered(
        10,
        guardianAttemptsRef.current.length,
        [...guardianAttemptsRef.current]
      )
      setTimeout(() => {
        const letters = getCollectedLetters()
        prepareLockedSarcophagus(letters.length > 0 ? letters : collectedLetters)
      }, 2000)
    }
  }

  // Skip test shortcut
  useEffect(() => {
    if (skipToEndTest) {
      const halfIds = SPAWN_LETTER_ORDER.slice(0, 6)
      const halfLetters = halfIds
        .map((id) => SECRET_LETTERS.find((l) => l.id === id)!)
        .filter(Boolean)
      setGameState('ending')
      setCollectedLetters(halfLetters)
      setSkyLetters(scrambleLetters(halfLetters))
      startEndingChoreography(halfLetters, 3)
    }
  }, [skipToEndTest, setCollectedLetters, setGameState, startEndingChoreography])

  const handleContinueToForm = () => {
    const letters = getCollectedLetters()
    const stats = getStats()
    onCompleteRef.current({
      lettersCollected: letters.length > 0 ? letters.length : collectedLetters.length,
      totalLetters: 12,
      difficulty,
      difficultyLabel: DIFFICULTY_CONFIGS[difficulty].label,
      skippedStages: stats.skippedStages,
      manuallyCollectedCount: stats.manuallyCollectedCount,
      hitsTaken: stats.hitsTaken,
      deathsCount: stats.deathsCount,
      guardianAttempts: [...guardianAttemptsRef.current],
      totalPlayTimeSeconds: stats.totalPlayTimeSeconds,
      hasDiamondCard,
      diamondCardUsedQuestions: usedCardQuestion !== null ? [usedCardQuestion] : [],
    })
  }

  const isPauseDisabled =
    gameState === 'ready' ||
    gameState === 'gameover' ||
    gameState === 'ending' ||
    gameState === 'checkpoint'

  const isEndingActive = gameState === 'ending' && endingPhase !== 'none'

  return (
    <div className={`veil-game-wrapper ${isEndingActive ? 'ending-stage-active' : ''}`}>
      {!isEndingActive && (
        <GameHud
          lives={lives}
          biome={biome}
          difficulty={difficulty}
          soundMuted={soundMuted}
          isPauseDisabled={isPauseDisabled}
          isPaused={gameState === 'paused'}
          progress={progress}
          collectedLetters={collectedLetters}
          hasDiamondCard={hasDiamondCard}
          onToggleSound={handleToggleSound}
          onTogglePause={togglePause}
          onSkip={handleSkipGame}
        />
      )}

      <div className={`game-arena-container ${biome}`}>
        <div ref={hostRef} className="veil-pixi-host" aria-label="Obszar gry" />
        {toast && <div className="biome-toast">{toast}</div>}

        {/* Event banner */}
        {eventBanner && <GameEventBanner eventBanner={eventBanner} />}

        {/* Mobile controls */}
        {!isEndingActive && <GameControls onSteer={steer} />}

        {error && (
          <div className="game-overlay">
            <div className="game-modal-card">
              <h3 className="modal-heading">Gra nie mogła wystartować</h3>
              <p className="modal-text">Odśwież stronę i spróbuj ponownie.</p>
            </div>
          </div>
        )}

        {/* Start Screen */}
        {gameState === 'ready' && !error && (
          <GameReadyModal
            difficulty={difficulty}
            soundMuted={soundMuted}
            onSelectDifficulty={setDifficulty}
            onToggleSound={handleToggleSound}
            onStart={handleStartGame}
            onSkip={handleSkipGame}
          />
        )}

        {/* Checkpoint: Wejście do Muzeum */}
        {gameState === 'checkpoint' && checkpointStage === 'museum' && (
          <MuseumCheckpointModal
            doorOpening={doorOpening}
            onEnter={handleEnterMuseum}
            onSkip={handleSkipGame}
          />
        )}

        {/* Checkpoint: Wejście na Niewidzialną Wystawę */}
        {gameState === 'checkpoint' && checkpointStage === 'invisible_exhibition' && (
          <InvisibleExhibitionCheckpointModal
            onEnter={handleEnterExhibition}
            onSkip={handleSkipGame}
          />
        )}

        {/* Pauza */}
        {gameState === 'paused' && (
          <GamePauseModal
            onResume={togglePause}
            onSkip={handleSkipGame}
          />
        )}

        {/* Game Over */}
        {gameState === 'gameover' && (
          <GameOverModal
            hasCheckpoint={hasCheckpoint}
            checkpointStage={checkpointStage}
            difficulty={difficulty}
            onSelectDifficulty={setDifficulty}
            onResumeCheckpoint={resumeCheckpoint}
            onRestart={handleStartGame}
            onSkip={handleSkipGame}
          />
        )}

        {/* Ending Screen */}
        {gameState === 'ending' && endingPhase !== 'none' && (
          <div
            className="game-overlay sarcophagus-ending-overlay"
            onClick={(e) => e.stopPropagation()}
          >
            {(endingPhase === 'guardian_intro' ||
              endingPhase === 'guardian_question' ||
              endingPhase === 'guardian_wrong' ||
              endingPhase === 'guardian_correct') && (
              <GuardianRiddleModal
                endingPhase={endingPhase}
                guardianHearts={guardianHearts}
                currentQuestion={currentQuestion}
                genieMood={genieMood}
                speechText={speechText}
                selectedHotValue={selectedHotValue}
                hasDiamondCard={hasDiamondCard}
                isCardConsumed={usedCardQuestion !== null}
                isCardActiveOnCurrentQuestion={usedCardQuestion === currentQuestion}
                onUseDiamondCard={handleUseDiamondCard}
                onStartQuestions={handleStartQuestions}
                onAnswerQuestion1={handleAnswerQuestion1}
                onAnswerQuestion2={handleAnswerQuestion2}
                onAnswerHotQuestion={handleAnswerHotQuestion}
                onReturnToMuseum={handleManualReturnToMuseum}
              />
            )}

            {(endingPhase === 'sarcophagus_locked' ||
              endingPhase === 'key_inserting' ||
              endingPhase === 'sarcophagus_opening' ||
              endingPhase === 'flying_letters' ||
              endingPhase === 'complete') && (
              <SarcophagusStage
                endingPhase={endingPhase}
                difficulty={difficulty}
                collectedLetters={collectedLetters}
                skyLetters={skyLetters}
                placedCollectedIds={placedCollectedIds}
                activeFlyingId={activeFlyingId}
                showGrayout={showGrayout}
                isFlashing={isFlashing}
                onInsertKey={handleInsertKey}
                onContinue={handleContinueToForm}
              />
            )}
          </div>
        )}
      </div>

      {!isEndingActive && (
        <div className="game-steering-hint">
          <span>Tapuj lewo/prawo, aby sterować</span>
          <span>•</span>
          <span>Spacja lub strzałki na klawiaturze</span>
        </div>
      )}
    </div>
  )
}
