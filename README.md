Here’s a complete **README.md** file for your project:

---

# BM2Q

BM2Q is a personal version of **Cards Against Humanity**, developed during the COVID lockdown. This project facilitates multiplayer gaming with a web-based interface. It has been updated recently to integrate the latest version of **boardgame.io**, providing a smooth and responsive gameplay experience.

## Table of Contents
- [BM2Q](#bm2q)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [Technologies Used](#technologies-used)
  - [Installation](#installation)
    - [Prerequisites](#prerequisites)
    - [Steps](#steps)
  - [Running the Project](#running-the-project)
  - [License](#license)

## Features
- Multiplayer online gameplay based on **Cards Against Humanity**.
- Real-time interactions with robust state management using **boardgame.io**.
- Clean and responsive UI powered by **React**.
- Seamless integration of the latest version of **boardgame.io**.
- Developed to connect friends remotely during the COVID lockdown.

## Technologies Used
- **Node.js** (version <= 20)
- **React**
- **boardgame.io**
- **Koa** (for serving static files)

## Installation

### Prerequisites
- **Node.js** (version <= 20)
- **npm** (comes with Node.js)

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

   This will start the backend server, which handles game logic and serves static files.

2. **Run the client**:
   Open a separate terminal window and run:
   ```bash
   npm run start
   ```

   This will start the React development server, and you can access the application at `http://localhost:3000`.

Ensure both the server and client are running for the application to work correctly.


## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

