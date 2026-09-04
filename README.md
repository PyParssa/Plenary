# Plenary Project

A full-stack web application built with React, Vite, TypeScript, and Node.js with Express, featuring AI integration.

## Table of Contents

-   [Features](#features)
-   [Tech Stack](#tech-stack)
-   [Getting Started](#getting-started)
    -   [Prerequisites](#prerequisites)
    -   [Installation](#installation)
    -   [Environment Variables](#environment-variables)
    -   [Running the Development Server](#running-the-development-server)
    -   [Building for Production](#building-for-production)
-   [Project Structure](#project-structure)
-   [Contributing](#contributing)
-   [License](#license)
-   [Support Parssa](#support-parssa)

## Features

This project appears to include components for:
-   **Author Studio**: For content creation or management.
-   **Deck View**: Likely for presentations or structured content display.
-   **Share Modal**: For sharing content.
-   **Socratic Drawer**: Possibly an AI-powered conversational interface.
-   **Support Modal**: For user support or feedback.
-   **Top Navigation**: Standard navigation bar.
-   **Vault View**: A secure or private content area.
-   **Vouch Button**: Functionality for endorsements or approvals.

## Tech Stack

**Frontend:**
-   **React 19**: A JavaScript library for building user interfaces.
-   **Vite**: A fast build tool that provides a leaner and faster development experience for modern web projects.
-   **TypeScript**: A superset of JavaScript that adds static types.
-   **Tailwind CSS**: A utility-first CSS framework for rapidly building custom designs.
-   **Motion**: A production-ready motion library for React.

**Backend:**
-   **Node.js**: A JavaScript runtime built on Chrome's V8 JavaScript engine.
-   **Express**: A fast, unopinionated, minimalist web framework for Node.js.
-   **TypeScript**: For type-safe backend development.
-   **@google/genai**: Google's Generative AI SDK, indicating AI capabilities.
-   **dotenv**: To load environment variables from a `.env` file.

**Tooling:**
-   **esbuild**: An extremely fast JavaScript bundler and minifier.
-   **tsx**: Seamlessly runs TypeScript & ESM in Node.js.

## Getting Started

Follow these instructions to set up and run the project locally.

### Prerequisites

-   Node.js (LTS recommended)
-   npm, yarn, or bun (bun is used in `bun.lock`, so it's a good choice)

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd Plenary
    ```
2.  Install dependencies:
    ```bash
    bun install # or npm install or yarn install
    ```

### Environment Variables

Create a `.env` file in the root of the project based on `.env.example`. This file will contain sensitive information and configuration specific to your environment.

Example `.env`:
```
VITE_API_URL=http://localhost:3000
GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=Plenary <noreply@your-verified-domain.com>
GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
GOOGLE_SHEETS_WEBHOOK_SECRET=use-a-long-random-secret
```
Replace `YOUR_GOOGLE_API_KEY` with your actual Google Generative AI API key.

### Email verification and Google Sheets signups

The account flow sends a six-digit code through Resend. In development, if `RESEND_API_KEY` is not configured, the code is shown in the server terminal and in the account dialog. Production must use a verified Resend sending domain.

To collect verified accounts in a Sheet without running a database:

1. Create a Google Sheet with a tab named `Signups` and columns `Created At`, `Email`, and `Atmospheres`.
2. Open Extensions > Apps Script, paste the contents of `google-apps-script/Code.gs`, replace `SHEET_ID`, and set the Apps Script property `PLENARY_WEBHOOK_SECRET` to the same value as your server environment variable.
3. Deploy the script as a Web app, execute as yourself, and allow anyone with the link to access it. Put its `/exec` URL in `GOOGLE_SHEETS_WEBHOOK_URL`.
4. Restart or redeploy the server. The server, not the browser, calls the webhook after the email code is verified.

Put the four picker images in `public/assets/journey/`; see that folder's README for the exact filenames.

### Running the Development Server

To run both the frontend and backend in development mode:

```bash
bun run dev # or npm run dev or yarn dev
```

This command uses `tsx` to run the `server.ts` file, which should also serve the Vite development server.

### Building for Production

To build the project for production:

```bash
bun run build # or npm run build or yarn build
```

This command will:
1.  Build the frontend assets using Vite.
2.  Bundle the backend `server.ts` into `dist/server.cjs` using esbuild.

After building, you can start the production server:

```bash
bun run start # or npm run start or yarn start
```

## Project Structure

-   `public/`: Static assets for the frontend.
-   `src/`: Frontend source code (React components, styles, main entry points).
    -   `src/components/`: Reusable React components.
    -   `src/data/`: Initial data or mock data.
    -   `src/types.ts`: TypeScript type definitions.
-   `server.ts`: Backend Express server entry point.
-   `index.html`: Main HTML file for the frontend.
-   `metadata.json`: Project metadata.
-   `tsconfig.json`: TypeScript configuration.
-   `vite.config.ts`: Vite frontend build configuration.
-   `package.json`: Project dependencies and scripts.

## Support Parssa

If you find this project helpful and would like to support my work, you can send crypto (Solana) to the following wallet address:

**Solana Wallet Address:** `ExHycmN3JJH2S3MuLjVLsGigz6PaaEkwsnb3KSxi9dQJ`

Visit my website: [parssa.pro](https://parssa.pro)

## Contributing

Contributions are welcome! Please follow these steps:
1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Commit your changes (`git commit -m 'feat: Add new feature'`).
5.  Push to the branch (`git push origin feature/your-feature-name`).
6.  Open a Pull Request.

## License

This project is licensed under the [Creative Commons Attribution-NonCommercial 4.0 International License](LICENSE.md).

You may use, copy, modify, and share this project for non-commercial purposes with appropriate credit to Parssa. Commercial use requires separate written permission from the author.