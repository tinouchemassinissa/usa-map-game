# 🦅 USA Map Master - Kids Edition

**USA Map Master** is a highly interactive, beautifully designed educational web application that helps kids (and adults!) learn the geography, capitals, and trivia of the 50 United States of America.

Built with **React**, **Vite**, and **react-simple-maps**, it features a modern glassmorphism UI, satisfying sound effects, and rewarding gameplay loops to make learning incredibly fun.

![USA Map Master](https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Map_of_USA_with_state_names.svg/800px-Map_of_USA_with_state_names.svg.png)

## ✨ Features

- **5 Distinct Game Modes**:
  - **🗺️ Classic**: The standard experience. Find the state by its name before you lose your 3 lives.
  - **⏱️ Time Attack**: A frantic 60-second dash! Gain +2 seconds for a correct guess, lose -5 seconds for a mistake.
  - **📍 Reverse**: The map highlights a state in blue, and you must pick the correct name from 4 multiple-choice options.
  - **🏛️ Capitals**: Test your knowledge by finding the state based entirely on its capital city.
  - **🧠 Trivia**: The map highlights a state, and you are asked a random multiple-choice trivia question about its population, area, or capital.
- **🔥 Combo Streaks**: Answer consecutive questions correctly to build your streak multiplier and earn massive points!
- **🏆 High Score Tracking**: Your highest scores are securely saved locally to your device.
- **🎖️ Achievement Badges**: Unlock exclusive golden badges on the main menu by scoring 200+ points in specific game modes.
- **🎵 Interactive Audio**: Features a low-volume, upbeat American marching tune (Yankee Doodle) and responsive sound effects built directly into the Web Audio API.
- **📱 Fully Responsive**: Custom CSS media queries ensure the game looks and plays perfectly on PCs, Tablets, and Smartphones.

## 🚀 Quick Start

To run this project locally on your machine:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/tinouchemassinissa/usa-map-game.git
   cd usa-map-game
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Play the game**: Open your browser and navigate to `http://localhost:5173/` (or the port provided by Vite).

## 🛠️ Technology Stack
- **Framework**: React 19 + Vite
- **Mapping**: `react-simple-maps` (D3-geo)
- **Styling**: Vanilla CSS (Glassmorphism, CSS Variables, Flexbox/Grid)
- **Effects**: `canvas-confetti` & Web Audio API

## 📝 License
This project is for educational purposes. Feel free to fork, modify, and deploy!
