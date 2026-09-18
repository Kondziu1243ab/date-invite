import React from 'react';

export interface PeakInfo {
  id: string;
  name: string;
  height: string;
  range: string;
  isTarget?: boolean;
  stamped?: boolean;
  notes?: string;
}

export const PEAKS_DATA: PeakInfo[] = [
  {
    id: 'rysy',
    name: 'Rysy',
    height: '2499 m n.p.m.',
    range: 'Tatry Wysokie',
    stamped: true,
    notes: 'Wymagana wysoka kondycja i brak lęku wysokości.'
  },
  {
    id: 'babia',
    name: 'Babia Góra',
    height: '1725 m n.p.m.',
    range: 'Beskid Żywiecki',
    stamped: true,
    notes: 'Kapryśna pogoda, zwana Matką Niepogód.'
  },
  {
    id: 'sniezka',
    name: 'Śnieżka',
    height: '1603 m n.p.m.',
    range: 'Karkonosze',
    stamped: true,
    notes: 'Latające spodki obserwatorium.'
  },
  {
    id: 'szczesliwice',
    name: 'Górka Szczęśliwicka',
    height: '152 m n.p.m.',
    range: 'Korona Warszawy / Ochota',
    isTarget: true,
    stamped: false,
    notes: 'Najwyższy szczyt stolicy. Wymagany: uśmiech, luźny krok i dobre towarzystwo!'
  }
];

interface KgpBookProps {
  pageIndex: number; // 0 = Cover, 1 = Rysy, 2 = Babia Góra, 3 = Śnieżka, 4 = Górka Szczęśliwicka
  isFlipping: boolean;
  isStamping: boolean;
  hasStamp: boolean;
  onBookClick?: () => void;
}

