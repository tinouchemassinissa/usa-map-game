import React, { useState, useEffect, useRef } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import confetti from 'canvas-confetti';
import { STATE_FACTS } from './facts';
import { playCorrectSound, playIncorrectSound } from './audio';
import './index.css';

const geoUrl = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

const STATE_NAMES = Object.keys(STATE_FACTS);

function App() {
  const [playerName, setPlayerName] = useState("");
  const [gameStarted, setGameStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [targetState, setTargetState] = useState("");
  const [guessedStates, setGuessedStates] = useState({});
  const [gameOver, setGameOver] = useState(false);
  
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [currentFact, setCurrentFact] = useState(null);

  const audioRef = useRef(null);

  useEffect(() => {
    // Load high score from local storage
    const savedHighScore = localStorage.getItem("usaMapHighScore");
    if (savedHighScore) setHighScore(parseInt(savedHighScore, 10));

    // Initialize funny American music
    audioRef.current = new Audio("https://upload.wikimedia.org/wikipedia/commons/4/4e/Yankee_Doodle_-_United_States_Army_Band.ogg");
    audioRef.current.loop = true;
    audioRef.current.volume = 0.05;
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  useEffect(() => {
    // Save high score if we beat it
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem("usaMapHighScore", score);
    }
  }, [score, highScore]);

  const toggleMusic = () => {
    if (musicPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.log("Audio play failed:", e));
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
    setGuessedStates({});
    setGameOver(false);
    pickNewTarget({});
    
    audioRef.current.play().then(() => {
      setMusicPlaying(true);
    }).catch(e => console.log("Audio play failed:", e));
  };

  const pickNewTarget = (currentGuessed) => {
    const remaining = STATE_NAMES.filter(s => currentGuessed[s] !== "correct");
    if (remaining.length === 0) {
      triggerWin();
      return;
    }
    const randomState = remaining[Math.floor(Math.random() * remaining.length)];
    setTargetState(randomState);
  };

  const triggerWin = () => {
    setGameOver(true);
    setTargetState("You Win!");
    confetti({
      particleCount: 200,
      spread: 160,
      origin: { y: 0.6 }
    });
  };

  const handleStateClick = (geo) => {
    if (gameOver || currentFact || !gameStarted) return;

    const stateName = geo.properties.name;
    if (guessedStates[stateName] === "correct" || !STATE_NAMES.includes(stateName)) return;

    if (stateName === targetState) {
      // Correct guess
      playCorrectSound();
      const newGuessed = { ...guessedStates, [stateName]: "correct" };
      setGuessedStates(newGuessed);
      
      const newStreak = streak + 1;
      setStreak(newStreak);
      
      // Calculate score with streak multiplier (base 10 + streak bonus)
      const points = 10 * newStreak;
      setScore(prev => prev + points);
      
      confetti({
        particleCount: 50 + (newStreak * 10), // more confetti for higher streaks!
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#22c55e', '#ffffff', '#3b82f6', '#facc15']
      });

      setCurrentFact({
        state: stateName,
        text: STATE_FACTS[stateName] || "This is a wonderful state!",
        pointsEarned: points
      });

    } else {
      // Incorrect guess
      playIncorrectSound();
      setStreak(0); // reset streak
      setGuessedStates(prev => ({ ...prev, [stateName]: "incorrect" }));
      setLives(prev => {
        const newLives = prev - 1;
        if (newLives <= 0) {
          setGameOver(true);
        }
        return newLives;
      });
      setTimeout(() => {
        setGuessedStates(prev => {
          const updated = { ...prev };
          if (updated[stateName] === "incorrect") {
            delete updated[stateName];
          }
          return updated;
        });
      }, 800);
    }
  };

  const closeFactAndNext = () => {
    setCurrentFact(null);
    pickNewTarget(guessedStates);
  };

  if (!gameStarted) {
    return (
      <div className="game-container" style={{ justifyContent: 'center' }}>
        <div className="glass-panel modal">
          <div className="mascot">🦅</div>
          <h1 className="title" style={{ fontSize: '3rem' }}>USA Map Master</h1>
          <h2 style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Kids Edition!</h2>
          <p style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>Learn the states, earn combos, and discover fun facts!</p>
          
          <input 
            type="text" 
            className="player-input" 
            placeholder="Enter your name..." 
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && startGame()}
          />

          <button className="btn-primary" onClick={startGame}>
            Let's Play! 🚀
          </button>

          {highScore > 0 && (
            <div style={{ marginTop: '1rem', color: '#facc15', fontWeight: 'bold' }}>
              🏆 All-Time High Score: {highScore}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="game-container">
      <button className="music-toggle" onClick={toggleMusic} title="Toggle Music">
        {musicPlaying ? "🔊" : "🔇"}
      </button>

      <div className="header">
        <div className="title-container">
          <span className="mascot">🦅</span>
          <h1 className="title" style={{ fontSize: '2.5rem' }}>{playerName}'s Challenge!</h1>
        </div>
        
        <div className="glass-panel">
          <div className="stat-box">
            <span className="stat-label">Score</span>
            <span className="stat-value">⭐ {score}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Streak</span>
            <span className={`stat-value ${streak >= 3 ? 'streak-text' : ''}`}>
              🔥 x{streak}
            </span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Lives</span>
            <span className="stat-value">{"❤️".repeat(Math.max(0, lives))}</span>
          </div>
        </div>

        {!gameOver && !currentFact && (
          <div className="target-state-display">
            <span className="target-label">Can you find...</span>
            <div className="target-name">{targetState}</div>
          </div>
        )}
      </div>

      <div className="map-container">
        <ComposableMap projection="geoAlbersUsa">
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const stateName = geo.properties.name;
                const status = guessedStates[stateName];
                let className = "state-path";
                if (status === "correct") className += " correct";
                if (status === "incorrect") className += " incorrect";

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    className={className}
                    onClick={() => handleStateClick(geo)}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </div>

      {currentFact && (
        <div className="overlay">
          <div className="glass-panel modal">
            <h2 className="title" style={{ fontSize: '2.5rem' }}>Awesome! 🎉</h2>
            <div style={{ color: '#22c55e', fontSize: '1.2rem', fontWeight: 'bold' }}>
              +{currentFact.pointsEarned} Points!
            </div>
            <div className="fact-box">
              <div className="fact-title">💡 Fun Fact about {currentFact.state}</div>
              <div className="fact-text">{currentFact.text}</div>
            </div>
            <button className="btn-primary" onClick={closeFactAndNext}>
              Next State ➡️
            </button>
          </div>
        </div>
      )}

      {gameOver && (
        <div className="overlay">
          <div className="glass-panel modal">
            <div className="mascot">{lives <= 0 ? "😢" : "🏆"}</div>
            <h2 className="title" style={{ fontSize: '3.5rem' }}>
              {lives <= 0 ? "Game Over" : "You Win!"}
            </h2>
            <div className="stat-box" style={{ margin: '1rem 0' }}>
              <span className="stat-label">Final Score</span>
              <span className="stat-value" style={{ fontSize: '3rem' }}>⭐ {score}</span>
            </div>
            {score >= highScore && score > 0 && (
              <div style={{ color: '#facc15', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                🌟 New High Score! 🌟
              </div>
            )}
            <button className="btn-primary" onClick={() => setGameStarted(false)}>
              Back to Menu ↩️
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
