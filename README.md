# Snap Filter App

## Project Overview
This is a real-time face filter web application developed as a practice experiment to explore computer vision capabilities in the browser. It tracks facial landmarks in real-time and overlays digital assets (filters) onto the user's face.

## Features
- **Real-time Face Tracking**: Utilizes high-precision facial landmark detection.
- **Multiple Filters**: Includes dynamic filters such as Glasses, Dog Ears, Mask, and Cat Whiskers.
- **Responsive Design**: Adapts to various screen sizes and maintains correct aspect ratios.
- **Snapshot Capture**: Allows users to take photos of the filtered video feed.
- **mirroring**: The video feed and snapshots are mirrored for a natural user experience.

## Techniques and Technologies Used
- **MediaPipe Face Mesh**: A machine learning solution for high-fidelity face geometry to detect 468 3D face landmarks.
- **HTML5 Canvas API**: Used for rendering the video feed and drawing the overlay images (filters) with transformations (rotation, scaling) based on face geometry.
- **JavaScript (ES6+)**: Implemented with a class-based architecture for better state management and modularity.
- **CSS3**: Uses modern CSS variables, flexbox, and backdrop-filter for the user interface.

## Setup and Usage
1. Open the "index.html" file in a modern web browser.
2. Allow camera access when prompted.
3. Select a filter from the list to apply it.
4. Click "Take Photo" to save a snapshot.

**Note**: For the "Take Photo" feature to work correctly without security errors, the project should be served via a local server (e.g., VS Code Live Server) rather than opening the HTML file directly from the file system.

## Disclaimer
This project is for educational and experimental purposes.
