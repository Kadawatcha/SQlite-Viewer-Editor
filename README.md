# SQLite Viewer / Editor

[English](#english) | [Français](#français)

---

<a name="english"></a>
## English

A simple and effective web-based SQLite database viewer and editor that runs entirely in your browser. No server-side setup required.

### ✨ Features

*   **Upload & Go**: Open any `.db`, `.sqlite`, or `.sqlite3` file from your computer.
*   **Session Persistence**: The application remembers your last used database, even after closing the tab (using IndexedDB).
*   **Table Navigation**: Easily browse through all tables in your database.
*   **Data Editing**: Click on any cell (except primary keys) to edit its content. Changes are saved in the browser.
*   **Image Support**: Automatically detects and displays images (PNG, JPEG, GIF) stored as BLOBs.
*   **Data Export**:
    *   Export the current table to **CSV** or **Excel (.xlsx)**.
    *   Export the current table to **CSV**, **JSON**, or **Excel (.xlsx)**. (Correction: JSON was listed twice)
    *   Export all tables at once into a single **ZIP** file (as individual XLSX files).
*   **Save Changes**: Download the modified database as a new `.db` file.
*   **Multilingual**: Interface available in English and French (auto-detects browser language).

### 🚀 How to Use

The easiest way to use the application is to access it directly online:

**https://kadawatcha.github.io/SQlite-Viewer-Editor/**

Simply open the link, click "Choose a file", and select your SQLite database.

### 🛠️ Technologies Used

*   **sql.js**: SQLite compiled to WebAssembly.
*   **SheetJS (xlsx)**: For creating Excel files.
*   **JSZip**: For creating ZIP archives.
*   **HTML5, CSS3, Vanilla JavaScript**

### 📄 License

This project is licensed under the **MIT License**.

---

<a name="français"></a>
## Français

Un visualiseur et éditeur de bases de données SQLite simple et efficace qui s'exécute entièrement dans votre navigateur. Aucune configuration côté serveur n'est nécessaire.

### ✨ Fonctionnalités

*   **Chargez et utilisez**: Ouvrez n'importe quel fichier `.db`, `.sqlite`, ou `.sqlite3` depuis votre ordinateur.
*   **Persistance de session**: L'application se souvient de la dernière base de données utilisée, même après avoir fermé l'onglet (via IndexedDB).
*   **Navigation entre les tables**: Parcourez facilement toutes les tables de votre base de données.
*   **Édition des données**: Cliquez sur une cellule (sauf les clés primaires) pour modifier son contenu. Les changements sont sauvegardés dans le navigateur.
*   **Support des images**: Détecte et affiche automatiquement les images (PNG, JPEG, GIF) stockées en tant que BLOBs.
*   **Exportation des données**:
    *   Exportez la table actuelle en **CSV** ou **Excel (.xlsx)**.
    *   Exportez la table actuelle en **CSV**, **JSON**, ou **Excel (.xlsx)**. (Correction: JSON était listé deux fois)
    *   Exportez toutes les tables en une seule fois dans un fichier **ZIP** (en tant que fichiers XLSX individuels).
*   **Sauvegarde des modifications**: Téléchargez la base de données modifiée en tant que nouveau fichier `.db`.
*   **Multilingue**: Interface disponible en anglais et en français (détecte automatiquement la langue du navigateur).

### 🚀 Comment utiliser

La manière la plus simple d'utiliser l'application est d'y accéder directement en ligne :

**https://kadawatcha.github.io/SQlite-Viewer-Editor/**

Ouvrez simplement le lien, cliquez sur "Choisir un fichier", et sélectionnez votre base de données SQLite.

### 🛠️ Technologies utilisées

*   **sql.js**: SQLite compilé en WebAssembly.
*   **SheetJS (xlsx)**: Pour la création de fichiers Excel.
*   **JSZip**: Pour la création d'archives ZIP.
*   **HTML5, CSS3, JavaScript natif (Vanilla)**

### 📄 Licence

Ce projet est sous **Licence MIT**.