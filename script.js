document.addEventListener('DOMContentLoaded', () => { // Main function wrapper
    const fileInput = document.getElementById('dbFile');
    const toast = document.getElementById('toast-notification');
    const tableListContainer = document.querySelector('#tableList .table-button-container');
    const tableDataContainer = document.querySelector('#tableData .table-responsive');
    const controlsDiv = document.getElementById('controls');
    const exportControlsDiv = document.getElementById('exportControls');
    const saveDbButton = document.getElementById('saveDb');
    const fileNameSpan = document.getElementById('fileName');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const tableFilterInput = document.getElementById('tableFilter');
    const dataFilterInput = document.getElementById('dataFilter');

    let db;
    let currentActiveButton = null;
    let isDbModified = false;
    const pagination = {
        rowsPerPage: 10,
        currentPage: 1,
        tableName: null,
        currentFilter: ''
    };

    let currentLang = 'fr';

    // --- Toast Notification ---
    function showToast(message, type = 'info', duration = 3000) {
        toast.className = 'show';
        toast.textContent = message;
        if (type === 'error') {
            toast.classList.add('error');
        } else if (type === 'warning') {
            toast.classList.add('warning');
        }

        setTimeout(() => {
            toast.className = toast.className.replace('show', '');
            toast.classList.remove('error', 'warning');
        }, duration);
    }

    // --- IndexedDB Persistence ---
    const DB_NAME = 'SQLiteViewerDB';
    const STORE_NAME = 'databaseFiles';
    let idb;

    async function initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);
            request.onerror = () => reject("Erreur IndexedDB: " + request.error);
            request.onsuccess = () => {
                idb = request.result;
                resolve(idb);
            };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
        });
    }

    async function saveDbToIndexedDB(data, name) {
        if (!idb) return;
        const transaction = idb.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        // Enregistrer la base de données, son nom, et le timestamp actuel
        store.put(data, 'lastDb'); 
        store.put(name, 'lastDbName'); 
        store.put(Date.now(), 'lastDbTimestamp');
    }

    async function loadDbFromIndexedDB() {
        if (!idb) return null;
        return new Promise((resolve) => {
            const transaction = idb.transaction([STORE_NAME], 'readwrite'); // readwrite pour pouvoir supprimer si expiré
            const store = transaction.objectStore(STORE_NAME);
            const dataReq = store.get('lastDb');
            const nameReq = store.get('lastDbName');
            const timestampReq = store.get('lastDbTimestamp');

            transaction.oncomplete = () => {
                const lastTimestamp = timestampReq.result;
                const fiveMinutes = 5 * 60 * 1000;

                // Si un timestamp existe et qu'il date de moins de 5 minutes
                if (lastTimestamp && (Date.now() - lastTimestamp < fiveMinutes)) {
                    resolve({ data: dataReq.result, name: nameReq.result });
                } else {
                    // Sinon, la session a expiré, on nettoie IndexedDB
                    store.delete('lastDb');
                    store.delete('lastDbName');
                    store.delete('lastDbTimestamp');
                    resolve(null); // Et on ne retourne rien à charger
                }
            };
        });
    }

    // --- End IndexedDB ---

    // --- I18n (Internationalization) ---

    function applyTranslations() {
        document.documentElement.lang = currentLang;
        const elements = document.querySelectorAll('[data-i18n-key]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n-key');
            let translation = translations[currentLang][key];
            if (translation) {
                // Replace placeholders like {year}
                translation = translation.replace('{year}', new Date().getFullYear());

                if (el.tagName === 'META' && el.name === 'description') {
                    el.content = translation;
                } else {
                    el.textContent = translation;
                }
            }
        });

        // Handle placeholders
        const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
        placeholderElements.forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            let translation = translations[currentLang][key];
            if (translation) {
                el.placeholder = translation;
            }
        });
    }

    function setLanguage(lang) {
        currentLang = lang;
        applyTranslations();
        // Update active button style
        document.querySelectorAll('.lang-switcher button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });
        // Re-display initial message or currently active table to update its title
        if (currentActiveButton) {
            // A table is active, re-render it
            const tableName = currentActiveButton.textContent;
            displayTableData(tableName);
        } else if (tableDataContainer.querySelector('p')) {
            tableDataContainer.innerHTML = `<p data-i18n-key="select_table_prompt">${translations[currentLang]['select_table_prompt']}</p>`;
        }
    }

    async function initializeAppWithDb(data, name) {
        try {
            const SQL = await initSqlJs(config);
            db = new SQL.Database(data);
            displayTables();
            controlsDiv.style.display = 'flex';
            saveDbButton.disabled = true;
            isDbModified = false;
            if (name) {
                fileNameSpan.textContent = name;
            }
        } catch (error) {
            console.error("Database loading error from memory:", error);
            alert(translations[currentLang]['load_error']);
        }
    }

    // --- End I18n ---

    // --- Theme Management ---

    function loadTheme() {
        const preferredTheme = localStorage.getItem('theme') || 'light';
        setTheme(preferredTheme);
    }

    // --- End Theme Management ---

    const config = {
        locateFile: filename => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${filename}`
    };

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) {
            fileNameSpan.textContent = translations[currentLang]['no_file_selected'];
            return;
        }
        fileNameSpan.textContent = file.name;

        const fileBuffer = await file.arrayBuffer();
        await saveDbToIndexedDB(new Uint8Array(fileBuffer), file.name);
        await initializeAppWithDb(new Uint8Array(fileBuffer), file.name);
    });

    // Table list filtering
    tableFilterInput.addEventListener('input', (e) => {
        const filterValue = e.target.value.toLowerCase();
        const buttons = tableListContainer.querySelectorAll('.table-button-item');
        buttons.forEach(btnContainer => {
            const btn = btnContainer.querySelector('.table-button');
            if (btn.textContent.toLowerCase().includes(filterValue)) {
                btnContainer.style.display = '';
            } else {
                btnContainer.style.display = 'none';
            }
        });
    });

    // Data filtering
    dataFilterInput.addEventListener('input', (e) => {
        if (currentActiveButton) {
            // Reset to page 1 when filtering
            displayTableData(currentActiveButton.textContent, 1, e.target.value);
        }
    });

    function displayTables() {
        tableListContainer.innerHTML = '';
        tableDataContainer.innerHTML = `<p data-i18n-key="select_table_prompt">${translations[currentLang]['select_table_prompt']}</p>`;
        exportControlsDiv.style.display = 'none'; // Cacher les contrôles d'export
        dataFilterInput.style.display = 'none'; // Cacher le filtre de données

        try {
            const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';");
            if (tables.length === 0 || tables[0].values.length === 0) {
                tableListContainer.innerHTML = `<p data-i18n-key="no_tables_found">${translations[currentLang]['no_tables_found']}</p>`;
                return;
            }

            tables[0].values.forEach(tableNameArr => {
                const tableName = tableNameArr[0];

                const container = document.createElement('div');
                container.className = 'table-button-item';

                const button = document.createElement('button');
                button.className = 'table-button';
                button.textContent = tableName;
                button.onclick = () => {
                    if (currentActiveButton) {
                        currentActiveButton.classList.remove('active');
                    }
                    dataFilterInput.value = ''; // Reset filter input
                    displayTableData(tableName, 1, ''); // Reset filter state
                    button.classList.add('active');
                    currentActiveButton = button;
                };

                const deleteIcon = document.createElement('span');
                deleteIcon.className = 'delete-icon';
                deleteIcon.textContent = '🗑️';
                deleteIcon.onclick = (e) => {
                    e.stopPropagation(); // Empêche le clic de déclencher le bouton de la table
                    deleteTable(tableName);
                };

                container.appendChild(button);
                container.appendChild(deleteIcon);
                tableListContainer.appendChild(container);
            });
        } catch (error) {
            console.error("Error listing tables:", error);
            alert(translations[currentLang]['list_tables_error']);
        }
    }

    function deleteTable(tableName) {
        const confirmText = getTranslation('delete_table_confirm', { tableName });
        if (!confirm(confirmText)) {
            return;
        }

        try {
            db.run(`DROP TABLE \`${tableName}\``);
            const successText = getTranslation('delete_table_success', { tableName });
            showToast(successText);

            // Marquer la base de données comme modifiée
            if (!isDbModified) {
                isDbModified = true;
                saveDbButton.disabled = false;
            }
            saveDbToIndexedDB(db.export(), fileNameSpan.textContent); // Mettre à jour IndexedDB

            // Si la table supprimée était celle affichée, on nettoie la vue
            if (currentActiveButton && currentActiveButton.textContent === tableName) {
                tableDataContainer.innerHTML = `<p data-i18n-key="select_table_prompt">${translations[currentLang]['select_table_prompt']}</p>`;
                exportControlsDiv.style.display = 'none';
                currentActiveButton = null;
                 // Vider également les contrôles de pagination
                const paginationControls = document.getElementById('paginationControls');
                if (paginationControls) {
                    paginationControls.innerHTML = '';
                }
            }

            displayTables(); // Rafraîchir la liste des tables

        } catch (error) {
            console.error(`Error deleting table ${tableName}:`, error);
            const errorText = getTranslation('delete_table_error', { tableName });
            showToast(errorText, 'error');
        }
    }

    function isURL(str) {
        if (typeof str !== 'string') return false;
        try {
            const url = new URL(str);
            return url.protocol === "http:" || url.protocol === "https:";
        } catch (_) {
            return false;
        }
    }

    async function generateLinkPreview(url, container) {
        const previewContainer = document.createElement('div');
        previewContainer.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-top: 5px; padding: 5px; border: 1px solid #eee; border-radius: 4px;';

        // Utiliser un proxy CORS pour récupérer les métadonnées de la page
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;

        try {
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error('Network response was not ok.');
            
            const data = await response.json();
            const htmlContent = data.contents;

            if (!htmlContent) {
                throw new Error("Could not fetch HTML content.");
            }

            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');
            
            const title = doc.querySelector('title')?.textContent || url;
            const faviconLink = doc.querySelector("link[rel*='icon']")?.href || `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}`;

            previewContainer.innerHTML = `
                <img src="${faviconLink}" alt="favicon" width="16" height="16" style="border-radius: 2px;" crossorigin="anonymous">
                <span style="font-size: 0.9em; color: #555; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${title}</span>
            `;
        } catch (error) {
            console.warn(`Could not generate preview for ${url}:`, error);
            // Fallback simple si l'aperçu échoue
            previewContainer.innerHTML = `<span style="font-size: 0.9em; color: #888;">Aperçu non disponible</span>`;
        }
        container.appendChild(previewContainer);
    }

    function displayTableData(tableName, page = 1, filter = null) {
        pagination.tableName = tableName;
        pagination.currentPage = page;
        if (filter !== null) {
            pagination.currentFilter = filter;
        }

        dataFilterInput.style.display = 'block'; // Ensure filter input is visible

        const headerText = translations[currentLang]['table_content_header'].replace('{tableName}', tableName);
        const tableHeader = document.querySelector('#tableData .table-header-controls h2');
        tableHeader.innerHTML = headerText;
        tableDataContainer.innerHTML = ''; // Vider seulement la zone du tableau
    
        try {
            const pkeyInfo = db.exec(`PRAGMA table_info(${tableName})`);
            const pkeyColumn = pkeyInfo[0].values.find(col => col[5] === 1);
            if (!pkeyColumn) {
                const warningText = getTranslation('no_pk_warning', { tableName });
                showToast(warningText, 'warning', 5000);
            }
            const pkeyColumnName = pkeyColumn ? pkeyColumn[1] : null;

            // Prepare Queries with Filter
            let query = `SELECT * FROM \`${tableName}\``;
            let countQuery = `SELECT COUNT(*) FROM \`${tableName}\``;

            if (pagination.currentFilter) {
                const colInfo = db.exec(`PRAGMA table_info(\`${tableName}\`)`);
                if (colInfo.length > 0) {
                    const columns = colInfo[0].values.map(c => c[1]);
                    // Using simple string concatenation for WHERE clause with LIKE.
                    // Note: sql.js binding for multiple OR LIKE clauses dynamically is tricky.
                    // Ideally we should bind parameters, but for generic search across all columns:
                    const filterValue = pagination.currentFilter.replace(/'/g, "''"); // Basic SQL escape
                    const whereClause = columns.map(col => `\`${col}\` LIKE '%${filterValue}%'`).join(' OR ');
                    query += ` WHERE ${whereClause}`;
                    countQuery += ` WHERE ${whereClause}`;
                }
            }

            // Pagination: Count total rows
            const countResult = db.exec(countQuery);
            const totalRows = countResult[0].values[0][0];
            const totalPages = Math.ceil(totalRows / pagination.rowsPerPage);
            const offset = (page - 1) * pagination.rowsPerPage;

            query += ` LIMIT ${pagination.rowsPerPage} OFFSET ${offset}`;

            const stmt = db.prepare(query);
            const table = document.createElement('table');
            const thead = document.createElement('thead');
            const tbody = document.createElement('tbody');

            const headerRow = document.createElement('tr');
            stmt.getColumnNames().forEach(colName => {
                const th = document.createElement('th');
                th.textContent = colName;
                if (colName === pkeyColumnName) {
                    th.classList.add('pk-column');
                    th.title = getTranslation('pk_column_tooltip');
                    th.innerHTML += ' 🔑'; // Ajoute une icône de clé
                }
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);

            while (stmt.step()) {
                const row = stmt.getAsObject();
                const tr = document.createElement('tr');
                const pkeyValue = pkeyColumnName ? row[pkeyColumnName] : null;

                stmt.getColumnNames().forEach(colName => {
                    const td = document.createElement('td');
                    const value = row[colName];

                    if (colName === pkeyColumnName) {
                        td.classList.add('pk-column');
                    }

                    if (value instanceof Uint8Array) {
                        try {
                            const blob = new Blob([value], { type: 'image/png' });
                            const url = URL.createObjectURL(blob);
                            const img = document.createElement('img');
                            img.src = url;
                            td.appendChild(img);
                        } catch (e) {
                            td.textContent = '[BLOB]';
                        }
                    } else {
                        let textValue = value === null ? 'NULL' : String(value);
                        if (isURL(textValue)) {
                            const linkWrapper = document.createElement('div');
                            const a = document.createElement('a');
                            a.href = textValue;
                            a.textContent = textValue;
                            a.target = '_blank';
                            a.rel = 'noopener noreferrer';
                            linkWrapper.appendChild(a);
                            td.appendChild(linkWrapper);
                            generateLinkPreview(textValue, linkWrapper);
                        } else {
                            td.textContent = textValue;
                        }
                    }

                    if (pkeyColumnName && colName !== pkeyColumnName) {
                        td.contentEditable = true;
                        td.addEventListener('keydown', (e) => {
                             if (e.key === 'Enter') {
                                e.preventDefault();
                                e.target.blur();
                            }
                        });
                        td.addEventListener('blur', (e) => {
                            // Si la cellule contient un lien, la valeur est dans le div > a
                            let newValue;
                            if (e.target.querySelector('a')) {
                                newValue = e.target.querySelector('a').textContent;
                            } else {
                                newValue = e.target.textContent;
                            }
                            // Trim for text content to avoid issues with non-breaking spaces or newlines
                            // introduced by contentEditable
                            if (newValue !== textValue) {
                                updateCell(tableName, colName, newValue, pkeyColumnName, pkeyValue);
                                // Update the textValue in the closure to reflect the new value for subsequent edits
                                textValue = newValue;
                            } else {
                                // If no change, just re-render to clean up any formatting issues (like newlines from contentEditable)
                                td.textContent = textValue;
                            }
                        });
                    }
                    tr.appendChild(td);
                });
                tbody.appendChild(tr);
            }

            stmt.free();
            table.appendChild(thead);
            table.appendChild(tbody);
            tableDataContainer.appendChild(table);
            renderPaginationControls(totalRows, totalPages);

            // Afficher et configurer les contrôles d'exportation
            setupExportControls(tableName);

        } catch (error) {
            console.error(`Error displaying table ${tableName}:`, error);
            const errorText = translations[currentLang]['display_table_error'].replace('{tableName}', tableName);
            alert(errorText);
        }
    }

    function renderPaginationControls(totalRows, totalPages) {
        let paginationControlsContainer = document.getElementById('paginationControls');
        if (!paginationControlsContainer) {
            paginationControlsContainer = document.createElement('div');
            paginationControlsContainer.id = 'paginationControls';
            tableDataContainer.parentNode.insertBefore(paginationControlsContainer, tableDataContainer.nextSibling);
        }

        if (totalPages <= 1) {
            paginationControlsContainer.innerHTML = '';
            return;
        }

        const { currentPage } = pagination;

        paginationControlsContainer.innerHTML = `
            <button id="prevPage" ${currentPage === 1 ? 'disabled' : ''}>&laquo; Précédent</button>
            <span>Page ${currentPage} / ${totalPages}</span>
            <button id="nextPage" ${currentPage === totalPages ? 'disabled' : ''}>Suivant &raquo;</button>
        `;

        document.getElementById('prevPage').addEventListener('click', () => {
            if (pagination.currentPage > 1) {
                displayTableData(pagination.tableName, pagination.currentPage - 1, null); // Keep current filter
            }
        });

        document.getElementById('nextPage').addEventListener('click', () => {
            if (pagination.currentPage < totalPages) {
                displayTableData(pagination.tableName, pagination.currentPage + 1, null); // Keep current filter
            }
        });
    }

    // =================================================================
    // ======================== EXPORT FUNCTIONS =======================
    // =================================================================
    function setupExportControls(tableName) {
        exportControlsDiv.innerHTML = `
            <select id="exportFormat">
                <optgroup label="${tableName}">
                <option value="csv_current_table">${translations[currentLang]['export_format_csv']} (${tableName})</option>
                <option value="json_current_table">${translations[currentLang]['export_format_json']} (${tableName})</option>
                <option value="xlsx_current_table">${translations[currentLang]['export_format_excel']} (${tableName})</option>
                </optgroup>
                <optgroup label="Toutes les tables">
                <option value="zip_all">${translations[currentLang]['export_format_zip_all']}</option>
                 <option value="json_zip_all">${translations[currentLang]['export_format_json_zip_all']}</option>
                <option value="xlsx_zip_all">${translations[currentLang]['export_format_xlsx_zip_all']}</option>
               
            </select>
            <button id="exportBtn" data-i18n-key="export_button">${translations[currentLang]['export_button']}</button>
        `;

        exportControlsDiv.style.display = 'flex';

        document.getElementById('exportBtn').addEventListener('click', () => {
            const format = document.getElementById('exportFormat').value;
            switch (format) {
                case 'csv_current_table':
                    exportTable(tableName, 'csv');
                    break;
                case 'json_current_table':
                    exportTable(tableName, 'json');
                    break;
                case 'xlsx_current_table':
                    exportTable(tableName, 'xlsx');
                    break;
                case 'zip_all':
                    exportAllTablesAsZip();
                    break;
                case 'xlsx_zip_all':
                    exportAllTablesAsXLSXZip();
                    break;
                case 'json_zip_all':
                    exportAllTablesAsJSONZip();
                    break;
                default:
                    console.error("Unknown export format selected:", format);
            }
        });
    }

    function exportTable(tableName, format) {
        const results = db.exec(`SELECT * FROM ${tableName}`);
        if (!results || results.length === 0) return;

        const columns = results[0].columns;
        const data = results[0].values;

        if (format === 'csv') {
            exportToCSV(tableName, columns, data);
        } else if (format === 'xlsx') {
            exportToXLSX(tableName, columns, data);
        } else if (format === 'json') {
            exportToJSON(tableName, columns, data);
        }
    }

    async function exportAllTablesAsZip() {
        const tablesResult = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';");
        if (!tablesResult || tablesResult.length === 0) return;

        const zip = new JSZip();
        const tableNames = tablesResult[0].values.map(row => row[0]);

        for (const tableName of tableNames) {
            const results = db.exec(`SELECT * FROM ${tableName}`);
            if (results && results.length > 0) {
                const columns = results[0].columns;
                const data = results[0].values;
                let csvContent = columns.map(escapeCSV).join(',') + '\r\n';
                data.forEach(row => {
                    csvContent += row.map(escapeCSV).join(',') + '\r\n';
                });
                zip.file(`${tableName}.csv`, csvContent);
            }
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(zipBlob);
        link.download = "database_export.zip";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }

    async function exportAllTablesAsXLSXZip() {
        const tablesResult = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';");
        if (!tablesResult || tablesResult.length === 0) return;

        const zip = new JSZip();
        const tableNames = tablesResult[0].values.map(row => row[0]);

        for (const tableName of tableNames) {
            const results = db.exec(`SELECT * FROM ${tableName}`);
            if (results && results.length > 0) {
                const columns = results[0].columns;
                const data = results[0].values;

                const dataAsObjects = data.map(row => {
                    let obj = {};
                    columns.forEach((col, index) => {
                        obj[col] = row[index] instanceof Uint8Array ? '[BLOB]' : row[index];
                    });
                    return obj;
                });

                const worksheet = XLSX.utils.json_to_sheet(dataAsObjects);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, tableName);

                // Générer le fichier XLSX en mémoire (ArrayBuffer)
                const xlsxData = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
                zip.file(`${tableName}.xlsx`, xlsxData);
            }
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        downloadFile(zipBlob, "database_export_xlsx.zip");
    }

    async function exportAllTablesAsJSONZip() {
        const tablesResult = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';");
        if (!tablesResult || tablesResult.length === 0) return;

        const zip = new JSZip();
        const tableNames = tablesResult[0].values.map(row => row[0]);

        for (const tableName of tableNames) {
            const results = db.exec(`SELECT * FROM ${tableName}`);
            if (results && results.length > 0) {
                const columns = results[0].columns;
                const data = results[0].values;

                const dataAsObjects = data.map(row => {
                    let obj = {};
                    columns.forEach((col, index) => {
                        // Gérer les BLOBs comme une chaîne de caractères pour la sérialisation JSON
                        obj[col] = row[index] instanceof Uint8Array ? '[BLOB]' : row[index];
                    });
                    return obj;
                });

                // Convertir le tableau d'objets en une chaîne JSON formatée
                const jsonContent = JSON.stringify(dataAsObjects, null, 2);
                zip.file(`${tableName}.json`, jsonContent);
            }
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        downloadFile(zipBlob, "database_export_json.zip");
    }

    // Helper function to download a blob
    function downloadFile(blob, filename) {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }

    function escapeCSV(str) {
        if (str === null || str === undefined) return '';
        str = String(str);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }

    function exportToCSV(tableName, columns, data) {
        let csvContent = columns.map(escapeCSV).join(',') + '\r\n';

        data.forEach(row => {
            csvContent += row.map(escapeCSV).join(',') + '\r\n';
        });

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
        downloadFile(blob, `${tableName}.csv`);
    }

    function exportToJSON(tableName, columns, data) {
        const dataAsObjects = data.map(row => {
            let obj = {};
            columns.forEach((col, index) => {
                // Gérer les BLOBs comme une chaîne de caractères pour la sérialisation JSON
                obj[col] = row[index] instanceof Uint8Array ? '[BLOB]' : row[index];
            });
            return obj;
        });

        // Convertir le tableau d'objets en une chaîne JSON formatée
        const jsonContent = JSON.stringify(dataAsObjects, null, 2);
        const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8" });
        downloadFile(blob, `${tableName}.json`);
    }

    function exportToXLSX(tableName, columns, data) {
        // La bibliothèque xlsx attend un tableau d'objets
        const dataAsObjects = data.map(row => {
            let obj = {};
            columns.forEach((col, index) => {
                // Gérer les BLOBs comme des chaînes vides pour éviter les erreurs
                obj[col] = row[index] instanceof Uint8Array ? '[BLOB]' : row[index];
            });
            return obj;
        });

        const worksheet = XLSX.utils.json_to_sheet(dataAsObjects);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, tableName);
        const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], {type: 'application/octet-stream'});
        downloadFile(blob, `${tableName}.xlsx`);
    }

    function updateCell(tableName, colName, newValue, pkeyName, pkeyValue) {
        try {
            const stmt = db.prepare(`UPDATE \`${tableName}\` SET \`${colName}\` = :value WHERE \`${pkeyName}\` = :id`);
            stmt.bind({ ':value': newValue, ':id': pkeyValue });
            stmt.step();
            stmt.free();
            const successText = getTranslation('update_success', { tableName, colName, newValue: String(newValue).substring(0, 30) + '...' });
            showToast(successText);
            saveDbToIndexedDB(db.export(), fileNameSpan.textContent); // Save changes to IndexedDB
            if (!isDbModified) {
                isDbModified = true;
                saveDbButton.disabled = false; // Activer le bouton à la première modification
            }
        } catch (error) {
            showToast(getTranslation('update_error'), 'error');
            displayTableData(tableName);
        }
    }

    saveDbButton.addEventListener('click', () => {
        if (!db) {
            alert(translations[currentLang]['no_db_loaded']);
            return;
        }
        try {
            const data = db.export();
            const blob = new Blob([data], { type: "application/octet-stream" });
            const a = document.createElement("a");
            a.href = window.URL.createObjectURL(blob);
            a.download = "database_modifiee.db";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(a.href);
            // Réinitialiser l'état après la sauvegarde
            isDbModified = false;
            saveDbToIndexedDB(data, fileNameSpan.textContent); // Also update IndexedDB on explicit save
            saveDbButton.disabled = true;
        } catch (error) {
            console.error("Save error:", error);
            alert(translations[currentLang]['save_error']);
        }
    });

    // Helper pour les traductions avec placeholders
    function getTranslation(key, replacements = {}) {
        let translation = translations[currentLang][key] || key;
        for (const placeholder in replacements) {
            translation = translation.replace(`{${placeholder}}`, replacements[placeholder]);
        }
        return translation;
    }

    // --- Theme Management Logic ---
    function setTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }

    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.body.getAttribute('data-theme');
        if (currentTheme === 'dark') {
            setTheme('light');
        } else {
            setTheme('dark');
        }
    });

    // --- Initialisation ---

    async function start() {
        // Détecter la langue du navigateur et l'appliquer
        const userLang = navigator.language.split('-')[0]; // 'fr-FR' -> 'fr'
        const initialLang = translations[userLang] ? userLang : 'en'; // 'en' par défaut
        setLanguage(initialLang);

        loadTheme(); // Charger le thème au démarrage

        await initIndexedDB();
        const storedDb = await loadDbFromIndexedDB();
        if (storedDb && storedDb.data) {
            await initializeAppWithDb(storedDb.data, storedDb.name);
        }
    }

    start();

    // Gérer le clic sur les boutons de langue
    document.querySelectorAll('.lang-switcher button').forEach(button => {
        button.addEventListener('click', (e) => {
            setLanguage(e.target.dataset.lang);
        });
    });

}); // Fin du wrapper principal
