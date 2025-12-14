// scan.js
import { initSupabase, fetchFrameById } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Wait for libraries
    if (!window.supabase || !window.Html5Qrcode) {
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    await initSupabase();

    const scannerContainer = document.getElementById('reader');
    const resultContainer = document.getElementById('scanResult');
    const videoPlayer = document.getElementById('memoryVideo');
    const frameTitle = document.getElementById('frameTitle');
    const frameDesc = document.getElementById('frameDesc');
    const scanStatus = document.getElementById('scanStatus');
    const resetBtn = document.getElementById('resetScan');
    const fileInput = document.getElementById('qrInputFile');

    // Check URL params for frame ID (direct link)
    const urlParams = new URLSearchParams(window.location.search);
    const frameId = urlParams.get('frame');

    if (frameId) {
        loadMemory(frameId);
    } else {
        startScanner();
    }

    let html5QrcodeScanner;

    function startScanner() {
        if (!scannerContainer) return;
        
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        
        // If using the library class Html5QrcodeScanner for UI
        // html5QrcodeScanner = new Html5QrcodeScanner("reader", config, /* verbose= */ false);
        // html5QrcodeScanner.render(onScanSuccess, onScanFailure);

        // Or using Html5Qrcode for more control
        const html5QrCode = new Html5Qrcode("reader");
        const qrCodeSuccessCallback = (decodedText, decodedResult) => {
            // Handle on success condition with the decoded message.
            console.log(`Scan result: ${decodedText}`, decodedResult);
            stopScanner(html5QrCode);
            
            // Try to extract frame ID if it's a URL
            let id = decodedText;
            try {
                const url = new URL(decodedText);
                const params = new URLSearchParams(url.search);
                if(params.has('frame')) {
                    id = params.get('frame');
                }
            } catch(e) {
                // Not a URL, use raw text
            }
            
            loadMemory(id);
        };
        const configQr = { fps: 10, qrbox: { width: 250, height: 250 } };

        // Prefer back camera
        html5QrCode.start({ facingMode: "environment" }, configQr, qrCodeSuccessCallback)
        .catch(err => {
            scanStatus.textContent = "Camera access failed. You can upload an image instead.";
        });

        // File input change listener
        if(fileInput) {
            fileInput.addEventListener('change', e => {
                if (e.target.files.length == 0) {
                    return;
                }
                const imageFile = e.target.files[0];
                // Scan QR Code
                html5QrCode.scanFile(imageFile, true)
                .then(decodedText => {
                    // success
                    stopScanner(html5QrCode);
                    loadMemory(decodedText);
                })
                .catch(err => {
                    // failure, handle it.
                    scanStatus.textContent = "Error scanning file. Try another image.";
                });
            });
        }
    }

    function stopScanner(scannerInstance) {
        if(scannerInstance) {
            scannerInstance.stop().then((ignore) => {
                // QR Code scanning is stopped.
                scannerContainer.style.display = 'none';
            }).catch((err) => {
                // Stop failed, handle it.
            });
        }
    }

    async function loadMemory(id) {
        scanStatus.textContent = "Loading memory...";
        scannerContainer.style.display = 'none';
        
        try {
            const frame = await fetchFrameById(id);
            if(frame) {
                resultContainer.classList.remove('hidden');
                frameTitle.textContent = frame.title;
                frameDesc.textContent = frame.description || '';
                videoPlayer.src = frame.video_url;
                videoPlayer.play();
                scanStatus.style.display = 'none';
            } else {
                scanStatus.textContent = "Memory not found.";
                resetBtn.classList.remove('hidden');
            }
        } catch (err) {
            console.error(err);
            scanStatus.textContent = "Error loading memory.";
            resetBtn.classList.remove('hidden');
        }
    }

    if(resetBtn) {
        resetBtn.addEventListener('click', () => {
            window.location.href = 'scan.html';
        });
    }
});

