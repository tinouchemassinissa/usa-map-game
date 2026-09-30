import React, { useState, useEffect, useRef } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import confetti from 'canvas-confetti';
import { STATE_DATA } from './data';
import { playCorrectSound, playIncorrectSound } from './audio';
import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';
import './index.css';

const geoUrl = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";
const STATE_NAMES = Object.keys(STATE_DATA);

const GAME_MODES = {
  CLASSIC: { id: 'CLASSIC', title: 'Classic', desc: 'Find the state on the map.' },
  TIME_ATTACK: { id: 'TIME_ATTACK', title: 'Time Attack', desc: '60 seconds. Go fast!' },
  REVERSE: { id: 'REVERSE', title: 'Reverse', desc: 'Map highlights a state. Pick its name.' },
  CAPITALS: { id: 'CAPITALS', title: 'Capitals', desc: 'Find the state by its Capital.' },
  TRIVIA: { id: 'TRIVIA', title: 'Trivia', desc: 'State is highlighted. Answer a fact!' },
  FLAGS: { id: 'FLAGS', title: 'Flags Game', desc: 'Identify the state by its flag! 🚩' },
  STUDY: { id: 'STUDY', title: 'Study Guide', desc: 'Relax, click around, and learn! 📚' }
};

const BADGES = [
  { id: 'classic', icon: '🗺️', label: 'Classic Explorer (Score 200+)' },
  { id: 'speedster', icon: '⏱️', label: 'Speedster (Time Attack 200+)' },
  { id: 'geographer', icon: '📍', label: 'Geographer (Reverse 200+)' },
  { id: 'president', icon: '🏛️', label: 'President (Capitals 200+)' },
  { id: 'brainiac', icon: '🧠', label: 'Brainiac (Trivia 200+)' },
  { id: 'vexillologist', icon: '🚩', label: 'Vexillologist (Flags 200+)' }
];

