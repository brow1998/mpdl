# MPDL - Marca Página's Downloader

A hassle-free YouTube video downloader with clear and simple options. Download videos in your preferred format: audio-only, video-only (4K/1080p), or video+audio (4K/1080p), all through a simplified UI. Enjoy a reliable experience without endless ads.

## Features

*   **Simplified UI**: A user-friendly interface for easy video downloading.
*   **Multiple Format Options**: Choose between audio-only (MP3), video-only (MP4 without audio), and video+audio (MP4 with audio) formats.
*   **Quality Selection**: Select your desired video quality, including 4K and 1080p options.
*   **Local Server**: Runs as a local Node.js server, eliminating the need for a CLI.
*   **Cross-Platform Compatibility**: Designed to work seamlessly on both Windows and Ubuntu.
*   **Dependency Management**: Automatically downloads and manages `yt-dlp` and `ffmpeg` dependencies.

## Prerequisites

Before you begin, ensure you have the following installed:

*   **Node.js**: Download and install Node.js from [nodejs.org](https://nodejs.org).

## Installation

1.  Clone the repository:

    ```bash
    git clone https://github.com/brow1998/mpdl.git
    cd mpdl
    ```

2.  Run the appropriate installation script for your operating system:

    *   **Windows**:

        ```batch
        install.bat
        ```

    *   **Ubuntu**:

        ```bash
        ./install.sh
        ```

    This script will:

    *   Verify the presence of Node.js.
    *   Install the required dependencies using `npm install`.
    *   Download `yt-dlp` and `ffmpeg`.

## Usage

1.  Start the application by running the appropriate start script for your operating system:

    *   **Windows**:

        ```batch
        start.bat
        ```

    *   **Ubuntu**:

        ```bash
        ./start.sh
        # OR
        npm start
        ```

2.  Open your web browser and navigate to `http://localhost:3000` to access the MPDL UI.

## License

[MIT](LICENSE). Respect YouTube's terms of service and the rights to the content you download.

## Acknowledgments

This project is a wrapper around the powerful [yt-dlp](https://github.com/yt-dlp/yt-dlp) tool.
