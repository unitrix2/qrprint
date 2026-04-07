const fileInput = document.getElementById('file-input');
const dropZone = document.getElementById('drop-zone');
const dataBody = document.getElementById('data-body');
const actionButtons = document.getElementById('actions');

let tableData = [];

// Handle Clicks
dropZone.addEventListener('click', () => fileInput.click());

// Handle Drag & Drop
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    processFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => processFiles(e.target.files));

async function processFiles(files) {
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;

        const qrData = await readQRCode(file);
        if (qrData) {
            const processedRow = parseData(qrData, file.name, tableData.length + 1);
            tableData.push(processedRow);
            renderRow(processedRow);
        }
    }
    if (tableData.length > 0) actionButtons.classList.remove('hidden');
}

// QR Reading Logic
function readQRCode(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                resolve(code ? code.data : null);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// Data Processing Logic (As per your requirement)
function parseData(link, fileName, index) {
    // Column 2: Last 6 digits after '='
    const code = link.includes('=') ? link.split('=').pop().substring(0, 6) : "N/A";

    // Column 3: Extract from ABCDEF_123-456 -> 123/456
    let feNo = "N/A";
    if (fileName.includes('_') && fileName.includes('-')) {
        const partAfterUnderscore = fileName.split('_')[1]; // 123-456.jpg
        const rawCode = partAfterUnderscore.split('.')[0]; // 123-456
        feNo = rawCode.replace('-', '/'); // 123/456
    }

    const depot = "CDO/CNB-";
    const caption = depot + feNo;

    return {
        srNo: index,
        code: code,
        feNo: feNo,
        depot: depot,
        caption: caption,
        link: link
    };
}

function renderRow(row) {
    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50 transition-colors";
    tr.innerHTML = `
        <td class="p-4 text-slate-600">${row.srNo}</td>
        <td class="p-4 font-mono text-blue-600 font-bold">${row.code}</td>
        <td class="p-4 text-slate-700">${row.feNo}</td>
        <td class="p-4 text-slate-700">${row.depot}</td>
        <td class="p-4 font-medium text-slate-900">${row.caption}</td>
        <td class="p-4 text-xs text-slate-400 truncate max-w-xs">${row.link}</td>
    `;
    dataBody.appendChild(tr);
}

// Export Logic
document.getElementById('export-excel').addEventListener('click', () => {
    const ws = XLSX.utils.json_to_sheet(tableData.map(item => ({
        "Sr No": item.srNo,
        "CODE": item.code,
        "FE_No": item.feNo,
        "Depot": item.depot,
        "Caption": item.caption,
        "Link": item.link
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "QR_Data");
    XLSX.writeFile(wb, `QR_Export_${Date.now()}.xlsx`);
});

document.getElementById('export-csv').addEventListener('click', () => {
    const ws = XLSX.utils.json_to_sheet(tableData);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `QR_Export_${Date.now()}.csv`;
    link.click();
});