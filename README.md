# BM2Q

BM2Q is a personal version of **Cards Against Humanity**, developed during the COVID lockdown and migrated to nextjs, tailwindcss with daisyui.


## Installation

### Prerequisites
- **Node.js** (version <= 21)

To check if Node.js is installed and confirm the version, run:

```bash
node -v
```

### Steps
1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/BM2Q.git
   ```

2. **Navigate to the project directory**:
   ```bash
   cd BM2Q
   ```

3. **Install the dependencies**:
   ```bash
   npm install
   ```

## Running the Project

To run the application, you'll need to start both the **server** and the **client**.

1. **Run the server**:
   ```bash
   npm run serve
   ```

   This will start the backend server, which handles game logic and serves static files (port 8000)

2. **Run the client**:
   Open a separate terminal window and run:
   ```bash
   npm run start   ```

   This will start the game development server, and you can access the application at `http://localhost:3000`.

Ensure both the server and client are running for the application to work correctly.


## Known Issue & TODOs
- UI is crap and could be greatly enhanced
- Player names are not passe to the game letting the default "Joueur x" in the leaderboard
- Integrate multi-answers set (should work but not tested)