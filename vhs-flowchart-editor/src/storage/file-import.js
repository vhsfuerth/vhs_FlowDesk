const MAX_IMPORT_FILE_BYTES = 20 * 1024 * 1024;

/**
 * Öffnet den Datei-Dialog und liest eine JSON-Datei ein.
 * Liefert `{ file, json }` oder `null`, wenn keine Datei gewählt wurde.
 */
export const pickJsonFile = () => {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';

        input.onchange = (event) => {
            const file = event.target.files?.[0];
            if (!file) {
                resolve(null);
                return;
            }
            if (file.size > MAX_IMPORT_FILE_BYTES) {
                reject(new Error('Die Datei ist zu groß (maximal 20 MB).'));
                return;
            }

            const reader = new FileReader();

            reader.onload = (loadEvent) => {
                try {
                    resolve({ file, json: JSON.parse(loadEvent.target.result) });
                } catch {
                    reject(new Error(`„${file.name}“ ist keine gültige JSON-Datei.`));
                }
            };

            reader.onerror = () => reject(new Error(`„${file.name}“ konnte nicht gelesen werden.`));
            reader.readAsText(file);
        };

        // Abbruch des Datei-Dialogs (sonst bliebe das Promise offen)
        input.oncancel = () => resolve(null);

        input.click();
    });
};