function App() {
  const [playerName, setPlayerName] = useState("");
  const [gameStarted, setGameStarted] = useState(false);
  const [mode, setMode] = useState(GAME_MODES.CLASSIC.id);
  
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(60);
  
  const [targetState, setTargetState] = useState("");
  const [options, setOptions] = useState([]);
  const [triviaQuestion, setTriviaQuestion] = useState("");
  
  const [guessedStates, setGuessedStates] = useState({});
  const [gameOver, setGameOver] = useState(false);
  
  const [currentFact, setCurrentFact] = useState(null);
  
  const [floatingTexts, setFloatingTexts] = useState([]); // Array of floating text objects

  const [unlockedBadges, setUnlockedBadges] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [studyData, setStudyData] = useState(null); // Advanced Study Guide Data

  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const anthemRef = useRef(null);

  const fetchLeaderboard = async () => {
    try {
      const q = query(collection(db, "usa-map-leaderboard"), orderBy("score", "desc"), limit(5));
      const querySnapshot = await getDocs(q);
      const scores = [];
      querySnapshot.forEach((doc) => {
        scores.push({ id: doc.id, ...doc.data() });
      });
      setLeaderboard(scores);
    } catch (e) {
      console.log("Firebase not configured yet");
    }
  };

  useEffect(() => {
    const savedHighScore = localStorage.getItem("usaMapHighScore");
    if (savedHighScore) setHighScore(parseInt(savedHighScore, 10));
    
    const savedBadges = JSON.parse(localStorage.getItem("usaMapBadges") || "[]");
    setUnlockedBadges(savedBadges);

    fetchLeaderboard();

    const bgMusic = document.getElementById('bg-music');
    const anthemMusic = document.getElementById('anthem-audio');

    if (bgMusic) bgMusic.volume = 0.05;
    if (anthemMusic) {
      anthemMusic.volume = 0.08;
      anthemMusic.onended = () => {
        if (musicPlaying && bgMusic) {
          bgMusic.play().catch(e => console.log(e));
        }
      };
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [musicPlaying]);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem("usaMapHighScore", score);
    }
    checkBadges(score, mode);
  }, [score, highScore, mode]);

  useEffect(() => {
    if (gameStarted && !gameOver && !currentFact && mode === 'TIME_ATTACK') {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            triggerGameOver(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [gameStarted, gameOver, currentFact, mode]);

  const checkBadges = (currentScore, currentMode) => {
    if (currentScore >= 200) {
      let badgeId = '';
      if (currentMode === 'CLASSIC') badgeId = 'classic';
      if (currentMode === 'TIME_ATTACK') badgeId = 'speedster';
      if (currentMode === 'REVERSE') badgeId = 'geographer';
      if (currentMode === 'CAPITALS') badgeId = 'president';
      if (currentMode === 'TRIVIA') badgeId = 'brainiac';
      
      if (badgeId && !unlockedBadges.includes(badgeId)) {
        const newBadges = [...unlockedBadges, badgeId];
        setUnlockedBadges(newBadges);
        localStorage.setItem("usaMapBadges", JSON.stringify(newBadges));
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.3 }, colors: ['#facc15'] });
      }
    }
  };

  const toggleMusic = () => {
    const bgMusic = document.getElementById('bg-music');
    const anthemMusic = document.getElementById('anthem-audio');
    
    if (musicPlaying) {
      if (bgMusic) bgMusic.pause();
      if (anthemMusic) anthemMusic.pause();
    } else {
      if (anthemMusic && anthemMusic.currentTime > 0 && !anthemMusic.ended) {
        anthemMusic.play().catch(e => console.log(e));
      } else if (bgMusic) {
        bgMusic.play().catch(e => console.log(e));
      }
    }
    setMusicPlaying(!musicPlaying);
  };

  const startGame = () => {
    const finalName = playerName.trim() || "Explorer";
    setPlayerName(finalName);
    setGameStarted(true);
    setScore(0);
    setStreak(0);
    setLives(3);
    setTimeLeft(60);
    setGuessedStates({});
    setGameOver(false);
    pickNewTarget({});
    
    // Play Yankee Doodle via audio element
    const bgMusic = document.getElementById('bg-music');
    if (bgMusic) {
      bgMusic.currentTime = 0;
      bgMusic.play().then(() => setMusicPlaying(true)).catch(e => console.log("Audio block:", e));
    }
  };

  const saveToLeaderboard = async (finalScore) => {
    if (finalScore > 0 && playerName) {
      try {
        await addDoc(collection(db, "usa-map-leaderboard"), {
          name: playerName,
          score: finalScore,
          mode: mode,
          date: new Date().toISOString()
        });
        fetchLeaderboard();
      } catch (e) {
        console.log("Firebase error:", e);
      }
    }
  };

  const triggerGameOver = (finalScore) => {
    setGameOver(true);
    saveToLeaderboard(finalScore);
  };

  const generateMultipleChoice = (correctAnswer, type) => {
    const opts = new Set([correctAnswer]);
    while(opts.size < 4) {
      const randState = STATE_NAMES[Math.floor(Math.random() * STATE_NAMES.length)];
      if (type === 'name') opts.add(randState);
      else if (type === 'population') opts.add(STATE_DATA[randState].population);
      else if (type === 'area') opts.add(STATE_DATA[randState].area);
      else if (type === 'capital') opts.add(STATE_DATA[randState].capital);
    }
    return Array.from(opts).sort(() => Math.random() - 0.5);
  };

  const pickNewTarget = (currentGuessed) => {
    if (mode === 'STUDY') {
      setTargetState("Click any state to learn! 📚");
      return;
    }

    const remaining = STATE_NAMES.filter(s => currentGuessed[s] !== "correct");
    if (remaining.length === 0) {
      setTargetState("You Win!");
      
      const anthemMusic = document.getElementById('anthem-audio');
      const bgMusic = document.getElementById('bg-music');
      if (bgMusic) bgMusic.pause();
      if (anthemMusic) {
        anthemMusic.currentTime = 0;
        anthemMusic.play().catch(e => console.log(e));
      }
      
      const duration = 50 * 1000;
      const animationEnd = Date.now() + duration;
      const interval = setInterval(function() {
        var timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
          return clearInterval(interval);
        }
        var particleCount = 50 * (timeLeft / duration);
        confetti({ startVelocity: 30, spread: 360, ticks: 60, zIndex: 0, particleCount, origin: { x: Math.random(), y: Math.random() - 0.2 } });
      }, 250);

      setTimeout(() => {
        triggerGameOver(score);
      }, 50000);
      return;
    }
    const randomState = remaining[Math.floor(Math.random() * remaining.length)];
    setTargetState(randomState);

    if (mode === 'REVERSE') {
      setOptions(generateMultipleChoice(randomState, 'name'));
    } else if (mode === 'FLAGS') {
      setOptions(generateMultipleChoice(randomState, 'name'));
    } else if (mode === 'TRIVIA') {
      const types = ['population', 'area', 'capital'];
      const questionType = types[Math.floor(Math.random() * types.length)];
      setTriviaQuestion(`What is the ${questionType} of this state?`);
      setOptions(generateMultipleChoice(STATE_DATA[randomState][questionType], questionType));
    }
  };

  const handleGuess = (guess) => {
    if (gameOver || currentFact || !gameStarted) return;
    
    let isCorrect = false;
    
    if (mode === 'REVERSE' || mode === 'FLAGS' || mode === 'TRIVIA') {
      const isCorrect = (guess === targetState);
      processAnswer(isCorrect, targetState, null);
    } else {
      processAnswer(guess === targetState, targetState, null);
    }
  };

  const handleMapClick = (geo, evt) => {
    if (gameOver || currentFact || !gameStarted) return;
    const stateName = geo.properties.name;

    if (mode === 'STUDY') {
      if (STATE_NAMES.includes(stateName)) {
        setCurrentFact({
          state: stateName,
          text: STATE_DATA[stateName].fact,
          pointsEarned: 0
        });
      }
      return;
    }

    if (mode === 'REVERSE' || mode === 'FLAGS' || mode === 'TRIVIA') return; // In these modes, use buttons
    
    if (guessedStates[stateName] === "correct" || !STATE_NAMES.includes(stateName)) return;

    // Pass the click coordinates for the floating combo text
    handleGuess(stateName, evt);
  };

  const handleGuessMap = (guess, evt) => {
    if (gameOver || currentFact || !gameStarted) return;
    processAnswer(guess === targetState, guess, evt);
  };

  const handleMapClickFinal = (geo, evt) => {
    if (gameOver || currentFact || !gameStarted) return;
    const stateName = geo.properties.name;

    if (mode === 'STUDY') {
      if (STATE_NAMES.includes(stateName)) {
        setTargetState(stateName);
        
        setStudyData({
           stateName,
           extract: STATE_DATA[stateName].fact,
           thumbnail: `https://flagcdn.com/w320/us-${STATE_DATA[stateName].code}.png`,
           url: `https://www.google.com/search?q=${stateName}+state+history+site:.gov+OR+site:.edu`
        });
      }
      return;
    }

    if (mode === 'REVERSE' || mode === 'FLAGS' || mode === 'TRIVIA') return;
    
    if (guessedStates[stateName] === "correct" || !STATE_NAMES.includes(stateName)) return;

    handleGuessMap(stateName, evt);
  };

  const processAnswer = (isCorrect, stateName, evt) => {
    if (isCorrect) {
      playCorrectSound();
      const newGuessed = { ...guessedStates, [stateName]: "correct" };
      setGuessedStates(newGuessed);
      
      const newStreak = streak + 1;
      setStreak(newStreak);
      
      const points = 10 * newStreak;
      const newScore = score + points;
      setScore(newScore);
      if (mode === 'TIME_ATTACK') setTimeLeft(prev => prev + 2);
      
      // Floating Combo Text
      if (evt && evt.clientX) {
        const id = Date.now();
        const x = evt.clientX;
        const y = evt.clientY - 20;
        setFloatingTexts(prev => [...prev, { id, text: `+${points}`, combo: newStreak >= 3 ? newStreak : null, x, y }]);
        setTimeout(() => setFloatingTexts(prev => prev.filter(f => f.id !== id)), 1500);
      }
      
      confetti({
        particleCount: 50 + (newStreak * 10),
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#22c55e', '#ffffff', '#3b82f6', '#facc15']
      });

      setCurrentFact({
        state: stateName,
        text: STATE_DATA[stateName].fact,
        pointsEarned: points
      });

    } else {
      playIncorrectSound();
      setStreak(0);
      setGuessedStates(prev => ({ ...prev, [stateName]: "incorrect" }));
      
      if (mode === 'TIME_ATTACK') {
        setTimeLeft(prev => Math.max(0, prev - 5));
      } else {
        setLives(prev => {
          const newLives = prev - 1;
          if (newLives <= 0) triggerGameOver(score);
          return newLives;
        });
      }

      setTimeout(() => {
        setGuessedStates(prev => {
          const updated = { ...prev };
          if (updated[stateName] === "incorrect") delete updated[stateName];
          return updated;
        });
      }, 800);
    }
  };

  const closeFactAndNext = () => {
    setCurrentFact(null);
    pickNewTarget(guessedStates);
  };

  return (
    <div className="game-wrapper" style={{ width: '100vw', height: '100vh' }}>
      {/* Hidden Audio Elements for better browser support - ALWAYS MOUNTED */}
      <audio id="anthem-audio" src="https://archive.org/download/StarSpangledBanner_201310/StarSpangledBanner.mp3" preload="auto"></audio>
      <audio id="bg-music" src="https://archive.org/download/yankee-doodle/Yankee%20Doodle.mp3" loop preload="auto"></audio>

      {!gameStarted ? (
        <div className="game-container" style={{ justifyContent: 'center' }}>
          <button className="icon-btn music-toggle" onClick={toggleMusic} title="Toggle Music">
            {musicPlaying ? "🔊" : "🔇"}
          </button>
        <div className="glass-panel modal">
          <div className="mascot">🦅</div>
          <h1 className="title">USA Map Master</h1>
          
          <input 
            type="text" 
            className="player-input" 
            placeholder="Enter your name..." 
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />

          <h3 style={{ marginTop: '0.5rem' }}>Select Game Mode</h3>
          <div className="mode-grid">
            {Object.values(GAME_MODES).map(m => (
              <div 
                key={m.id} 
                className={`mode-card ${mode === m.id ? 'active' : ''}`}
                onClick={() => setMode(m.id)}
              >
                <div className="mode-title">{m.title}</div>
                <div className="mode-desc">{m.desc}</div>
              </div>
            ))}
          </div>

          <button className="btn-primary" onClick={startGame}>
            Let's Play! 🚀
          </button>

          <div className="badges-container">
            {BADGES.map(b => (
              <div key={b.id} className={`badge ${unlockedBadges.includes(b.id) ? 'unlocked' : ''}`} title={b.label}>
                {b.icon}
              </div>
            ))}
          </div>

          {leaderboard.length > 0 && (
            <div style={{ marginTop: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', width: '100%' }}>
              <h3 style={{ color: '#facc15', marginBottom: '0.5rem' }}>🌍 Global Leaderboard</h3>
              {leaderboard.map((entry, i) => (
                <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '0.2rem 0' }}>
                  <span>{i + 1}. {entry.name} <span style={{opacity:0.5}}>({entry.mode})</span></span>
                  <span style={{ fontWeight: 'bold' }}>{entry.score} pts</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      ) : (
      <div className="game-container">
        <button className="icon-btn home-btn" onClick={() => setGameStarted(false)} title="Back to Menu">
          🏠
        </button>
        <button className="icon-btn music-toggle" onClick={toggleMusic} title="Toggle Music">
          {musicPlaying ? "🔊" : "🔇"}
        </button>
      <div className="header">
        <div className="title-container">
          <span className="mascot">🦅</span>
          <h1 className="title" style={{ fontSize: '2.5rem' }}>{playerName}'s Challenge!</h1>
        </div>
        
        <div className="glass-panel" style={{ padding: '0.5rem', gap: '1rem' }}>
          <div className="stat-box">
            <span className="stat-label">Score</span>
            <span className="stat-value">⭐ {score}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Streak</span>
            <span className={`stat-value ${streak >= 3 ? 'streak-text' : ''}`}>🔥 x{streak}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">{mode === 'TIME_ATTACK' ? 'Time' : 'Lives'}</span>
            <span className={`stat-value ${mode === 'TIME_ATTACK' && timeLeft <= 10 ? 'streak-text' : ''}`} style={mode==='TIME_ATTACK' && timeLeft<=10 ? {color:'#ef4444'}:{}}>
              {mode === 'TIME_ATTACK' ? `${timeLeft}s ⏳` : "❤️".repeat(Math.max(0, lives))}
            </span>
          </div>
        </div>

        {!gameOver && !currentFact && (
          <div className="target-state-display">
            <span className="target-label">
              {mode === 'CAPITALS' ? "Find the state where the capital is:" : 
               mode === 'REVERSE' ? "What state is highlighted on the map?" :
               mode === 'FLAGS' ? "Which state does this flag belong to?" :
               mode === 'TRIVIA' ? triviaQuestion :
               mode === 'STUDY' ? "Study Guide Mode Active" :
               "Can you find..."}
            </span>
            <div className="target-name" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {mode === 'FLAGS' && targetState && STATE_DATA[targetState] && (
                <img src={`https://flagcdn.com/w160/us-${STATE_DATA[targetState].code}.png`} alt="flag" style={{ width: '120px', borderRadius: '8px', border: '2px solid rgba(255,255,255,0.4)', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }} />
              )}
              {targetState && STATE_DATA[targetState] && mode !== 'REVERSE' && mode !== 'TRIVIA' && mode !== 'CAPITALS' && mode !== 'FLAGS' && mode !== 'STUDY' && (
                <img src={`https://flagcdn.com/w80/us-${STATE_DATA[targetState].code}.png`} alt="flag" style={{ width: '50px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)' }} />
              )}
              {mode === 'CAPITALS' ? STATE_DATA[targetState]?.capital : 
               mode === 'REVERSE' || mode === 'TRIVIA' || mode === 'FLAGS' ? "???" : 
               targetState}
            </div>
          </div>
        )}
      </div>

      <div className="map-container">
        <ComposableMap projection="geoAlbersUsa" className="main-map-svg">
          <defs>
            <pattern id="us-flag" patternUnits="userSpaceOnUse" width="1000" height="600">
              <image href="https://flagcdn.com/w1280/us.png" x="0" y="0" width="1000" height="600" preserveAspectRatio="xMidYMid slice" />
            </pattern>
          </defs>
          <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const stateName = geo.properties.name;
                  const status = guessedStates[stateName];
                  let className = "state-path";
                  
                  if (status === "correct") className += " correct";
                  if (status === "incorrect") className += " incorrect";
                  
                  if ((mode === 'REVERSE' || mode === 'TRIVIA' || mode === 'FLAGS') && stateName === targetState && !currentFact) {
                    className += " target-highlight";
                  }

                  if (targetState === "You Win!") {
                    className = "state-path win-animation";
                  }

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      className={className}
                      onClick={(evt) => handleMapClickFinal(geo, evt)}
                      style={{
                        default: { outline: "none" },
                        hover: { outline: "none" },
                        pressed: { outline: "none" },
                      }}
                    />
                  );
                })
              }
            </Geographies>
        </ComposableMap>

        {floatingTexts.map(ft => (
          <div key={ft.id} className="floating-text" style={{ left: ft.x, top: ft.y }}>
            {ft.text}
            {ft.combo && <span className="floating-combo">Combo x{ft.combo}! 🔥</span>}
          </div>
        ))}
      </div>

      {!gameOver && !currentFact && (mode === 'REVERSE' || mode === 'TRIVIA' || mode === 'FLAGS') && (
        <div className="options-grid">
          {options.map((opt, i) => (
            <button key={i} className="option-btn" onClick={() => handleGuess(opt)}>
              {opt}
            </button>
          ))}
        </div>
      )}

      {currentFact && (
        <div className="overlay">
          <div className="glass-panel modal">
            <h2 className="title" style={{ fontSize: '2.5rem' }}>Awesome! 🎉</h2>
            <div style={{ color: '#22c55e', fontSize: '1.2rem', fontWeight: 'bold' }}>
              {currentFact.pointsEarned > 0 ? `+${currentFact.pointsEarned} Points!` : "Fact Unlocked! 📚"}
            </div>
            <div className="fact-box">
              <div className="fact-title">
                <img src={`https://flagcdn.com/w40/us-${STATE_DATA[currentFact.state].code}.png`} alt="flag" style={{ borderRadius: '2px' }} />
                💡 Did you know about {currentFact.state}?
              </div>
              <div className="fact-text">{currentFact.text}</div>
            </div>
            <button className="btn-primary" onClick={closeFactAndNext}>
              Next State ➡️
            </button>
          </div>
        </div>
      )}

      {studyData && (
        <div className="overlay" style={{ alignItems: 'flex-start', paddingTop: '5vh' }}>
          <div className="glass-panel modal" style={{ maxWidth: '700px', animation: 'floatUp 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="title" style={{ fontSize: '2.5rem', margin: 0 }}>{studyData.stateName}</h2>
              <button onClick={() => setStudyData(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '2rem', cursor: 'pointer' }}>✖</button>
            </div>
            
            {studyData.loading ? (
              <div style={{ padding: '3rem', color: '#94a3b8' }}>Fetching official Wikipedia records... 📚</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  {studyData.thumbnail && (
                    <img src={studyData.thumbnail} alt={studyData.stateName} style={{ width: '150px', borderRadius: '8px', border: '2px solid rgba(255,255,255,0.2)' }} />
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div className="stat-label">Capital: <span className="stat-value" style={{ fontSize: '1.2rem' }}>{STATE_DATA[studyData.stateName].capital}</span></div>
                    <div className="stat-label">Population: <span className="stat-value" style={{ fontSize: '1.2rem' }}>{STATE_DATA[studyData.stateName].population}</span></div>
                    <div className="stat-label">Area: <span className="stat-value" style={{ fontSize: '1.2rem' }}>{STATE_DATA[studyData.stateName].area}</span></div>
                    <div className="stat-label">Statehood: <span className="stat-value" style={{ fontSize: '1.2rem' }}>{STATE_DATA[studyData.stateName].statehood}</span></div>
                    <div className="stat-label">Geography: <span className="stat-value" style={{ fontSize: '1.2rem' }}>{STATE_DATA[studyData.stateName].geography}</span></div>
                  </div>
                </div>
                
                <div className="fact-box" style={{ fontSize: '1.1rem', lineHeight: '1.6', maxHeight: '30vh', overflowY: 'auto' }}>
                  {studyData.extract}
                </div>
                
                {studyData.url && (
                  <a href={studyData.url} target="_blank" rel="noreferrer" className="btn-primary" style={{ textDecoration: 'none', textAlign: 'center', background: '#3b82f6', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>🏛️</span> Research Official .gov & .edu Records
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {gameOver && (
        <div className="overlay">
          <div className="glass-panel modal">
            <div className="mascot">{(mode === 'TIME_ATTACK' ? timeLeft <= 0 : lives <= 0) ? "😢" : "🏆"}</div>
            <h2 className="title" style={{ fontSize: '3.5rem' }}>
              {(mode === 'TIME_ATTACK' ? timeLeft <= 0 : lives <= 0) ? "Game Over" : "You Win!"}
            </h2>
            <div className="stat-box" style={{ margin: '1rem 0' }}>
              <span className="stat-label">Final Score</span>
              <span className="stat-value" style={{ fontSize: '3rem' }}>⭐ {score}</span>
            </div>
            
            {leaderboard.length > 0 && (
              <div style={{ margin: '1rem 0', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', width: '100%' }}>
                <h3 style={{ color: '#facc15', marginBottom: '0.5rem' }}>🌍 Top Players</h3>
                {leaderboard.slice(0,3).map((entry, i) => (
                  <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '0.2rem 0' }}>
                    <span>{i + 1}. {entry.name}</span>
                    <span style={{ fontWeight: 'bold' }}>{entry.score} pts</span>
                  </div>
                ))}
              </div>
            )}

            <button className="btn-primary" onClick={() => setGameStarted(false)}>
              Back to Menu ↩️
            </button>
          </div>
        </div>
      )}
      </div>
      )}
    </div>
  );
}

export default App;