export const KgpBook: React.FC<KgpBookProps> = ({
  pageIndex,
  isFlipping,
  isStamping,
  hasStamp,
}) => {
  const isCover = pageIndex === 0;
  const currentPeak = PEAKS_DATA[Math.min(pageIndex - 1, PEAKS_DATA.length - 1)] || PEAKS_DATA[0];

  return (
    <div className="book-stage">
      <div className={`book-container ${isFlipping ? 'is-flipping' : ''} ${hasStamp ? 'has-stamp-applied' : ''}`}>
        
        {/* PHYSICAL RUBBER STAMP HAMMER ANIMATION */}
        {isStamping && (
          <div className="stamp-tool-wrapper">
            <div className="stamp-tool">
              <div className="stamp-handle-knob"></div>
              <div className="stamp-handle-stem"></div>
              <div className="stamp-handle-collar"></div>
              <div className="stamp-base-plate">
                <div className="stamp-rubber-bottom">
                  <span>😊 ⛰️</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BOOK COVER STATE */}
        {isCover ? (
          <div className="book-cover">
            <div className="cover-inner-border">
              <div className="cover-gold-badge">
                <div className="cover-icon-mountain">
                  <svg viewBox="0 0 100 80" className="mountain-svg" fill="currentColor">
                    <polygon points="10,75 45,20 60,45 75,25 95,75" />
                    <polygon points="45,20 52,32 40,35 34,26" fill="#fff" opacity="0.9" />
                    <polygon points="75,25 80,36 70,38" fill="#fff" opacity="0.9" />
                  </svg>
                </div>
                <h1 className="cover-title">KORONA GÓR POLSKI</h1>
                <div className="cover-divider">
                  <span>✦ ✦ ✦</span>
                </div>
                <h2 className="cover-subtitle">KSIĄŻECZKA WERYFIKACYJNA</h2>
                <p className="cover-caption">OFICJALNY REJESTR ZDOBYWCY</p>
                <div className="cover-gold-seal">
                  <div className="seal-ring">
                    <span>EDYCJA SPECJALNA</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="book-ribbon"></div>
          </div>
        ) : (
          /* OPEN BOOK SPREAD */
          <div className="book-spread">
            {/* SPINE SHADOW */}
            <div className="book-spine-crease"></div>

            {/* LEFT PAGE - GENERAL / PREVIOUS PEAK */}
            <div className="book-page page-left">
              <div className="page-header">
                <span className="page-serial">KGP / 2026</span>
                <span className="page-title-mini">KORONA GÓR POLSKI</span>
                <span className="page-num">{pageIndex * 2 - 1}</span>
              </div>

              <div className="page-inner-content">
                <div className="stamp-placeholder previous-stamp">
                  <div className="vintage-stamp-official">
                    <div className="stamp-circle-border">
                      <span className="stamp-pttk-text">PTTK • ODDZIAŁ TATRZAŃSKI</span>
                      <div className="stamp-inner-symbol">★ RYSY ★</div>
                      <span className="stamp-date">2499 m</span>
                    </div>
                  </div>
                  <div className="stamp-watermark-label">ZALICZONO</div>
                </div>

                <div className="peak-meta-block">
                  <div className="meta-row">
                    <span className="meta-label">Pasmo:</span>
                    <span className="meta-value">Karpaty / Tatry</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">Trasa:</span>
                    <span className="meta-value">Morskie Oko → Szczyt</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">Status:</span>
                    <span className="meta-value verified-badge">Potwierdzone ✓</span>
                  </div>
                </div>

                <div className="hiker-quote">
                  „W górach nie ma dróg na skróty, ale każda droga prowadzi ku szczytom!”
                </div>
              </div>

              <div className="page-corner-fold"></div>
            </div>

            {/* RIGHT PAGE - ACTIVE / TARGET PEAK */}
            <div className={`book-page page-right ${currentPeak.isTarget ? 'target-page-active' : ''}`}>
              <div className="page-header">
                <span className="page-serial">NR SZCZYTU: 29/28</span>
                <span className="page-title-mini">KARTA WERYFIKACJI</span>
                <span className="page-num">{pageIndex * 2}</span>
              </div>

              <div className="page-inner-content">
                <div className="target-peak-header">
                  <span className="peak-tag">👑 SZCZYT KORONNY</span>
                  <h3 className="target-peak-title">{currentPeak.name}</h3>
                  <div className="target-peak-height">{currentPeak.height}</div>
                  <div className="target-peak-range">{currentPeak.range}</div>
                </div>

                <div className="target-specs-table">
                  <div className="spec-item">
                    <span className="spec-key">Trudność:</span>
                    <span className="spec-val">Ekstremalnie miła ☕</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-key">Ekwipunek:</span>
                    <span className="spec-val">Uśmiech & Proviant</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-key">Kandydatka:</span>
                    <span className="spec-val highlight-name">Kornelia ✨</span>
                  </div>
                </div>

                {/* STAMP BOX */}
                <div className="stamp-target-box">
                  <div className="stamp-box-frame">
                    <span className="stamp-box-label">MIEJSCE NA PIECZĄTKĘ SZCZYTOWĄ</span>

                    {/* APPLIED STAMP */}
                    {hasStamp && (
                      <div className="applied-stamp-mark">
                        <div className="ink-stamp-circle">
                          <svg className="stamp-curved-text" viewBox="0 0 200 200">
                            <path
                              id="textCircle"
                              d="M 100, 100 m -75, 0 a 75,75 0 1,1 150,0 a 75,75 0 1,1 -150,0"
                              fill="none"
                            />
                            <text fill="currentColor" fontSize="13.5" fontWeight="bold" letterSpacing="2.5">
                              <textPath href="#textCircle" startOffset="50%" textAnchor="middle">
                                • GÓRKA SZCZĘŚLIWICKA • 152m •
                              </textPath>
                            </text>
                          </svg>

                          {/* USER SPECIFIED: SMILEY FACE AND ^ MOUNTAIN TRIANGLE */}
                          <div className="ink-stamp-art">
                            <div className="ink-smiley" title="Uśmiechnięta buźka">
                              <div className="smiley-eyes">
                                <span className="eye">●</span>
                                <span className="eye">●</span>
                              </div>
                              <div className="smiley-smile"></div>
                            </div>
                            <div className="ink-mountain" title="Trójkącik symbolizujący górkę">
                              <span className="mountain-peak-symbol">^</span>
                              <div className="mountain-lines">
                                <span>▲</span>
                              </div>
                            </div>
                          </div>

                          <div className="stamp-subtext">ZDOBYTO!</div>
                        </div>

                        {/* Ink splatter micro dots */}
                        <div className="ink-splatter s1"></div>
                        <div className="ink-splatter s2"></div>
                        <div className="ink-splatter s3"></div>
                      </div>
                    )}

                    {!hasStamp && !isStamping && (
                      <div className="stamp-prompt-hint">
                        <span className="hint-dashed-circle"></span>
                        <span className="hint-text">Czeka na przybicie...</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="handwritten-note">
                  {currentPeak.isTarget ? (
                    <span>„Wyprawa zatwierdzona. Wymaga obecności Kornelii!”</span>
                  ) : (
                    <span>{currentPeak.notes}</span>
                  )}
                </div>
              </div>

              <div className="page-corner-fold"></div>
            </div>
          </div>
        )}

        {/* FLIPPING PAGE SHADOW/EFFECT OVERLAY */}
        {isFlipping && (
          <div className="page-flip-overlay">
            <div className="flipping-leaf">
              <div className="leaf-front">
                <div className="leaf-lines"></div>
              </div>
              <div className="leaf-back"></div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
