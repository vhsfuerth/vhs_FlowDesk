export const importJSON = () => {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return reject(new Error('No file selected'));
            
            const reader = new FileReader();
            
            reader.onload = re => {
                try {
                    const json = JSON.parse(re.target.result);
                    resolve({ file, json });
                } catch (err) {
                    reject(new Error('Invalid JSON file.'));
                }
            };
            
            reader.onerror = () => reject(new Error('Error reading file'));
            reader.readAsText(file);
        };
        
        input.click();
    });
};
